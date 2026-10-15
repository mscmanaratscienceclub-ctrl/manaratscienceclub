/**
 * Shared rendering vocabulary for the bracket reports.
 *
 * Money, dates and status wording appear in the markdown, in the PDF and in the
 * index; one module keeps them saying the same thing in all three. Money is
 * formatted by the catalogue's own `formatBdt`, so a report can never quote a
 * different symbol or grouping from the form the participant paid against.
 */

import { ADMIN_TIME_ZONE } from "@/lib/admin/filters";
import { formatBdt } from "@/lib/data/stemfest-registration";
import type { Participant } from "./analysis";

export function money(amount: number): string {
  return formatBdt(amount);
}

/** `13 Oct 2026, 11:40` — in the timezone the admin panel reads rows in. */
export function dateTime(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
  }).format(at);
}

/** `13/10/2026` — the roster's compact submitted column. */
export function dayOnly(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: ADMIN_TIME_ZONE,
  }).format(at);
}

/** A share as `83%`, with zero entries reading as `0%` rather than `NaN%`. */
export function percent(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

/**
 * The status as the panel states it, plus how it got there: an SMS match and an
 * admin's decision are different evidence, and a printed sheet is read by people
 * who cannot hover over the pill.
 */
export function statusText(participant: Participant): string {
  if (participant.status === "verified") {
    return participant.source === "manual" ? "Verified — admin" : "Verified — SMS";
  }
  return participant.status === "rejected" ? "Rejected" : "Pending";
}
