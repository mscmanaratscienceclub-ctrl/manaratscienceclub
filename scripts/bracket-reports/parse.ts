/**
 * Reading a stored registration back into the brackets it entered.
 *
 * `stem_fest_registrations.segments` is prose, not JSON: the insert action writes
 * `entries.map(describeEntry).join(", ")`, so a row reads
 *
 *     Mathematics · Category C, Physics · Category A, Team of 4 · Team “X”
 *
 * There is no `entries` column to query, which makes this parser the only bridge
 * between the stored row and the catalogue's event and category ids. It is written
 * around two habits of that prose:
 *
 * - **Entry boundaries are event names, not commas.** A team name may contain a
 *   comma, so splitting on `, ` can cut one entry in half. Every occurrence of a
 *   catalogue event name starts an entry, and the entry runs to the next one.
 * - **No catalogue event name is a substring of another** — `pnpm db:verify`
 *   asserts it — so an occurrence is unambiguous, and the category letter that
 *   follows it belongs to it.
 */

import { stemfestEvents } from "@/lib/data/stemfest-registration";

export interface StoredEntry {
  eventId: string;
  /** `null` for an open-bracket event, matching the catalogue's own rule. */
  categoryId: string | null;
  teamSize: number | null;
  teamName: string | null;
}

/** Where each catalogue event name appears in the prose, earliest first. */
function occurrences(segments: string): { eventId: string; start: number }[] {
  const found: { eventId: string; start: number }[] = [];

  for (const event of stemfestEvents) {
    let at = segments.indexOf(event.name);
    while (at >= 0) {
      found.push({ eventId: event.id, start: at });
      at = segments.indexOf(event.name, at + event.name.length);
    }
  }

  return found.sort((a, b) => a.start - b.start);
}

const CATEGORY = /Category\s+([A-Za-z0-9]+)\b/;
const TEAM_SIZE = /Team of\s+(\d)/;
const TEAM_NAME = /Team\s*[“"]([^”"]+)[”"]/;

/** The entry a name's region describes. */
function readRegion(region: string): Omit<StoredEntry, "eventId"> {
  return {
    categoryId: region.match(CATEGORY)?.[1]?.toUpperCase() ?? null,
    teamSize: Number(region.match(TEAM_SIZE)?.[1] ?? "") || null,
    teamName: region.match(TEAM_NAME)?.[1]?.trim() ?? null,
  };
}

/**
 * Every entry a stored `segments` string carries, in the order it lists them.
 *
 * Returns `[]` for prose that names no catalogue event — a row written as
 * `General`, or one collected before the catalogue's names were in use. The
 * caller counts those as unmapped rather than silently dropping them.
 */
export function parseSegments(segments: string): StoredEntry[] {
  const marks = occurrences(segments);
  if (marks.length === 0) return [];

  return marks.map((mark, index) => {
    const event = stemfestEvents.find((candidate) => candidate.id === mark.eventId);
    const from = mark.start + (event?.name.length ?? 0);
    const to = index + 1 < marks.length ? marks[index + 1].start : segments.length;
    return { eventId: mark.eventId, ...readRegion(segments.slice(from, to)) };
  });
}

/**
 * The bracket a stored entry belongs to, once its category letter is reconciled
 * with the catalogue.
 *
 * A letter the event does not define is kept rather than discarded — the row is
 * evidence the club accepted a payment for it, and the report surfaces it as
 * drift instead of losing the participant from every bracket.
 */
export function bracketKey(eventId: string, categoryId: string | null): string {
  return `${eventId}::${categoryId ?? "open"}`;
}
