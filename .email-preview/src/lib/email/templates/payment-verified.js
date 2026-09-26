"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentVerifiedEmailHtml = getPaymentVerifiedEmailHtml;
const data_1 = require("@/lib/data");
const shell_1 = require("./shell");
/**
 * Absolute base for links inside the email.
 *
 * An email is read away from the site, so a relative `/syllabus` would be a
 * dead end. Same env var and same fallback as `src/app/sitemap.ts`, so a link
 * in a mail and a link in the sitemap can never point at different hosts.
 *
 * A loopback host is discarded rather than used: `.env` sets
 * `NEXT_PUBLIC_BASE_URL=http://localhost:3000`, and a participant who received
 * a receipt linking to localhost has been handed a dead end in a mail they
 * cannot fix. Falling back to the live domain fails safe — worst case the link
 * points at production from a staging build, which still resolves.
 */
const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const BASE_URL = (!configuredBaseUrl || /localhost|127\.0\.0\.1/.test(configuredBaseUrl)
    ? "https://manaratscience.club"
    : configuredBaseUrl).replace(/\/+$/, "");
/** Where the club's segment material lives, linked from every confirmation. */
const SYLLABUS_URL = `${BASE_URL}/syllabus`;
/** A grouping label between the receipt's tables. */
function sectionHeading(label) {
    return `
              <p style="font-size: 12px; line-height: 1.5; color: ${shell_1.COLOR_MUTED}; margin: 24px 0 6px 0; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">
                ${label}
              </p>`;
}
function getPaymentVerifiedEmailHtml({ registrationCode, name, classLabel, school, phone, transactionId, paymentNumber, segments, submittedOn, amount, }) {
    const safeName = (0, shell_1.escapeHtml)(name || "there");
    const notProvided = "Not provided";
    // The ID is the one line a club volunteer greets a participant with, so it
    // gets the hero treatment rather than a table row: cream panel, coral left
    // edge, ink mono ID. The old coral-tinted card put coral text on white
    // (2.7:1) and was the only box of its kind in the mail system.
    const registrationIdBlock = registrationCode
        ? `
              <div style="margin: 20px 0; padding: 14px 18px; background-color: ${shell_1.COLOR_CREAM}; border: 1px solid #f0e6d2; border-left: 3px solid ${shell_1.COLOR_ACCENT}; border-radius: ${shell_1.RADIUS_PANEL};">
                <p style="font-size: 11px; color: ${shell_1.COLOR_MUTED}; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
                  Registration ID
                </p>
                <p style="font-size: 26px; font-weight: 700; color: ${shell_1.COLOR_INK}; margin: 0; font-family: ${shell_1.MONO_STACK}; letter-spacing: 0.04em;">
                  ${(0, shell_1.escapeHtml)(registrationCode)}
                </p>
                <p style="font-size: 12px; color: ${shell_1.COLOR_MUTED}; margin: 6px 0 0 0;">
                  Quote this ID at the check-in desk and on the results sheet.
                </p>
              </div>`
        : "";
    return (0, shell_1.page)((0, shell_1.bodyPanel)(`
      <h2 style="font-size: 17px; font-weight: 700; color: ${shell_1.COLOR_INK}; margin: 0 0 14px 0;">
        Your payment is confirmed
      </h2>
      ${(0, shell_1.paragraph)(`Hello ${safeName},`)}
      ${(0, shell_1.paragraph)(`We have verified your bKash payment for STEM Fest. Your registration is confirmed. Keep this email as your receipt.`, 8)}
${registrationIdBlock}
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 8px 0;">
${(0, shell_1.detailRow)("Name", (0, shell_1.escapeHtml)(name) || notProvided)}
${(0, shell_1.detailRow)("Class", (0, shell_1.escapeHtml)(classLabel))}
${(0, shell_1.detailRow)("School / college", (0, shell_1.escapeHtml)(school) || notProvided)}
${(0, shell_1.detailRow)("Phone", (0, shell_1.escapeHtml)(phone) || notProvided)}
      </table>

${sectionHeading("Payment")}
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 8px 0;">
${(0, shell_1.detailRow)("Transaction ID", (0, shell_1.escapeHtml)(transactionId), true)}
${(0, shell_1.detailRow)("bKash number", (0, shell_1.escapeHtml)(paymentNumber) || notProvided, true)}
${amount ? (0, shell_1.detailRow)("Amount received", (0, shell_1.escapeHtml)(amount)) : ""}
${(0, shell_1.detailRow)("Registered on", (0, shell_1.escapeHtml)(submittedOn || "") || notProvided)}
      </table>

${sectionHeading("Confirmed events")}
      <p style="font-size: 15px; line-height: 1.7; color: ${shell_1.COLOR_INK}; margin: 0;">
        ${(0, shell_1.escapeHtml)(segments || "General")}
      </p>

${sectionHeading("Before the day")}
      <p style="font-size: 15px; line-height: 1.6; color: ${shell_1.COLOR_BODY}; margin: 0 0 16px 0;">
        The syllabus and rulebooks for every segment are on the syllabus page. Check your event's material before the fest.
      </p>
      ${(0, shell_1.button)(SYLLABUS_URL, "Syllabus and rulebooks")}

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 32px 0 20px 0;" />

      ${(0, shell_1.note)(`If your ID, TrxID or events look wrong, reply to this email or contact the club before the event. Team events: report to your slot with your whole team. One registration covers the team.`)}
    `), `Payment confirmed - ${data_1.siteConfig.name}`);
}
