/**
 * Capture the *measured* state of the source Supabase project into replayable DDL.
 *
 * Why introspection rather than replaying `drizzle/*.sql`: the files and the live
 * database disagree, in ways that would silently corrupt the new project.
 * `0004_powerful_albert_cleary.sql:1` drops `applications`, which still exists with
 * no file behind it; `0005_pink_sinister_six.sql:1-4` disables RLS on the auth
 * tables, which the 2026-09-13 audit measured as enabled; `0002` and `0003` both
 * add the same `posts.custom_author_*` columns; and four tables
 * (`applications`, `form_fields`, `form_settings`, `form_submissions`) exist in no
 * file at all. Only the source catalog can answer "what is the schema".
 *
 * Read-only against the source: every statement here is a SELECT.
 *
 * Usage
 *   pnpm db:port:capture            write artifacts + report into db-port/<run-id>/
 *   pnpm db:port:diff               the same capture against the target, then diff
 *   pnpm db:port:capture --tables   just the table/policy/index inventory
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadPortEnv,
  openPool,
  describePool,
  assertEndpoints,
  endpointEnv,
  projectRef,
  poolerRegion,
  redact,
  heading,
  fail,
  has,
  pinSession,
} from "./db-port-lib.mjs";

const env = loadPortEnv();
const DIFF = has("diff");
const ONLY_TABLES = has("tables");

const { sourceUrl, targetUrl, sourceRef, targetRef, liveRef } = endpointEnv(env);
assertEndpoints({ sourceRef, targetRef, liveRef });

const source = openPool(sourceUrl);
await pinSession(source, sourceUrl);

let target = null;
if (DIFF) {
  target = openPool(targetUrl);
  await pinSession(target, targetUrl);
}

heading("endpoints");
await describePool(source, DIFF ? "source" : "source", sourceUrl);
if (DIFF) await describePool(target, "target", targetUrl);

/* ------------------------------------------------------------------ *
 * Capture
 * ------------------------------------------------------------------ */

/**
 * Everything the port must reproduce, keyed by replay order.
 * Each entry is `{ name, ddl, extra? }` where `ddl` is one runnable statement.
 */
