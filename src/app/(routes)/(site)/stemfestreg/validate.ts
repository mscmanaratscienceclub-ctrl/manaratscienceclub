import { z } from "zod";
import {
  STEMFEST_OTHER_SCHOOL_ID,
  buildEntry,
  stemfestClasses,
  stemfestEvents,
  stemfestSchools,
  type StemfestClassId,
  type StemfestEntry,
  type StemfestTeamSize,
} from "@/lib/data/stemfest-registration";

/**
 * Validation for the STEM Fest event registration form.
 * Mirrors `public.stem_fest_registrations`
 * (drizzle/create_stemfest_registrations.sql).
 *
 * The same schema guards the browser and the server action, and categories are
 * always re-derived from `classId` via `buildEntries` rather than accepted from
 * the client — a participant cannot claim a category their class isn't in.
 */

/** Bangladeshi mobile number — bKash wallets are mobile numbers. */
const phonePattern = /^(?:\+?8801|01)[\s-]?\d{9}$/;

function phoneField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(20, `${label} looks too long`)
    .refine(
      (value) => phonePattern.test(value.replace(/\s+/g, "")),
      "Enter a valid local number, e.g. 01XXXXXXXXX",
    );
}

/**
 * Teammate names live in fixed slots rather than an array so react-hook-form
 * can register them plainly — no `useFieldArray` needed for at most four names.
 */
export const TEAMMATE_SLOTS = [1, 2, 3, 4] as const;
export type TeammateSlot = (typeof TEAMMATE_SLOTS)[number];

export interface TeamFields {
  size: string;
  teammate1: string;
  teammate2: string;
  teammate3: string;
  teammate4: string;
}

const teamFieldsSchema = z.object({
  size: z.string(),
  teammate1: z.string(),
  teammate2: z.string(),
  teammate3: z.string(),
  teammate4: z.string(),
});

export const teamEventIds = stemfestEvents
  .filter((event) => event.teamBased)
  .map((event) => event.id);

const eventIds = new Set(stemfestEvents.map((event) => event.id));
const classIds = new Set<string>(stemfestClasses.map((entry) => entry.id));
const schoolIds = new Set<string>(stemfestSchools.map((entry) => entry.id));

export const stemfestRegistrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be under 100 characters"),
    /**
     * The dropdown's value: a known school id, or `STEMFEST_OTHER_SCHOOL_ID`.
     * The name that reaches the row is resolved by `resolveSchoolName`, so the
     * catalogue can be re-pointed without rewriting stored rows.
     */
    school: z.string().trim().min(1, "Choose your school").max(120),
    /** Only read when `school` is the "not listed" sentinel. */
    schoolOther: z.string().trim().max(120, "School name looks too long"),
    classId: z.string().trim().min(1, "Choose your class").max(30),
    phone: phoneField("Phone number"),
    /**
     * Where the bKash confirmation — the participant's receipt — is emailed. Asked
     * for here because the admin's verification flow sends to this address; the
     * column stays nullable for rows collected before the form asked.
     */
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .max(254, "Email address looks too long")
      .pipe(z.email("Enter a valid email address")),
    bkashNumber: phoneField("bKash number"),
    bkashTrxId: z
      .string()
      .trim()
      .min(1, "Transaction ID is required")
      .regex(
        /^[A-Za-z0-9]{6,20}$/,
        "Enter the TrxID exactly as bKash shows it — letters and numbers only",
      ),
    eventIds: z.array(z.string()),
    teams: z.record(z.string(), teamFieldsSchema),
  })
  .superRefine((values, ctx) => {
    const otherSchool = values.school === STEMFEST_OTHER_SCHOOL_ID;
    if (!otherSchool && !schoolIds.has(values.school)) {
      ctx.addIssue({
        code: "custom",
        path: ["school"],
        message: "Choose your school",
      });
    } else if (otherSchool && values.schoolOther.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["schoolOther"],
        message: "Enter your school's name",
      });
    }

    if (!classIds.has(values.classId)) {
      ctx.addIssue({
        code: "custom",
        path: ["classId"],
        message: "Choose your class",
      });
      return;
    }

    const classId = values.classId as StemfestClassId;

    if (values.eventIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["eventIds"],
        message: "Pick at least one event to register for",
      });
      return;
    }

    for (const eventId of values.eventIds) {
      const event = stemfestEvents.find((candidate) => candidate.id === eventId);
      if (!event || !eventIds.has(eventId)) {
        ctx.addIssue({
          code: "custom",
          path: ["eventIds"],
          message: "One of the selected events is not available",
        });
        return;
      }

      const eligible = event.categories.some((rule) =>
        rule.classes.includes(classId),
      );
      if (!eligible) {
        ctx.addIssue({
          code: "custom",
          path: ["eventIds"],
          message: `${event.name} is not open to your class`,
        });
        return;
      }

      if (!event.teamBased) continue;

      const team = values.teams[eventId];
      const size = parseTeamSize(team?.size);
      if (!size) {
        ctx.addIssue({
          code: "custom",
          path: ["teams", eventId, "size"],
          message: "Choose your team size",
        });
        continue;
      }

      const required = size - 1;
      const provided = countTeammates(team);
      if (provided < required) {
        ctx.addIssue({
          code: "custom",
          path: ["teams", eventId, `teammate${provided + 1}`],
          message: `A team of ${size} needs ${required} teammate ${required === 1 ? "name" : "names"}`,
        });
      }
    }
  });

