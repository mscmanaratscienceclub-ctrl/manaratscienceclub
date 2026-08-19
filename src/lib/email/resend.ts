import { Resend } from "resend";
import { getVerificationEmailHtml } from "./templates/verification-email";
import { getResetPasswordEmailHtml } from "./templates/reset-password";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "Manara Science Club <onboarding@resend.dev>";

interface EmailRecipient {
  to: string;
  name: string;
  url: string;
}

interface SendOptions {
  subject: string;
  html: string;
  label: string;
  recipient: EmailRecipient;
}

async function sendEmail({ subject, html, label, recipient }: SendOptions) {
  const { to, name, url } = recipient;

  // No Resend API key (or placeholder key) → log the link for local dev.
  if (!apiKey || apiKey.startsWith("re_xxx") || apiKey.trim() === "") {
    console.info(
      "\n=======================================================\n" +
        `  [DEV ${label} LINK]\n` +
        `  To: ${to}\n` +
        `  Name: ${name}\n` +
        `  Link: ${url}\n` +
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
          `  Link: ${url}\n` +
          "=======================================================\n"
      );
      if (process.env.NODE_ENV !== "production") {
        return { success: false, error: error.message, simulated: true };
      }
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      "\n=======================================================\n" +
        `  [RESEND EXCEPTION]: ${message}\n` +
        `  To: ${to}\n` +
        `  Name: ${name}\n` +
        `  Link: ${url}\n` +
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
    subject: "Verify your email address - Manara Science Club",
    html: getVerificationEmailHtml({ name: recipient.name, url: recipient.url }),
    label: "EMAIL VERIFICATION",
    recipient,
  });
}

export async function sendResetPasswordEmail(recipient: EmailRecipient) {
  return sendEmail({
    subject: "Reset your password - Manara Science Club",
    html: getResetPasswordEmailHtml({ name: recipient.name, url: recipient.url }),
    label: "PASSWORD RESET",
    recipient,
  });
}
