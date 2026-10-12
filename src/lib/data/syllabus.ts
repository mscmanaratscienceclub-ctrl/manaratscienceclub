/**
 * Catalogue for the `/syllabus` page.
 *
 * The syllabi are PDFs in the public `pdfs` bucket on Supabase, published by the
 * club. The rows on the page are *derived* from the registration catalogue
 * (`stemfest-registration.ts`) rather than typed out here, so every event that
 * can be entered has exactly one slot and its name is the same string the form,
 * the receipt and the admin table use.
 *
 * To publish a syllabus, upload the PDF to the `pdfs` bucket and add its object
 * key to `publishedSyllabi` below — the page picks it up from there. Nothing
 * else changes, and a document without a key renders as reserved space instead
 * of a dead link.
 */

import { pdfUrl } from "@/lib/media";

import { stemfestSegments } from "./stemfest";
import {
  stemfestClasses,
  stemfestEvents,
  type StemfestClassId,
  type StemfestEventOption,
} from "./stemfest-registration";

export interface SyllabusDocument {
  /** The event id this syllabus belongs to. */
  id: string;
  /** The event name, exactly as the registration form spells it. */
  label: string;
  /** Who the syllabus is written for — category split and class range. */
  coverage: string;
  /** Public PDF URL. `null` until the club releases the document. */
  href: string | null;
  /** Object key inside the `pdfs` bucket, or `null` while unpublished. */
  bucketPath: string | null;
  /** ISO date the club last replaced the PDF, or `null` while unpublished. */
  updated: string | null;
}

export interface SyllabusSection {
  /** Matches the segment id in `stemfest.ts`. */
  segmentId: string;
  /** Zero-padded index, copied from the catalogue so the order reads the same. */
  index: string;
  heading: string;
  description: string;
  documents: SyllabusDocument[];
}

/**
 * Object keys inside the public `pdfs` bucket, keyed by event id.
 *
 * These are the filenames as uploaded, spaces and all — `pdfUrl` encodes them.
 * The five Olympiad subjects and the robotics events are the ones that have one
 * today; the rest are published by adding a line here.
 */
const publishedSyllabi: Record<string, { path: string; updated: string }> = {
  mathematics: { path: "MATH OLYMPIAD SYLLABUS.pdf", updated: "2026-09-22" },
  physics: { path: "PHYSICS OLYMPIAD SYLLABUS.pdf", updated: "2026-09-22" },
  "bio-chem": { path: "BIOCHEM OLYMPIAD SYLLABUS.pdf", updated: "2026-09-22" },
  "general-science": {
    path: "GEN SCIENCE OLYMPIAD SYLLABUS.pdf",
    updated: "2026-09-22",
  },
};

export const syllabusCopy = {
  eyebrow: "STEM Fest · Manarat Science Club",
  heading: "Syllabus",
  subheading:
    "What each event is set from, published as a PDF by the club. Download the one for your event and check back for the rest — material is added as each segment finalises it.",
  publishedLabel: "published",
  publishedNote:
    "A syllabus appears here the moment the club releases it. Anything still marked coming soon has not been finalised yet.",
  pendingLabel: "Coming soon",
  pendingNote: "This syllabus has not been released yet.",
  openLabel: "Open PDF",
  downloadLabel: "Download",
  newTabNote: "opens in a new tab",
} as const;

/**
 * Who one event's syllabus covers.
 *
 * Both halves come out of the catalogue: the category split from the event's
 * rules (Olympiads run A–E, Robotics has none) and the class range from the
 * first and last class label admitted. Nothing here is authored, so a category
 * boundary moved in the catalogue moves the line on this page with it.
 */
function coverageFor(event: StemfestEventOption): string {
  const admitted = new Set<StemfestClassId>(
    event.categories.flatMap((rule) => rule.classes),
  );
  const ordered = stemfestClasses.filter((entry) => admitted.has(entry.id));

  const first = ordered[0]?.label;
  const last = ordered[ordered.length - 1]?.label;
  const classRange =
    first && last ? (first === last ? first : `${first} – ${last}`) : null;

  const categoryIds = event.categories
    .map((rule) => rule.categoryId)
    .filter((id): id is string => Boolean(id));
  const categoryPart =
    categoryIds.length > 1
      ? `Categories ${categoryIds[0]}–${categoryIds[categoryIds.length - 1]}`
      : categoryIds.length === 1
        ? `Category ${categoryIds[0]}`
        : null;

  return [categoryPart, classRange].filter(Boolean).join(" · ");
}

/** One slot per event in the segment, in catalogue order. */
function documentsFor(segmentId: string): SyllabusDocument[] {
  const events = stemfestEvents.filter((event) => event.segmentId === segmentId);

  if (events.length === 0) {
    // Segments with nothing to register for still get a slot, so the page always
    // covers every segment in the fest rather than quietly skipping one.
    return [
      {
        id: `${segmentId}-syllabus`,
        label: "Segment syllabus",
        coverage: "All brackets",
        href: null,
        bucketPath: null,
        updated: null,
      },
    ];
  }

  return events.map((event) => {
    const published = publishedSyllabi[event.id] ?? null;

    return {
      id: event.id,
      label: event.name,
      coverage: coverageFor(event),
      href: published ? pdfUrl(published.path) : null,
      bucketPath: published?.path ?? null,
      updated: published?.updated ?? null,
    };
  });
}

export const syllabusSections: SyllabusSection[] = stemfestSegments.map(
  (segment) => ({
    segmentId: segment.id,
    index: segment.index,
    heading: segment.title,
    description: segment.description,
    documents: documentsFor(segment.id),
  }),
);

/**
 * How much of the syllabus is out, counted across every segment. Drives the
 * progress line at the top of the page so it can never claim a number the
 * catalogue disagrees with.
 */
export function syllabusProgress(): { published: number; total: number } {
  const documents = syllabusSections.flatMap((section) => section.documents);
  return {
    published: documents.filter((document) => document.href !== null).length,
    total: documents.length,
  };
}

/** Display date for a document's last update, e.g. `22 Sep 2026`. */
export function formatSyllabusDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}
