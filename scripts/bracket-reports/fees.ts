/**
 * What one entry of a registration is worth, as opposed to what the row charges.
 *
 * `total_fee` is per registration — one payment for everything a participant
 * entered — so a bracket cannot read its own money off the row. This attributes
 * the catalogue's own pricing to each entry, the way `computeFeeSummary` builds a
 * participant's fee:
 *
 * | segment                  | rule                                                            |
 * |--------------------------|-----------------------------------------------------------------|
 * | Olympiads                | first event ৳400 (৳350 for a host-school entrant), then ৳350 each |
 * | Robotics / Project Display | ৳1,500 for a team of 4, ৳2,000 for a team of 5                |
 * | E-sports                 | ৳200 per title                                                  |
 *
 * The Olympiad tier is charged across the whole segment, so which event is
 * "first" is a choice: entries are ordered by the catalogue, which keeps the
 * attribution reproducible. The tier's *sum* does not depend on that choice.
 *
 * Where the attributed total and the stored `total_fee` disagree — a price list
 * that moved after the payment, a row whose team size was never recorded — the
 * attribution is scaled to the money that actually moved, so a bracket's column
 * still adds up to what the participant paid and the disagreement itself is
 * reported (`feeDrift`).
 */

import {
  getStemfestSegment,
  isManaratSchool,
  stemfestEvents,
  stemfestFees,
  teamFee,
  type StemfestEventOption,
  type StemfestTeamSize,
} from "@/lib/data/stemfest-registration";
import type { StoredEntry } from "./parse";

const eventById = new Map(stemfestEvents.map((event) => [event.id, event]));

/** Catalogue position, so the Olympiad tier is attributed in a fixed order. */
const eventOrder = new Map(
  stemfestEvents.map((event, index) => [event.id, index]),
);

function isOlympiad(event: StemfestEventOption | undefined): boolean {
  return (
    event !== undefined &&
    getStemfestSegment(event.segmentId)?.pricing === "olympiad-tier"
  );
}

function asTeamSize(size: number | null): StemfestTeamSize | null {
  return size === 5 ? 5 : size === 4 ? 4 : null;
}

/** The catalogue's fee for one entry, before the Olympiad tier is applied. */
function entryFee(entry: StoredEntry, event: StemfestEventOption): number {
  const pricing = getStemfestSegment(event.segmentId)?.pricing;
  if (pricing === "per-title") return stemfestFees.esportsPerTitle;
  if (pricing === "team") return teamFee(asTeamSize(entry.teamSize) ?? 4);
  return 0;
}

export interface FeeAttribution {
  /** Event id → what this entry contributed to the row's fee. */
  amounts: Map<string, number>;
  /** The attributed total against the stored total, when they differ. */
  drift: { attributed: number; charged: number } | null;
}

/**
 * Split a registration's stored fee across the entries it lists.
 *
 * `charged` is `total_fee` as the row holds it, or `null` for a row written
 * before the column existed — those keep the unscaled catalogue figures.
 */
export function attributeFees(
  entries: StoredEntry[],
  school: string,
  charged: number | null,
): FeeAttribution {
  const ordered = [...entries]
    .map((entry) => ({ entry, event: eventById.get(entry.eventId) }))
    .filter((row): row is { entry: StoredEntry; event: StemfestEventOption } =>
      row.event !== undefined,
    )
    .sort(
      (a, b) => (eventOrder.get(a.event.id) ?? 0) - (eventOrder.get(b.event.id) ?? 0),
    );

  const amounts = new Map<string, number>();
  const firstAmount = isManaratSchool(school)
    ? stemfestFees.olympiadFirstManarat
    : stemfestFees.olympiadFirst;
  let olympiadSeen = 0;

  for (const { entry, event } of ordered) {
    const amount = isOlympiad(event)
      ? olympiadSeen === 0
        ? firstAmount
        : stemfestFees.olympiadAdditional
      : entryFee(entry, event);
    olympiadSeen += isOlympiad(event) ? 1 : 0;
    amounts.set(event.id, (amounts.get(event.id) ?? 0) + amount);
  }

  const attributed = [...amounts.values()].reduce((total, value) => total + value, 0);
  const drift = charged !== null && attributed !== charged ? { attributed, charged } : null;
  if (charged === null || attributed === charged || attributed === 0) {
    return { amounts, drift };
  }

  // Scale to the money that moved; the last entry absorbs the rounding so the
  // scaled column adds up to `charged` exactly.
  const every = [...amounts.keys()];
  let running = 0;
  every.forEach((key, index) => {
    const scaled =
      index === every.length - 1
        ? charged - running
        : Math.round(((amounts.get(key) ?? 0) * charged) / attributed);
    running += scaled;
    amounts.set(key, scaled);
  });

  return { amounts, drift };
}
