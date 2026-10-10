/**
 * Content for the `/details` page — the whole MDIC STEM-FEST 2026-27 brief in
 * one place: the dates, the venue, what each segment is worth, who each event
 * is open to, and how the papers run.
 *
 * The event rows are *derived* from the registration catalogue
 * (`stemfest-registration.ts`), the same way `/syllabus` builds its list: a
 * segment's events, their class bands and their category letters on this page
 * can never disagree with what the form actually lets you enter. Only what the
 * catalogue cannot say — prize pools, calculator rules, paper format, the
 * E-sports brackets, the fest's own social pages — is authored here, keyed by
 * segment id and event id.
 *
 * Publishing detail is a data edit, never a component edit. A slot with nothing
 * in it yet — the day-by-day run sheet today — renders as reserved space rather
 * than as a gap, so the page can be live while part of the brief is still being
 * confirmed.
 */

import {
  CURRENCY_SYMBOL,
  stemfestClasses,
  stemfestEvents,
  stemfestSegments,
  stemfestTeamSizes,
  type StemfestClassId,
  type StemfestEventOption,
  type StemfestSegmentId,
} from "./stemfest-registration";

// ── Copy ─────────────────────────────────────────────────────────────────────

export const stemfestDetailsCopy = {
  eyebrow: "STEM Fest · Manarat Science Club",
  heading: "MDIC STEM-FEST 2026-27",
  subheading:
    "Two days of competition at Manarat Dhaka International School and College — Olympiads, Robotics, Project Display and E-sports, each with its own prize pool. Everything the fest has published about how it runs is on this page.",
  datesLabel: "Dates",
  venueLabel: "Venue",
  prizeLabel: "Total prize pool",
  prizeNote: "Across all four segments.",
  segmentsHeading: "Segment details",
  segmentsLead:
    "Every segment in the fest, what it is worth, and the events you can enter in it.",
  prizePoolLabel: "Prize pool",
  entryIndividual: "Individual",
  entryTeam: `Teams of ${stemfestTeamSizes.join(" or ")}`,
  detailPendingLead: "The format, scoring and kit rules are in the",
  detailPendingLink: "segment rulebook",
  formatHeading: "Individual Olympiad details",
  formatLead:
    "The same paper runs for all five Olympiads, whoever enters and whatever category they sit in.",
  categoriesHeading: "Category details",
  categoriesLead:
    "Which bracket you compete in, and what each one is open to.",
  linksHeading: "Rules, syllabus and resources",
  linksLead: "Everything else the fest publishes, page by page.",
  scheduleHeading: "Schedule & itinerary",
  socialHeading: "Updates on the day",
  socialLead:
    "The run sheet for both days goes out on the fest's own social pages — follow them for the schedule and the itinerary.",
  pendingLabel: "Details coming soon",
  pendingNote:
    "The club has not published this part of the brief yet. It will appear on this page before the fest.",
} as const;

// ── The fest at a glance ─────────────────────────────────────────────────────

export const festBasics = {
  name: "MDIC STEM-FEST 2026-27",
  dates: "16th – 17th October 2026",
  venue: {
    name: "Manarat Dhaka International School and College",
    address: "H.No 16, Road No. 104, Gulshan 2, Dhaka 1212",
  },
} as const;

/**
 * The fest's own social pages — where the schedule and itinerary are posted.
 *
 * Deliberately not `siteConfig.social`, which is the club's: these two accounts
 * belong to STEM Fest and carry a different handle.
 */
export interface StemfestSocial {
  id: string;
  label: string;
  handle: string;
  href: string;
}

export const festSocials: StemfestSocial[] = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@mdicstemfest",
    href: "https://www.instagram.com/mdicstemfest?igsh=bm0yaXg3ZGN2Njkz",
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: "STEM-FEST page",
    href: "https://www.facebook.com/share/18QWsJxz1H/",
  },
];

// ── What this page renders ───────────────────────────────────────────────────

export interface StemfestEventRow {
  /** The event id in the registration catalogue. */
  id: string;
  /** The event name, exactly as the form spells it. */
  name: string;
  /** Who may enter, read off the classes the event admits. */
  eligibility: string;
  /** Individual or team entry, read off `teamBased`. */
  entryMode: string;
  /** Whether entry is a squad, so the page can badge it as one. */
  teamBased: boolean;
  /** The brief for the day, or `null` when the rulebook carries it. */
  detail: string | null;
  /** Stage-by-stage notes, rendered under `detail`. */
  points: string[];
}

export interface StemfestSegmentRow {
  id: StemfestSegmentId;
  index: string;
  name: string;
  blurb: string;
  /** Taka. */
  prizePool: number;
  events: StemfestEventRow[];
}

export interface StemfestCategoryRow {
  id: string;
  /** The bracket's own title — "Junior", "Category A", "Open bracket". */
  title: string;
  /** The class band the bracket covers. */
  classes: string;
  /** Which events run this bracket, and the letter each of them calls it. */
  placements: string[];
}

