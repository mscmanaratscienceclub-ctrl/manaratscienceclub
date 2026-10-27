/**
 * Second probe: the shape of the volunteer and ambassador free-text answers, so
 * the infographic's category buckets are written against what people actually
 * typed rather than a guess. Values are printed short and only to design the
 * normalizers; none of them reach an output file.
 *
 * Usage: node --env-file=.env scripts/infographics/probe2.mjs
 */
import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const db = postgres(url, { max: 1, connect_timeout: 20, idle_timeout: 20 });

async function top(table, column, n = 18) {
  const rows = await db.unsafe(
    `select ${column} as v, count(*)::int as c from "${table}" group by 1 order by 2 desc limit ${n}`,
  );
  console.log(`\n### ${table}.${column}`);
  for (const r of rows) console.log(`  [${r.c}] ${String(r.v ?? "").replace(/\s+/g, " ").slice(0, 110)}`);
}

for (const c of ["class_section", "attendance_week", "parents_comfort", "campus_hesitation", "roll"]) {
  await top("volunteer_registrations", c);
}
await top("campus_ambassador_registrations", "class");
await top("campus_ambassador_registrations", "experience", 8);

const med = async (table, columns) => {
  const list = columns.map((c) => `percentile_cont(0.5) within group (order by char_length(${c})) as "${c}"`);
  const [row] = await db.unsafe(`select ${list.join(", ")} from "${table}"`);
  console.log(`\n### medians ${table}`, JSON.stringify(row));
};
await med("volunteer_registrations", ["scenario_task_conflict", "scenario_peer_conduct", "selection_reason"]);
await med("campus_ambassador_registrations", ["experience"]);

await db.end();
