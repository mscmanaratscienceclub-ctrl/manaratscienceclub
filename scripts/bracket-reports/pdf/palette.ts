import { rgb } from "pdf-lib";

import { pt } from "./geometry";

/**
 * The colours a report prints in, mirrored from the `@media print` block in
 * `src/app/globals.css`.
 *
 * They are duplicated rather than read because a PDF has no cascade: the
 * stylesheet is applied by a browser, and this document is drawn by hand. The
 * two must be kept in step by hand too, which is why every value here names the
 * rule it comes from. `obsidian/frontend/design-system.md` records the same
 * pairing.
 */

/** `--ink`, the paper's near-black. */
export const INK = "#142326";

/** `--manara-teal`, the club rule under the masthead and the eyebrow's colour. */
export const TEAL = "#005f6b";

/**
 * `--print-rule` — `color-mix(in srgb, var(--ink) 28%, transparent)`. Paper is
 * opaque, so the mix is flattened against white rather than expressed as alpha:
 * 28 % of `#142326` over `#ffffff`.
 */
export const RULE = "#bdc1c2";

/** `thead th` background. */
export const HEAD_BACKGROUND = "#eef3f2";

/** Zebra striping — `tbody tr:nth-child(even)`, the paper `--admin-sunken`. */
export const ROW_TINT = "#f4f6f5";

/** `td` colour, the paper `--admin-ink-soft`. */
export const CELL_INK = "#26383c";

/** Masthead note and the generated-value block. */
export const SOFT_INK = "#435458";

/** Small uppercase labels and the footer — paper `--admin-muted`. */
export const MUTED = "#6b767a";

/** The ceiling warning: `--admin-warn-bg` / `--admin-warn-ink` on paper. */
export const WARNING_BACKGROUND = "#f8eecd";
export const WARNING_INK = "#7a5200";

/**
 * The `REPORT_ROW_LIMIT` band — `[role="status"]`'s `#fff7e0` fill, `#5c4800`
 * text and `#e8c230` border. A different amber from the chips above, because the
 * stylesheet gives the warning its own and the brief its own.
 */
export const CEILING_BACKGROUND = "#fff7e0";
export const CEILING_INK = "#5c4800";
export const CEILING_BORDER = "#e8c230";

/** A movement's direction, as the brief prints it. */
export const POSITIVE = "#245c2a";
export const NEGATIVE = "#8a2826";

/** The wash under a direction pill — `--admin-positive-bg` on the brief's stock. */
export const POSITIVE_BACKGROUND = "#e6f1e6";
export const NEGATIVE_BACKGROUND = "#f8dfe0";
export const NEUTRAL_BACKGROUND = "#ececeb";
export const NEUTRAL_INK = "#4a5457";
export const INFO_BACKGROUND = "#dbeeff";
export const INFO_INK = "#1b5f8c";

/**
 * `--admin-ink` as the brief restates it (`#14191b`), for the surfaces that are
 * the brief's own — section titles, the chart's axis, the forecast box's frame.
 * The document title and table rules keep `INK`, which is `--ink`.
 */
export const BRIEF_INK = "#14191b";

/**
 * `--admin-accent-violet`, the trend bars' hue. The print block leaves a bar's
 * `background-color` alone, so paper keeps the panel's accent rather than
 * inventing a quieter one.
 */
export const VIOLET = "#6d3bd1";

/** `--admin-accent-teal` — the brief's share meters, which the print block leaves unpainted. */
export const ACCENT_TEAL = "#0f7c86";

/**
 * Chart fills, keyed by the `ChartTone` the on-screen brief uses. The panel
 * paints these with gradients; paper keeps the flat `background-color` the
 * print block falls back to, so a bar reads the same in both.
 */
export const CHART_TONES = {
  teal: TEAL,
  ink: INK,
  positive: POSITIVE,
  warn: WARNING_INK,
  muted: MUTED,
} as const;

export type ChartTone = keyof typeof CHART_TONES;

/** Widths, in points, of the rules the print block draws. */
export const RULE_WIDTHS = {
  /** `header` bottom border, 0.6mm. */
  masthead: pt(0.6),
  /** `th` bottom border, 0.35mm. */
  head: pt(0.35),
  /** `td` / row bottom border, 0.15mm. */
  row: pt(0.15),
  /** Scope strip and footer rules, 0.2mm. */
  hairline: pt(0.2),
} as const;

const colors = new Map<string, ReturnType<typeof rgb>>();

/**
 * A colour flattened against white at `alpha`.
 *
 * Paper has no alpha to composite with: the stylesheet's `color-mix` and the
 * chart's faded bars are both applied against a white page, so the mix is done
 * here once, in sRGB, rather than carried into the file as a graphics state.
 */
export function wash(hex: string, alpha: number): string {
  const digits = hex.replace("#", "");
  const channel = (offset: number) => {
    const from = Number.parseInt(digits.slice(offset, offset + 2), 16);
    return Math.round(from * alpha + 255 * (1 - alpha));
  };
  return `#${[0, 2, 4].map((offset) => channel(offset).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A `#rrggbb` token from this file, as a pdf-lib colour.
 *
 * Memoised: tracked text draws a character at a time, and a 40-column header row
 * would otherwise build the same colour object forty times over.
 */
export function rgbColor(hex: string): ReturnType<typeof rgb> {
  const cached = colors.get(hex);
  if (cached) return cached;
  const digits = hex.replace("#", "");
  const colour = rgb(
    Number.parseInt(digits.slice(0, 2), 16) / 255,
    Number.parseInt(digits.slice(2, 4), 16) / 255,
    Number.parseInt(digits.slice(4, 6), 16) / 255,
  );
  colors.set(hex, colour);
  return colour;
}
