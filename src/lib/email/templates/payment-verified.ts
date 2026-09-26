import { siteConfig } from "@/lib/data";

interface PaymentVerifiedEmailOptions {
  /**
   * The `<GENDER><CLASS><NNN>` ID the database minted — the number the club
   * looks a participant up by, so it leads the receipt. Supplied for every
   * registration made since the trigger existed; optional so a legacy row
   * without one still sends (the row's uuid is not printed instead — a
   * receipt either carries the real ID or carries nothing there).
   */
  registrationCode?: string;
  name: string;
  /** Class label, already resolved (e.g. `Class 7`, `A2/12`). */
  classLabel: string;
  /** The school/college name as stored on the row. */
  school: string;
  /** The registered participant's phone, for on-the-day contact. */
  phone: string;
  transactionId: string;
  /** The bKash wallet the fee was sent from. */
  paymentNumber: string;
  /**
   * What the participant entered, already joined by `describeEntry` — rendered as
   * one block rather than re-split, because the description itself is a `·`
   * separated sentence and guessing at separators would mangle it.
   */
  segments: string;
  /** When the registration was submitted, already formatted. Optional for legacy rows. */
  submittedOn?: string;
  /** The amount a forwarded SMS reported, already formatted. Omitted when unknown. */
  amount?: string;
}

/**
 * Absolute base for links inside the email.
 *
 * An email is read away from the site, so a relative `/syllabus` would be a dead
 * end. Same env var and same fallback as `src/app/sitemap.ts`, so a link in a
 * mail and a link in the sitemap can never point at different hosts.
 *
 * A loopback host is discarded rather than used: `.env` sets
 * `NEXT_PUBLIC_BASE_URL=http://localhost:3000`, and a participant who received a
 * receipt linking to localhost has been handed a dead end in a mail they cannot
 * fix. Falling back to the live domain fails safe — worst case the link points at
 * production from a staging build, which still resolves.
 */
const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const BASE_URL = (
  !configuredBaseUrl || /localhost|127\.0\.0\.1/.test(configuredBaseUrl)
    ? "https://manaratscience.club"
    : configuredBaseUrl
).replace(/\/+$/, "");

/** Where the club's segment material lives, linked from every confirmation. */
const SYLLABUS_URL = `${BASE_URL}/syllabus`;

/**
 * The interpolated names, TrxIDs and event descriptions are whatever the
 * participant typed, so they are escaped before they reach the markup — an email
 * client is a renderer like any other. No dependency for this: the replacement
 * table is the whole of what HTML needs.
 */
function escapeHtml(value: string): string {
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

function detailRow(label: string, value: string, mono = false): string {
  return `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280; width: 40%;">
                    ${label}
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; font-weight: 600; ${mono ? "font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;" : ""}">
                    ${value}
                  </td>
                </tr>`;
}

/** A section heading between the receipt's tables. */
function sectionHeading(label: string): string {
  return `
              <p style="font-size: 12px; line-height: 1.5; color: #6b7280; margin: 24px 0 6px 0; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">
                ${label}
              </p>`;
}

export function getPaymentVerifiedEmailHtml({
  registrationCode,
  name,
  classLabel,
  school,
  phone,
  transactionId,
  paymentNumber,
  segments,
  submittedOn,
  amount,
}: PaymentVerifiedEmailOptions): string {
  const safeName = escapeHtml(name || "there");

  // The ID is the one line a club volunteer greets a participant with, so it
  // gets the hero treatment rather than a table row.
  const registrationIdBlock = registrationCode
    ? `
              <div style="margin: 20px 0; padding: 16px 20px; background-color: #fff4f1; border: 1px solid #ffd8cd; border-radius: 12px;">
                <p style="font-size: 11px; color: #c2410c; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
                  Registration ID
                </p>
                <p style="font-size: 26px; font-weight: 700; color: #111827; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.04em;">
                  ${escapeHtml(registrationCode)}
                </p>
                <p style="font-size: 12px; color: #9a3412; margin: 6px 0 0 0;">
                  Quote this ID at the check-in desk and on the results sheet.
                </p>
              </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed - ${siteConfig.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); max-width: 560px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #ff7053; padding: 32px 24px;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                ${siteConfig.name}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
                Your payment is confirmed
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                Hello ${safeName},
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 8px 0;">
                We have verified your bKash payment for STEM Fest. Your registration is confirmed — keep this email as your receipt.
              </p>
${registrationIdBlock}
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 8px 0;">
${detailRow("Name", escapeHtml(name || "—"))}
${detailRow("Class", escapeHtml(classLabel))}
${detailRow("School / college", escapeHtml(school || "—"))}
${detailRow("Phone", escapeHtml(phone || "—"))}
              </table>

${sectionHeading("Payment")}
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 8px 0;">
${detailRow("Transaction ID", escapeHtml(transactionId), true)}
${detailRow("bKash number", escapeHtml(paymentNumber || "—"), true)}
${amount ? detailRow("Amount received", escapeHtml(amount)) : ""}
${detailRow("Registered on", escapeHtml(submittedOn || "—"))}
              </table>

${sectionHeading("Confirmed events")}
              <p style="font-size: 15px; line-height: 1.7; color: #111827; margin: 0;">
                ${escapeHtml(segments || "General")}
              </p>

${sectionHeading("Before the day")}
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 16px 0;">
                The syllabus and rulebooks for every segment can be found on our syllabus page — check your event's material before the fest.
              </p>
              <a href="${SYLLABUS_URL}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #ff7053; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 9999px;">
                Syllabus &amp; rulebooks
              </a>

              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

              <p style="font-size: 12px; line-height: 1.5; color: #9ca3af; margin: 0;">
                If you believe this is a mistake, or your ID, TrxID or events look wrong, reply to this email or contact the club before the event. Team events: report to your slot with your whole team — one registration covers the team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                &copy; ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
