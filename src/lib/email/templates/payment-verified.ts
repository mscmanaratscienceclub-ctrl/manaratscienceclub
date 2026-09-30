import { siteConfig } from "@/lib/data";
import { escapeHtml } from "./shell";

interface PaymentVerifiedEmailOptions {
  /**
   * The `<GENDER><CLASS><NNN>` ID the database minted, the number the club
   * looks a participant up by, so it leads the receipt. Supplied for every
   * registration made since the trigger existed; optional so a legacy row
   * without one still sends (the receipt either carries the real ID or
   * carries nothing there).
   */
  registrationCode?: string;
  name: string;
  /** Class label, already resolved (e.g. `Class 7`, `A2/12`). */
  classLabel: string;
  /** The school/college name as stored on the row. */
  school: string;
  /** The registered participant's phone, for on-the-day contact. */
  phone: string;
  /** The participant's email, when the row carries one. */
  email?: string;
  transactionId: string;
  /** The bKash wallet the fee was sent from. */
  paymentNumber: string;
  /**
   * What the participant entered, already joined by `describeEntry` — rendered
   * as one line rather than re-split, because team names and sizes live inside
   * the description and guessing at separators would mangle it.
   */
  segments: string;
  /** The amount a forwarded SMS reported, already formatted. Omitted when unknown. */
  amount?: string;
}

/** The fest as this mail prints it, everywhere it appears. */
const FEST_NAME = "STEM Fest '26-27";

/** The days the fest runs, on the club's calendar. */
const FEST_DATES = "16th & 17th October 2026";

/** Where the fest happens, hyperlinked from the venue line. */
const VENUE_URL = "https://share.google/b8LRwJlxs93jL0wD7";
const VENUE_LABEL =
  "Manarat Dhaka International School & College, Gulshan-2, Dhaka";

/** Who a participant contacts when something looks wrong. */
const CONTACTS = [
  {
    name: "Mohammad Ajmain Faieq",
    role: "President",
    phone: "01920522197",
    dial: "+8801920522197",
  },
  {
    name: "Yasa Rahman",
    role: "General Secretary",
    phone: "01332510118",
    dial: "+8801332510118",
  },
];

/* ── Brand palette ────────────────────────────────────────────────────────
 * Copied from `src/app/globals.css`: the same ink text and Manara teal the
 * site is built on, so a receipt and the site read as one brand. The page
 * behind the card is deliberately NOT painted — the mail is just the card, on
 * whatever the reader's client puts behind it — which is why CREAM below is
 * only a card tint, never a page colour. Email cannot use the tokens
 * themselves, which is why `lib/email/templates/` is the one place `verify.sh`
 * allows raw hex. Every pairing below clears WCAG AAA: ink on white is 16.4:1,
 * teal-deep on the cream and teal tints is 13:1 or better, and white on the
 * teal header and footer is 7.37:1.
 */
const CREAM = "#FFF8EC";
const INK = "#142326";
const TEAL = "#005F6B";
const TEAL_DEEP = "#002F36";
const YELLOW = "#FFB703";
const WHITE = "#FFFFFF";
const HAIRLINE = "#D8E4E5";
const TINT_TEAL = "#E9F2F3";
const TINT_YELLOW = "#FFF4D6";
const TINT_NEUTRAL = "#F4F1EC";

const SANS = "Arial, Helvetica, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

/** One `Label: value` line of a card body. */
function line(label: string, value: string): string {
  return `<strong>${label}:</strong> ${value}`;
}

/**
 * One numbered card of the receipt: a tinted strip carrying the step badge and
 * title, then the white body. `first` is the card that opens the run, which the
 * intro above it gets more room than its siblings.
 */
