/**
 * The brackets a fest is run in — one per event and category — derived from the
 * registration catalogue rather than written out again.
 *
 * A bracket is the unit the club prints for: Mathematics Category A is the Class
 * 3–4 paper, so it is one report, one roster, one room. Which letters exist, what
 * classes each covers and which events are open-bracket are all read from
 * `src/lib/data/stemfest-registration.ts`, and the day-brief, prize pool and
 * run-sheet window beside each bracket come from `/details`' own derived data in
 * `src/lib/data/stemfest-details.ts`. Nothing here can disagree with what
 * `/stemfestreg` accepts, because it is the same arrays.
 */

import {
  stemfestClasses,
  stemfestEvents,
  type StemfestClassId,
  type StemfestSegmentId,
} from "@/lib/data/stemfest-registration";
import {
  categorySchemes,
  festBasics,
  scheduleDays,
  segmentRows,
  type StemfestEventRow,
  type StemfestSegmentRow,
} from "@/lib/data/stemfest-details";

export interface Bracket {
  /** `mathematics::A`, stable and unique. */
  id: string;
  /** `mathematics-category-a` — the file name, segment folder aside. */
  slug: string;
  segmentId: StemfestSegmentId;
  segmentName: string;
  eventId: string;
  eventName: string;
  /** `null` for an event with no class split — Robotics and E-sports. */
  categoryId: string | null;
  /** `Category A`, or `Open bracket` when there is no letter. */
  categoryLabel: string;
  /** `Classes 3 – 4` — the band this bracket is sat in. */
  classBand: string;
  classes: StemfestClassId[];
  teamBased: boolean;
  /**
   * The exact fragment the stored `segments` prose carries for this entry.
   * Matching on it is how a registration is placed in a bracket — see `parse.ts`.
   */
  token: string;
  /** The `/details` brief for the event, when the page has one. */
  eventRow: StemfestEventRow;
  /** `Day 1 · Friday, 16 October 2026 · 9:00AM – 10:00AM`, when the run sheet has it. */
  scheduled: string | null;
  /** What the segment's category block says about this bracket. */
  segmentNote: string;
  prizePool: number;
}

export interface SegmentGroup {
  id: StemfestSegmentId;
  name: string;
  index: string;
  row: StemfestSegmentRow;
  brackets: Bracket[];
}

/**
 * A bracket's class band as one range, youngest to oldest.
 *
 * Same shape the `/details` category table prints: ends shown as numbers where
 * both are school or college levels (`AS/11` and `A2/12` count as 11 and 12), and
 * full labels where the band reaches University, which has no number.
 */
function classBandLabel(classes: StemfestClassId[]): string {
  const ordered = stemfestClasses.filter((entry) => classes.includes(entry.id));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) return "";
  if (first.id === last.id) return first.label;

  const level = (label: string) => Number(label.match(/\d+$/)?.[0] ?? NaN);
  const from = level(first.label);
  const to = level(last.label);

  if (Number.isFinite(from) && Number.isFinite(to)) return `Classes ${from} – ${to}`;
  return `${first.label} – ${last.label}`;
}

/** Run-sheet window an event is contested in, or `null` when the sheet skips it. */
function scheduleOf(eventName: string): string | null {
  for (const day of scheduleDays) {
    for (const slot of day.slots) {
      if (slot.events.some((event) => event.name === eventName)) {
        const note = slot.note ? ` · ${slot.note}` : "";
        return `${day.label} · ${day.date} · ${slot.time}${note}`;
      }
    }
  }
  return null;
}

const eventRowByName = new Map<string, StemfestEventRow>(
  segmentRows.flatMap((segment) =>
    segment.events.map((event) => [event.name, event] as const),
  ),
);

const segmentRowById = new Map(segmentRows.map((row) => [row.id, row]));

/** Each segment's own note on how its brackets are split, from `/details`. */
const segmentNoteById = new Map(categorySchemes.map((scheme) => [scheme.id, scheme.note]));

/**
 * Every bracket in the fest, in catalogue order: segment, event, then the
 * categories youngest band first.
 */
export const brackets: Bracket[] = stemfestEvents.flatMap((event) => {
  const segmentId = event.segmentId;
  const segmentRow = segmentRowById.get(segmentId);
  const eventRow = eventRowByName.get(event.name);
  if (!segmentRow || !eventRow) return [];

  return event.categories.map((rule) => {
    const categoryId = rule.categoryId;
    const categoryLabel = rule.label ?? "Open bracket";
    return {
      id: `${event.id}::${categoryId ?? "open"}`,
      slug: `${event.id}${categoryId ? `-category-${categoryId.toLowerCase()}` : "-open"}`,
      segmentId,
      segmentName: segmentRow.name,
      eventId: event.id,
      eventName: event.name,
      categoryId,
      categoryLabel,
      classBand: classBandLabel(rule.classes),
      classes: [...rule.classes],
      teamBased: event.teamBased,
      token: categoryId ? `${event.name} · ${categoryLabel}` : event.name,
      eventRow,
      scheduled: scheduleOf(event.name),
      segmentNote: segmentNoteById.get(segmentId) ?? "",
      prizePool: segmentRow.prizePool,
    };
  });
});

/** Brackets grouped per segment, segments in catalogue order. */
export const segmentGroups: SegmentGroup[] = segmentRows.map((row) => ({
  id: row.id,
  name: row.name,
  index: row.index,
  row,
  brackets: brackets.filter((bracket) => bracket.segmentId === row.id),
}));

export const festName: string = festBasics.name;
export const festDates: string = festBasics.dates;
export const festVenue: string = festBasics.venue.name;