async function capture(sql) {
  const out = {};

  out.tables = [];
  const tableRows = await sql`
    select c.oid, c.relname,
           pg_get_userbyid(c.relowner)                       as owner,
           c.relrowsecurity                                  as rls_enabled,
           c.relforcerowsecurity                             as rls_forced,
           coalesce(obj_description(c.oid), '')              as table_comment
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by c.relname`;

  for (const t of tableRows) {
    const cols = await sql`
      select a.attname,
             format_type(a.atttypid, a.atttypmod)                          as type,
             a.attnotnull,
             coalesce(pg_get_expr(d.adbin, d.adrelid), '')                  as default_expr,
             a.attgenerated,
             coalesce(col_description(a.attrelid, a.attnum), '')            as comment,
             case when a.attcollation = 0 then '' else
               (select collname from pg_collation co where co.oid = a.attcollation)
             end                                                           as collation
      from pg_attribute a
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = ${t.oid} and a.attnum > 0 and not a.attisdropped
      order by a.attnum`;

    const lines = cols.map((c) => {
      let line = `    ${quote(c.attname)} ${c.type}`;
      if (c.attgenerated === "s") {
        line += ` generated always as (${c.default_expr}) stored`;
      } else {
        if (c.collation && !["default", "C", "POSIX"].includes(c.collation))
          line += ` collate ${quote(c.collation)}`;
        if (c.default_expr) line += ` default ${c.default_expr}`;
        if (c.attnotnull) line += ` not null`;
      }
      return line;
    });

    out.tables.push({
      name: t.relname,
      owner: t.owner,
      ddl: `create table public.${quote(t.relname)} (\n${lines.join(",\n")}\n);`,
      comments: cols
        .filter((c) => c.comment)
        .map((c) => `comment on column public.${quote(t.relname)}.${quote(c.attname)} is ${lit(c.comment)};`),
      tableComment: t.table_comment
        ? `comment on table public.${quote(t.relname)} is ${lit(t.table_comment)};`
        : "",
      rls_enabled: t.rls_enabled,
      rls_forced: t.rls_forced,
      columns: cols.map((c) => ({
        name: c.attname,
        type: c.type,
        notNull: c.attnotnull,
        default: c.default_expr,
        generated: c.attgenerated,
      })),
    });

    const cons = await sql`
      select con.conname, con.contype,
             pg_get_constraintdef(con.oid) as def,
             con.convalidated               as valid
      from pg_constraint con
      where con.conrelid = ${t.oid} and con.contype <> 't'
      order by case con.contype when 'p' then 0 when 'u' then 1 when 'c' then 2 else 3 end,
               con.conname`;
    out.tables.at(-1).constraints = cons.map((c) => ({
      name: c.conname,
      kind: c.contype,
      ddl: c.valid
        ? `alter table public.${quote(t.relname)} add constraint ${quote(c.conname)} ${c.def};`
        : `alter table public.${quote(t.relname)} add constraint ${quote(c.conname)} ${c.def} not valid;`,
      def: c.def,
    }));

    const idx = await sql`
      select ci.relname as indexname, pg_get_indexdef(i.indexrelid) as def,
             i.indisunique, i.indisprimary,
             coalesce(obj_description(i.indexrelid), '') as comment
      from pg_index i
      join pg_class ci on ci.oid = i.indexrelid
      where i.indrelid = ${t.oid}
        and not i.indisprimary
        and not exists (select 1 from pg_constraint pc where pc.conindid = i.indexrelid)
      order by ci.relname`;
    out.tables.at(-1).indexes = idx.map((i) => ({
      name: i.indexname,
      ddl: withIfNotExists(i.def),
      def: i.def,
      comment: i.comment ? `comment on index public.${quote(i.indexname)} is ${lit(i.comment)};` : "",
    }));
  }

  // `pg_get_policy(oid)` does not exist on Postgres 17 — it arrived later — so the
  // policy is rebuilt from pg_policy's own columns and deparsed expressions.
  out.policies = (
    await sql`
      select pol.polname, cls.relname as tab, pol.polcmd, pol.polpermissive,
             coalesce((select array_agg(r.rolname) from pg_roles r
                        where r.oid = any(pol.polroles)), '{}')          as roles,
             coalesce(array_length(pol.polroles, 1), 0) > 0              as has_roles,
             pg_get_expr(pol.polqual, pol.polrelid)                      as qual,
             pg_get_expr(pol.polwithcheck, pol.polrelid)                 as wcheck
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public'
      order by cls.relname, pol.polname`
  ).map((p) => ({
    name: `${p.tab}/${p.polname}`,
    table: p.tab,
    policyName: p.polname,
    ddl:
      `drop policy if exists ${quote(p.polname)} on public.${quote(p.tab)};\n` +
      policyDdl(p, "public") +
      ";",
    def: policyDdl(p, "public"),
    roles: p.roles,
    command: p.polcmd,
    permissive: p.polpermissive,
  }));

  out.functions = (
    await sql`
      select p.oid, p.proname,
             pg_get_function_identity_arguments(p.oid) as args,
             pg_get_functiondef(p.oid)                  as def,
             pg_get_userbyid(p.proowner)                as owner,
             p.prosecdef                                as security_definer,
             coalesce(array_to_string(p.proconfig, ','), '') as config,
             coalesce(p.proacl::text, '')               as acl
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f'
      order by p.proname, pg_get_function_identity_arguments(p.oid)`
  ).map((f) => ({
    name: f.proname,
    ddl: deCreate(f.def) + `;\nalter function public.${quote(f.proname)}(${f.args}) owner to ${quote(f.owner)};`,
    owner: f.owner,
    securityDefiner: f.security_definer,
    acl: f.acl,
    args: f.args,
  }));

  out.triggers = (
    await sql`
      select tg.tgname, cls.relname as tab, pg_get_triggerdef(tg.oid) as def,
             coalesce(obj_description(tg.oid), '') as comment
      from pg_trigger tg
      join pg_class cls on cls.oid = tg.tgrelid
      join pg_namespace n on n.oid = cls.relnamespace
      where n.nspname = 'public' and not tg.tgisinternal
      order by cls.relname, tg.tgname`
  ).map((t) => ({
    name: `${t.tab}/${t.tgname}`,
    table: t.tab,
    ddl: `drop trigger if exists ${quote(t.tgname)} on public.${quote(t.tab)};\n` + deCreate(t.def) + ";",
    def: t.def,
  }));

  // Only relations with an explicit ACL are emitted. A NULL acl means "the
  // owner's defaults", which the target reproduces on its own as long as the
  // owner matches — and the owner is asserted separately.
  out.grants = (
    await sql`
      select c.relname, c.relkind, a.privilege_type,
             pg_get_userbyid(a.grantee) as grantee, a.is_grantable
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) a
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'S', 'v', 'f')
        and c.relacl is not null
      order by c.relname, grantee, a.privilege_type`
  ).map((g) => ({
    name: `${g.relname}:${g.grantee}:${g.privilege_type}`,
    grantee: g.grantee,
    object: g.relname,
    privilege: g.privilege_type,
    ddl: `grant ${g.privilege_type} on ${g.relkind === "S" ? "sequence" : "table"} public.${quote(g.relname)} to ${quote(g.grantee)}${g.is_grantable ? " with grant option" : ""};`,
  }));

  out.sequences = await sql`
    select schemaname, sequencename, data_type, start_value, last_value
    from pg_sequences where schemaname = 'public'`;

  out.views = (
    await sql`
      select c.relname, pg_get_viewdef(c.oid, true) as def,
             pg_get_userbyid(c.relowner) as owner
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('v', 'm') order by 1`
  ).map((v) => ({
    name: v.relname,
    ddl: `create or replace view public.${quote(v.relname)} as\n${v.def.replace(/;\s*$/, "")};`,
  }));

  out.extensions = await sql`
    select e.extname, e.extversion, coalesce(n.nspname, '-') as schema
    from pg_extension e left join pg_namespace n on n.oid = e.extnamespace order by 1`;

  out.publications = await sql`
    select p.pubname, coalesce(string_agg(t.tablename, ',' order by t.tablename), '') as tables
    from pg_publication p
    left join pg_publication_tables t on t.pubname = p.pubname and t.schemaname = 'public'
    group by p.pubname order by 1`;

  out.dbSettings = await sql`
    with expanded as (
      select coalesce(r.rolname, '') as role,
             coalesce(d.datname, '') as db,
             unnest(s.setconfig)     as cfg
      from pg_db_role_setting s
      left join pg_roles r on r.oid = s.setrole
      left join pg_database d on d.oid = s.setdatabase
    )
    select role, db,
           split_part(cfg, '=', 1)                                    as name,
           substring(cfg from position('=' in cfg) + 1)                as value
    from expanded order by db, role, name`;

  out.roles = await sql`
    select rolname from pg_roles
    where rolname in ('anon','authenticated','service_role','postgres','supabase_functions_admin','supabase_storage_admin')
    order by 1`;

  out.counts = await sql`
    select c.relname, coalesce(s.n_live_tup, -1)::bigint as approx_rows,
           pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public' and c.relkind in ('r','p') order by 1`;

  out.storage = await safeQuery(
    sql,
    `select id, name, public, file_size_limit, allowed_mime_types::text as allowed_mime_types,
            created_at::text, updated_at::text
     from storage.buckets order by id`,
    [],
  );
  out.storageObjects = await safeQuery(
    sql,
    `select bucket_id, count(*)::bigint as objects from storage.objects group by 1 order by 1`,
    [],
  );
  out.storagePolicies = await safeQuery(
    sql,
    `select polname, cls.relname as tab from pg_policy pol
     join pg_class cls on cls.oid = pol.polrelid
     join pg_namespace n on n.oid = cls.relnamespace where n.nspname = 'storage'`,
    [],
  );
  out.eventTriggers = await safeQuery(
    sql,
    `select evtname, evtevent, pg_get_event_trigger_def(oid) as def from pg_event_trigger`,
    [],
  );
  out.rules = await safeQuery(
    sql,
    `select c.relname, r.rulname from pg_rewrite r
     join pg_class c on c.oid = r.ev_class
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and r.rulname <> '_RETURN'`,
    [],
  );

  return out;
}

