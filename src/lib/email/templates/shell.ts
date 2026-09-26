/**
 * The shared shell every club email renders in.
 *
 * Email is not a browser: there is no Tailwind, no tokens file, and a client
 * like Gmail strips `<style>` tags and some class attributes, so everything is
 * inline styles and table layout. That makes this the one file allowed to hold
 * raw hex literals — globals.css tokens do not exist here, and `.claude/
 * scripts/verify.sh` deliberately excludes `lib/email/templates/` from the
 * token checks for exactly this reason. They are this file's copy of the brand
 * tokens; when the brand re-themes, this file re-themes with it.
 *
 * Every template composes these pieces rather than pasting its own shell. The
 * old templates were four divergent copies of the same markup, which is how
 * reset-password ended up dark while its siblings stayed light.
 */

import { siteConfig } from "@/lib/data";

/* ── Brand tokens (Tier-1 equivalents for the mail renderer) ──────────────
 * Mirrors globals.css so a mail and the site read as one brand. Never
 * introduce a colour here that globals.css does not have. */

/** Brand accent. Site equivalent: `--ion`. */
export const COLOR_ACCENT = "#ff7053";
/** Near-black warm ink. Site equivalent: `--ink`. */
export const COLOR_INK = "#142326";
/** Page backdrop behind the card. Site equivalent: `--cream`. */
export const COLOR_CREAM = "#fff8ec";
/** Header/footer band colour. Site equivalent: `--manara-teal-deep`. */
export const COLOR_TEAL_DEEP = "#002f36";
/** Body text on white, a teal-weighted ink instead of stock grey. */
export const COLOR_BODY = "#33565b";
/** Secondary text: labels, helper lines, muted notes. */
export const COLOR_MUTED = "#5c7276";

/* ── Shape + type locks ────────────────────────────────────────────────────
 * One radius system: 16px container, 12px inset panels, pill buttons. One
 * type ramp: 22/17/15/13/12. One shadow, tinted to the cream backdrop. */

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Mono stack for IDs and transaction references, exported with the panels. */
export const MONO_STACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const RADIUS_CONTAINER = "16px";
const RADIUS_PILL = "999px";

/** Inset panel radius, exported for receipt blocks like the ID card. */
export const RADIUS_PANEL = "12px";

/* ── Small helpers ──────────────────────────────────────────────────────── */

/**
 * Escapes interpolated user text before it reaches the markup — an email
 * client is a renderer like any other. The replacement table is the whole of
 * what HTML needs, so no dependency for this.
 */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

/**
 * A muted 12px note, used for expiry lines and safe-ignore lines.
 * `center` renders it centered (footer-area notes), otherwise left.
 *
 * Accent discipline: coral is a surface colour only (buttons, panels, edge
 * accents), never a text colour — coral text on white is 2.7:1. Links inside
 * body copy are ink and underlined instead, which every client renders.
 */
export function note(text: string, center = false): string {
  return `<p style="font-size: 12px; line-height: 1.5; color: ${COLOR_MUTED}; margin: 0;${center ? " text-align: center;" : ""}">${text}</p>`;
}

/* ── Header ─────────────────────────────────────────────────────────────── */

/**
 * Brand header: cream band, ink wordmark, the tagline beneath it, and a 3px
 * coral edge accent along the top. The old coral slab with white text failed
 * contrast (2.7:1, AA large-text needs 3:1) and read like a marketing blast;
 * ink on cream is 13.7:1 and keeps the mail looking like correspondence.
 */
export function header(): string {
  return `
          <!-- Header: cream band, ink wordmark, coral edge accent -->
          <tr>
            <td
              align="center"
              bgcolor="${COLOR_CREAM}"
              style="background-color: ${COLOR_CREAM}; padding: 28px 32px 22px 32px; border-bottom: 1px solid #f0e6d2;"
            >
              <div
                style="width: 40px; height: 3px; background-color: ${COLOR_ACCENT}; border-radius: ${RADIUS_PILL}; margin: 0 auto 14px auto; font-size: 0; line-height: 0;"
              >&nbsp;</div>
              <h1
                style="margin: 0; font-family: ${FONT_STACK}; font-size: 22px; font-weight: 700; color: ${COLOR_INK}; letter-spacing: -0.3px;"
              >
                ${siteConfig.name}
              </h1>
              <p
                style="margin: 3px 0 0 0; font-family: ${FONT_STACK}; font-size: 12px; line-height: 1.4; color: ${COLOR_MUTED};"
              >
                ${siteConfig.tagline}
              </p>
            </td>
          </tr>`;
}

