import { Resend } from "resend";
import { siteConfig } from "@/lib/data";
import { getVerificationEmailHtml } from "./templates/verification-email";
import { getResetPasswordEmailHtml } from "./templates/reset-password";
import { getPaymentVerifiedEmailHtml } from "./templates/payment-verified";
import { getCustomEmailHtml } from "./templates/custom-message";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

/**
 * The `From:` identity every mail is sent with. `EMAIL_FROM` wins because the
 * address has to be one Resend has verified for the domain; the fallback is the
 * club's own public address rather than a Resend sandbox one, so a misconfigured
 * environment is a refused send (loud) instead of mail from `resend.dev`.
 */
export const EMAIL_FROM =
  process.env.EMAIL_FROM || `${siteConfig.name} <${siteConfig.email}>`;

interface EmailRecipient {
  to: string;
  name: string;
  /**
   * The link the email is about, when it has one. Verification and password-reset
   * mails are entirely a link; a payment confirmation is not, and forcing a fake
   * one on it would put a dead button in front of a participant.
   */
  url?: string;
}

interface SendOptions {
  subject: string;
  html: string;
  label: string;
  recipient: EmailRecipient;
}

/**
 * What a send attempt answers. `simulated` is not a failure: it means no real
 * message left the building — either this environment has no usable API key, or
 * Resend refused in development (a free testing key can only send to the account
 * owner). Callers say so rather than reporting a delivery that did not happen.
 */
export interface SendEmailResult {
  success: boolean;
  simulated?: boolean;
  error?: string;
}

/** The dev log prints a link line only for mails that have one. */
function formatLink(url: string | undefined): string {
  return url ? `  Link: ${url}\n` : "";
}

async function sendEmail({
  subject,
  html,
  label,
  recipient,
}: SendOptions): Promise<SendEmailResult> {
  const { to, name, url } = recipient;

  // No Resend API key (or placeholder key) → log the message for local dev.
  if (!apiKey || apiKey.startsWith("re_xxx") || apiKey.trim() === "") {
    console.info(
      "\n=======================================================\n" +
        `  [DEV ${label}]\n` +
        `  To: ${to}\n` +
        `  Name: ${name}\n` +
        formatLink(url) +
        "=======================================================\n"
    );
    return { success: true, simulated: true };
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      console.warn(
        "\n=======================================================\n" +
          `  [RESEND API NOTICE]: ${error.message}\n` +
          "  (Note: Resend free testing keys can only send to your account owner email).\n" +
          `  To: ${to}\n` +
          `  Name: ${name}\n` +
          formatLink(url) +
          "=======================================================\n"
      );
      if (process.env.NODE_ENV !== "production") {
        return { success: false, error: error.message, simulated: true };
      }
      throw new Error(error.message);
    }

    return { success: true, data: data ?? undefined } as SendEmailResult;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      "\n=======================================================\n" +
        `  [RESEND EXCEPTION]: ${message}\n` +
        `  To: ${to}\n` +
        `  Name: ${name}\n` +
        formatLink(url) +
        "=======================================================\n"
    );
    if (process.env.NODE_ENV !== "production") {
      return { success: false, error: message, simulated: true };
    }
    throw err;
  }
}

export async function sendVerificationEmail(recipient: EmailRecipient) {
  return sendEmail({
    subject: `Verify your email address - ${siteConfig.name}`,
    html: getVerificationEmailHtml({ name: recipient.name, url: recipient.url ?? "" }),
    label: "EMAIL VERIFICATION",
    recipient,
  });
}

export async function sendResetPasswordEmail(recipient: EmailRecipient) {
  return sendEmail({
    subject: `Reset your password - ${siteConfig.name}`,
    html: getResetPasswordEmailHtml({ name: recipient.name, url: recipient.url ?? "" }),
    label: "PASSWORD RESET",
    recipient,
  });
}

export interface CustomEmailOptions {
  to: string;
  name: string;
  /** The subject line, also used as the message's heading. */
  subject: string;
  /** The admin's prose, with `{{name}}` optionally standing in for a name. */
  body: string;
}

/**
 * A message an admin wrote, sent to a filtered audience from `/admin/emails`.
 *
 * The same `sendEmail` path every other mail takes, so a custom blast is logged in
 * development and rate-limited in production exactly like a receipt — there is no
 * second way out of the building.
 */
export async function sendCustomEmail({
  to,
  name,
  subject,
  body,
}: CustomEmailOptions): Promise<SendEmailResult> {
  return sendEmail({
    subject,
    html: getCustomEmailHtml({ subject, body, name }),
    label: "CUSTOM MESSAGE",
    recipient: { to, name },
  });
}

export interface PaymentVerifiedEmailOptions {
  /** The `<GENDER><CLASS><NNN>` ID minted on insert — the receipt's headline. */
  registrationCode?: string;
  to: string;
  name: string;
  /** Class label, already resolved (e.g. `Class 7`). */
  classLabel: string;
  /** The school/college name as stored on the row. */
  school: string;
  /** The registered participant's phone. */
  phone: string;
  transactionId: string;
  /** The bKash wallet the fee was sent from. */
  paymentNumber: string;
  /** The registration's `segments` value: the events, already described. */
  segments: string;
  /** Confirmation time, already formatted in `ADMIN_TIME_ZONE`. */
  verifiedOn: string;
  /** Submission time, already formatted. Optional for legacy rows. */
  submittedOn?: string;
  /** The amount a forwarded SMS reported, already formatted. Omitted if unknown. */
  amount?: string;
}

/**
 * The mail an admin's "Verified" sends: the participant is told a human checked
 * their bKash payment and their slots are confirmed. It doubles as the
 * participant's receipt, so it carries the whole registration — ID, participant
 * details, payment reference and events — rather than only the payment.
 * Fired from the Server Action that records the decision, never from the SMS
 * webhook — a public, retried, unauthenticated endpoint is the wrong place to
 * depend on a third party.
 */
export async function sendPaymentVerifiedEmail({
  registrationCode,
  to,
  name,
  classLabel,
  school,
  phone,
  transactionId,
  paymentNumber,
  segments,
  verifiedOn,
  submittedOn,
  amount,
}: PaymentVerifiedEmailOptions): Promise<SendEmailResult> {
  return sendEmail({
    subject: registrationCode
      ? `Payment confirmed — ${registrationCode} · STEM Fest, ${siteConfig.name}`
      : `Payment confirmed - STEM Fest registration, ${siteConfig.name}`,
    html: getPaymentVerifiedEmailHtml({
      registrationCode,
      name,
      classLabel,
      school,
      phone,
      transactionId,
      paymentNumber,
      segments,
      verifiedOn,
      submittedOn,
      amount,
    }),
    label: "PAYMENT CONFIRMED",
    recipient: { to, name },
  });
}

