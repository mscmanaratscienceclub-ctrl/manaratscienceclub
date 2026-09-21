import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

/**
 * STEM Fest volunteer applications.
 *
 * Deliberately its own table — the volunteer questions (roll, shift, student
 * code, six situational answers) share nothing with the ambassador form.
 * Created by `drizzle/create_volunteer_registrations.sql`.
 */
export const volunteerRegistrations = pgTable(
  "volunteer_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Student identity
    fullName: text("full_name").notNull(),
    classSection: text("class_section").notNull(),
    roll: text("roll").notNull(),
    shift: text("shift").notNull(),
    studentCode: text("student_code").notNull(),

    // Contact
    address: text("address").notNull(),
    personalPhone: text("personal_phone").notNull(),
    parentsPhone: text("parents_phone").notNull(),

    // Availability & consent
    attendanceWeek: text("attendance_week").notNull(),
    parentsComfort: text("parents_comfort").notNull(),
    campusHesitation: text("campus_hesitation").notNull(),

    // Situational & motivation
    scenarioTaskConflict: text("scenario_task_conflict").notNull(),
    scenarioPeerConduct: text("scenario_peer_conduct").notNull(),
    selectionReason: text("selection_reason").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("volunteer_registrations_created_at_idx").on(table.createdAt.desc()),
  ]
).enableRLS();

export type VolunteerRegistration = typeof volunteerRegistrations.$inferSelect;
