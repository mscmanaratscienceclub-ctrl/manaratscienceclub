/**
 * Shared plumbing for the Supabase-project-to-project port.
 *
 * Every `db-port-*.mjs` script goes through here so the safety rules cannot be
 * forgotten by one script: credentials come only from `.env.port` under `PORT_*`
 * names, the project ref of both ends is resolved and compared before anything
 * runs, and each connection is a standalone `max: 1` pool — never the app's
 * `src/db/index.ts` singleton, which is wired to the live production database.
 *
 * Why a separate env file: `.env` holds the **production** `DATABASE_URL` and the
 * live Resend key, so `node --env-file=.env` (the convention `db:audit` uses)
 * would put a production DSN in scope of a script whose job is to write to a
 * different project. Only `PORT_*` names are ever consulted, and a stray
 * `DATABASE_URL` in the environment is not allowed to be mistaken for a target.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

/** Name of the project being retired, hard-coded so a typo cannot aim a write at it. */
export const RETIRED_REF = "ipmdyrxfptdsulfhxjkb";

const argv = process.argv.slice(2);

/** `--flag=value` reader; never put secrets in argv — it is visible in `ps` and logs. */
export function flag(name) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? undefined : hit.slice(name.length + 3);
}

export function has(name) {
  return argv.includes(`--${name}`);
}

/**
 * Parse a dotenv file into an object, with the shell winning over the file — the
 * same precedence `scripts/migrate-media-to-tigris.mjs` uses, so a run can be
 * re-aimed without editing the file.
 */
export function loadPortEnv(path = flag("env-file") ?? ".env.port") {
  let text;
  try {
    text = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  } catch {
    fail(
      `No ${path}. Copy the new project's database password, publishable key and ` +
        `service-role key into it (it is gitignored by .env*'s rule).`,
    );
  }
  const fileEnv = Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => [
        l.slice(0, l.indexOf("=")),
        l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
      ]),
  );
  return new Proxy(fileEnv, { get: (t, k) => process.env[k] ?? t[k] });
}

/** Read one variable out of an ordinary dotenv file (used for the source DSN in `.env`). */
function readDotenvVar(path, name) {
  const text = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) fail(`${path} has no ${name}`);
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
}

export function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

export function heading(text) {
  console.log(`\n${"─".repeat(78)}\n${text}\n${"─".repeat(78)}`);
}

