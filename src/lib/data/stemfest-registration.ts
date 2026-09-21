/**
 * Catalogue for the STEM Fest event registration form
 * (`src/app/(routes)/(site)/stemfestreg/`).
 *
 * Single source of truth for the segments, the events inside them, which class
 * each event's category admits, and what everything costs. The form, the Zod
 * schema and the server action all read from here, so the fee shown to a
 * participant and the fee stored on their row can never disagree.
 *
 * This is deliberately separate from `stemfest.ts`, which drives the homepage
 * hero animation and is free to describe segments that aren't open for
 * registration.
 */

export type StemfestSegmentId =
  | "olympiads"
  | "robotics"
  | "project-display"
  | "esports";

export type StemfestClassId =
  | "class-3"
  | "class-4"
  | "class-5"
  | "class-6"
  | "class-7"
  | "class-8"
  | "class-9"
  | "class-10"
  | "as"
  | "a2"
  | "university";

export type StemfestTeamSize = 4 | 5;

/** How a segment turns selections into money. */
export type StemfestPricing = "olympiad-tier" | "team" | "per-title";

export const CURRENCY_SYMBOL = "৳";

export const stemfestClasses: { id: StemfestClassId; label: string }[] = [
  { id: "class-3", label: "Class 3" },
  { id: "class-4", label: "Class 4" },
  { id: "class-5", label: "Class 5" },
  { id: "class-6", label: "Class 6" },
  { id: "class-7", label: "Class 7" },
  { id: "class-8", label: "Class 8" },
  { id: "class-9", label: "Class 9" },
  { id: "class-10", label: "Class 10" },
  { id: "as", label: "AS/11" },
  { id: "a2", label: "A2/12" },
  { id: "university", label: "University" },
];

/** Grouping for the class dropdown — eleven flat options is a lot to scan. */
export const stemfestClassGroups: {
  label: string;
  classIds: StemfestClassId[];
}[] = [
  {
    label: "School",
    classIds: [
      "class-3",
      "class-4",
      "class-5",
      "class-6",
      "class-7",
      "class-8",
      "class-9",
      "class-10",
    ],
  },
  { label: "College levels", classIds: ["as", "a2"] },
  { label: "Higher education", classIds: ["university"] },
];

// ── Gender ───────────────────────────────────────────────────────────────────

/**
 * Gender, which is asked for one reason: it is the first character of a
 * participant's registration ID (`M7 001`). The ID itself is built by the
 * database — see `drizzle/add_stemfest_registration_ids.sql` — so this list is
 * the *form's* vocabulary only, and the letter each option contributes lives
 * with the trigger that writes it rather than here.
 *
 * Mirrors the vocabulary the ambassador table already uses
 * (`campus_ambassador_registrations.gender`), so the two forms agree on what the
 * three answers are called.
 */
export type StemfestGenderId = "male" | "female" | "other";

