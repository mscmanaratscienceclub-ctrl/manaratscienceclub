import { z } from "zod";
import {
  STEMFEST_NO_REFERENCE_ID,
  STEMFEST_OTHER_SCHOOL_ID,
  buildEntry,
  referencesForSchool,
  stemfestClasses,
  stemfestEvents,
  stemfestGenders,
  stemfestSchools,
  type StemfestClassId,
  type StemfestEntry,
  type StemfestTeammate,
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

/** Shared email rule — the participant's address and every teammate's. */
function emailField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(254, `${label} looks too long`)
    .pipe(z.email("Enter a valid email address"));
}

const emailSchema = z.email();

/**
 * Teammate names live in fixed slots rather than an array so react-hook-form
 * can register them plainly — no `useFieldArray` needed for at most four names.
 */
export const TEAMMATE_SLOTS = [1, 2, 3, 4] as const;
export type TeammateSlot = (typeof TEAMMATE_SLOTS)[number];

export interface TeamFields {
  size: string;
  /** Optional: a team without a name on the results sheet is still a team. */
  teamName: string;
  teammate1: StemfestTeammate;
  teammate2: StemfestTeammate;
  teammate3: StemfestTeammate;
  teammate4: StemfestTeammate;
}

/**
 * One teammate's three answers. They are plain strings here even though only
 * slots below the chosen team size are required — the superRefine pass enforces
 * which ones must be filled, so the shape stays uniform for react-hook-form.
 */
const teammateFieldsSchema = z.object({
  name: z.string(),
  email: z.string(),
  school: z.string(),
});

const teamFieldsSchema = z.object({
  size: z.string(),
  teamName: z.string(),
  teammate1: teammateFieldsSchema,
  teammate2: teammateFieldsSchema,
  teammate3: teammateFieldsSchema,
  teammate4: teammateFieldsSchema,
});

/** Team names are printed on a results sheet, so the bound is a name, not a story. */
export const TEAM_NAME_MAX_LENGTH = 60;

export const teamEventIds = stemfestEvents
  .filter((event) => event.teamBased)
  .map((event) => event.id);

const eventIds = new Set(stemfestEvents.map((event) => event.id));
const classIds = new Set<string>(stemfestClasses.map((entry) => entry.id));
const schoolIds = new Set<string>(stemfestSchools.map((entry) => entry.id));
const genderIds = new Set<string>(stemfestGenders.map((entry) => entry.id));

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
    /**
     * Who referred the participant, from the list their school maps to. Accepted
     * here as a plain string and checked in the pass below, which is the only
     * place that knows which school was chosen — a name from the other school's
     * list is rejected rather than stored, so the club can trust the column.
     */
    reference: z.string().trim().max(120, "Reference looks too long"),
    classId: z.string().trim().min(1, "Choose your class").max(30),
    /**
     * Required, and not merely for the record: the first character of the
     * participant's registration ID comes from here (`M7001`), and the ID is
     * minted by the database on insert. A missing gender would produce an `X`
     * prefix, which is reserved for rows that predate the question.
     */
    gender: z.string().trim().min(1, "Choose your gender").max(20),
    phone: phoneField("Phone number"),
    /**
     * Where the bKash confirmation — the participant's receipt — is emailed. Asked
     * for here because the admin's verification flow sends to this address; the
     * column stays nullable for rows collected before the form asked.
     */
    email: emailField("Email address"),
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

    // Checked against the list the *resolved* school maps to, which is the same
    // resolution the row is written with — so "not listed" is judged on the name
    // the participant typed rather than on the sentinel.
    const reference = values.reference?.trim() ?? "";
    if (!reference) {
      ctx.addIssue({
        code: "custom",
        path: ["reference"],
        message: "Choose your reference",
      });
    } else if (
      reference !== STEMFEST_NO_REFERENCE_ID &&
      !referencesForSchool(resolveSchoolName(values)).includes(reference)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reference"],
        message: "Pick a reference from the list for your school",
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

    if (!genderIds.has(values.gender)) {
      ctx.addIssue({
        code: "custom",
        path: ["gender"],
        message: "Choose your gender",
      });
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

      const teamName = team?.teamName?.trim() ?? "";
      if (teamName.length > TEAM_NAME_MAX_LENGTH) {
        ctx.addIssue({
          code: "custom",
          path: ["teams", eventId, "teamName"],
          message: `Team name must be under ${TEAM_NAME_MAX_LENGTH} characters`,
        });
      }

      const required = size - 1;
      for (const slot of TEAMMATE_SLOTS) {
        if (slot > required) break;
        const teammate = team?.[`teammate${slot}`];

        if (!teammate?.name?.trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["teams", eventId, `teammate${slot}`, "name"],
            message: `Teammate ${slot}'s name is required`,
          });
        }

        const teammateEmail = teammate?.email?.trim() ?? "";
        if (!teammateEmail) {
          ctx.addIssue({
            code: "custom",
            path: ["teams", eventId, `teammate${slot}`, "email"],
            message: `Teammate ${slot}'s email is required`,
          });
        } else if (!emailSchema.safeParse(teammateEmail).success) {
          ctx.addIssue({
            code: "custom",
            path: ["teams", eventId, `teammate${slot}`, "email"],
            message: `Teammate ${slot}'s email looks invalid`,
          });
        }

        if (!teammate?.school?.trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["teams", eventId, `teammate${slot}`, "school"],
            message: `Teammate ${slot}'s school is required`,
          });
        }
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

