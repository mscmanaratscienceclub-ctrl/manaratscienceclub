"use server";

import {
  getSupabaseAdmin,
  submissionErrorMessage,
  type SubmitResult,
} from "@/lib/supabase-admin";
import {
  ambassadorSubmissionSchema,
  type AmbassadorSubmission,
} from "./validate";

export async function submitAmbassadorForm(
  input: AmbassadorSubmission
): Promise<SubmitResult> {
  const parsed = ambassadorSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: "Registration is temporarily unavailable." };
  }

  const data = parsed.data;
  const { data: inserted, error } = await supabase
    .from("campus_ambassador_registrations")
    .insert([
      {
        type: data.type,
        name: data.name,
        class: data.class,
        school: data.school,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        facebook: data.facebook || null,
        instagram: data.instagram || null,
        experience: data.experience,
        first_time_ca: data.firstTimeCa === "yes",
      },
    ])
    .select("id, created_at")
    .single();

  if (error) {
    return { success: false, error: submissionErrorMessage() };
  }

  return {
    success: true,
    id: inserted.id,
    submittedAt: inserted.created_at,
  };
}
