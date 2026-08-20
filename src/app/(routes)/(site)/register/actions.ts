"use server";

import { createClient } from "@supabase/supabase-js";

export type AmbassadorFormData = {
  name: string;
  class: string;
  school: string;
  experience: string;
  firstTimeCa: "yes" | "no";
};

export type SubmitResult =
  | { success: true; id: string; submittedAt: string }
  | { success: false; error: string };

function getSupabaseAdmin(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function submitAmbassadorForm(
  data: AmbassadorFormData
): Promise<SubmitResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = getSupabaseAdmin(url, key);

  const { data: inserted, error } = await supabase
    .from("campus_ambassador_registrations")
    .insert([
      {
        name: data.name.trim(),
        class: data.class.trim(),
        school: data.school.trim(),
        experience: data.experience.trim(),
        first_time_ca: data.firstTimeCa === "yes",
      },
    ])
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[AmbassadorForm] Supabase error:", error);
    // TEMP diagnostic — remove after debugging
    console.error(
      "[AmbassadorForm] env check:",
      "url:", url,
      "| key prefix:", key?.slice(0, 15),
      "| key len:", key?.length
    );
    return {
      success: false,
      error: "Failed to submit. Please try again.",
    };
  }

  return {
    success: true,
    id: inserted.id,
    submittedAt: inserted.created_at,
  };
}
