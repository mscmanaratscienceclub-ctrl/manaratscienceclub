"use server";

import {
  getSupabaseAdmin,
  submissionErrorMessage,
} from "@/lib/supabase-admin";
import {
  computeTotalFee,
  describeEntry,
} from "@/lib/data/stemfest-registration";
import {
  buildEntries,
  resolveSchoolName,
  stemfestRegistrationSchema,
  type StemfestFormValues,
} from "./validate";

/**
 * Extends the shared `SubmitResult` with the fee actually recorded, so the
 * receipt shows the server's number rather than the browser's.
 */
export type StemfestSubmitResult =
  | { success: true; id: string; submittedAt: string; totalFee: number }
  | { success: false; error: string };

/**
 * Insert a STEM Fest event registration into `stem_fest_registrations`.
 */
export async function submitStemfestRegistration(
  input: StemfestFormValues,
): Promise<StemfestSubmitResult> {
  const parsed = stemfestRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const data = parsed.data;
  const entries = buildEntries(data);
  if (entries.length === 0) {
    return { success: false, error: "Pick at least one event to register for." };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      success: false,
      error: "STEM Fest registration is temporarily unavailable.",
    };
  }

  const totalFee = computeTotalFee(entries);
  const segments = entries.map((entry) => describeEntry(entry)).join(", ");

  const { data: inserted, error } = await supabase
    .from("stem_fest_registrations")
    .insert([
      {
        name: data.name,
        class: data.classId,
        // The dropdown's value resolved to the school's name — the catalogue's
        // for a listed school, the participant's own words for "not listed".
        school: resolveSchoolName(data),
        segments: segments || "General",
        transaction_id: data.bkashTrxId.toUpperCase(),
        payment_number: data.bkashNumber,
        // Where the admin's verification emails the confirmation. Lower-cased here
        // rather than in SQL, so the address the participant reads back on their
        // receipt and the one Resend is handed are the same string.
        email: data.email.toLowerCase(),
      },
    ])
    .select("id, created_at")
    .single();

  if (error) {
    return { success: false, error: submissionErrorMessage() };
  }

  // Auto-link any incoming SMS that arrived before the user submitted the form
  try {
    const trxId = data.bkashTrxId.toUpperCase();
    await supabase
      .from("stem_fest_payment_sms")
      .update({
        matched_registration_id: inserted.id,
        status: "matched",
      })
      .eq("status", "unmatched")
      .ilike("transaction_id", trxId);
  } catch {
    // Non-critical background link failure should not fail user registration
  }

  return {
    success: true,
    id: inserted.id,
    submittedAt: inserted.created_at,
    totalFee,
  };
}
