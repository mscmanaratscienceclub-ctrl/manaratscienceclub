/**
 * Copy rows from the source project into the target, and keep them in step.
 *
 * One algorithm serves three purposes, which is the point:
 *   pnpm db:port:data            bulk copy (source → target)
 *   pnpm db:port:delta           the final delta before cutover — one more full
 *                                reconcile carries inserts AND updates made while
 *                                the bulk copy ran, with no watermark. A watermark
 *                                could not work: `stem_fest_registrations` has no
 *                                updated_at column, so an admin's payment_decision
 *                                change during the window would be invisible to it.
 *   pnpm db:port:data --reverse  the rollback direction (target → source)
 *
 * Values never pass through JavaScript's type parsers. Each column is read as
 * `col::text` and re-enters through `$n::<type the catalog reports>`, so
 * numeric(10,2) does not become 3.1, text[] round-trips through Postgres' own
 * array I/O, and better-auth's `timestamp without time zone` is not shifted by a
 * session offset the way a JS Date would shift it.
 *
 * The registration-code trigger stays enabled during the load: it no-ops when
 * registration_code is already present, so every copied row keeps the ID its
 * participant was told, and the bulk insert exercises the same path a real
 * registration takes after cutover (ADR-0031).
 */
import { writeFileSync, readFileSync } from "node:fs";
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
  pinSession,
} from "./db-port-lib.mjs";

const env = loadPortEnv();

/**
 * better-auth's session cookie is an HMAC signed with BETTER_AUTH_SECRET, and this
 * cutover rotates that secret — so browsers are signed out whether or not the rows
 * travel. Copying them would carry live bearer tokens (including any `impersonatedBy`
 * privileged session) and short-lived OTP values for no benefit.
 */
const NOT_PORTED = new Set(["session", "verification"]);

const REVERSE = has("reverse");
const ANALYZE = has("analyze");
const DRY = has("dry-run");
const ONLY = flag("tables");
/** Rows per statement — the server's parameter ceiling is 65535, so keep well under it. */
const CHUNK = Number(flag("chunk") ?? 50);

const { sourceUrl: forwardSource, targetUrl: forwardTarget } = endpointEnv(env);

const fromUrl = REVERSE ? forwardTarget : forwardSource;
const toUrl = REVERSE ? forwardSource : forwardTarget;

const runDir = join("db-port", flag("run") || readFileSync(join("db-port", "latest"), "utf8").trim());

assertEndpoints({
  sourceRef: projectRef(fromUrl),
  targetRef: projectRef(toUrl),
  liveRef: REVERSE ? projectRef(forwardSource) : "",
  allowLive: REVERSE && has("allow-live"),
});

if (REVERSE && !has("yes"))
  fail("--reverse writes to the LIVE project. Add --yes only once rollback is the decision.");

const from = openPool(fromUrl);
const to = openPool(toUrl);
await pinSession(from, fromUrl);
await pinSession(to, toUrl);

heading(REVERSE ? "ROLLBACK direction — target → source" : "forward — source → target");
await describePool(from, "from", fromUrl);
await describePool(to, "to", toUrl);

/* ------------------------------------------------------------------ *
 * What to copy, in what order
 * ------------------------------------------------------------------ */

const tableRows = await from`
  select c.oid, c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname`;

const wanted = ONLY
  ? ONLY.split(",").map((s) => s.trim())
  : tableRows.map((t) => t.relname).filter((n) => !NOT_PORTED.has(n));

if (ONLY) {
  const unknown = wanted.filter((w) => !tableRows.some((t) => t.relname === w));
  if (unknown.length) fail(`--tables names table(s) the source does not have: ${unknown.join(", ")}`);
}

const shapes = new Map();
for (const t of tableRows.filter((r) => wanted.includes(r.relname))) {
  const columns = await from`
    select a.attname,
           format_type(a.atttypid, a.atttypmod) as type,
           a.attgenerated,
           exists (select 1 from pg_constraint k
                    where k.conrelid = a.attrelid
                      and a.attnum = any(k.conkey)
                      and k.contype = 'p') as is_pk
    from pg_attribute a
    where a.attrelid = ${t.oid} and a.attnum > 0 and not a.attisdropped
    order by a.attnum`;
  const edges = await from`
    select confrelid::regclass::text as referenced
    from pg_constraint
    where conrelid = ${t.oid} and contype = 'f'`;
  shapes.set(t.relname, {
    name: t.relname,
    columns: columns.filter((c) => c.attgenerated === ""),
    pk: columns.filter((c) => c.is_pk).map((c) => c.attname),
    dependsOn: edges.map((e) => e.referenced.replace(/^public\./, "").replace(/"/g, "")),
  });
}

const order = topoSort([...shapes.values()]);
console.log(`\n  copy order: ${order.join(" → ")}`);
if (!ONLY)
  console.log(`  not ported: ${[...NOT_PORTED].join(", ")} (see the header note)`);

/* ------------------------------------------------------------------ *
 * Copy
 * ------------------------------------------------------------------ */

const summary = [];
for (const name of order) {
  const result = await copyTable(shapes.get(name));
  summary.push(result);
  if (result.skipped) continue;
  console.log(
    `  ${name.padEnd(34)} source=${String(result.sourceRows).padStart(5)} ` +
      `inserted=${String(result.inserted).padStart(5)} updated=${String(result.updated).padStart(5)} ` +
      `deleted=${String(result.deleted).padStart(4)}`,
  );
}

const totals = summary.reduce(
  (acc, s) => ({
    sourceRows: acc.sourceRows + Math.max(s.sourceRows, 0),
    written: acc.written + s.inserted + s.updated,
    removed: acc.removed + s.deleted,
  }),
  { sourceRows: 0, written: 0, removed: 0 },
);
console.log(
  `\n  totals  source=${totals.sourceRows} rows, written=${totals.written}, removed=${totals.removed}`,
);
if (!DRY && totals.written === 0 && totals.removed === 0 && totals.sourceRows > 0)
  console.log("  (nothing changed — the two projects already agree row-for-row)");

if (ANALYZE && !DRY) {
  heading("analyze");
  for (const name of order) await to.unsafe(`analyze public."${name}"`);
  console.log(
    `  analyzed ${order.length} tables. The 2026-09-13 audit found last_autovacuum = never\n` +
      "  on every one of them, so without this the first post-cutover queries plan against\n" +
      "  empty statistics.",
  );
}

writeFileSync(
  join(runDir, `data${REVERSE ? "-reverse" : ""}.json`),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      direction: REVERSE ? "reverse" : "forward",
      from: redact(fromUrl),
      to: redact(toUrl),
      dryRun: DRY,
      summary,
    },
    null,
    2,
  ),
);