export interface StemfestCategoryScheme {
  id: string;
  heading: string;
  note: string;
  rows: StemfestCategoryRow[];
}

export interface StemfestDetailLink {
  id: string;
  label: string;
  description: string;
  href: string;
}

// ── Authored brief ───────────────────────────────────────────────────────────

/**
 * What one segment is worth in prize money, keyed by the catalogue's segment id.
 * The page totals these, so the headline number can never drift from the
 * segments listed under it.
 */
const prizePools: Record<StemfestSegmentId, number> = {
  olympiads: 25000,
  robotics: 40000,
  "project-display": 40000,
  esports: 30000,
};

/**
 * The day-brief for one event, keyed by the catalogue's event id.
 *
 * Events missing from here render with their eligibility and entry chips only,
 * which is a real answer rather than a gap: the Robotics events are run off
 * their published rulebooks, not off a paragraph on this page.
 *
 * The Mathematics calculator rule reads as an exception because that is how the
 * club set it — no calculator below Class 9.
 */
const eventBriefings: Record<
  string,
  { detail: string | null; points?: string[] }
> = {
  mathematics: {
    detail:
      "A one-hour showdown of mathematical prowess. Calculators are allowed only from Class 9 up; every younger category works without one.",
  },
  physics: {
    detail:
      "A fast-paced one-hour physics quiz, set mostly against the syllabus of your own class. Calculators are allowed.",
  },
  "bio-chem": {
    detail:
      "A one-hour timed quiz on the class-wise Biochemistry syllabus. Calculators are allowed.",
  },
  "computer-science": {
    detail: "A one-hour timed quiz on the class-wise Computer Science syllabus.",
  },
  "general-science": {
    detail: "A one-hour timed quiz on the class-wise General Science syllabus.",
  },

  lfr: { detail: null },
  robosoccer: { detail: null },

  "project-display": {
    detail:
      "Prototypes, papers and live demos on the floor, judged in person. Enter as a team of four or five, in the category for your class.",
  },

  "ea-fc-26": { detail: "Offline tournament, played on campus." },
  "clash-royale": { detail: "Online tournament." },
  "minecraft-bedwars": {
    detail: "Solo Bedwars on Java Edition 1.8.9, cut down over both days.",
    points: [
      "Prelims are held online.",
      "32 semi-finalists play the offline round on 16th October.",
      "8 finalists play the offline round on 17th October.",
    ],
  },
};

/** How the individual Olympiad papers are set and scored. */
export const olympiadFormat: string[] = [
  "Every individual Olympiad is a one-hour sit.",
  "The paper is 30 multiple-choice questions and 10 short questions.",
  "The Mathematics Olympiad carries 40 marks of structured questions.",
  "There is no negative marking for an incorrect answer.",
  "All questions are presented in English.",
  "The top three students in each category are awarded.",
];

/**
 * The Olympiad class bands, named the way the club names them.
 *
 * The bands themselves are read off the catalogue — Mathematics runs the full
 * set, so its categories give the page its five tiers in age order — and only
 * the names are authored here. Move a boundary in the catalogue and the range
 * shown against the name moves with it.
 */
const olympiadTierNames = [
  "Junior",
  "Primary",
  "Middle-School",
  "Secondary",
  "Higher Secondary",
] as const;

/**
 * The bracket note each segment carries in the Categories block, in catalogue
 * order. Robotics and E-sports have no class split at all, so their rows read
 * as one open bracket rather than as letters.
 */
const categoryNotes: Record<StemfestSegmentId, string> = {
  olympiads:
    "Everyone sits inside their own class band. The letter a band carries differs by event — Mathematics runs A to E, the Class 7-up Olympiads run A to C, General Science A and B.",
  robotics: "Open for everyone — school, college and university.",
  "project-display":
    "Open for everyone — school and college. Your category is set by your class.",
  esports: "Open for everyone — school and college. One bracket per title, no class split.",
};

/** Existing pages the brief points at, in the order a participant needs them. */
export const stemfestDetailLinks: StemfestDetailLink[] = [
  {
    id: "rules",
    label: "Event rules",
    description:
      "Dress code and identification guidelines for participants, private candidates, parents and visitors.",
    href: "/rules",
  },
  {
    id: "syllabus",
    label: "Syllabus",
    description:
      "What each event is set from, published as a PDF — one for every Olympiad, Robotics event and E-sports title.",
    href: "/syllabus",
  },
  {
    id: "resources",
    label: "Rulebooks & resources",
    description:
      "The Robotics, Project Display and E-sports rulebooks, which carry the format and scoring for the events this page leaves open.",
    href: "/resources",
  },
];

/**
 * The two-day run sheet. Empty until the club confirms it, which the page
 * renders as reserved space under its own heading.
 */
export const scheduleBody: string[] = [];

// ── Derivation ───────────────────────────────────────────────────────────────

/** Where a class sits in the school ladder, for ordering brackets youngest-first. */
const classOrder = new Map<StemfestClassId, number>(
  stemfestClasses.map((entry, index) => [entry.id, index]),
);

