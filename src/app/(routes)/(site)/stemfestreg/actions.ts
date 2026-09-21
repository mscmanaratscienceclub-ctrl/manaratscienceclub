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
 * receipt shows the server's number rather than the browser's — and with the
 * registration ID the database minted, which is the number the participant is
 * told and the club looks them up by.
 */
export type StemfestSubmitResult =
  | {
      success: true;
      id: string;
      /** `<GENDER><CLASS><NNN>`, assigned by a trigger on insert. */
      registrationCode: string;
      submittedAt: string;
      totalFee: number;
    }
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

  // Resolved once, because both the stored row and the fee turn on it — the
  // Olympiad tier is charged at a different rate to a host-school participant.
  const school = resolveSchoolName(data);
  const totalFee = computeTotalFee(entries, { school });
  const segments = entries.map((entry) => describeEntry(entry)).join(", ");

  const { data: inserted, error } = await supabase
    .from("stem_fest_registrations")
    // `total_fee` is a column added by `drizzle/add_stemfest_total_fee.sql` — an
    // un-migrated database refuses this insert outright, so that file has to be
    // run before this build is deployed.
    .insert([
      {
        name: data.name,
        class: data.classId,
        // The dropdown's value resolved to the school's name — the catalogue's
        // for a listed school, the participant's own words for "not listed".
        school,
        // The amount the participant was told to send, recomputed here from the
        // catalogue rather than trusted from the browser. Written so the admin
        // panel can say what a row owes without re-deriving it from `segments`.
        total_fee: totalFee,
        // The ID's first character is derived from this, by the trigger that
        // mints `registration_code` on insert.
        gender: data.gender,
        segments: segments || "General",
        transaction_id: data.bkashTrxId.toUpperCase(),
        payment_number: data.bkashNumber,
        // Where the admin's verification emails the confirmation. Lower-cased here
        // rather than in SQL, so the address the participant reads back on their
        // receipt and the one Resend is handed are the same string.
        email: data.email.toLowerCase(),
      },
    ])
    // `registration_code` is never sent: the `stemfest_assign_registration_code`
    // trigger fills it, and the value is read back so the receipt shows the ID
    // that was actually stored rather than one the browser guessed at.
    .select("id, registration_code, created_at")
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
    registrationCode: inserted.registration_code,
    submittedAt: inserted.created_at,
    totalFee,
  };
}