await from.end();
await to.end();

/* ------------------------------------------------------------------ */

async function copyTable(shape) {
  const cols = shape.columns;

  if (!shape.pk.length) {
    console.log(
      `  ! ${shape.name} has no primary key — SKIPPED. Both the upsert and the delete ` +
        `sweep need one; appending blind would duplicate rows on every re-run.`,
    );
    return { table: shape.name, sourceRows: 0, inserted: 0, updated: 0, deleted: 0, skipped: true };
  }

  const rows = await from.unsafe(
    `select ${cols.map((c) => `${q(c.attname)}::text`).join(", ")} ` +
      `from public.${q(shape.name)} order by ${shape.pk.map((p) => q(p)).join(", ")}`,
  );

  const pkKey = (row) => shape.pk.map((p) => row[p] ?? "\0").join("\u001f");
  const sourceKeys = new Set(rows.map(pkKey));

  const targetKeys = new Set();
  if (!DRY) {
    const existing = await to.unsafe(
      `select ${shape.pk.map((p) => q(p)).join(", ")} from public.${q(shape.name)}`,
    );
    for (const row of existing) targetKeys.add(pkKey(row));
  }

  const insertColumns = cols.map((c) => q(c.attname)).join(", ");
  const updateSet = cols
    .filter((c) => !shape.pk.includes(c.attname))
    .map((c) => `${q(c.attname)} = excluded.${q(c.attname)}`)
    .join(", ");
  const conflict = `on conflict (${shape.pk.map((p) => q(p)).join(", ")}) do update set ${updateSet}`;
  // No explicit cast: in an INSERT the server infers each parameter's type from
  // the target column and runs that type's own input function over the text we
  // send. That is byte-faithful (numeric keeps its scale, text[] is parsed by
  // array_in, `timestamp without time zone` is never shifted by a JS Date) and
  // avoids the spelling problem in `format_type`'s multi-word type names.
  //
  // Numbering is row-major and must continue across tuples: reusing one
  // `($1…$15)` string for every row leaves $16 onward unreferenced, and the
  // server answers "could not determine data type of parameter $16".
  const tupleFor = (row) =>
    `(${cols.map((_, i) => `$${row * cols.length + i + 1}`).join(", ")})`;

  let inserted = 0;
  let updated = 0;

  for (const chunk of rows.length ? chunks(rows, CHUNK) : []) {
    if (DRY) continue;
    const params = chunk.flatMap((row) => cols.map((c) => row[c.attname] ?? null));
    const statement =
      `insert into public.${q(shape.name)} (${insertColumns}) values ` +
      `${chunk.map((_, r) => tupleFor(r)).join(",")} ${conflict} returning (xmax = 0) as was_new`;
    try {
      // xmax = 0 on a returned row means that row was created, not overwritten.
      const result = await to.unsafe(statement, params);
      for (const r of result) r.was_new ? inserted++ : updated++;
    } catch (error) {
      fail(
        `${shape.name}: ${error.message}\n` +
          `  rows=${chunk.length} params=${params.length} columns=${cols.length}\n` +
          `  ${statement.slice(0, 240)}…`,
      );
    }
  }

  // Rows the target holds and the source no longer does. Only for a full-table
  // run, never for a --tables subset, where absence is not meaningful.
  let deleted = 0;
  if (!DRY && !ONLY) {
    const stale = [...targetKeys].filter((k) => !sourceKeys.has(k));
    for (const key of stale) {
      const parts = key.split("\u001f");
      const result = await to.unsafe(
        `delete from public.${q(shape.name)} where ` +
          shape.pk.map((p, i) => `${q(p)}::text = $${i + 1}`).join(" and "),
        parts.map((v) => (v === "\0" ? null : v)),
      );
      deleted += result.count;
    }
  }

  return { table: shape.name, sourceRows: rows.length, inserted, updated, deleted };
}

function topoSort(list) {
  const byName = new Map(list.map((s) => [s.name, s]));
  const out = [];
  const state = new Map();
  function visit(name, path) {
    if (state.get(name) === "done") return;
    if (state.get(name) === "open")
      fail(
        `FK cycle: ${[...path, name].join(" → ")}. Supavisor gives no way to defer ` +
          `constraints — session_replication_role is superuser-only and Supabase's ` +
          `postgres role is not superuser — so a cycle needs a human, not a workaround.`,
      );
    state.set(name, "open");
    for (const parent of byName.get(name)?.dependsOn ?? [])
      if (byName.has(parent)) visit(parent, [...path, name]);
    state.set(name, "done");
    out.push(name);
  }
  for (const s of list) visit(s.name, []);
  return out;
}

function chunks(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function q(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}
