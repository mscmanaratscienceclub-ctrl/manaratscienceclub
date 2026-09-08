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
  { id: "as", label: "AS Level" },
  { id: "a2", label: "A2 Level" },
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
  { label: "A Levels", classIds: ["as", "a2"] },
  { label: "Higher education", classIds: ["university"] },
];

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

const everyClass: StemfestClassId[] = stemfestClasses.map((c) => c.id);

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
      { categoryId: "junior", label: "Junior", classes: ["class-7", "class-8", "class-9"] },
      { categoryId: "senior", label: "Senior", classes: ["class-10", "as", "a2"] },
    ],
  },

  // ── Robotics ───────────────────────────────────────────────────────────────
  {
    id: "robosoccer",
    name: "Robosoccer",
    segmentId: "robotics",
    teamBased: true,
    categories: openTo(roboticsClasses),
  },
  {
    id: "lfr",
    name: "LFR",
    segmentId: "robotics",
    teamBased: true,
    categories: openTo(roboticsClasses),
  },
  {
    id: "roborace",
    name: "Roborace",
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
    categories: openTo(everyClass),
  },
  {
    id: "clash-royale",
    name: "Clash Royale",
    segmentId: "esports",
    teamBased: false,
    categories: openTo(everyClass),
  },
  {
    id: "minecraft-bedwars",
    name: "Minecraft — Bedwars (Solos)",
    segmentId: "esports",
    teamBased: false,
    categories: openTo(everyClass),
  },
];

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
  teammates: string[];
}

// ── Fees ─────────────────────────────────────────────────────────────────────

export const stemfestFees = {
  olympiadFirst: 400,
  olympiadAdditional: 350,
  esportsPerTitle: 200,
  teamOfFour: 1600,
  teamOfFive: 2000,
} as const;

export const stemfestTeamSizes: StemfestTeamSize[] = [4, 5];

export function teamFee(teamSize: StemfestTeamSize): number {
  return teamSize === 5 ? stemfestFees.teamOfFive : stemfestFees.teamOfFour;
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
  /** Null for events with no category split (Robotics, E-sports). */
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
 * Itemised fee for a set of entries, grouped by segment.
 *
 * Olympiads are tiered across the whole segment — the first costs 400 and each
 * further one 350 — so they collapse into a single line rather than one per
 * event. Everything else is priced per entry.
 */
export function computeFeeSummary(entries: StemfestEntry[]): FeeSummary {
  const lines: FeeLine[] = [];
  let total = 0;

  const olympiadEntries = entries.filter(
    (entry) => segmentById.get(entry.segmentId)?.pricing === "olympiad-tier",
  );

  if (olympiadEntries.length > 0) {
    const amount =
      stemfestFees.olympiadFirst +
      (olympiadEntries.length - 1) * stemfestFees.olympiadAdditional;
    total += amount;
    lines.push({
      segmentId: "olympiads",
      title: "Olympiads",
      detail:
        olympiadEntries.length === 1
          ? "1 event"
          : `${olympiadEntries.length} events — first ${stemfestFees.olympiadFirst}, then ${stemfestFees.olympiadAdditional} each`,
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

export function computeTotalFee(entries: StemfestEntry[]): number {
  return computeFeeSummary(entries).total;
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
  teammates: string[],
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
  return parts.join(" · ");
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

/**
 * TODO(before launch): replace `merchantNumber` with the real bKash number the
 * club collects fees on. It was not in the brief and must not be guessed —
 * participants are shown this verbatim and send real money to it.
 */
export const stemfestPaymentCopy = {
  merchantNumber: "01XXXXXXXXX",
  merchantLabel: "Manarat Science Club — bKash (Personal)",
  instructions: [
    "Send the exact total shown in your summary to the bKash number above.",
    "Open your bKash app or the confirmation SMS and copy the Transaction ID (TrxID).",
    "Enter the number you sent from and that TrxID below — that is how we match your payment to your registration.",
  ],
  trxIdHint:
    "A short code like 8N7A2B1C2D, found in your bKash confirmation SMS under “TrxID”.",
} as const;