/** `host:port/database` — safe to print. Passwords and roles never are. */
export function redact(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port}${parsed.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

/**
 * Project ref from either connection shape Supabase hands out:
 *   postgresql://postgres.<ref>:pw@aws-1-region.pooler.supabase.com:5432/postgres
 *   https://<ref>.supabase.co
 */
export function projectRef(value) {
  if (!value) return "";
  try {
    const url = new URL(value.replace(/^postgres(ql|)\+https:/, "https:"));
    const pooler = /^(?:postgres|supabase_admin)\.([a-z0-9]{20})$/i.exec(
      decodeURIComponent(url.username || ""),
    );
    if (pooler) return pooler[1];
    const api = /^([a-z0-9]{20})\.supabase\./i.exec(url.hostname);
    if (api) return api[1];
  } catch {
    /* fall through */
  }
  return "";
}

/** Region the pooler hostname says — a new project in another region is worth knowing. */
export function poolerRegion(url) {
  try {
    const m = /^(aws-[a-z0-9]+)-([a-z0-9-]+)\.pooler\.supabase\.com$/.exec(
      new URL(url).hostname,
    );
    return m ? `${m[1]} · ${m[2]}` : "not a pooler host";
  } catch {
    return "unknown";
  }
}

/**
 * The guard every script runs before touching a connection.
 *
 * `liveRef` is whatever `.env` points at — i.e. production. Refusing to treat it
 * as a target is what stops a `--reset` from dropping the live schema because a
 * password was pasted into the wrong line of `.env.port`.
 */
export function assertEndpoints({ sourceRef, targetRef, liveRef, allowLive = false }) {
  if (!sourceRef) fail("cannot read a project ref from the source DSN");
  if (!targetRef) fail("cannot read a project ref from the target DSN");
  if (sourceRef === targetRef)
    fail(`source and target are the same project (${targetRef})`);
  if (targetRef === RETIRED_REF)
    fail(`target ref is ${RETIRED_REF} — the project being retired, not the new one`);
  const live = liveRef || projectRef(process.env.DATABASE_URL ?? "");
  if (live && targetRef === live && !allowLive)
    fail(
      `target ref ${targetRef} is the project .env's DATABASE_URL points at — ` +
        `that is live production. Refusing. (override: --allow-live)`,
    );
  if (live && targetRef === live && allowLive)
    console.warn(`  ! --allow-live: writes will land on ${targetRef}`);
}

/**
 * The two endpoints, read only from `.env.port`.
 *
 * Before the cutover `.env` holds the live production DSN, so it was a sensible
 * source for "which project is live". Once `.env` is repointed at the new project
 * that stops being true — the port would read its own target and refuse to run.
 * The port therefore keeps its own copy of both DSNs: `PORT_SOURCE_DB` is the
 * project being retired whatever `.env` currently says, and `.env` is not read at
 * all by these scripts.
 */
export function endpointEnv(env) {
  const sourceUrl =
    env.PORT_SOURCE_DB ||
    fail(
      "PORT_SOURCE_DB must be set in .env.port — the port no longer reads .env, " +
        "so the retired project's DSN has to live there",
    );
  const targetUrl = env.PORT_TARGET_DB || fail("PORT_TARGET_DB must be set in .env.port");
  return {
    sourceUrl,
    targetUrl,
    sourceRef: projectRef(sourceUrl),
    targetRef: projectRef(targetUrl),
    // "live" is the project registrations are actually landing in — the source —
    // which is what `--reverse` needs an override to write to.
    liveRef: projectRef(sourceUrl),
  };
}

/** Standalone pool. Never imports `src/db/index.ts`, so no globalThis singleton exists. */
export function openPool(url, { max = 1 } = {}) {
  return postgres(url, {
    max,
    // Supavisor transaction mode rejects prepared statements, and the session-mode
    // URL is still Supavisor — so this is off unconditionally (see ADR-0026).
    prepare: false,
    connect_timeout: 20,
    idle_timeout: 5,
    // `drop … if exists` on a fresh project answers with a NOTICE per object.
    // Those are expected; anything else is worth seeing.
    onnotice: (note) => {
      const message = typeof note === "string" ? note : note?.message ?? "";
      if (!/skipping/.test(message)) console.log(`  notice: ${message}`);
    },
    /**
     * The single most load-bearing lines in this port.
     *
     * postgres.js asks the server what type each parameter is — and for
     * `insert into t (a, b) values ($1, $2)` the server answers from the target
     * column. It then runs the value through that type's serializer, which is
     * written for JS values, not for text that already came out of Postgres:
     *
     *   date    `to: 1184` → `new Date(x).toISOString()`  — parsed in the
     *           machine's zone and truncated to milliseconds. A value copied as
     *           '2026-08-19 18:22:18.578' landed as 12:22:18.578, six hours early.
     *   boolean `to: 16`   → `x === true ? 't' : 'f'`     — the string 't' is not
     *           `true`, so **every boolean in every copied row became false**.
     *
     * Measured: `pnpm db:port:data` on its own silently rewrote emailVerified,
     * banned, first_time_ca, required and enabled; caught only because G2 digests
     * the rows column by column.
     *
     * `serialize` is overridden to pass a string through untouched and fall back to
     * the driver's own behaviour for genuine JS values (the probes POST real
     * booleans and objects). `parse` is overridden only for the temporal and
     * numeric OIDs, so a read never hands back a Date or a lossy float; boolean
     * parsing is deliberately left alone, because `returning (xmax = 0)` must stay
     * a JS boolean or the insert/update counts invert.
     */
    types: {
      portDate: {
        to: 1082,
        from: [1082],
        serialize: (value) => (typeof value === "string" ? value : String(value)),
        parse: (value) => value,
      },
      portTimestamp: {
        to: 1114,
        from: [1114],
        serialize: (value) => (typeof value === "string" ? value : String(value)),
        parse: (value) => value,
      },
      portTimestamptz: {
        to: 1184,
        from: [1184],
        serialize: (value) => (typeof value === "string" ? value : String(value)),
        parse: (value) => value,
      },
      // Numeric and bigint arrive as text and must not become JS floats: fee
      // amounts and the registration counters are compared byte-for-byte by verify.
      portNumeric: {
        to: 1700,
        from: [1700],
        serialize: (value) => (typeof value === "string" ? value : String(value)),
        parse: (value) => value,
      },
      portInt8: {
        to: 20,
        from: [20],
        serialize: (value) => (typeof value === "string" ? value : String(value)),
        parse: (value) => value,
      },
      portBool: {
        to: 16,
        serialize: (value) =>
          typeof value === "string" ? value : value === true ? "t" : value === false ? "f" : String(value),
      },
      portJson: {
        to: 114,
        serialize: (value) => (typeof value === "string" ? value : JSON.stringify(value)),
      },
      portJsonb: {
        to: 3802,
        serialize: (value) => (typeof value === "string" ? value : JSON.stringify(value)),
      },
    },
  });
}

/**
 * Pin the session so text round-trips are identical on both ends.
 *
 * Without `timezone=UTC` a `timestamptz::text` is rendered in the source's zone
 * and re-parsed in the target's, which silently moves the instant. `datestyle`
 * and `intervalstyle` decide how other literals are written out; `bytea_output`
 * and `search_path` keep the DDL and any bytea unambiguous.
 */
export const SESSION_PIN = [
  "set search_path = public",
  "set timezone = 'UTC'",
  "set datestyle = 'ISO, MDY'",
  "set intervalstyle = 'postgres'",
  "set bytea_output = 'hex'",
  "set extra_float_digits = 3",
];

/**
 * `SET` is session-scoped and must never reach a transaction-mode pooler: the
 * Supavisor backend is shared, so a session setting would leak onto the next
 * client that lands on it (see [[decisions-log|ADR-0026]] and `src/db/index.ts`).
 * On a `max: 1` session pooler it is safe; on a 6543 URL it is refused.
 */
export function isSessionMode(url) {
  try {
    const parsed = new URL(url);
    if (parsed.port === "6543") return false;
    return !/[?&]pgbouncer=true/.test(parsed.search);
  } catch {
    return false;
  }
}

export function toSessionUrl(url) {
  return isSessionMode(url) ? url : url.replace(":6543", ":5432");
}

/** Apply the pin, or refuse loudly rather than leak a setting onto a shared backend. */
export async function pinSession(sql, url) {
  if (!isSessionMode(url))
    fail(
      "refusing to SET session settings on a transaction-mode URL — use the :5432 session pooler",
    );
  for (const statement of SESSION_PIN) await sql.unsafe(statement);
  const [{ timezone }] = await sql`select current_setting('timezone') as timezone`;
  if (timezone !== "UTC") fail(`session timezone is ${timezone}, expected UTC`);
}

/** Print, and return, the identity of a connection so a run is auditable. */
export async function describePool(sql, label, url) {
  const [row] = await sql`
    select current_user as role, current_database() as db,
           current_setting('server_version') as version,
           current_setting('timezone') as timezone,
           (select count(*) from pg_class c
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind in ('r','p','f','v')) as public_relations
  `;
  console.log(
    `  ${label.padEnd(8)} ${redact(url)}\n` +
      `           ref=${projectRef(url) || "-"}  region=${poolerRegion(url)}\n` +
      `           role=${row.role}  db=${row.db}  postgres=${row.version}  timezone=${row.timezone}\n` +
      `           relations in public: ${row.public_relations}`,
  );
  return row;
}

/**
 * Split a SQL file into executable statements.
 *
 * `split(";")` cannot work here: `pg_get_functiondef` bodies are full of
 * semicolons, and the repo's files use dollar-quoting and `--> statement-
 * breakpoint` comments. Respecting quotes, comments and dollar-quoted bodies is
 * what lets the replay run one statement per round-trip, so a failure names the
 * exact statement instead of the whole file.
 */
export function splitStatements(text) {
  const out = [];
  let current = "";
  let line = 1;
  let startLine = 1;
  const n = text.length;
  const at = (i) => text[i];

  for (let i = 0; i < n; i++) {
    const c = at(i);
    const next = at(i + 1);

    if (c === "\n") line++;

    // line comment — but `--> statement-breakpoint` is also a hard break
    if (c === "-" && next === "-") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      if (/^-->\s*statement-breakpoint/.test(text.slice(i, stop))) {
        i = stop;
        push();
        continue;
      }
      i = stop;
      continue;
    }

    // block comment (Postgres nests them)
    if (c === "/" && next === "*") {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (at(i) === "/" && at(i + 1) === "*") {
          depth++;
          i += 2;
        } else if (at(i) === "*" && at(i + 1) === "/") {
          depth--;
          i += 2;
        } else {
          if (at(i) === "\n") line++;
          i++;
        }
      }
      i -= 1;
      continue;
    }

    // single-quoted string, with '' escaping
    if (c === "'") {
      current += c;
      i++;
      while (i < n) {
        if (at(i) === "'" && at(i + 1) === "'") {
          current += "''";
          i += 2;
          continue;
        }
        if (at(i) === "\\") {
          current += at(i) + at(i + 1);
          i += 2;
          continue;
        }
        if (at(i) === "\n") line++;
        current += at(i);
        if (at(i) === "'") {
          i++;
          break;
        }
        i++;
      }
      i -= 1;
      continue;
    }

    // quoted identifier
    if (c === '"') {
      current += c;
      i++;
      while (i < n && at(i) !== '"') {
        if (at(i) === "\n") line++;
        current += at(i);
        i++;
      }
      current += '"';
      continue;
    }

    // dollar-quoted body: $tag$ ... $tag$
    if (c === "$") {
      const m = /^\$([A-Za-z_0-9]*)\$/.exec(text.slice(i));
      if (m) {
        const tag = m[0];
        const end = text.indexOf(tag, i + tag.length);
        if (end !== -1) {
          current += text.slice(i, end + tag.length);
          line += (text.slice(i, end + tag.length).match(/\n/g) ?? []).length;
          i = end + tag.length - 1;
          continue;
        }
      }
    }

    if (c === ";") {
      push();
      continue;
    }

    current += c;
  }
  push();

  function push() {
    const trimmed = current.trim();
    if (trimmed) out.push({ text: trimmed, line: startLine });
    current = "";
    startLine = line;
  }
  return out;
}