export type StemfestFormValues = z.input<typeof stemfestRegistrationSchema>;

/** The size select stores strings; entries store the numeric literal. */
export function parseTeamSize(
  value: string | undefined,
): StemfestTeamSize | null {
  if (value === "4") return 4;
  if (value === "5") return 5;
  return null;
}

function countTeammates(team: TeamFields | undefined): number {
  if (!team) return 0;
  let count = 0;
  for (const slot of TEAMMATE_SLOTS) {
    if (team[`teammate${slot}`].trim()) count += 1;
    else break;
  }
  return count;
}

function collectTeammates(
  team: TeamFields | undefined,
  size: StemfestTeamSize,
): string[] {
  if (!team) return [];
  const names: string[] = [];
  for (const slot of TEAMMATE_SLOTS) {
    if (names.length >= size - 1) break;
    const value = team[`teammate${slot}`].trim();
    if (value) names.push(value);
  }
  return names;
}

/**
 * Turns the raw form into the authoritative entry list stored on the row.
 * Events the participant's class isn't eligible for are dropped rather than
 * stored, so this is safe to call on untrusted input.
 */
export function buildEntries(values: StemfestFormValues): StemfestEntry[] {
  if (!classIds.has(values.classId)) return [];
  const classId = values.classId as StemfestClassId;
  const entries: StemfestEntry[] = [];

  for (const eventId of values.eventIds) {
    const event = stemfestEvents.find((candidate) => candidate.id === eventId);
    if (!event) continue;

    const team = values.teams[eventId];
    const size = event.teamBased ? parseTeamSize(team?.size) : null;
    const entry = buildEntry(
      eventId,
      classId,
      size,
      event.teamBased && size ? collectTeammates(team, size) : [],
    );
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * The school name stored on the row: the catalogue's name for a listed school,
 * or the participant's own words when they picked "not listed".
 *
 * Resolution happens here rather than in SQL or the admin so a school can be
 * renamed in the catalogue without rewriting registrations already filed.
 */
export function resolveSchoolName(values: StemfestFormValues): string {
  const listed = stemfestSchools.find((entry) => entry.id === values.school);
  return listed ? listed.name : values.schoolOther.trim();
}

const emptyTeam = (): TeamFields => ({
  size: "",
  teammate1: "",
  teammate2: "",
  teammate3: "",
  teammate4: "",
});

export const EMPTY_STEMFEST_VALUES: StemfestFormValues = {
  name: "",
  school: "",
  schoolOther: "",
  classId: "",
  phone: "",
  email: "",
  bkashNumber: "",
  bkashTrxId: "",
  eventIds: [],
  teams: Object.fromEntries(teamEventIds.map((id) => [id, emptyTeam()])),
};
