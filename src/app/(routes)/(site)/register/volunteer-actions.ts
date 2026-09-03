"use server";

import {
  getSupabaseAdmin,
  submissionErrorMessage,
  type SubmitResult,
} from "@/lib/supabase-admin";
import {
  volunteerFormSchema,
  type VolunteerFormValues,
} from "./volunteer-validate";

/**
 * Insert a STEM Fest volunteer application into `volunteer_registrations`.
 * Ambassador applications keep their own table + action (`actions.ts`).
 */
export async function submitVolunteerForm(
  input: VolunteerFormValues
): Promise<SubmitResult> {
  const parsed = volunteerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: "Volunteer registration is temporarily unavailable." };
  }

  const data = parsed.data;
  const { data: inserted, error } = await supabase
    .from("volunteer_registrations")
    .insert([
      {
        full_name: data.fullName,
        class_section: data.classSection,
        roll: data.roll,
        shift: data.shift,
        student_code: data.studentCode,
        address: data.address,
        personal_phone: data.personalPhone,
        parents_phone: data.parentsPhone,
        attendance_week: data.attendanceWeek,
        parents_comfort: data.parentsComfort,
        campus_hesitation: data.campusHesitation,
        scenario_task_conflict: data.scenarioTaskConflict,
        scenario_peer_conduct: data.scenarioPeerConduct,
        selection_reason: data.selectionReason,
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
