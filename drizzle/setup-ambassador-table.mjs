// Quick probe script — run with: node --env-file=.env drizzle/setup-ambassador-table.mjs
//
// SECURITY: this file used to hard-code the project URL *and* the live
// service-role JWT. A service-role key bypasses RLS completely — read it, and
// you own every row in `public`, including the registrant PII tables. Both are
// now read from the environment, which `.gitignore` keeps out of version
// control. See [[supabase-audit-2026-09-13]] finding F1.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with:  node --env-file=.env drizzle/setup-ambassador-table.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: probeError } = await supabase
  .from("campus_ambassador_registrations")
  .select("id")
  .limit(1);

if (!probeError) {
  console.log("✅ Table exists and is accessible.");
} else if (probeError.code === "42P01") {
  console.log("❌ Table does not exist yet.");
  console.log(
    "   → Run the SQL in drizzle/campus_ambassador_migration.sql",
    "via the Supabase Dashboard SQL Editor:"
  );
  console.log(
    "   https://supabase.com/dashboard/project/ipmdyrxfptdsulfhxjkb/sql/new"
  );
} else {
  console.log("⚠️  Unexpected error:", probeError.message, "(code:", probeError.code + ")");
}
