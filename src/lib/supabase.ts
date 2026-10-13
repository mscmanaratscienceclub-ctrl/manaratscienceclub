import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Singleton ────────────────────────────────────────────────────────────────
// Same HMR issue as the DB client — without a singleton, every hot reload
// creates a new Supabase client instance.

const globalForSupabase = globalThis as unknown as {
  supabaseClient?: SupabaseClient | null;
};

/**
 * Service-role Supabase client for `/api/upload`.
 *
 * Built on first use rather than at import: `createClient("")` throws, and this
 * module is in the server bundle, so an eager singleton turned a missing
 * `NEXT_PUBLIC_SUPABASE_URL` into a failed build ("Failed to collect page data for
 * /api/upload") instead of one clean 503. Same shape as `getSupabaseAdmin()`, which
 * already returns `null` when its secrets are absent.
 */
function makeSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabase(): SupabaseClient | null {
  globalForSupabase.supabaseClient ??= makeSupabaseClient();
  return globalForSupabase.supabaseClient ?? null;
}

// Bucket names and URL building are pure/no-secret — they live in `@/lib/media`
// so client components and data modules can use them without pulling this
// service-key client into the browser bundle.
export {
  AVATARS_BUCKET,
  bucketImage,
  bucketOriginal,
  contentImage,
  renderedImageUrl,
  storagePublicUrl,
  supabasePublicUrl,
  avatarUrl,
  isOptimizedObjectUrl,
} from "@/lib/media";