/* ── Footer ─────────────────────────────────────────────────────────────── */

/**
 * Dark teal footer: club line, address, copyright. Muted sand on deep teal
 * clears AA for small text. Uses `bgcolor` alongside the inline style because
 * Outlook drops the style attribute on `<td>`.
 */
export function footer(): string {
  return `
          <!-- Footer -->
          <tr>
            <td
              align="center"
              bgcolor="${COLOR_TEAL_DEEP}"
              style="background-color: ${COLOR_TEAL_DEEP}; padding: 24px 32px;"
            >
              <p
                style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; font-weight: 600; color: #f5ece3;"
              >
                ${siteConfig.name}
              </p>
              <p
                style="margin: 4px 0 0 0; font-family: ${FONT_STACK}; font-size: 12px; line-height: 1.5; color: #a8c3c4;"
              >
                ${siteConfig.address}
              </p>
              <p
                style="margin: 6px 0 0 0; font-family: ${FONT_STACK}; font-size: 12px; line-height: 1.5; color: #a8c3c4;"
              >
                &copy; ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.
              </p>
            </td>
          </tr>`;
}

/* ── Page + card wrappers ───────────────────────────────────────────────── */

/**
 * The whole mail: cream page, white 560px card, header, body, footer.
 * `bodyHtml` is everything between header and footer, already escaped where
 * it interpolates user input.
 */
export function page(bodyHtml: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLOR_CREAM}; font-family: ${FONT_STACK}; color: ${COLOR_INK};">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${COLOR_CREAM}; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 560px; background-color: #ffffff; border-radius: ${RADIUS_CONTAINER}; overflow: hidden; box-shadow: 0 6px 24px rgba(20, 35, 38, 0.08);">
${header()}
${bodyHtml}
${footer()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/* ── Body primitives ────────────────────────────────────────────────────── */

/** The white content panel between header and footer. */
export function bodyPanel(content: string): string {
  return `
          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 36px 32px;">
              ${content}
            </td>
          </tr>`;
}

/** 17px section heading inside the body. */
export function heading(text: string): string {
  return `<h2 style="margin: 0 0 14px 0; font-family: ${FONT_STACK}; font-size: 17px; font-weight: 700; color: ${COLOR_INK};">${escapeHtml(text)}</h2>`;
}

/** 15px body paragraph. Spacing is set by the caller via `style` needs. */
export function paragraph(text: string, marginBottom = 16): string {
  return `<p style="margin: 0 0 ${marginBottom}px 0; font-family: ${FONT_STACK}; font-size: 15px; line-height: 1.6; color: ${COLOR_BODY};">${text}</p>`;
}

/**
 * A coral pill button. The `<a>` sits inside a padded `<td>` rather than
 * carrying the padding itself: Outlook renders padding on links badly, and a
 * wrapped `<a>` renders as a misshapen pill. Text must stay short enough to
 * fit one line at 320px wide (this is enforced in the templates' copy).
 */
export function button(url: string, label: string): string {
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
                  <tr>
                    <td align="center" bgcolor="${COLOR_ACCENT}" style="background-color: ${COLOR_ACCENT}; border-radius: ${RADIUS_PILL};">
                      <a
                        href="${url}"
                        target="_blank"
                        style="display: inline-block; padding: 13px 34px; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 600; color: #142326; text-decoration: none; border-radius: ${RADIUS_PILL};"
                      >${label}</a>
                    </td>
                  </tr>
                </table>`;
}

/** One 13px label / 14px value row of a details table. */
export function detailRow(label: string, value: string, mono = false): string {
  return `
                <tr>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f0f2f3; font-family: ${FONT_STACK}; font-size: 13px; color: ${COLOR_MUTED}; width: 40%; vertical-align: top;">
                    ${label}
                  </td>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f0f2f3; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 600; color: ${COLOR_INK}; ${
                    mono ? `font-family: ${MONO_STACK};` : ""
                  } vertical-align: top;">
                    ${value}
                  </td>
                </tr>`;
}