/**
 * A human range for a set of classes: `Classes 3 – 4`, `Classes 9 – 12`,
 * `Class 7 – University`.
 *
 * Both ends read as numbers wherever they are school or college levels — the
 * catalogue's `AS/11` and `A2/12` count as 11 and 12 — so a band that runs into
 * the college shows as a class range instead of two mismatched labels. A band
 * that reaches University, which has no number, keeps the labels.
 */
function classRangeLabel(classes: StemfestClassId[]): string {
  const ordered = stemfestClasses.filter((entry) =>
    classes.includes(entry.id),
  );
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  if (!first || !last) return "";
  if (first.id === last.id) return first.label;

  const level = (label: string) => Number(label.match(/\d+$/)?.[0] ?? NaN);
  const from = level(first.label);
  const to = level(last.label);

  if (Number.isFinite(from) && Number.isFinite(to)) {
    return `Classes ${from} – ${to}`;
  }

  return `${first.label} – ${last.label}`;
}

function eventRowFor(event: StemfestEventOption): StemfestEventRow {
  const briefing = eventBriefings[event.id];
  const admitted = new Set<StemfestClassId>(
    event.categories.flatMap((rule) => rule.classes),
  );

  return {
    id: event.id,
    name: event.name,
    eligibility: classRangeLabel(
      stemfestClasses.filter((entry) => admitted.has(entry.id)).map((c) => c.id),
    ),
    entryMode: event.teamBased
      ? stemfestDetailsCopy.entryTeam
      : stemfestDetailsCopy.entryIndividual,
    teamBased: event.teamBased,
    detail: briefing?.detail ?? null,
    points: briefing?.points ?? [],
  };
}

/**
 * The Olympiad tiers, gathered from every Olympiad event's categories.
 *
 * Events share bands rather than letters — Physics A and Mathematics C are the
 * same two classes — so the page keys a tier by the classes it covers and lists
 * the letter each event gives it. Nothing here can fall out of step with the
 * form: a band that stops existing in the catalogue stops existing on the page.
 */
function olympiadTierRows(): StemfestCategoryRow[] {
  const events = stemfestEvents.filter(
    (event) => event.segmentId === "olympiads",
  );

  const bands: { classes: StemfestClassId[]; placements: string[] }[] = [];

  for (const event of events) {
    for (const rule of event.categories) {
      const signature = rule.classes.join("+");
      const existing = bands.find(
        (band) => band.classes.join("+") === signature,
      );

      if (existing) {
        existing.placements.push(`${event.name} (${rule.categoryId})`);
        continue;
      }

      bands.push({
        classes: [...rule.classes],
        placements: [`${event.name} (${rule.categoryId})`],
      });
    }
  }

  bands.sort((a, b) => (classOrder.get(a.classes[0]) ?? 0) - (classOrder.get(b.classes[0]) ?? 0));

  return bands.map((band, index) => ({
    id: `tier-${band.classes[0]}`,
    title: olympiadTierNames[index] ?? `Category ${index + 1}`,
    classes: classRangeLabel(band.classes),
    placements: band.placements,
  }));
}

/**
 * One scheme per segment, in catalogue order.
 *
 * Olympiads get the merged tier table. Every other segment lists the brackets
 * its own events define, which for Robotics and E-sports is a single open
 * bracket (`categoryId: null`) and for Project Display is its three categories.
 */
export const categorySchemes: StemfestCategoryScheme[] = stemfestSegments.map(
  (segment) => {
    const events = stemfestEvents.filter(
      (event) => event.segmentId === segment.id,
    );

    if (segment.id === "olympiads") {
      return {
        id: segment.id,
        heading: segment.name,
        note: categoryNotes[segment.id],
        rows: olympiadTierRows(),
      };
    }

    const rules = events[0]?.categories ?? [];

    return {
      id: segment.id,
      heading: segment.name,
      note: categoryNotes[segment.id],
      rows: rules.map((rule) => ({
        id: `${segment.id}-${rule.categoryId ?? "open"}`,
        title: rule.label ?? "Open bracket",
        classes: classRangeLabel(rule.classes),
        placements: [],
      })),
    };
  },
);

/** Every segment, with its prize pool and its events, in catalogue order. */
export const segmentRows: StemfestSegmentRow[] = stemfestSegments.map(
  (segment, index) => ({
    id: segment.id,
    index: String(index + 1).padStart(2, "0"),
    name: segment.name,
    blurb: segment.blurb,
    prizePool: prizePools[segment.id],
    events: stemfestEvents
      .filter((event) => event.segmentId === segment.id)
      .map(eventRowFor),
  }),
);

/** What all four segments are worth together, in Taka. */
export const prizePoolTotal: number = segmentRows.reduce(
  (total, segment) => total + segment.prizePool,
  0,
);

/** Taka with the thousands separators the flyer uses — `৳25,000`. */
export function formatTaka(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-US")}`;
}
