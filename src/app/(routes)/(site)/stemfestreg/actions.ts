"use server";

import {
  getSupabaseAdmin,
  submissionErrorMessage,
} from "@/lib/supabase-admin";
import { computeTotalFee } from "@/lib/data/stemfest-registration";
import {
  buildEntries,
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
 * Insert a STEM Fest event registration into `stemfest_registrations`.
 *
 * Categories and the fee are both recomputed here from the class and the chosen
 * event ids. Anything the browser claims about those is ignored — `total_fee`
 * is money, so it must not be settable by the client.
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

  const { data: inserted, error } = await supabase
    .from("stemfest_registrations")
    .insert([
      {
        name: data.name,
        class: data.classId,
        phone: data.phone,
        bkash_number: data.bkashNumber,
        bkash_trx_id: data.bkashTrxId.toUpperCase(),
        entries,
        total_fee: totalFee,
      },
    ])
    .select("id, created_at, total_fee")
    .single();

  if (error) {
    return { success: false, error: submissionErrorMessage() };
  }

  return {
    success: true,
    id: inserted.id,
    submittedAt: inserted.created_at,
    totalFee: inserted.total_fee,
  };
}
