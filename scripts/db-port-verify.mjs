/**
 * Prove the two projects agree, before anything is allowed to point at the new one.
 *
 *   G2  per-table row digests, computed server-side so nothing is reinterpreted by
 *       Node — same rule as the copy itself.
 *   G3  the registration-counter invariant: `last_number` must never sit behind the
 *       highest number already issued, or the trigger mints a duplicate code and the
 *       unique index rejects every later registration.
 *   G4  functional probes against the target only (--probe --yes): the PostgREST
 *       write paths the registration forms actually use, the anon posture that RLS
 *       is responsible for, the bucket upload `/api/upload` needs, and five
 *       concurrent queries through the transaction pooler the app will run on.
 *
 * Nothing here writes to the source. Writes in G4 go to the target, are tagged
 * `PORTPROBE`, and are deleted again — except the counter, which is deliberately
 * left one ahead of the source, because rewinding a counter is how you create a
 * duplicate ID.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
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
const PROBE = has("probe");
const YES = has("yes");

const { sourceUrl, targetUrl, sourceRef, targetRef, liveRef } = endpointEnv(env);

assertEndpoints({ sourceRef, targetRef, liveRef });

const source = openPool(sourceUrl);
const target = openPool(targetUrl);
await pinSession(source, sourceUrl);
await pinSession(target, targetUrl);

heading("endpoints");
await describePool(source, "source", sourceUrl);
await describePool(target, "target", targetUrl);

/** Tables whose rows must match exactly. `session`/`verification` are not ported. */
const NOT_PORTED = new Set(["session", "verification"]);

const tableNames = (await source`
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' order by 1`)
  .map((r) => r.relname)
  .filter((n) => !NOT_PORTED.has(n));

/* ------------------------------------------------------------------ *
 * G2 — row digests
 * ------------------------------------------------------------------ */

heading("G2 — row digests (server-side, no JS parsing)");

let g2failures = 0;
const g2 = [];
for (const name of tableNames) {
  const cols = await source`
    select a.attname,
           exists (select 1 from pg_constraint k where k.conrelid = a.attrelid
                     and a.attnum = any(k.conkey) and k.contype = 'p') as is_pk
    from pg_attribute a
    where a.attrelid = to_regclass(${"public." + name})
      and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
    order by a.attnum`;
  const pk = cols.filter((c) => c.is_pk).map((c) => c.attname);
  if (!pk.length) {
    console.log(`  ${name.padEnd(34)} skipped — no primary key to order by`);
    continue;
  }

  const hashExpr = `encode(sha256(convert_to(concat_ws(chr(31), ${cols
    .map((c) => `coalesce(${q(c.attname)}::text, chr(30))`)
    .join(", ")}), 'utf8')), 'hex')`;
  const digestSql = `
    select count(*)::text as rows,
           coalesce(encode(sha256(convert_to(string_agg(h, '' order by ${pk
             .map((p) => q(p))
             .join(", ")}), 'utf8')), 'hex'), '(empty)') as digest
    from (select ${pk.map((p) => q(p)).join(", ")}, ${hashExpr} as h
          from public.${q(name)}) s`;

  const [s] = await source.unsafe(digestSql);
  const [t] = await target.unsafe(digestSql);
  const match = s.rows === t.rows && s.digest === t.digest;
  if (!match) g2failures++;

  // A matching digest is the strong check; these catch a vacuous one.
  const extras = [];
  const hasCreated = cols.some((c) => ["created_at", "createdAt"].includes(c.attname));
  if (hasCreated) {
    const col = cols.find((c) => ["created_at", "createdAt"].includes(c.attname)).attname;
    const [sx] = await source.unsafe(
      `select min(${q(col)})::text a, max(${q(col)})::text b from public.${q(name)}`,
    );
    const [tx] = await target.unsafe(
      `select min(${q(col)})::text a, max(${q(col)})::text b from public.${q(name)}`,
    );
    if (sx.a !== tx.a || sx.b !== tx.b) {
      extras.push(`${col} min/max DIFFERS  S ${sx.a}..${sx.b}  T ${tx.a}..${tx.b}`);
      g2failures++;
    }
  }
  const bigText = cols.find((c) => ["experience", "segments", "raw_message", "content"].includes(c.attname));
  if (bigText) {
    const [sx] = await source.unsafe(
      `select coalesce(sum(octet_length(${q(bigText.attname)})),0)::text n from public.${q(name)}`,
    );
    const [tx] = await target.unsafe(
      `select coalesce(sum(octet_length(${q(bigText.attname)})),0)::text n from public.${q(name)}`,
    );
    if (sx.n !== tx.n) {
      extras.push(`${bigText.attname} byte total DIFFERS S ${sx.n} T ${tx.n} (encoding damage?)`);
      g2failures++;
    }
  }

  console.log(
    `  ${name.padEnd(34)} S=${String(s.rows).padStart(5)} T=${String(t.rows).padStart(5)} ` +
      `${match ? "MATCH" : "MISMATCH"}  ${short(s.digest)}`,
  );
  for (const line of extras) console.log(`      ! ${line}`);
  g2.push({ table: name, source: s, target: t, match, extras });
}
console.log(g2failures ? `\n  G2 FAILED: ${g2failures} difference(s).` : "\n  G2 met: every ported table is byte-identical.");

