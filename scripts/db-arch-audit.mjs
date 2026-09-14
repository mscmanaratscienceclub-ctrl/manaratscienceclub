/**
 * Supabase architecture audit — **read-only**, no DDL, no writes.
 *
 * Run with:  node --env-file=.env scripts/db-arch-audit.mjs
 *
 * Answers the questions a review of `src/db`, `drizzle/` and `src/lib/supabase*`
 * raises but cannot settle from the repo alone, because they depend on what is
 * actually in the hosted project:
 *
 *   1. Every `public` table: is RLS on, is it forced, which policies exist, and
 *      do `anon`/`authenticated` hold privileges (i.e. is the Data API surface
 *      open)?
 *   2. Foreign keys with no supporting index (Postgres does not create them).
 *   3. Indexes that exist but have never been scanned, and indexes the Drizzle
 *      schema declares that differ from what is deployed.
 *   4. Storage buckets: public flag, size/mime limits, and `storage.objects`
 *      policies.
 *   5. Installed extensions, table sizes and dead-tuple pressure.
 *
 * Prints no secrets — only the hostname/port of the connection it used.
 */
import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error("Set DATABASE_URL or DIRECT_URL (e.g. node --env-file=.env ...)");
  process.exit(1);
}

function redact(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.hostname}:${parsed.port}${parsed.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

/** Tables the app owns and mirrors in `src/db/schema`. */
const APP_TABLES = [
  "posts",
  "user",
  "session",
  "account",
  "verification",
  "campus_ambassador_registrations",
  "volunteer_registrations",
  "stem_fest_registrations",
  "stem_fest_payment_sms",
];

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});

function heading(text) {
  console.log(`\n${"─".repeat(78)}\n${text}\n${"─".repeat(78)}`);
}

