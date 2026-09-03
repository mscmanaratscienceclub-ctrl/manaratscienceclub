import { z } from "zod";

/**
 * Validation for the STEM Fest volunteer application.
 * Mirrors `public.volunteer_registrations`
 * (drizzle/create_volunteer_registrations.sql).
 */

const phonePattern = /^(?:\+?8801|01)[\s-]?\d{9}$/;

function phoneField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(20, `${label} looks too long`)
    .refine(
      (value) => phonePattern.test(value.replace(/\s+/g, "")),
      "Enter a valid local number, e.g. 01XXXXXXXXX"
    );
}

function answerField(label: string, min: number) {
  return z
    .string()
    .trim()
    .min(min, `Please write a little more (${min}+ characters)`)
    .max(1000, "Keep it under 1 000 characters");
}

export const volunteerFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  classSection: z.string().trim().min(1, "Class section is required").max(50),
  roll: z.string().trim().min(1, "Roll is required").max(30),
  shift: z.string().trim().min(1, "Shift is required").max(30),
  studentCode: z
    .string()
    .trim()
    .min(1, "Student code is required")
    .max(40, "Student code must be under 40 characters"),

  address: z
    .string()
    .trim()
    .min(5, "Please write your full address")
    .max(500, "Address must be under 500 characters"),
  personalPhone: phoneField("Personal phone no"),
  parentsPhone: phoneField("Parents phone no"),

  attendanceWeek: answerField("This answer", 10),
  parentsComfort: answerField("This answer", 10),
  campusHesitation: answerField("This answer", 10),
  scenarioTaskConflict: answerField("This answer", 20),
  scenarioPeerConduct: answerField("This answer", 20),
  selectionReason: answerField("This answer", 20),
});

export type VolunteerFormValues = z.infer<typeof volunteerFormSchema>;