function card(
  tint: string,
  step: string,
  title: string,
  body: string,
  first = false,
): string {
  return `
          <!-- ${step} ${title} -->
          <tr>
            <td class="pad-body" style="padding: ${first ? "28px" : "18px"} 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${HAIRLINE}; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="background-color: ${tint}; padding: 12px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 30px; height: 30px; background-color: ${TEAL}; color: ${WHITE}; border-radius: 999px; text-align: center; font-family: ${SANS}; font-size: 15px; font-weight: bold; line-height: 30px;">${step}</td>
                        <td style="padding-left: 12px; font-family: ${SANS}; font-size: 17px; font-weight: bold; color: ${TEAL_DEEP};">${title}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: ${WHITE}; padding: 8px 16px 16px; font-family: ${SANS}; font-size: 15px; line-height: 1.6; color: ${INK};">${body}</td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/**
 * The payment-confirmation receipt.
 *
 * This mail deliberately does NOT use the shared shell: the club picked this
 * layout (a full-width branded header, numbered cards, a card per topic) from
 * the drafts they were shown, and the shell's 560px cream card would undo it.
 * It also ships no page background of its own — no painted backdrop behind the
 * card — so it sits on whatever the client renders; the card's own hairline
 * border and radius are what set it apart, not a coloured page.
 * The colours are the site's own brand tokens, so the receipt matches the
 * website rather than introducing a palette of its own.
 *
 * Escaping is still non-negotiable — every interpolated value that a participant
 * or admin ever typed goes through `escapeHtml` before it reaches the markup.
 */
export function getPaymentVerifiedEmailHtml({
  registrationCode,
  name,
  classLabel,
  school,
  phone,
  email,
  transactionId,
  paymentNumber,
  segments,
  amount,
}: PaymentVerifiedEmailOptions): string {
  // The ID block is the line a volunteer greets a participant with. A legacy
  // row without an ID prints no line rather than a placeholder.
  const registration: string[] = [];
  if (registrationCode) {
    registration.push(
      line(
        "Registration ID",
        `<span style="font-family: ${MONO};">${escapeHtml(registrationCode)}</span>`,
      ),
    );
  }
  registration.push(
    line("Name", escapeHtml(name) || "Not provided"),
    line("Class", escapeHtml(classLabel)),
    line("Email", escapeHtml(email ?? "") || "Not provided"),
    line("Phone", escapeHtml(phone) || "Not provided"),
    line("Institution", escapeHtml(school) || "Not provided"),
    line("Segment(s)", escapeHtml(segments) || "General"),
  );

  // Same rule for the fee: a row no forwarded SMS reported an amount for prints
  // nothing rather than a placeholder that reads like a number.
  const payment: string[] = [
    line("bKash Number", escapeHtml(paymentNumber) || "Not provided"),
    line(
      "Transaction ID",
      `<span style="font-family: ${MONO}; font-weight: bold;">${escapeHtml(transactionId)}</span>`,
    ),
  ];
  if (amount) {
    payment.push(
      line(
        "Amount Paid",
        `<span style="font-size: 18px; font-weight: bold; color: ${TEAL_DEEP};">${escapeHtml(amount)}</span>`,
      ),
    );
  }

  const event = [
    line("Dates", `<span style="font-weight: bold; color: ${TEAL_DEEP};">${FEST_DATES}</span>`),
    line(
      "Venue",
      `<a href="${VENUE_URL}" target="_blank" style="color: ${TEAL}; text-decoration: underline;">${VENUE_LABEL}</a>`,
    ),
    line("Reporting", "Confirmed in the itinerary email"),
  ];

  const support = [
    `Reply to this email and it reaches the ${FEST_NAME} team at <a href="mailto:${siteConfig.email}" style="color: ${TEAL}; text-decoration: underline;">${siteConfig.email}</a>.`,
    "<strong>For urgent matters during the fest, call:</strong>",
    ...CONTACTS.map(
      (contact) =>
        `<a href="tel:${contact.dial}" style="color: ${TEAL}; text-decoration: underline; font-weight: bold;">${contact.phone}</a> ${contact.name} (${contact.role})`,
    ),
  ];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>${FEST_NAME} - Payment Confirmed</title>
  <style>
    a { color: ${TEAL}; }
    @media screen and (min-width: 600px) {
      .pad-hero {
        padding: 48px 40px !important;
      }
      .pad-body {
        padding-left: 36px !important;
        padding-right: 36px !important;
      }
      .hero-title {
        font-size: 36px !important;
      }
      .hero-sub {
        font-size: 18px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${WHITE}; -webkit-text-size-adjust: 100%; font-family: ${SANS}; color: ${INK}; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: ${WHITE}; border: 1px solid ${HAIRLINE}; border-radius: 18px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td class="pad-hero" style="background-color: ${TEAL}; padding: 38px 28px; text-align: center;">
              <p style="margin: 0; display: inline-block; background-color: ${WHITE}; color: ${TEAL_DEEP}; font-family: ${SANS}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold; padding: 6px 14px; border-radius: 999px;">You are in</p>
              <h1 class="hero-title" style="margin: 18px 0 0; color: ${WHITE}; font-size: 30px; line-height: 1.15; font-weight: bold;">Payment Confirmed</h1>
              <p class="hero-sub" style="margin: 12px 0 0; color: ${WHITE}; font-size: 16px; line-height: 1.4;">${FEST_NAME} &middot; ${FEST_DATES}</p>
            </td>
          </tr>

          <!-- Accent band -->
          <tr>
            <td style="height: 8px; background-color: ${YELLOW}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Intro -->
          <tr>
            <td class="pad-body" style="padding: 34px 24px 0; text-align: center;">
              <p style="margin: 0 0 14px; font-size: 16px; font-weight: bold;">Dear ${escapeHtml(name) || "Participant"},</p>
              <p style="margin: 0; font-size: 16px; color: ${INK};">Your registration and payment are confirmed. Here is your receipt. Each block below covers one part of your entry, so you can check it at a glance. A second email will follow with the itinerary and the details of the two days.</p>
            </td>
          </tr>
${card(CREAM, "1", "Your Registration", registration.join("<br>"), true)}
${card(TINT_TEAL, "2", "Payment Receipt", payment.join("<br>"))}
${card(TINT_YELLOW, "3", "Event Details", event.join("<br>"))}
${card(TINT_NEUTRAL, "4", "Questions and Support", support.join("<br>"))}

          <!-- Closing -->
          <tr>
            <td class="pad-body" style="padding: 32px 24px 12px; text-align: center;">
              <p style="margin: 0 0 16px; font-size: 16px; color: ${INK};">We cannot wait to see you at the fest. Thank you for your cooperation.</p>
              <p style="margin: 0 0 2px; font-size: 16px; font-weight: bold;">Regards,</p>
              <p style="margin: 0; font-size: 16px;">${FEST_NAME} Team<br><span style="color: ${INK};">${escapeHtml(siteConfig.name)}</span></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${TEAL}; padding: 22px 24px; text-align: center; font-family: ${SANS}; font-size: 13px; line-height: 1.6; color: ${WHITE};">
              &copy; ${new Date().getFullYear()} ${escapeHtml(siteConfig.name)}. All rights reserved.<br>
              ${FEST_NAME} &middot; ${VENUE_LABEL}
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
