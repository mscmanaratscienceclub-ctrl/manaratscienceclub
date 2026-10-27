/**
 * Read-only probe of the columns the infographic set has to label.
 *
 * Low-cardinality answers (shift, comfort, tags, role) become chart axes, so the
 * real vocabulary has to be seen before the charts are drawn; everything printed
 * here is a group label or a count, never a name, phone, email or TrxID.
 *
 * Usage: node --env-file=.env scripts/infographics/probe.mjs
 */
import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required.");

const db = postgres(url, { max: 1, connect_timeout: 20, idle_timeout: 20 });

const tables = [
  "stem_fest_registrations",
  "stem_fest_payment_sms",
  "volunteer_registrations",
  "campus_ambassador_registrations",
  "posts",
  "user",
  "account",
  "session",
  "stem_fest_registration_counters",
];

const counts = {};
for (const table of tables) {
  try {
    const [{ n }] = await db.unsafe(
      `select count(*)::int as n from "${table}"`,
    );
    counts[table] = n;
  } catch {
    counts[table] = null;
  }
}
console.log("COUNTS", JSON.stringify(counts, null, 1));

const cols = await db.unsafe(`
  select table_name, column_name, data_type, is_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name in (${tables.map((t) => `'${t}'`).join(", ")})
  order by table_name, ordinal_position`);
const byTable = {};
for (const c of cols) (byTable[c.table_name] ??= []).push(`${c.column_name}:${c.data_type}${c.is_nullable === "YES" ? "?" : ""}`);
for (const [t, list] of Object.entries(byTable)) console.log(`COLUMNS ${t}\n  ${list.join(", ")}`);

/** Distinct values, only where they are few enough to be a chart axis. */
async function values(table, column, max = 40) {
  try {
    const rows = await db.unsafe(
      `select ${column} as v, count(*)::int as n from "${table}"
       group by 1 order by 2 desc limit ${max + 1}`,
    );
    if (rows.length > max) {
      console.log(`VALUES ${table}.${column} → HIGH CARDINALITY (${rows.length}+ distinct, top: ${rows[0]?.n})`);
      return;
    }
    console.log(
      `VALUES ${table}.${column} → ` +
        rows.map((r) => `${String(r.v ?? "∅").slice(0, 42)} (${r.n})`).join(" | "),
    );
  } catch (error) {
    console.log(`VALUES ${table}.${column} → ERROR ${error.message}`);
  }
}

for (const [t, c] of [
  ["stem_fest_registrations", "class"],
  ["stem_fest_registrations", "gender"],
  ["stem_fest_registrations", "payment_decision"],
  ["stem_fest_registrations", "total_fee"],
  ["stem_fest_registrations", "attendance"],
  ["stem_fest_registrations", "payment_number"],
  ["stem_fest_registrations", "reference"],
  ["stem_fest_payment_sms", "status"],
  ["stem_fest_payment_sms", "sender"],
  ["stem_fest_payment_sms", "amount"],
  ["volunteer_registrations", "shift"],
  ["volunteer_registrations", "class_section"],
  ["volunteer_registrations", "attendance_week"],
  ["volunteer_registrations", "parents_comfort"],
  ["volunteer_registrations", "campus_hesitation"],
  ["campus_ambassador_registrations", "type"],
  ["campus_ambassador_registrations", "class"],
  ["campus_ambassador_registrations", "gender"],
  ["campus_ambassador_registrations", "first_time_ca"],
  ["posts", "status"],
  ["user", "role"],
  ["account", "providerId"],
]) await values(t, c);

const teams = await db.unsafe(`
  select count(*)::int as n from information_schema.columns
  where table_name = 'stem_fest_registrations' and column_name = 'attendance_marked_at'`);
console.log("attendance_marked_at present:", teams[0].n === 1);

await db.end();