export const stemfestGenders: { id: StemfestGenderId; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

// ── Schools ──────────────────────────────────────────────────────────────────

/**
 * Sentinel select value for "my school isn't in the list". Picking it reveals a
 * free-text field, and the typed name is what gets stored.
 *
 * Deliberately not an entry in `stemfestSchools`: the catalogue stays a plain
 * list of real schools and the escape hatch can never be mistaken for one.
 */
export const STEMFEST_OTHER_SCHOOL_ID = "other";

/** The escape hatch's option label, kept here with the rest of the copy. */
export const stemfestOtherSchoolLabel = "My school isn’t listed";

export interface StemfestSchoolOption {
  id: string;
  name: string;
}

/**
 * The schools offered in the registration form's dropdown, with the host school
 * first.
 *
 * Only the resolved *name* is stored, so a school missing from here can still
 * register through the "not listed" option — this list is for convenience, not
 * an eligibility gate. `id` is a slug unique within the list; the form's select
 * matches on it and the stored value is the name.
 */
export const stemfestSchools: StemfestSchoolOption[] = [
  { id: "manarat-disc", name: "Manarat Dhaka International School & College" },
  { id: "adamjee-cantonment-college", name: "Adamjee Cantonment College" },
  {
    id: "rajarbag-police-lines",
    name: "Rajarbag Police Lines School and College",
  },
  { id: "dhaka-college", name: "Dhaka College" },
  {
    id: "viqarunnisa-noon",
    name: "Viqarunnisa Noon School and College",
  },
  {
    id: "govt-shahid-suhrawardy-college",
    name: "Government Shahid Suhrawardy College",
  },
  {
    id: "st-gregorys",
    name: "St Gregory's High School and College",
  },
  {
    id: "rajendrapur-cantonment-public",
    name: "Rajendrapur Cantonment Public School and College",
  },
  { id: "notre-dame-college", name: "Notre Dame College" },
  { id: "dhaka-city-college", name: "Dhaka City College" },
  {
    id: "st-joseph-higher-secondary",
    name: "St. Joseph Higher Secondary School",
  },
  {
    id: "dhaka-residential-model-college",
    name: "Dhaka Residential Model College",
  },
  { id: "milestone-college", name: "Milestone College" },
  { id: "ideal-school-and-college", name: "Ideal School and College" },
  { id: "government-science-college", name: "Government Science College" },
  {
    id: "adamjee-cantonment-public-school",
    name: "Adamjee Cantonment Public School",
  },
  {
    id: "bangladesh-international-school",
    name: "Bangladesh International School & College",
  },
  {
    id: "motijheel-model-school",
    name: "Motijheel Model School and College",
  },
  { id: "kazem-ali-school", name: "Kazem Ali School and College" },
  { id: "vashantek-government-college", name: "Vashantek Government College" },
  {
    id: "mohammadpur-preparatory",
    name: "Mohammadpur Preparatory School and College",
  },
  {
    id: "birshreshtha-munshi-abdur-rouf",
    name: "Birshreshtha Munshi Abdur Rouf Public College",
  },
  {
    id: "bpatc-school-savar",
    name: "Bangladesh Public Administration Training Centre (BPATC) School and College, Savar",
  },
  {
    id: "jalalabad-cantonment-public",
    name: "Jalalabad Cantonment Public School and College",
  },
  { id: "dhaka-commerce-college", name: "Dhaka Commerce College" },
  { id: "noubahini-college-dhaka", name: "Noubahini College, Dhaka" },
  {
    id: "cantonment-public-saidpur",
    name: "Cantonment Public School and College Saidpur",
  },
  {
    id: "dhaka-cantonment-girls-public",
    name: "Dhaka Cantonment Girls Public School and College",
  },
  { id: "shaheed-ramiz-uddin-school", name: "Shaheed Ramiz Uddin School" },
];

/**
 * Classes admitted to the open brackets — E-sports runs one per title.
 *
 * University is deliberately absent: the university class competes in Robotics
 * alone, so E-sports is not open to it. Robotics keeps `university` in its own
 * list below (`roboticsClasses`), which is the only place it appears.
 */
const openBracketClasses: StemfestClassId[] = stemfestClasses
  .map((c) => c.id)
  .filter((id) => id !== "university");

/** Classes admitted to Robotics, which runs from Class 7 all the way up. */
const roboticsClasses: StemfestClassId[] = [
  "class-7",
  "class-8",
  "class-9",
  "class-10",
  "as",
  "a2",
  "university",
];

/**
 * A `categoryId` of `null` means the event has no category split — the classes
 * list is purely an eligibility gate. Robotics and E-sports work that way.
 */
export interface StemfestCategoryRule {
  categoryId: string | null;
  label: string | null;
  classes: StemfestClassId[];
}

export interface StemfestEventOption {
  id: string;
  name: string;
  segmentId: StemfestSegmentId;
  teamBased: boolean;
  categories: StemfestCategoryRule[];
}

export interface StemfestSegmentOption {
  id: StemfestSegmentId;
  name: string;
  blurb: string;
  pricing: StemfestPricing;
}

export const stemfestSegments: StemfestSegmentOption[] = [
  {
    id: "olympiads",
    name: "Olympiads",
    blurb: "Written rounds, split into categories by your class.",
    pricing: "olympiad-tier",
  },
  {
    id: "robotics",
    name: "Robotics",
    blurb: "Open from Class 7 to University. Enter as a team of 4 or 5.",
    pricing: "team",
  },
  {
    id: "project-display",
    name: "Project Display",
    blurb: "Prototypes, papers and live demos, judged in person. Team of 4 or 5.",
    pricing: "team",
  },
  {
    id: "esports",
    name: "E-sports",
    blurb: "Three titles, open brackets, open to every class.",
    pricing: "per-title",
  },
];

/** `categoryId: null` — no split, the classes list is just the gate. */
function openTo(classes: StemfestClassId[]): StemfestCategoryRule[] {
  return [{ categoryId: null, label: null, classes }];
}

function category(
  categoryId: string,
  classes: StemfestClassId[],
): StemfestCategoryRule {
  return { categoryId, label: `Category ${categoryId}`, classes };
}

export const stemfestEvents: StemfestEventOption[] = [
  // ── Olympiads ──────────────────────────────────────────────────────────────
  {
    id: "mathematics",
    name: "Mathematics",
    segmentId: "olympiads",
    teamBased: false,
    categories: [
      category("A", ["class-3", "class-4"]),
      category("B", ["class-5", "class-6"]),
      category("C", ["class-7", "class-8"]),
      category("D", ["class-9", "class-10"]),
      category("E", ["as", "a2"]),
    ],
  },
  {
    id: "physics",
    name: "Physics",
    segmentId: "olympiads",
    teamBased: false,
    categories: [
      category("A", ["class-7", "class-8"]),
      category("B", ["class-9", "class-10"]),
      category("C", ["as", "a2"]),
    ],
  },
  {
    id: "bio-chem",
    name: "Bio-Chem",
    segmentId: "olympiads",
    teamBased: false,
    categories: [
      category("A", ["class-7", "class-8"]),
      category("B", ["class-9", "class-10"]),
      category("C", ["as", "a2"]),
    ],
  },
  {
    id: "general-science",
    name: "General Science",
    segmentId: "olympiads",
    teamBased: false,
    categories: [
      category("A", ["class-3", "class-4"]),
      category("B", ["class-5", "class-6"]),
    ],
  },
  {
    id: "computer-science",
    name: "Computer Science",
    segmentId: "olympiads",
    teamBased: false,
    categories: [
      category("A", ["class-7", "class-8"]),
      category("B", ["class-9", "class-10"]),
      category("C", ["as", "a2"]),
    ],
  },

  // ── Robotics ───────────────────────────────────────────────────────────────
  // Both events are team-based and have no category split: the classes list is
  // purely an eligibility gate, so `rule.label` is null and the picker shows
  // only the "Team" badge. Priced by `pricing: "team"` on the segment above.
  {
    id: "lfr",
    name: "LFR (Line Following Robot)",
    segmentId: "robotics",
    teamBased: true,
    categories: openTo(roboticsClasses),
  },
  {
    id: "robosoccer",
    name: "Robosoccer",
    segmentId: "robotics",
    teamBased: true,
    categories: openTo(roboticsClasses),
  },

  // ── Project Display ────────────────────────────────────────────────────────
  {
    id: "project-display",
    name: "Project Display",
    segmentId: "project-display",
    teamBased: true,
    categories: [
      category("A", ["class-3", "class-4", "class-5"]),
      category("B", ["class-6", "class-7", "class-8"]),
      category("C", ["class-9", "class-10", "as", "a2"]),
    ],
  },

  // ── E-sports ───────────────────────────────────────────────────────────────
  {
    id: "ea-fc-26",
    name: "EA FC 26",
    segmentId: "esports",
    teamBased: false,
    categories: openTo(openBracketClasses),
  },
  {
    id: "clash-royale",
    name: "Clash Royale",
    segmentId: "esports",
    teamBased: false,
    categories: openTo(openBracketClasses),
  },
  {
    id: "minecraft-bedwars",
    name: "Minecraft — Bedwars (Solos)",
    segmentId: "esports",
    teamBased: false,
    categories: openTo(openBracketClasses),
  },
];

/**
 * One member of a team entry, other than the registrant.
 *
 * Stored as an object rather than a bare name because the fest needs each
 * teammate's email and school for certificates and results. Entries written by a
 * build from before this shape existed carry plain strings — read them through
 * `normalizeTeammate`, which tolerates both.
 */
export interface StemfestTeammate {
  name: string;
  email: string;
  school: string;
}

/**
 * One participant's entry in one event. This is the shape stored in the
 * `entries` jsonb column, and the shape the server rebuilds from scratch —
 * never trusting whatever the browser sent.
 */
export interface StemfestEntry {
  segmentId: StemfestSegmentId;
  eventId: string;
  categoryId: string | null;
  teamSize: StemfestTeamSize | null;
  teammates: StemfestTeammate[];
  /**
   * What the team calls itself, for team events. Optional by design: a team that
   * has not settled on a name can still register, so this is `null` rather than
   * an empty string. Absent entirely on entries stored by a build from before the
   * field existed — always read it as `entry.teamName ?? null`.
   */
  teamName: string | null;
}

// ── Fees ─────────────────────────────────────────────────────────────────────

export const stemfestFees = {
  olympiadFirst: 400,
  olympiadAdditional: 350,
  /**
   * What the *first* Olympiad event costs a student of the host school.
   *
   * A deliberate concession, and deliberately unadvertised: no copy on the form,
   * the fee summary, the receipt or the confirmation email names it or explains
   * why a total came out lower. Every later event still costs
   * `olympiadAdditional`, so a host-school participant pays 350 per event, and
   * `pricingNote` — the one place the Olympiad tier is stated publicly — keeps
   * quoting the standard rate to everyone.
   */
  olympiadFirstManarat: 350,
  esportsPerTitle: 200,
  teamOfFour: 1500,
  teamOfFive: 2000,
} as const;

export const stemfestTeamSizes: StemfestTeamSize[] = [4, 5];

export function teamFee(teamSize: StemfestTeamSize): number {
  return teamSize === 5 ? stemfestFees.teamOfFive : stemfestFees.teamOfFour;
}

/**
 * Whether a *resolved* school name is the host school — the only thing the
 * discounted Olympiad rate above turns on.
 *
 * Substring rather than equality on purpose. The form stores the catalogue's name
 * for a listed school and the participant's own words for "my school isn't
 * listed", so an equality test would miss every host-school student who typed the
 * name out by hand. No other school in `stemfestSchools` contains the word, so
 * the loose match cannot hand the rate to the wrong school — and it stays in step
 * with the way the admin's school league table already groups these names.
 */
export function isManaratSchool(school: string | null | undefined): boolean {
  return /manarat/i.test(school ?? "");
}

/**
 * One-line fee hint shown under each segment heading. Built from
 * `stemfestFees` so the displayed copy can never drift from what is charged.
 */
export function pricingNote(pricing: StemfestPricing): string {
  switch (pricing) {
    case "olympiad-tier":
      return `${formatBdt(stemfestFees.olympiadFirst)} for your first event, ${formatBdt(stemfestFees.olympiadAdditional)} for each one after`;
    case "team":
      return `${formatBdt(stemfestFees.teamOfFour)} for a team of 4 · ${formatBdt(stemfestFees.teamOfFive)} for a team of 5`;
    case "per-title":
      return `${formatBdt(stemfestFees.esportsPerTitle)} per title`;
  }
}

export function formatBdt(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-US")}`;
}

const segmentById = new Map(
  stemfestSegments.map((segment) => [segment.id, segment]),
);
const eventById = new Map(stemfestEvents.map((event) => [event.id, event]));

export function getStemfestEvent(eventId: string): StemfestEventOption | undefined {
  return eventById.get(eventId);
}

export function getStemfestSegment(
  segmentId: StemfestSegmentId,
): StemfestSegmentOption | undefined {
  return segmentById.get(segmentId);
}

export function getStemfestClassLabel(classId: string): string {
  return (
    stemfestClasses.find((entry) => entry.id === classId)?.label ?? classId
  );
}

/**
 * The label for a stored gender, or `null` when there isn't one.
 *
 * `null` rather than the raw value: a row collected before the form asked for a
 * gender has none, and the admin surfaces render that as an em dash. Returning
 * `classId`-style passthrough text here would print `—` as a gender.
 */
export function getStemfestGenderLabel(gender: string | null): string | null {
  if (!gender) return null;
  return stemfestGenders.find((entry) => entry.id === gender)?.label ?? gender;
}

/**
 * How a registration ID reads, shown under the gender field so a participant
 * understands what they are choosing it for. The ID itself is minted by the
 * database on insert (`drizzle/add_stemfest_registration_ids.sql`) — this is
 * copy only, and deliberately does not claim a format the trigger could drift
 * from: it shows the shape with a worked example.
 */
export const stemfestRegistrationIdHint =
  "Your registration ID is built from this and your class — e.g. M7001: M for male, 7 for Class 7, then your number.";

/**
 * The category a participant lands in for one event, derived from their class.
 * `null` means the event isn't open to them at all.
 *
 * Deriving this instead of asking is the whole point of the form: nobody can
 * pick a category their class doesn't belong to.
 */
export function resolveCategoryRule(
  event: StemfestEventOption,
  classId: StemfestClassId,
): StemfestCategoryRule | null {
  return event.categories.find((rule) => rule.classes.includes(classId)) ?? null;
}

export interface EligibleEvent {
  event: StemfestEventOption;
  /** Null for events with no category split (E-sports). */
  rule: StemfestCategoryRule;
}

export interface EligibleSegment {
  segment: StemfestSegmentOption;
  events: EligibleEvent[];
}

/**
 * The catalogue narrowed to one class, grouped by segment, in catalogue order.
 * Segments the class has nothing in are dropped entirely.
 */
export function eligibleSegmentsForClass(
  classId: StemfestClassId,
): EligibleSegment[] {
  const result: EligibleSegment[] = [];

  for (const segment of stemfestSegments) {
    const events: EligibleEvent[] = [];
    for (const event of stemfestEvents) {
      if (event.segmentId !== segment.id) continue;
      const rule = resolveCategoryRule(event, classId);
      if (rule) events.push({ event, rule });
    }
    if (events.length) result.push({ segment, events });
  }

  return result;
}

export interface FeeLine {
  segmentId: StemfestSegmentId;
  title: string;
  detail: string;
  amount: number;
}

export interface FeeSummary {
  lines: FeeLine[];
  total: number;
}

/**
 * What the fee depends on beyond the entries themselves.
 */
export interface FeeOptions {
  /**
   * The registrant's school, already resolved to the name that gets stored on the
   * row (`resolveSchoolName`). Only the Olympiad tier reads it — everything else
   * costs the same whoever you are.
   */
  school?: string | null;
}

/**
 * Itemised fee for a set of entries, grouped by segment.
 *
 * Olympiads are tiered across the whole segment — the first costs 400 and each
 * further one 350 — so they collapse into a single line rather than one per
 * event. Everything else is priced per entry. A host-school registrant's first
 * event is charged the discounted rate instead (see `stemfestFees`), with no line
 * in the summary pointing at it.
 */
export function computeFeeSummary(
  entries: StemfestEntry[],
  options: FeeOptions = {},
): FeeSummary {
  const lines: FeeLine[] = [];
  let total = 0;

  const olympiadEntries = entries.filter(
    (entry) => segmentById.get(entry.segmentId)?.pricing === "olympiad-tier",
  );

  if (olympiadEntries.length > 0) {
    const first = isManaratSchool(options.school)
      ? stemfestFees.olympiadFirstManarat
      : stemfestFees.olympiadFirst;
    const amount =
      first + (olympiadEntries.length - 1) * stemfestFees.olympiadAdditional;
    total += amount;
    lines.push({
      segmentId: "olympiads",
      title: "Olympiads",
      // The count and nothing else. The tier is already stated once, under the
      // segment heading (`pricingNote`); spelling out "first 400, then 350 each"
      // again here would print a price that is wrong for a discounted
      // registrant and would hand them the difference to notice.
      detail:
        olympiadEntries.length === 1
          ? "1 event"
          : `${olympiadEntries.length} events`,
      amount,
    });
  }

  for (const entry of entries) {
    const segment = segmentById.get(entry.segmentId);
    if (!segment || segment.pricing === "olympiad-tier") continue;

    const event = eventById.get(entry.eventId);
    const name = event?.name ?? entry.eventId;

    if (segment.pricing === "per-title") {
      total += stemfestFees.esportsPerTitle;
      lines.push({
        segmentId: segment.id,
        title: `${segment.name} — ${name}`,
        detail: "1 title",
        amount: stemfestFees.esportsPerTitle,
      });
      continue;
    }

    const size = entry.teamSize ?? 4;
    const amount = teamFee(size);
    total += amount;
    lines.push({
      segmentId: segment.id,
      title: `${segment.name} — ${name}`,
      detail: `Team of ${size}`,
      amount,
    });
  }

  return { lines, total };
}

export function computeTotalFee(
  entries: StemfestEntry[],
  options: FeeOptions = {},
): number {
  return computeFeeSummary(entries, options).total;
}

/**
 * Builds one authoritative entry from a raw selection, re-deriving the category
 * from the participant's class. Returns `null` when the event isn't open to
 * that class, so an ineligible pick is dropped rather than stored.
 */
export function buildEntry(
  eventId: string,
  classId: StemfestClassId,
  teamSize: StemfestTeamSize | null,
  teammates: StemfestTeammate[],
  teamName: string | null = null,
): StemfestEntry | null {
  const event = eventById.get(eventId);
  if (!event) return null;

  const rule = resolveCategoryRule(event, classId);
  if (!rule) return null;

  return {
    segmentId: event.segmentId,
    eventId: event.id,
    categoryId: rule.categoryId,
    teamSize: event.teamBased ? teamSize : null,
    teammates: event.teamBased ? teammates : [],
    // Only a team event can carry a team name; a solo pick never does.
    teamName: event.teamBased ? teamName : null,
  };
}

/** Short human label for an entry, used on the receipt and in the admin table. */
export function describeEntry(entry: StemfestEntry): string {
  const event = eventById.get(entry.eventId);
  const name = event?.name ?? entry.eventId;
  const rule = event
    ? event.categories.find((r) => r.categoryId === entry.categoryId)
    : undefined;

  const parts = [name];
  if (rule?.label) parts.push(rule.label);
  if (entry.teamSize) parts.push(`Team of ${entry.teamSize}`);
  // The team's own name, in quotes, so it reads as the team's words rather than
  // as another catalogue label. `?? null` because an entry written before the
  // field existed has no key at all.
  if (entry.teamName ?? null) parts.push(`Team “${entry.teamName}”`);
  return parts.join(" · ");
}

/**
 * Reads one stored teammate, tolerating the bare-name shape written before the
 * form asked for an email and a school. Missing fields read as empty strings.
 */
export function normalizeTeammate(
  teammate: StemfestTeammate | string | null | undefined,
): StemfestTeammate {
  if (!teammate) return { name: "", email: "", school: "" };
  if (typeof teammate === "string") {
    return { name: teammate, email: "", school: "" };
  }
  return {
    name: teammate.name ?? "",
    email: teammate.email ?? "",
    school: teammate.school ?? "",
  };
}

/**
 * The team names across a set of entries, deduplicated and in entry order.
 *
 * A participant can enter more than one team event with the same name, and the
 * admin table's `segments` column already carries it per entry — this is for the
 * surfaces that want the names once, such as a roster heading.
 */
export function teamNamesForEntries(entries: StemfestEntry[]): string[] {
  const names: string[] = [];
  for (const entry of entries) {
    const name = entry.teamName ?? null;
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

// ── Form copy ────────────────────────────────────────────────────────────────

export const stemfestFormCopy = {
  eyebrow: "STEM Fest Registration",
  heading: "Pick your events",
  subheading:
    "Choose your class first — the events open to you appear below with your category already worked out. Your total updates as you pick.",
  classPrompt:
    "Choose your class above and the events you can enter will appear here, with your category filled in automatically.",
  teamCaption:
    "Only shown for the team events you picked. You register and pay for the whole team.",
  teamNameLabel: "Team name",
  teamNameHint:
    "Optional — what your team should be called on the results sheet.",
  teamNamePlaceholder: "e.g. Circuit Breakers",
  teammateDetailsHint:
    "Every teammate’s name, email and school — we use them for certificates and results.",
  confirmation:
    "We have your entry and your bKash reference. We will match the payment and confirm your slots.",
  resubmitLabel: "Register another participant",
  resubmitNote:
    "Registering a sibling or a whole team? Start a fresh entry below — it creates a separate registration.",
  submitLabel: "Submit registration",
  disclaimer:
    "Your registration is only confirmed once the payment is matched against your bKash Transaction ID. Sending a wrong or reused TrxID will delay your slots.",
} as const;

// ── Payment copy ─────────────────────────────────────────────────────────────

export const stemfestPaymentCopy = {
  merchantNumber: "01718446955 or 01911499865",
  merchantLabel: "Manarat Science Club — bKash (Personal)",
  instructions: [
    "Send the exact total shown in your summary to the bKash number above.",
    "Open your bKash app or the confirmation SMS and copy the Transaction ID (TrxID).",
    "Enter the number you sent from and that TrxID below — that is how we match your payment to your registration.",
  ],
  trxIdHint:
    "A short code like 8N7A2B1C2D, found in your bKash confirmation SMS under “TrxID”.",
} as const;
