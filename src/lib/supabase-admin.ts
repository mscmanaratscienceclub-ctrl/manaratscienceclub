import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side form writes.
 *
 * Returns `null` when the secrets are absent so callers can answer with a
 * friendly message instead of throwing inside a server action. The service-role
 * key bypasses RLS, so this must never be reachable from client code.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Shape every public form returns from its submit action. */
export type SubmitResult =
  | { success: true; id: string; submittedAt: string }
  | { success: false; error: string };

/** Keeps database details out of public form responses. */
export function submissionErrorMessage(): string {
  return "Failed to submit. Please try again.";
}
