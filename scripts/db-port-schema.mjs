/**
 * Replay the captured DDL into the target Supabase project.
 *
 * The artifacts come from `pnpm db:port:capture`, i.e. from the source catalog —
 * never from `drizzle/*.sql`, and never from `drizzle-kit push`. Push is the
 * documented `db:migrate` in package.json and it cannot express the registration
 * trigger, the four functions, the eleven policies or the expression index; ADR-0027
 * records a push nearly destroying `stem_fest_payment_sms_trx_idx`. Building the
 * new project with it would produce a schema that quietly differs from production.
 *
 * Usage
 *   pnpm db:port:schema:check   replay everything, then ROLL BACK — proves the DDL
 *                               is valid without persisting a single object
 *   pnpm db:port:schema:dry     print the statements, connect to nothing but identity
 *   pnpm db:port:schema         apply for real
 *   pnpm db:port:schema --reset drop what a previous run made, then apply again
 *
 * Refuses to run against a target that already holds tables, so a mistyped
 * password cannot turn this into "wipe the production schema".
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  loadPortEnv,
  openPool,
  describePool,
  assertEndpoints,
  endpointEnv,
  projectRef,
  redact,
  heading,
  fail,
  has,
  flag,
  splitStatements,
  pinSession,
} from "./db-port-lib.mjs";

const env = loadPortEnv();
const { targetUrl, sourceRef, targetRef, liveRef } = endpointEnv(env);

assertEndpoints({
  sourceRef,
  targetRef,
  liveRef,
  allowLive: has("allow-live"),
});

const DRY = has("dry-run");
const CHECK = has("check");
const RESET = has("reset");

/** Replay order — constraints after tables, policies after RLS, trigger after its functions. */
const ORDER = [
  "10-tables.sql",
  "12-constraints.sql",
  "20-rls.sql",
  "25-grants.sql",
  "30-indexes.sql",
  "40-functions.sql",
  "50-trigger.sql",
  "60-policies.sql",
  "70-views.sql",
];
/** Role/database settings cannot run inside a transaction block. */
const POST = ["80-db-settings.sql"];

const runId = flag("run") || readFileSync(join("db-port", "latest"), "utf8").trim();
const dir = join("db-port", runId);
if (!existsSync(dir)) fail(`no artifacts in ${dir} — run pnpm db:port:capture first`);

const target = openPool(targetUrl);
await pinSession(target, targetUrl);

heading("target");
const identity = await describePool(target, "target", targetUrl);
if (projectRef(targetUrl) !== env.PORT_TARGET_REF)
  fail("the DSN in PORT_TARGET_DB does not resolve to PORT_TARGET_REF");

if (identity.role !== "postgres")
  console.log(
    `  ! connecting as ${identity.role}; the source objects are owned by postgres and\n` +
      `    SECURITY DEFINER functions run as their owner, so privileges may differ.`,
  );

const existing = await target`
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p','f','v') order by 1`;
if (existing.length && !RESET && !CHECK)
  fail(
    `target public schema is not empty (${existing.map((r) => r.relname).join(", ")}).\n` +
      `  A half-finished run? pnpm db:port:schema --reset\n` +
      `  A populated project? stop — this script would be pointed at the wrong place.`,
  );

if (RESET) await resetTarget(existing);

heading(CHECK ? "rehearsal — apply then roll back" : DRY ? "dry run — nothing executed" : "applying");

/** Sentinel that forces `sql.begin` to roll back a successful rehearsal. */
const ABORT = Symbol("rehearsal-rollback");

let executed = 0;
let report = null;

function statementsIn(file) {
  const path = join(dir, file);
  if (!existsSync(path)) return [];
  return splitStatements(readFileSync(path, "utf8")).filter(
    (s) => !/^set\s/i.test(s.text) && s.text !== ";",
  );
}

/**
 * One transaction for the whole object set. Nothing here uses `create index
 * concurrently`, so DDL is transactional, and an all-or-nothing apply means a
 * mid-file failure cannot leave the target half-built and ambiguous.
 */