/* ------------------------------------------------------------------ *
 * G3 — registration counter invariant
 * ------------------------------------------------------------------ */

heading("G3 — stem_fest_registration_counters vs the codes already issued");
const g3 = await checkCounters(source, "source");
const g3t = await checkCounters(target, "target");
console.log(`  ${"prefix".padEnd(8)}${"source last".padEnd(13)}${"max issued".padEnd(12)}${"target last".padEnd(13)}${"max issued".padEnd(12)}verdict`);
const g3failures = reportCounters(g3, g3t);
console.log(
  g3failures
    ? `\n  G3 FAILED on ${g3failures} prefix(es) — a code collision is waiting on registration day.`
    : "\n  G3 met: no counter sits behind a code that has already been handed out.",
);

/* ------------------------------------------------------------------ *
 * G4 — functional probes (target only)
 * ------------------------------------------------------------------ */

if (PROBE) {
  if (!YES) fail("--probe writes test rows to the target. Add --yes to confirm.");
  heading("G4 — functional probes against the target");
  await runProbes();
} else {
  heading("G4 — not run");
  console.log("  run pnpm db:port:probe once PORT_TARGET_SERVICE_ROLE_KEY is filled in.");
}

/* ------------------------------------------------------------------ *
 * Runtime shape — the pooler the app will actually use
 * ------------------------------------------------------------------ */

heading("runtime pooler shape (transaction mode, :6543)");
if (!env.PORT_TARGET_RUNTIME) {
  console.log("  PORT_TARGET_RUNTIME not set — skipped.");
} else {
  const runtime = postgres(env.PORT_TARGET_RUNTIME, {
    max: 5,
    prepare: false,
    connect_timeout: 20,
    idle_timeout: 5,
    onnotice: () => {},
  });
  const started = Date.now();
  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        runtime.unsafe(
          `select count(*)::text as n from public."stem_fest_registrations"`,
        ),
      ),
    );
    console.log(
      `  ✓ 5 concurrent queries over the transaction pooler in ${Date.now() - started}ms, ` +
        `all returning ${results[0][0].n}`,
    );
  } catch (error) {
    console.log(`  ✗ transaction pooler: ${error.message}`);
    process.exitCode = 1;
  }
  await runtime.end();
}

writeFileSync(
  join("db-port", flag("run") || readLatest(), "verify.json"),
  JSON.stringify({ at: new Date().toISOString(), g2, g3source: g3, g3target: g3t }, null, 2),
);

await source.end();
await target.end();
if (g2failures || g3failures) process.exitCode = 1;

/* ------------------------------------------------------------------ */

function readLatest() {
  try {
    return readFileSync(join("db-port", "latest"), "utf8").trim();
  } catch {
    return ".";
  }
}

/**
 * Recompute the code prefix the same way production does — with the ported
 * functions themselves, so the check cannot drift from the definition.
 */
async function checkCounters(sql, label) {
  const issued = await sql`
    with codes as (
      select public.stemfest_gender_letter(gender) || public.stemfest_class_code("class") as prefix,
             substring(registration_code
               from length(public.stemfest_gender_letter(gender)
                          || public.stemfest_class_code("class")) + 1) as number_text
      from public.stem_fest_registrations
    )
    select prefix,
           -- The mint is prefix || lpad(n, 3, '0'), so the tail after the prefix is
           -- the number. Taking the trailing digit run would swallow the class
           -- digits too: code F10011 is number 11, not 10011.
           max(nullif(regexp_replace(number_text, '\\D', '', 'g'), '')::int) as max_issued,
           count(*)::int as rows
    from codes
    group by 1 order by 1`;
  const counters = await sql`
    select prefix, last_number::int as last_number from public.stem_fest_registration_counters`;
  return issued.map((i) => {
    const c = counters.find((x) => x.prefix === i.prefix);
    return { prefix: i.prefix, rows: i.rows, maxIssued: i.max_issued, lastNumber: c?.last_number ?? null };
  });
}