function collectTeammates(
  team: TeamFields | undefined,
  size: StemfestTeamSize,
): StemfestTeammate[] {
  if (!team) return [];
  const members: StemfestTeammate[] = [];
  for (const slot of TEAMMATE_SLOTS) {
    if (members.length >= size - 1) break;
    const value = team[`teammate${slot}`];
    const name = value?.name?.trim() ?? "";
    if (!name) continue;
    members.push({
      name,
      // Lower-cased like the registrant's address, so the two agree wherever
      // they are compared or emailed.
      email: value.email.trim().toLowerCase(),
      school: value.school.trim(),
    });
  }
  return members;
}

/**
 * The team's name, or `null` when they didn't give one.
 *
 * `null` rather than `""`: an unnamed team is a real answer, and storing an empty
 * string would make "no name" and "a name of spaces" the same thing on every
 * surface that reads the entry.
 */
function collectTeamName(team: TeamFields | undefined): string | null {
  const value = team?.teamName?.trim() ?? "";
  return value ? value : null;
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
      // Read even when no size was chosen: the name is the team's, not the
      // roster's, so it survives a participant fixing their team size.
      event.teamBased ? collectTeamName(team) : null,
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

const emptyTeammate = (): StemfestTeammate => ({
  name: "",
  email: "",
  school: "",
});

const emptyTeam = (): TeamFields => ({
  size: "",
  teamName: "",
  teammate1: emptyTeammate(),
  teammate2: emptyTeammate(),
  teammate3: emptyTeammate(),
  teammate4: emptyTeammate(),
});

/**
 * Reads one teammate out of a stored draft, tolerating the bare-name shape a
 * draft saved before the email/school questions existed still holds, and missing
 * objects generally. Returns a complete teammate either way.
 */
function hydrateTeammate(value: unknown): StemfestTeammate {
  if (typeof value === "string") return { name: value, email: "", school: "" };
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      email: typeof record.email === "string" ? record.email : "",
      school: typeof record.school === "string" ? record.school : "",
    };
  }
  return emptyTeammate();
}

/** The stored draft's team block, filled out to a complete `TeamFields`. */
function hydrateTeam(value: unknown): TeamFields {
  const base = emptyTeam();
  if (!value || typeof value !== "object") return base;
  const record = value as Record<string, unknown>;
  return {
    size: typeof record.size === "string" ? record.size : base.size,
    teamName: typeof record.teamName === "string" ? record.teamName : base.teamName,
    teammate1: hydrateTeammate(record.teammate1),
    teammate2: hydrateTeammate(record.teammate2),
    teammate3: hydrateTeammate(record.teammate3),
    teammate4: hydrateTeammate(record.teammate4),
  };
}

/**
 * Rebuilds complete form values from a stored draft, filling anything the draft
 * predates. Kept here rather than in the form so the shape's rules live with the
 * schema that owns it.
 */
export function restoreStemfestDraft(
  draft: Partial<StemfestFormValues> | null,
): StemfestFormValues {
  return {
    ...EMPTY_STEMFEST_VALUES,
    ...draft,
    // A draft saved before the gender field existed would leave the select empty
    // while the schema requires it — filled from the defaults, same as a draft
    // saved before a team event existed is missing its slots.
    gender: draft?.gender || EMPTY_STEMFEST_VALUES.gender,
    eventIds: draft?.eventIds ?? [],
    teams: Object.fromEntries(
      teamEventIds.map((id) => [id, hydrateTeam(draft?.teams?.[id])]),
    ),
  };
}

export const EMPTY_STEMFEST_VALUES: StemfestFormValues = {
  name: "",
  school: "",
  schoolOther: "",
  reference: "",
  classId: "",
  gender: "",
  phone: "",
  email: "",
  bkashNumber: "",
  bkashTrxId: "",
  eventIds: [],
  teams: Object.fromEntries(teamEventIds.map((id) => [id, emptyTeam()])),
};
