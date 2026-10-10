/**
 * Content slots for the `/details` page — the full STEM Fest brief in one place:
 * the schedule, the venue, and what each segment runs on the day.
 *
 * The page renders whatever sections exist here, in the order they are listed.
 * Publishing detail is a data edit, never a component edit: add a section with
 * its paragraphs and the page picks it up. A section with no paragraphs yet
 * renders as reserved space, so the page can be live while part of the brief is
 * still being confirmed.
 */

export interface StemfestDetailSection {
  /** Stable id, used as the render key. */
  id: string;
  heading: string;
  /** Authored paragraphs in reading order. Empty renders reserved space. */
  body: string[];
}

export const stemfestDetailsCopy = {
  eyebrow: "STEM Fest · Manarat Science Club",
  heading: "STEM Fest details",
  subheading:
    "Everything about the fest in one place — the schedule, the venue, and what each segment runs on the day. Material is added here as the club finalises it, so check back before the event.",
  pendingLabel: "Details coming soon",
  pendingNote:
    "The club has not published this part of the brief yet. It will appear on this page before the fest.",
} as const;

/** The brief itself, in reading order. Empty until the details are posted. */
export const stemfestDetailSections: StemfestDetailSection[] = [];