function reportCounters(sources, targets) {
  let failures = 0;
  const prefixes = new Set([...sources, ...targets].map((r) => r.prefix));
  for (const prefix of [...prefixes].sort()) {
    const s = sources.find((r) => r.prefix === prefix);
    const t = targets.find((r) => r.prefix === prefix);
    if (!s || !t) {
      console.log(`  ${prefix.padEnd(8)} present on only one side — MISMATCH`);
      failures++;
      continue;
    }
    // Ahead is fine (the probe mints one and leaves it); behind is a collision.
    const ok = s.lastNumber !== null && t.lastNumber !== null && t.lastNumber >= s.lastNumber &&
      t.lastNumber >= t.maxIssued && s.lastNumber >= s.maxIssued;
    if (!ok) failures++;
    console.log(
      `  ${prefix.padEnd(8)}${String(s.lastNumber).padEnd(13)}${String(s.maxIssued).padEnd(12)}` +
        `${String(t.lastNumber).padEnd(13)}${String(t.maxIssued).padEnd(12)}${ok ? "ok" : "BEHIND"}`,
    );
  }
  return failures;
}

async function runProbes() {
  const base = env.PORT_TARGET_PROJECT_URL;
  const service = env.PORT_TARGET_SERVICE_ROLE_KEY;
  const publishable = env.PORT_TARGET_PUBLISHABLE_KEY;
  if (!base || !publishable) fail("PORT_TARGET_PROJECT_URL and PORT_TARGET_PUBLISHABLE_KEY are required");

  const run = `PORTPROBE${Date.now().toString(36).toUpperCase()}`;

  // 1 — anon posture: RLS is the only thing standing between the Data API and
  //     every row in these tables, so prove it holds before the site does.
  console.log("\n  1. anon posture with the publishable key");
  for (const table of ["user", "stem_fest_registrations", "form_fields", "account", "posts"]) {
    const res = await fetch(`${base}/rest/v1/${table}?select=*&limit=2`, {
      headers: { apikey: publishable, Authorization: `Bearer ${publishable}` },
    });
    const body = await res.json().catch(() => null);
    const rows = Array.isArray(body) ? body.length : -1;
    const ok = res.status === 200 && rows === 0;
    console.log(`     ${table.padEnd(28)} HTTP ${res.status} rows=${rows} ${ok ? "✓ default-deny" : "✗ EXPOSED"}`);
    if (!ok) process.exitCode = 1;
  }

  if (!service) {
    console.log(
      "\n  ✗ PORT_TARGET_SERVICE_ROLE_KEY is empty — the write-path, storage and\n" +
        "    update probes cannot run. Paste the new project's secret key into .env.port.",
    );
    process.exitCode = 1;
    return;
  }

  const rest = (path, method, payload, prefer) =>
    fetch(`${base}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        "Content-Type": "application/json",
        Prefer: prefer ?? "return=representation",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

  // 2 — volunteer insert through the same PostgREST path the form uses.
  console.log("\n  2. PostgREST insert — volunteer_registrations");
  const volunteerRow = await fillerRow(source, "volunteer_registrations", run);
  let res = await rest("volunteer_registrations", "POST", volunteerRow);
  const created = await res.json().catch(() => null);
  console.log(
    `     POST → HTTP ${res.status}` +
      (res.status === 201 ? ` ✓ id=${created?.[0]?.id}` : ` ✗ ${JSON.stringify(created).slice(0, 160)}`),
  );
  if (res.status === 201) {
    res = await rest(`volunteer_registrations?id=eq.${created[0].id}`, "DELETE");
    console.log(`     DELETE sentinel → HTTP ${res.status}`);
  }

  // 3 — the trigger path: no registration_code supplied, so the minting function,
  //     both helpers, SECURITY DEFINER ownership, the counter grant and the unique
  //     index are all proven by this one write.
  console.log("\n  3. PostgREST insert — stem_fest_registrations (trigger mints the code)");
  const stemRow = await fillerRow(source, "stem_fest_registrations", run);
  delete stemRow.registration_code;
  res = await rest("stem_fest_registrations", "POST", stemRow);
  const stem = await res.json().catch(() => null);
  const code = stem?.[0]?.registration_code;
  // Assert what the trigger actually guarantees, not the shape of a real
  // participant's code: a probe row carries a nonsense gender/class, so the
  // functions legitimately take their fallback branches (`X` for an unknown
  // gender, the uppercased class for an unknown class). What must hold is that a
  // code was minted, that it starts with a gender letter, that a class segment
  // survived between it and the number, and that the number is zero-padded —
  // a bare letter+digits would mean `stemfest_class_code` returned an empty
  // string, which is the failure its else-branch exists to prevent.
  const minted =
    typeof code === "string" &&
    /^[MFOX].+\d{3,}$/.test(code) &&
    code.slice(1, -3).length > 0;
  console.log(
    `     POST → HTTP ${res.status}  registration_code=${code ?? "(none)"} ` +
      `${res.status === 201 && minted ? "✓ trigger, functions, definer and grant all work" : "✗ " + JSON.stringify(stem).slice(0, 200)}`,
  );
  if (res.status !== 201 || !minted) process.exitCode = 1;
  if (res.status === 201) {
    res = await rest(`stem_fest_registrations?id=eq.${stem[0].id}`, "PATCH", { payment_decision: "verified" });
    console.log(`     PATCH payment_decision → HTTP ${res.status} ${res.status === 200 || res.status === 204 ? "✓ update policy exists" : "✗"}`);
    res = await rest(`stem_fest_registrations?id=eq.${stem[0].id}`, "DELETE");
    console.log(`     DELETE sentinel → HTTP ${res.status}`);
    // The probe's gender/class are nonsense, so the mint created a counter row for
    // a prefix no real participant can ever produce. Deleting it keeps the two
    // projects byte-identical; a probe against a REAL prefix would deliberately
    // leave its counter one ahead, because rewinding a counter is how you mint a
    // duplicate code.
    const probePrefix = code.slice(0, -3);
    const cleaned = await target`
      delete from public.stem_fest_registration_counters
      where prefix = ${probePrefix}
        and not exists (select 1 from public.stem_fest_registrations r
                         where r.registration_code like ${probePrefix + "%"})`;
    console.log(`     probe counter row "${probePrefix}" removed: ${cleaned.count === 1 ? "✓" : "was not present"}`);
  }

  // 4 — storage: the bucket must exist and accept what /api/upload sends.
  console.log("\n  4. storage");
  for (const bucket of ["avatars", "pdfs"]) {
    const exists = await fetch(`${base}/storage/v1/bucket/${bucket}`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    console.log(`     bucket ${bucket.padEnd(8)} → HTTP ${exists.status} ${exists.status === 200 ? "✓" : "✗ run pnpm db:port:storage"}`);
  }
  const webp = Uint8Array.from(
    atob(
      "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
    ),
    (c) => c.charCodeAt(0),
  );
  const key = `_probe/${run}.webp`;
  const up = await fetch(`${base}/storage/v1/object/avatars/${key}`, {
    method: "POST",
    headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "image/webp" },
    body: webp,
  });
  console.log(`     upload → HTTP ${up.status} ${up.status === 200 ? "✓ /api/upload will work" : "✗ " + (await up.text()).slice(0, 120)}`);
  if (up.status === 200 || up.status === 201) {
    const pub = await fetch(`${base}/storage/v1/object/public/avatars/${key}`);
    console.log(`     public read → HTTP ${pub.status} ${pub.status === 200 ? "✓" : "✗ bucket is not public"}`);
    await fetch(`${base}/storage/v1/object/avatars/${key}`, {
      method: "DELETE",
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
  }

  // 5 — the counters GRANT under SECURITY DEFINER, stated plainly.
  console.log("\n  5. owner check");
  const [ident] = await target`select current_user as who, (select rolname from pg_roles where rolsuper) as super`;
  const [fnOwner] = await target`
    select pg_get_userbyid(p.proowner) as owner from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'stemfest_next_registration_code'`;
  console.log(`     connecting as ${ident.who}; stemfest_next_registration_code owned by ${fnOwner?.owner}`);
  console.log(
    fnOwner?.owner === ident.who
      ? "     ✓ SECURITY DEFINER runs as the same role that owns the counter table"
      : "     ✗ definer owner differs from the connector — the counter UPDATE may be refused",
  );
}

/**
 * Build a POST body that satisfies every NOT NULL column, typed by the column's
 * own declared type, with a sentinel in the text fields so a stray probe row is
 * trivially findable and deletable.
 */
async function fillerRow(sql, table, sentinel) {
  const cols = await sql`
    select a.attname,
           format_type(a.atttypid, a.atttypmod) as type,
           a.attnotnull,
           coalesce(pg_get_expr(d.adbin, d.adrelid), '') as default_expr
    from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = to_regclass(${"public." + table})
      and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
    order by a.attnum`;
  const body = {};
  for (const c of cols) {
    if (c.attname === "registration_code") continue;
    if (c.default_expr) continue; // let the server supply uuids, now(), role defaults
    if (!c.attnotnull) continue;
    const t = c.type;
    if (/^(text|character varying|bpchar|char)/.test(t)) body[c.attname] = sentinel;
    else if (/^boolean/.test(t)) body[c.attname] = false;
    else if (/^(int|bigint|smallint|numeric|real|double)/.test(t)) body[c.attname] = 0;
    else if (/uuid/.test(t)) body[c.attname] = "00000000-0000-4000-8000-000000000000";
    else if (/json/.test(t)) body[c.attname] = {};
    else if (/\[\]$/.test(t)) body[c.attname] = [];
    else body[c.attname] = null;
  }
  return body;
}

function short(digest) {
  const text = String(digest ?? "");
  return text === "(empty)" ? "" : text.slice(0, 12);
}

function q(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}