/**
 * Which tables to port, and in what order.
 *
 * The include list is everything the source reports in `public`, because the
 * four orphan tables (`applications`, `form_fields`, `form_settings`,
 * `form_submissions`) exist in no migration file and a hard-coded list would
 * silently drop them. Supabase's own schemas are never touched.
 */
export const EXCLUDED_TABLES = new Set([]);

/** sha256 hex, for the artifact state ledger. */
export async function sha256(text) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}

/** Resolve a DSN from the pieces, trying each candidate host the file lists. */
export function targetDsnCandidates(env, { runtime = false } = {}) {
  if (env.PORT_TARGET_DB && !runtime) return [env.PORT_TARGET_DB];
  if (env.PORT_TARGET_RUNTIME && runtime) return [env.PORT_TARGET_RUNTIME];
  const user = env.PORT_TARGET_DB_USER || `postgres.${env.PORT_TARGET_REF}`;
  const pass = env.PORT_TARGET_DB_PASS;
  if (!pass || !env.PORT_TARGET_REF)
    fail("PORT_TARGET_DB_PASS and PORT_TARGET_REF must be set in .env.port");
  const encoded = encodeURIComponent(pass);
  const hosts = (env.PORT_TARGET_HOSTS || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (!hosts.length) fail("PORT_TARGET_HOSTS must list at least one host:port");
  return hosts.flatMap((host) => {
    const [hostname, port] = host.split(":");
    const sessionPort = runtime ? "6543" : port || "5432";
    const suffix = runtime ? "/postgres?pgbouncer=true" : "/postgres";
    return [`postgresql://${user}:${encoded}@${hostname}:${sessionPort}${suffix}`];
  });
}

/** Source DSN comes from `.env` so the live password lives in exactly one file. */
export function sourceDsn(env) {
  const explicit = env.PORT_SOURCE_DB;
  if (explicit) return explicit;
  const file = env.PORT_SOURCE_FILE || ".env";
  const name = env.PORT_SOURCE_VAR || "DIRECT_URL";
  return readDotenvVar(file, name);
}