function pad(value, width) {
  const text = String(value ?? "-");
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

async function connectionIdentity() {
  heading("1. Connection");
  console.log(`  target: ${redact(url)}`);
  const [row] = await sql`
    select current_user,
           current_database(),
           current_setting('search_path') as search_path,
           (select setting from pg_settings where name = 'max_connections') as max_connections,
           (select count(*) from pg_stat_activity)::int as sessions,
           version() as version
  `;
  console.log(`  role=${row.current_user}  db=${row.current_database}`);
  console.log(`  search_path=${row.search_path}`);
  console.log(`  max_connections=${row.max_connections}  sessions=${row.sessions}`);
  console.log(`  ${row.version.split(",")[0]}`);
}

async function tableInventory() {
  heading("2. public tables — RLS, policies, Data API grants");
  const rows = await sql`
    select c.relname                              as table_name,
           c.relrowsecurity                       as rls_enabled,
           c.relforcerowsecurity                  as rls_forced,
           pg_get_userbyid(c.relowner)            as owner,
           (select count(*) from pg_policies p
             where p.schemaname = 'public' and p.tablename = c.relname)::int as policy_count,
           coalesce(array_to_string(
             array(select p.policyname || ' [' || p.cmd || ' -> '
                     || coalesce(array_to_string(p.roles, ','), 'public') || ']'
                   from pg_policies p
                   where p.schemaname = 'public' and p.tablename = c.relname
                   order by p.policyname), E'\\n                    '), '-') as policies,
           has_table_privilege('anon', c.oid, 'SELECT')          as anon_select,
           has_table_privilege('authenticated', c.oid, 'SELECT') as auth_select,
           has_table_privilege('service_role', c.oid, 'SELECT')  as svc_select,
           coalesce(s.n_live_tup, 0)::bigint     as live_rows
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `;

  console.log(
    `  ${pad("table", 38)}${pad("rls", 5)}${pad("forced", 8)}${pad("pol", 5)}${pad("anon", 6)}${pad("auth", 6)}${pad("rows", 8)}mirrored`,
  );
  console.log(`  ${"-".repeat(102)}`);

  for (const r of rows) {
    const mirrored = APP_TABLES.includes(r.table_name) ? "yes" : "NO — not in src/db/schema";
    console.log(
      `  ${pad(r.table_name, 38)}${pad(r.rls_enabled, 5)}${pad(r.rls_forced, 8)}${pad(r.policy_count, 5)}` +
        `${pad(r.anon_select, 6)}${pad(r.auth_select, 6)}${pad(r.live_rows, 8)}${mirrored}`,
    );
    if (r.policy_count > 0) {
      console.log(`      policies: ${r.policies}`);
    }
  }

  const unmapped = rows.filter((r) => !APP_TABLES.includes(r.table_name));
  if (unmapped.length > 0) {
    console.log(`\n  ⚠ ${unmapped.length} table(s) exist in public but not in the Drizzle schema:`);
    for (const r of unmapped) {
      const reachable = r.anon_select || r.auth_select;
      console.log(
        `      ${r.table_name}: rls=${r.rls_enabled} policies=${r.policy_count}` +
          `${reachable ? "  ⚠ REACHABLE by anon/authenticated" : ""}`,
      );
    }
  }
}

async function policyDetail() {
  heading("3. Policy definitions (public)");
  const rows = await sql`
    select tablename, policyname, cmd, permissive,
           coalesce(array_to_string(roles, ','), 'public') as roles,
           coalesce(qual, '-')       as using_expression,
           coalesce(with_check, '-') as check_expression
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `;
  if (rows.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const r of rows) {
    console.log(`  ${r.tablename} :: "${r.policyname}" [${r.cmd}/${r.permissive}] to ${r.roles}`);
    console.log(`      using: ${r.using_expression}`);
    if (r.check_expression !== "-") console.log(`      check: ${r.check_expression}`);
  }
}

async function foreignKeyIndexes() {
  heading("4. Foreign keys without a supporting index");
  const rows = await sql`
    select con.conrelid::regclass::text as table_name,
           con.conname                   as constraint_name,
           pg_get_constraintdef(con.oid) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where con.contype = 'f'
      and n.nspname = 'public'
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = con.conrelid
          and (i.indkey::smallint[])[0:coalesce(array_length(con.conkey, 1), 1) - 1] = con.conkey
      )
    order by 1, 2
  `;
  if (rows.length === 0) {
    console.log("  none — every FK is covered by a leading-column index");
    return;
  }
  for (const r of rows) {
    console.log(`  ${r.table_name} :: ${r.constraint_name}  (no leading-column index)`);
    console.log(`      ${r.definition}`);
  }
}

async function indexInventory() {
  heading("5. Indexes — definition, scans, size");
  const rows = await sql`
    select t.relname                            as table_name,
           ic.relname                           as index_name,
           i.indisunique                        as is_unique,
           pg_get_indexdef(i.indexrelid)        as definition,
           coalesce(s.idx_scan, 0)::bigint      as idx_scan,
           pg_size_pretty(pg_relation_size(i.indexrelid)) as size
    from pg_index i
    join pg_class t  on t.oid = i.indrelid
    join pg_class ic on ic.oid = i.indexrelid
    join pg_namespace n on n.oid = t.relnamespace
    left join pg_stat_user_indexes s on s.indexrelid = i.indexrelid
    where n.nspname = 'public'
    order by t.relname, ic.relname
  `;
  for (const r of rows) {
    const flag = Number(r.idx_scan) === 0 ? "  <-- never scanned" : "";
    console.log(
      `  ${r.table_name}.${r.index_name}${r.is_unique ? " [unique]" : ""} — ${r.size}, scans=${r.idx_scan}${flag}`,
    );
    console.log(`      ${r.definition}`);
  }
}
async function storageAudit() {
  heading("6. Storage buckets & policies");
  const buckets = await sql`
    select id, name, public, file_size_limit, allowed_mime_types
    from storage.buckets
    order by name
  `;
  for (const b of buckets) {
    console.log(
      `  ${b.name} (id=${b.id})  public=${b.public}  size_limit=${b.file_size_limit ?? "unset"}  mime=${b.allowed_mime_types ? JSON.stringify(b.allowed_mime_types) : "unset"}`,
    );
  }

  console.log("\n  storage.objects policies:");
  const policies = await sql`
    select policyname, cmd, coalesce(array_to_string(roles, ','), 'public') as roles,
           coalesce(qual, '-') as using_expression
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    order by policyname
  `;
  if (policies.length === 0) {
    console.log("    (none — anon/authenticated cannot touch objects directly)");
  }
  for (const p of policies) {
    console.log(`    "${p.policyname}" [${p.cmd}] to ${p.roles}`);
    console.log(`        using: ${p.using_expression}`);
  }

  const [obj] = await sql`
    select count(*)::int as object_count,
           coalesce(sum((metadata->>'size')::bigint), 0)::bigint as total_bytes
    from storage.objects
  `;
  console.log(
    `\n  objects: ${obj.object_count}  total: ${(Number(obj.total_bytes) / 1024 / 1024).toFixed(1)} MB`,
  );
}


async function extensionsAndHealth() {
  heading("7. Extensions, table sizes, dead tuples");
  const ext = await sql`
    select extname, extversion from pg_extension order by extname
  `;
  console.log("  extensions:");
  for (const e of ext) console.log(`    ${e.extname} ${e.extversion}`);

  const sizes = await sql`
    select c.relname as table_name,
           pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
           pg_size_pretty(pg_relation_size(c.oid))       as table_size,
           pg_size_pretty(
             pg_total_relation_size(c.oid) - pg_relation_size(c.oid)
           ) as index_size,
           coalesce(s.n_dead_tup, 0)::bigint as dead_tuples,
           coalesce(s.last_autovacuum::text, 'never')   as last_autovacuum
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public' and c.relkind = 'r'
    order by pg_total_relation_size(c.oid) desc
  `;
  console.log("\n  tables:");
  for (const s of sizes) {
    console.log(
      `    ${pad(s.table_name, 38)} total=${pad(s.total_size, 10)} table=${pad(s.table_size, 10)} idx=${pad(s.index_size, 10)} dead=${s.dead_tuples} autovac=${s.last_autovacuum}`,
    );
  }
}

/**
 * Plans for the queries the app actually issues, so an index gap shows up as a
 * `Seq Scan` instead of an opinion. Each entry is a **thunk** on purpose:
 * building the promises up front would fire every EXPLAIN at the same instant,
 * which pipelines them onto one pooled connection — the exact Supavisor wedge
 * documented in `src/db/index.ts`. `EXPLAIN` without `ANALYZE` executes nothing.
 */
async function queryPlans() {
  heading("8. Plans for the hot queries (EXPLAIN only — no writes)");

  const plans = [
    [
      "SMS webhook: TrxID -> registration (src/app/api/webhooks/sms/route.ts)",
      () => sql`explain (costs off) select id from stem_fest_registrations where upper(transaction_id) = 'TEST123'`,
    ],
    [
      "Admin SMS list: newest-first by received_at (getSmsLogs)",
      () => sql`explain (costs off) select id from stem_fest_payment_sms order by received_at desc limit 25`,
    ],
    [
      "Public blog listing (getPublishedPosts)",
      () => sql`explain (costs off) select id from posts where status = 'published' order by published_at desc limit 10`,
    ],
    [
      "CMS post listing (getAllPostsCms)",
      () => sql`explain (costs off) select id from posts order by updated_at desc limit 20`,
    ],
    [
      "CMS writer's own posts (author_id filter)",
      () => sql`explain (costs off) select id from posts where author_id = 'x'`,
    ],
    [
      "better-auth: session rows for a user",
      () => sql`explain (costs off) select id from session where "userId" = 'x'`,
    ],
    [
      "Admin ambassador list (newest-first)",
      () => sql`explain (costs off) select id from campus_ambassador_registrations order by created_at desc limit 25`,
    ],
  ];

  for (const [label, query] of plans) {
    console.log(`\n  ${label}`);
    try {
      const rows = await query();
      for (const row of rows) console.log(`      ${row["QUERY PLAN"]}`);
    } catch (error) {
      console.log(`      [FAILED] ${error.message}`);
    }
  }
}

try {
  await connectionIdentity();
  await tableInventory();
  await policyDetail();
  await foreignKeyIndexes();
  await indexInventory();
  await storageAudit();
  await extensionsAndHealth();
  await queryPlans();
  console.log("\naudit complete");
} catch (error) {
  console.error(`\n[AUDIT FAILED] code=${error.code ?? "-"} ${error.message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

