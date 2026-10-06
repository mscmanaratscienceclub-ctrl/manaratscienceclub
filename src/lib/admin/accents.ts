/**
 * The admin panel's section accents.
 *
 * One hue per section — Dashboard, Campus Ambassador, Volunteer, Science
 * Competition, SMS Logs, Bulk Emails — used consistently in that section's rail
 * item, masthead, panels, table headings and primary action. The hue answers
 * "where am I" before the heading is read, which is what makes a panel with a
 * dozen tables navigable.
 *
 * A section does not pass its accent down through props. It scopes three CSS
 * custom properties on its own root (`adminAccentStyle`) and every surface
 * inside is written against `bg-admin-accent-soft` / `text-admin-accent-ink` /
 * `border-admin-accent`, so the shared class strings in `styles.ts` stay
 * section-agnostic — the alternative was threading an `accent` prop through five
 * tables, six panels and two dialogs.
 *
 * Plain data and one pure function: imported by Server Components (the pages that
 * scope the hue), by client leaves (the rail, the stat cards) and by the Excel
 * export path, so it must never read `env`, the database or `next/headers`.
 */

import type { CSSProperties } from "react";

import type { ChartTone } from "./dashboard";

export const ADMIN_ACCENTS = [
  "teal",
  "violet",
  "amber",
  "rose",
  "emerald",
  "azure",
] as const;

export type AdminAccent = (typeof ADMIN_ACCENTS)[number];

/**
 * The accent each section wears. Kept here rather than in `filters.ts` because
 * the rail (`sidebar.tsx`) and the pages must agree, and neither owns the other.
 */
export const SECTION_ACCENT = {
  dashboard: "teal",
  campusAmbassador: "violet",
  volunteer: "emerald",
  scienceCompetition: "azure",
  smsLogs: "amber",
  emails: "rose",
} as const satisfies Record<string, AdminAccent>;

/**
 * The chart tones that name a *series* rather than a *status*.
 *
 * `green`, `yellow` and `red` are deliberately absent: in a chart they mean
 * verified, pending and rejected — the same three readings as the status pills —
 * and they must keep resolving to the status inks in `dashboard.ts` so the ring
 * and the pills beside it cannot disagree about what "pending" looks like. The
 * four below are identity only, so they take the section accents.
 */
export const CHART_TONE_ACCENT: Partial<Record<ChartTone, AdminAccent>> = {
  teal: "teal",
  blue: "azure",
  purple: "violet",
  pink: "rose",
};

/**
 * The accent behind a chart tone, for surfaces that colour by tone rather than by
 * section — a stat card's icon chip, a sparkline's chrome.
 */
export function accentForTone(tone: ChartTone): AdminAccent {
  return CHART_TONE_ACCENT[tone] ?? "teal";
}

/**
 * The three custom properties that scope a section's hue, ready to spread onto
 * the element that roots it.
 *
 * They are set to *token* references rather than resolved values, so the palette
 * stays in `globals.css` and a re-themed accent needs no component change. The
 * cast is for TypeScript, which does not know that custom properties are legal in
 * a `CSSProperties` object; React passes them through to the style attribute
 * verbatim.
 */
export function adminAccentStyle(accent: AdminAccent): CSSProperties {
  return {
    "--admin-accent": `var(--admin-accent-${accent})`,
    "--admin-accent-soft": `var(--admin-accent-${accent}-soft)`,
    "--admin-accent-ink": `var(--admin-accent-${accent}-ink)`,
  } as CSSProperties;
}
