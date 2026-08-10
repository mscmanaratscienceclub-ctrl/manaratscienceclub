"use server";

import { createClient } from "@supabase/supabase-js";

export type AmbassadorFormData = {
  name: string;
  class: string;
  school: string;
  experience: string;
};

export type SubmitResult =
  | { success: true; id: string; submittedAt: string }
  | { success: false; error: string };

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function submitAmbassadorForm(
  data: AmbassadorFormData
): Promise<SubmitResult> {
  const supabase = getSupabaseAdmin();

  const { data: inserted, error } = await supabase
    .from("campus_ambassador_registrations")
    .insert([
      {
        name: data.name.trim(),
        class: data.class.trim(),
        school: data.school.trim(),
        experience: data.experience.trim(),
      },
    ])
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[AmbassadorForm] Supabase error:", error);
    return {
      success: false,
      error: error.message || "Failed to submit. Please try again.",
    };
  }

  return {
    success: true,
    id: inserted.id,
    submittedAt: inserted.created_at,
  };
}