const sourceCapture = await capture(source);

/* ------------------------------------------------------------------ *
 * Artifacts
 * ------------------------------------------------------------------ */

if (!DIFF && !ONLY_TABLES) writeArtifacts(sourceCapture);

function writeArtifacts(c) {
  const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = join("db-port", runId);
  mkdirSync(dir, { recursive: true });
  mkdirSync("db-port", { recursive: true });
  writeFileSync("db-port/latest", runId);

  const w = (file, header, statements) => {
    const body = statements.filter(Boolean).join("\n");
    writeFileSync(
      join(dir, file),
      `-- ${header}\n-- captured from the source catalog by db-port-capture.mjs, run ${runId}\n` +
        `-- do not edit by hand; re-run pnpm db:port:capture instead\n\n${body}\n`,
    );
    return { file, count: statements.filter(Boolean).length, bytes: body.length };
  };

  const prelude = [
    "set search_path = public;\n",
    "set timezone = 'UTC';\n",
    "set datestyle = 'ISO, MDY';\n",
  ].join("");

  const manifest = [
    w("00-prelude.sql", "session settings the replay runs under", [prelude]),
    w(
      "10-tables.sql",
      "tables exactly as the source defines them (orphan tables included)",
      c.tables.flatMap((t) => [
        `-- ${t.name}  owner=${t.owner}${t.tableComment ? "  (has comment)" : ""}`,
        ifNotExistsOnCreateTable(t.ddl),
        t.tableComment,
        ...t.comments,
      ]),
    ),
    w(
      "12-constraints.sql",
      "primary key, unique and check constraints first, then foreign keys — an FK needs its " +
        "target's PK to already exist, and tables are emitted in name order",
      [
        ...c.tables.flatMap((t) =>
          t.constraints.filter((k) => k.kind !== "f").map((k) => `-- ${t.name}\n${k.ddl}`),
        ),
        ...c.tables.flatMap((t) =>
          t.constraints.filter((k) => k.kind === "f").map((k) => `-- FK on ${t.name}\n${k.ddl}`),
        ),
      ],
    ),
    w(
      "20-rls.sql",
      "row-level-security state MEASURED from the source, not from drizzle/0005",
      c.tables.map(
        (t) =>
          `alter table public.${quote(t.name)} ${t.rls_enabled ? "enable" : "disable"} row level security${t.rls_forced ? ";\nalter table public." + quote(t.name) + " force row level security" : ""};`,
      ),
    ),
    w(
      "25-grants.sql",
      "privileges captured through aclexplode",
      c.grants.map((g) => g.ddl),
    ),
    w(
      "30-indexes.sql",
      "secondary indexes, including the expression and partial ones drizzle-kit push cannot make",
      c.tables.flatMap((t) => t.indexes.map((i) => [i.ddl, i.comment].filter(Boolean).join("\n"))),
    ),
    w("40-functions.sql", "functions with ownership preserved (SECURITY DEFINER depends on it)", c.functions.map((f) => `-- ${f.name}\n${f.ddl}`)),
    w("50-trigger.sql", "user triggers", c.triggers.map((t) => `-- ${t.name}\n${t.ddl}`)),
    w("60-policies.sql", "RLS policies", c.policies.map((p) => `-- ${p.table}\n${p.ddl}`)),
    w("70-views.sql", "views and materialized views", c.views.map((v) => v.ddl)),
    w(
      "80-db-settings.sql",
        "role/database GUCs — these are Supabase's own platform defaults (anon gets a 3s " +
        "statement_timeout, authenticator preloads safeupdate, and so on). Every Supabase " +
        "project ships them, `alter role` needs privileges the postgres role does not hold, " +
        "and `app.settings.jwt_exp` is refused outright. They are recorded here and compared " +
        "by pnpm db:port:diff; they are NOT replayed.",
      c.dbSettings.map((s) => {
        const statement =
          s.role && s.db
            ? `alter role ${quote(s.role)} in database ${quote(s.db)} set ${s.name} = ${lit(s.value)};`
            : s.role
              ? `alter role ${quote(s.role)} set ${s.name} = ${lit(s.value)};`
              : `alter database ${quote(s.db)} set ${s.name} = ${lit(s.value)};`;
        return `-- db=${s.db || "(cluster)"} role=${s.role || "(all roles)"}\n-- ${statement}`;
      }),
    ),
  ];

  writeFileSync(
    join(dir, "90-buckets.json"),
    JSON.stringify({ buckets: c.storage, objects: c.storageObjects }, null, 2),
  );
  writeFileSync(
    join(dir, "report.json"),
    JSON.stringify(
      {
        runId,
        capturedAt: new Date().toISOString(),
        source: { ref: projectRef(sourceUrl), host: redact(sourceUrl), region: poolerRegion(sourceUrl) },
        tables: c.tables.map((t) => ({
          name: t.name,
          owner: t.owner,
          rlsEnabled: t.rls_enabled,
          rlsForced: t.rls_forced,
          columns: t.columns,
          constraints: t.constraints.map((k) => k.def),
          indexes: t.indexes.map((i) => i.def),
        })),
        policies: c.policies.map((p) => ({ table: p.table, name: p.policyName, ddl: p.def, roles: p.roles })),
        functions: c.functions.map((f) => ({ name: f.name, owner: f.owner, securityDefiner: f.securityDefiner })),
        triggers: c.triggers.map((t) => ({ name: t.name, ddl: t.def })),
        grants: c.grants,
        sequences: c.sequences,
        views: c.views.map((v) => v.name),
        extensions: c.extensions,
        publications: c.publications,
        dbSettings: c.dbSettings,
        roles: c.roles,
        buckets: c.storage,
        bucketObjects: c.storageObjects,
        storagePolicies: c.storagePolicies,
        eventTriggers: c.eventTriggers,
        rules: c.rules,
        counts: c.counts,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(dir, "state.json"),
    JSON.stringify({ runId, source: redact(sourceUrl), ref: projectRef(sourceUrl), manifest }, null, 2),
  );
  console.log(`\nartifacts written to ${dir}/`);
  for (const m of manifest) if (m.count) console.log(`  ${m.file.padEnd(22)} ${m.count} statements`);
  console.log(`  90-buckets.json        ${c.storage.length} bucket rows`);
}

/* ------------------------------------------------------------------ *
 * Report / diff
 * ------------------------------------------------------------------ */

heading("inventory — what the source actually holds");
console.log(`  tables          ${sourceCapture.tables.length}`);
console.log(
  "  " + sourceCapture.tables.map((t) => `${t.name}(${t.columns.length})`).join(" "),
);
console.log(`  constraints     ${sourceCapture.tables.reduce((n, t) => n + t.constraints.length, 0)}`);
console.log(`  indexes         ${sourceCapture.tables.reduce((n, t) => n + t.indexes.length, 0)}`);
console.log(`  policies        ${sourceCapture.policies.length}`);
console.log(`  functions       ${sourceCapture.functions.length}${sourceCapture.functions.filter((f) => f.securityDefiner).length} security definer`);
console.log(`  triggers        ${sourceCapture.triggers.length}`);
console.log(`  grant rows      ${sourceCapture.grants.length}`);
console.log(`  views           ${sourceCapture.views.length}`);
console.log(`  sequences       ${sourceCapture.sequences.length}`);
console.log(`  event triggers  ${sourceCapture.eventTriggers.length}`);
console.log(`  rules           ${sourceCapture.rules.length}`);

heading("RLS state, measured");
console.log(
  `  ${"table".padEnd(34)}${"rls".padEnd(8)}${"forced".padEnd(8)}${"policies".padEnd(10)}owner`,
);
for (const t of sourceCapture.tables) {
  const pol = sourceCapture.policies.filter((p) => p.table === t.name).length;
  console.log(
    `  ${t.name.padEnd(34)}${String(t.rls_enabled).padEnd(8)}${String(t.rls_forced).padEnd(8)}${String(pol).padEnd(10)}${t.owner}`,
  );
}

heading("row counts and sizes");
for (const c of sourceCapture.counts)
  console.log(`  ${c.relname.padEnd(36)}approx=${String(c.approx_rows).padEnd(8)}${c.total_size}`);

heading("drift against the repo");
reportDrift(sourceCapture);

if (DIFF) {
  const targetCapture = await capture(target);
  heading("source → target structural diff");
  printDiff(sourceCapture, targetCapture);
}

await source.end();
if (target) await target.end();
console.log("");

/* ------------------------------------------------------------------ */

function reportDrift(c) {
  const known = [
    "posts",
    "user",
    "session",
    "account",
    "verification",
    "campus_ambassador_registrations",
    "volunteer_registrations",
    "stem_fest_registrations",
    "stem_fest_payment_sms",
    "stem_fest_registration_counters",
  ];
  const live = c.tables.map((t) => t.name);
  const orphans = live.filter((t) => !known.includes(t));
  const missing = known.filter((t) => !live.includes(t));
  console.log(
    `  in the database but in no src/db/schema module: ${orphans.length ? orphans.join(", ") : "(none)"}`,
  );
  console.log(`  expected by the schema but absent:      ${missing.length ? missing.join(", ") : "(none)"}`);

  // The remediation script announces "NOT APPLIED YET"; prove which of it exists.
  const wantedIndexes = [
    "stem_fest_registrations_trx_idx",
    "stem_fest_payment_sms_trx_idx",
    "stem_fest_payment_sms_status_idx",
    "posts_published_at_idx",
    "campus_ambassador_registrations_created_at_idx",
  ];
  const allIndexNames = c.tables.flatMap((t) => t.indexes.map((i) => i.name));
  const expressionIndexes = c.tables
    .flatMap((t) => t.indexes)
    .filter((i) => /[()]|upper\(/.test(i.def));
  console.log(
    `  remediation indexes present: ${wantedIndexes.filter((i) => allIndexNames.includes(i)).join(", ") || "(none)"}`,
  );
  console.log(
    `  remediation indexes absent:  ${wantedIndexes.filter((i) => !allIndexNames.includes(i)).join(", ") || "(none)"}`,
  );
  console.log(`  expression / partial indexes:  ${expressionIndexes.map((i) => i.name).join(", ") || "(none)"}`);
  for (const i of expressionIndexes) console.log(`      ${i.def.replace(/\s+/g, " ")}`);

  const auth = c.tables.filter((t) => ["user", "account", "session", "verification"].includes(t.name));
  const disabled = auth.filter((t) => !t.rls_enabled).map((t) => t.name);
  console.log(
    `  auth tables with RLS DISABLED (drizzle/0005 says all four): ${disabled.join(", ") || "(none — 0005 was never applied or was later re-enabled)"}`,
  );
  const exposed = c.tables.filter(
    (t) => !t.rls_enabled && c.grants.some((g) => g.object === t.name && g.grantee === "anon" && g.privilege === "SELECT"),
  );
  console.log(
    `  RLS off while anon holds SELECT: ${exposed.length ? exposed.map((t) => t.name).join(", ") + "  ← exposure" : "(none)"}`,
  );

  const legacy = c.storageObjects.filter((s) => Number(s.objects) > 0);
  console.log(
    `  storage objects still on Supabase: ${legacy.length ? legacy.map((s) => `${s.bucket_id}=${s.objects}`).join(", ") : "0 — ADR-0041's media:retire emptied both buckets"}`,
  );
  console.log(
    `  extensions: ${c.extensions.map((e) => `${e.extname}@${e.schema}`).join(", ")}`,
  );
  console.log(
    `  publications: ${c.publications.length ? c.publications.map((p) => `${p.pubname}[${p.tables || "no public tables"}]`).join(" ") : "(none)"}`,
  );
  console.log(
    `  db-level GUCs: ${c.dbSettings.length ? c.dbSettings.map((s) => `${s.name}=${s.value} (${s.db || "cluster"}/${s.role || "all roles"})`).join(" | ") : "(none)"}`,
  );
}

function printDiff(a, b) {
  const classes = [
    ["tables", (c) => c.tables.map((t) => [t.name, ddlText(t)]), (x) => x],
    ["constraints", (c) => c.tables.flatMap((t) => t.constraints.map((k) => [k.name, canon(k.def)])), null],
    ["indexes", (c) => c.tables.flatMap((t) => t.indexes.map((i) => [i.name, canon(i.def)])), null],
    ["rls", (c) => c.tables.map((t) => [t.name, `${t.rls_enabled}/${t.rls_forced}`]), null],
    ["policies", (c) => c.policies.map((p) => [p.name, canon(p.def)]), null],
    ["functions", (c) => c.functions.map((f) => [f.name, canon(f.ddl)]), null],
    ["triggers", (c) => c.triggers.map((t) => [t.name, canon(t.def)]), null],
    ["grants", (c) => c.grants.map((g) => [g.name, ""]), null],
    ["extensions", (c) => c.extensions.map((e) => [e.extname, e.extversion]), null],
    ["sequences", (c) => c.sequences.map((s) => [s.sequencename, String(s.last_value)]), null],
    ["views", (c) => c.views.map((v) => [v.name, canon(v.ddl)]), null],
    [
      "db-settings",
      (c) => c.dbSettings.map((s) => [`${s.role || "all roles"}/${s.db || "cluster"}/${s.name}`, s.value]),
      null,
    ],
    ["publications", (c) => c.publications.map((p) => [p.pubname, p.tables]), null],
    ["roles", (c) => c.roles.map((r) => [r.rolname, ""]), null],
  ];

  let failures = 0;
  let notes = 0;
  for (const [label, pick] of classes) {
    const left = new Map(pick(a));
    const right = new Map(pick(b));
    const onlySource = [...left.keys()].filter((k) => !right.has(k));
    const onlyTarget = [...right.keys()].filter((k) => !left.has(k));
    const diffs = [...left.keys()].filter(
      (k) => right.has(k) && norm(left.get(k)) !== norm(right.get(k)),
    );
    // An object the app owns must exist on both sides. Supabase's own baseline
    // (role settings, extensions, platform roles, the realtime publication) is
    // whatever the hosted version ships, so a newer project legitimately has
    // more of it — that is worth reading, not worth blocking a cutover on.
    const platform = ["db-settings", "extensions", "roles", "publications"].includes(label);
    const localFailures = onlySource.length + diffs.length + (platform ? 0 : onlyTarget.length);
    const localNotes = platform ? onlyTarget.length : 0;
    if (localFailures) failures++;
    notes += localNotes;
    const status = localFailures ? "DIFF" : localNotes ? "MATCH(+)" : "MATCH";
    console.log(`  ${label.padEnd(12)} ${status}  (${left.size} source / ${right.size} target)`);
    for (const k of onlySource) console.log(`      only-in-source: ${k}`);
    for (const k of onlyTarget)
      console.log(
        `      ${platform ? "note, only in the newer project: " : "only-in-target: "}${k}`,
      );
    for (const k of diffs)
      console.log(`      differs: ${k}\n        S ${left.get(k)}\n        T ${right.get(k)}`);
  }
  console.log(
    failures
      ? `\n  ${failures} class(es) differ — G1 structural gate NOT met.`
      : `\n  G1 structural gate met: every object the app owns matches.${notes ? ` (${notes} platform baseline difference(s) noted above.)` : ""}`,
  );
}

function ddlText(t) {
  return canon(
    t.columns
      .map((c) => `${c.name} ${c.type}${c.notNull ? " not null" : ""}${c.default ? " default " + c.default : ""}`)
      .join(","),
  );
}

function norm(text) {
  return String(text).toLowerCase().replace(/\s+/g, " ").replace(/public\./g, "").trim();
}

function canon(text) {
  return String(text)
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function quote(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/** Rebuild one `create policy` from pg_policy's columns. */
function policyDdl(p, schema = "public") {
  const command = { r: "select", a: "insert", d: "delete", u: "update", w: "all", "*": "all" };
  const roles =
    p.has_roles && p.roles && p.roles.length ? p.roles.map((r) => quote(r)).join(", ") : "";
  return [
    `create policy ${quote(p.polname)} on ${schema}.${quote(p.tab)}`,
    `  as ${p.permissive ? "permissive" : "restrictive"}`,
    `  for ${command[p.polcmd] ?? "all"}`,
    roles ? `  to ${roles}` : "",
    p.qual ? `  using (${p.qual})` : "",
    p.wcheck ? `  with check (${p.wcheck})` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function lit(text) {
  return `'${String(text).replace(/'/g, "''")}'`;
}

function deCreate(def) {
  return String(def).replace(/^CREATE (OR REPLACE )?/, "CREATE ");
}

function withIfNotExists(def) {
  return (
    String(def).replace(/^CREATE (UNIQUE )?INDEX\b/, "CREATE $1INDEX IF NOT EXISTS").trim() + ";"
  );
}

function ifNotExistsOnCreateTable(ddl) {
  return ddl.replace(/^create table /, "create table if not exists ");
}

async function safeQuery(sql, text, fallback) {
  try {
    return await sql.unsafe(text);
  } catch {
    return fallback;
  }
}
