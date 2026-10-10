/**
 * Copy for the `/resources` page — the home for rulebooks and the practical
 * information that sits around them.
 *
 * The segment names and their event lists come from `stemfest.ts`, the same
 * array the homepage hero reads, so a segment renamed there is renamed here too
 * and the two can never disagree about what the fest contains.
 *
 * The *details* are authored, not derived: an entry with no prose and no published
 * rulebooks renders as reserved space. Publishing a rulebook means uploading the
 * PDF and adding one line to `publishedRulebooks` below.
 */

import { pdfUrl } from "@/lib/media";

import { stemfestSegments } from "./stemfest";

export interface ResourceFile {
  label: string;
  /**
   * Public URL for the document. An entry only exists once the club has uploaded
   * the PDF, so a segment with nothing published has an empty `files` list — the
   * page renders that as reserved space rather than as a dead link.
   */
  href: string;
  /** Object key inside the `pdfs` bucket. */
  bucketPath: string;
}

export interface ResourceEntry {
  /** Matches the segment id in `stemfest.ts`. */
  segmentId: string;
  /** Zero-padded index, copied from the catalogue so the order reads the same. */
  index: string;
  heading: string;
  /** The events inside the segment, as listed on the homepage. */
  items: string[];
  /** Reserved space for segment-specific detail. `null` until written. */
  details: string | null;
  /** Rulebooks and similar downloads. Empty until published. */
  files: ResourceFile[];
}

export interface GeneralResource {
  id: string;
  label: string;
  description: string;
  /** Existing page to send people to, or `null` when there is nothing to open. */
  href: string | null;
}

export const resourcesCopy = {
  eyebrow: "STEM Fest · Manarat Science Club",
  heading: "Resources",
  subheading:
    "Rulebooks, briefs and the practical information for every segment of the fest. Material is added here as each segment finalises it — check back before the day.",
  generalHeading: "General information",
  generalLead: "The same details for everyone, whichever segment you enter.",
  segmentsHeading: "Segments",
  segmentsLead:
    "Every segment in the fest, with its events. Rulebooks and detailed briefs are published here as they are released.",
  pendingLabel: "Details coming soon",
  pendingNote:
    "The club has not published this material yet. It will appear on this page before the event.",
  /** Singular, for the reserved "Rulebook — coming soon" slot. */
  rulebookLabel: "Rulebook",
  rulebooksLabel: "Published rulebooks",
  /** Screen-reader suffix on the file link, which saves rather than navigates. */
  downloadFileLabel: "download",
  syllabusLinkLabel: "Syllabus PDFs",
  emptyItemsNote: "Event list to be confirmed.",
} as const;

export const generalResources: GeneralResource[] = [
  {
    id: "syllabus",
    label: "Syllabus",
    description:
      "What every segment is set from — one PDF per event, published as each segment finalises it.",
    href: "/syllabus",
  },
  {
    id: "rules",
    label: "Event rules",
    description:
      "Dress code and identification guidelines for participants, private candidates, parents and visitors.",
    href: "/rules",
  },
  {
    id: "registration",
    label: "Registration & fees",
    description:
      "Pick your class and events, see the total for what you selected, and pay by bKash.",
    href: "/stemfestreg",
  },
  {
    id: "schedule",
    label: "Schedule",
    description:
      "Timings for each segment across the two days of the fest, including breaks.",
    href: null,
  },
  {
    id: "venue",
    label: "Venue & directions",
    description:
      "Where to go, which gate to use, and how to find your segment once inside.",
    href: null,
  },
];

/**
 * Object keys inside the public `pdfs` bucket, keyed by segment id.
 *
 * The same bucket `publishedSyllabi` uses (`src/lib/data/syllabus.ts`), and the
 * same publishing gesture: upload the PDF, then add its key here. A segment with
 * no entry renders its slot as reserved space rather than as a dead link.
 *
 * An entry is a *list* because a segment can release more than one document —
 * Robotics and E-sports have a rulebook per event, so each of their events
 * appears here.
 *
 * Keys are matched against the bucket byte for byte, including case: the
 * Robosoccer rulebook is stored lowercase. A key the bucket does not hold answers
 * HTTP 400, so a segment with no uploaded rulebook gets no entry here and renders
 * its slot as reserved space.
 */
const publishedRulebooks: Record<
  string,
  { label: string; bucketPath: string }[]
> = {
  robotics: [
    {
      label: "LFR (Line Following Robot) rulebook",
      bucketPath: "LFR RULEBOOK.pdf",
    },
    { label: "Robosoccer rulebook", bucketPath: "robosoccer rulebook.pdf" },
  ],
  "project-display": [
    {
      label: "Project Display rulebook",
      bucketPath: "project display rulebook.pdf",
    },
  ],
  esports: [
    { label: "EA FC 26 rulebook", bucketPath: "FC26 rulebook.pdf" },
    { label: "Clash Royale rulebook", bucketPath: "clash royale rulebook.pdf" },
    { label: "Minecraft Bedwars rulebook", bucketPath: "bedwars rulebook.pdf" },
  ],
};

/**
 * One entry per fest segment, with the authored detail slots left open.
 *
 * `details` stays `null` until the club writes prose for a segment — the page
 * falls back to its "coming soon" note. `files` comes from `publishedRulebooks`,
 * so releasing a document is a one-line change there and never a component edit.
 */
export const resourceEntries: ResourceEntry[] = stemfestSegments.map(
  (segment) => ({
    segmentId: segment.id,
    index: segment.index,
    heading: segment.title,
    items: segment.items,
    details: null,
    files: (publishedRulebooks[segment.id] ?? []).map((document) => ({
      label: document.label,
      href: pdfUrl(document.bucketPath),
      bucketPath: document.bucketPath,
    })),
  }),
);
