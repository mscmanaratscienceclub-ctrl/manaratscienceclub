/**
 * Stop the two public write paths on the source, for the cutover window.
 *
 * Freezing is a privilege revoke, not a project pause: pausing a Supabase project
 * takes the database itself down, which would also block the delta reads this
 * script's own caller needs. Revoking `insert` from `service_role` on the two form
 * tables makes the public registration forms fail at the friendly error branch they
 * already have (`stemfestreg/actions.ts:106`, `volunteer-actions.ts:53`), while the
 * rest of the site keeps serving reads.
 *
 * `service_role` carries BYPASSRLS, so a policy cannot stop it — but table
 * privileges still bind, which is what this uses.
 *
 * Usage
 *   pnpm db:port:freeze      revoke insert on the public form tables (source)
 *   pnpm db:port:unfreeze    put the grants back
 *
 * Order matters: capture the grants BEFORE freezing, because `pnpm db:port:capture`
 * reads the source's real ACL and the freeze temporarily makes it wrong.
 */
import { readFileSync } from "node:fs";
import {
  loadPortEnv,
  openPool,
  describePool,
  assertEndpoints,
  endpointEnv,
  projectRef,
  heading,
  fail,
  has,
  pinSession,
} from "./db-port-lib.mjs";

const env = loadPortEnv();

const { sourceUrl, targetUrl } = endpointEnv(env);
// The freeze is aimed at whichever project is currently live — normally the source,
// but after a rollback it is the target, so --on-target picks the other side.
const side = has("on-target") ? targetUrl : sourceUrl;

assertEndpoints({ sourceRef: projectRef(side), targetRef: projectRef(side), liveRef: "" });

const UNFREEZE = has("grant") || has("unfreeze");

/** The public, unauthenticated write paths. Admin writes go through Drizzle as the
 *  table owner and are unaffected by this. */
const TABLES = ["stem_fest_registrations", "volunteer_registrations"];

const sql = openPool(side);
await pinSession(sql, side);

heading(UNFREEZE ? "restoring the public write path" : "freezing the public write path");
await describePool(sql, "on", side);

for (const table of TABLES) {
  const before = await sql`
    select a.privilege_type
    from aclexplode(coalesce((select relacl from pg_class where oid = to_regclass(${"public." + table})),
                             acldefault('postgres', 'r'))) a
    where a.grantee = 'service_role'::regrole`;
  const verb = UNFREEZE ? "grant" : "revoke";
  const tail = UNFREEZE ? "to service_role" : "from service_role";
  await sql.unsafe(`${verb} insert on public.${q(table)} ${tail}`);
  const after = await sql`
    select exists (select 1 from aclexplode(
                     (select relacl from pg_class where oid = to_regclass(${"public." + table}))) a
                   where a.grantee = 'service_role'::regrole and a.privilege_type = 'INSERT') as can_insert`;
  console.log(
    `  ${table.padEnd(28)} INSERT for service_role: ${before.some((r) => r.privilege_type === "INSERT")} → ${after[0].can_insert} ${
      after[0].can_insert === !UNFREEZE ? "✓" : "✗ did not take"
    }`,
  );
  if (after[0].can_insert !== !UNFREEZE) process.exitCode = 1;
}

console.log(
  UNFREEZE
    ? "\n  forms accept registrations again."
    : "\n  forms now reject new registrations; reads and admin pages are untouched.\n" +
      "  Run pnpm db:port:data (the delta reconcile) next, then check the site still reads.",
);

await sql.end();

function q(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}
