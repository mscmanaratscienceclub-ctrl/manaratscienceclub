import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Singleton ────────────────────────────────────────────────────────────────
// Same HMR issue as the DB client — without a singleton, every hot reload
// creates a new Supabase client instance.

const globalForSupabase = globalThis as unknown as {
  supabaseClient?: SupabaseClient;
};

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase: SupabaseClient =
  globalForSupabase.supabaseClient ?? makeSupabaseClient();

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseClient = supabase;
}

// Bucket names and URL building are pure/no-secret — they live in `@/lib/media`
// so client components and data modules can use them without pulling this
// service-key client into the browser bundle.
export {
  AVATARS_BUCKET,
  bucketImage,
  renderedImageUrl,
  storagePublicUrl,
} from "@/lib/media";