async function applyAll(conn) {
  for (const file of ORDER) {
    const statements = statementsIn(file);
    if (!statements.length) continue;
    console.log(`  ${file.padEnd(22)} ${statements.length} statements`);
    for (const statement of statements) {
      if (DRY) {
        console.log(`      · ${oneLine(statement.text)}`);
        executed++;
        continue;
      }
      try {
        await conn.unsafe(statement.text);
        executed++;
        process.stdout.write(".");
      } catch (error) {
        report = { file, statement, error };
        throw error;
      }
    }
    if (!DRY) console.log("");
  }
}

if (DRY) {
  await applyAll(target);
} else if (CHECK) {
  try {
    await target.begin(async (tx) => {
      await applyAll(tx);
      throw ABORT;
    });
  } catch (error) {
    if (error !== ABORT && !report) report = { error };
  }
  const stillEmpty = await target`
    select count(*)::int as n from pg_class c
    join pg_namespace n2 on n2.oid = c.relnamespace
    where n2.nspname = 'public' and c.relkind in ('r','p','f','v')`;
  console.log(
    report
      ? `\n  rehearsal FAILED at ${report.file ?? "?"}:${report.statement?.line ?? "?"} — ` +
          `${report.error?.message}\n      ${oneLine(report.statement?.text ?? "")}`
      : `\n  rehearsal clean: ${executed} statements validated, then rolled back.`,
  );
  console.log(
    `  public schema now holds ${stillEmpty[0].n} relation(s) ` +
      `${stillEmpty[0].n === 0 ? "— rollback confirmed." : "— ROLLBACK DID NOT HAPPEN, investigate before applying."}`,
  );
} else {
  try {
    await target.begin((tx) => applyAll(tx));
  } catch {
    /* reported below */
  }
  if (report) {
    console.log(
      `\n  ✗ ${report.file}:${report.statement.line} — nothing was persisted (transaction rolled back)\n` +
        `      ${report.error.message}\n      ${oneLine(report.statement.text)}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`\n  applied ${executed} statements.`);
    // Role/database settings are not transactional and may belong to Supabase
    // itself; run them afterwards and tolerate a refusal.
    for (const file of POST) {
      for (const statement of statementsIn(file)) {
        try {
          await target.unsafe(statement.text);
          console.log(`  ✓ ${oneLine(statement.text)}`);
        } catch (error) {
          console.log(`  · skipped ${oneLine(statement.text)} — ${error.message.slice(0, 70)}`);
        }
      }
    }
    const after = await target`
      select
        (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public' and c.relkind in ('r','p'))          as tables,
        (select count(*) from pg_index i join pg_class c on c.oid=i.indrelid
          join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public' and not i.indisprimary)              as indexes,
        (select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid
          join pg_namespace n on n.oid=c.relnamespace where n.nspname='public') as policies,
        (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public')                                     as functions,
        (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
          join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public' and not t.tgisinternal)              as triggers`;
    console.log(
      `  target now holds: ${after[0].tables} tables, ${after[0].indexes} indexes, ` +
        `${after[0].policies} policies, ${after[0].functions} functions, ${after[0].triggers} triggers`,
    );
    console.log("\n  next: pnpm db:port:diff  (G1 must be all-MATCH before any data is copied)");
  }
}

await target.end();

async function resetTarget(rows) {
  console.log(`\n  --reset: dropping ${rows.length} relation(s) from the target`);
  const trigs = await target`
    select tg.tgname, cls.relname as tab from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace n on n.oid = cls.relnamespace
    where n.nspname = 'public' and not tg.tgisinternal`;
  for (const t of trigs)
    await target.unsafe(`drop trigger if exists "${t.tgname}" on public."${t.tab}"`);
  const fns = await target`
    select p.oid, pg_get_function_identity_arguments(p.oid) as args, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`;
  for (const f of fns) await target.unsafe(`drop function if exists public."${f.proname}"(${f.args})`);
  for (const r of rows) await target.unsafe(`drop table if exists public."${r.relname}" cascade`);
  console.log("  dropped.");
}

function oneLine(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 96 ? `${flat.slice(0, 96)}…` : flat;
}
