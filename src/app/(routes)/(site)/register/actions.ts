"use server";

import { createClient } from "@supabase/supabase-js";
import {
  ambassadorSubmissionSchema,
  type AmbassadorSubmission,
} from "./validate";

export type SubmitResult =
  | { success: true; id: string; submittedAt: string }
  | { success: false; error: string };

function getSupabaseAdmin(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function submitAmbassadorForm(
  input: AmbassadorSubmission
): Promise<SubmitResult> {
  console.log("[submitAmbassadorForm] called with:", JSON.stringify(input));

  const parsed = ambassadorSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[submitAmbassadorForm] Zod validation failed:", parsed.error.flatten());
    return { success: false, error: "Please check the form and try again." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[submitAmbassadorForm] Supabase URL present:", !!url, "| Service key present:", !!key);

  if (!url || !key) {
    console.error("[submitAmbassadorForm] Missing Supabase env vars — url:", url ? "ok" : "MISSING", "key:", key ? "ok" : "MISSING");
    return { success: false, error: "Registration is temporarily unavailable." };
  }

  const data = parsed.data;
  const payload = {
    type: data.type,
    name: data.name,
    class: data.class,
    school: data.school,
    experience: data.experience,
    first_time_ca: data.firstTimeCa === "yes",
  };
  console.log("[submitAmbassadorForm] Inserting payload:", JSON.stringify(payload));

  const supabase = getSupabaseAdmin(url, key);
  const { data: inserted, error } = await supabase
    .from("campus_ambassador_registrations")
    .insert([payload])
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[submitAmbassadorForm] Supabase insert error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const isDev = process.env.NODE_ENV === "development";
    return {
      success: false,
      error: isDev
        ? `DB error (${error.code}): ${error.message}`
        : "Failed to submit. Please try again.",
    };
  }

  console.log("[submitAmbassadorForm] Inserted successfully:", inserted.id);
  return {
    success: true,
    id: inserted.id,
    submittedAt: inserted.created_at,
  };
}
