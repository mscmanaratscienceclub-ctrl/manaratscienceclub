// Quick probe script — run with: node drizzle/setup-ambassador-table.mjs
import { createClient } from "@supabase/supabase-js";

const url = "https://ipmdyrxfptdsulfhxjkb.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwbWR5cnhmcHRkc3VsZmh4amtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODY1NCwiZXhwIjoyMDk3NTA0NjU0fQ.sclTZC6k5rME2DHBw0OldPk4qTsP1s1S6jf43bYn01g";

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
