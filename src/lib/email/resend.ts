import { Resend } from "resend";
import { getVerificationEmailHtml } from "./templates/verification-email";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "Manara Science Club <onboarding@resend.dev>";

interface SendVerificationParams {
  to: string;
  name: string;
  url: string;
}

export async function sendVerificationEmail({
  to,
  name,
  url,
}: SendVerificationParams) {
  // If no Resend API key or placeholder key, log the verification link to dev console
  if (!apiKey || apiKey.startsWith("re_xxx") || apiKey.trim() === "") {
    console.log(
      "\n=======================================================\n" +
        "  [DEV EMAIL VERIFICATION LINK]\n" +
        `  To: ${to}\n` +
        `  Name: ${name}\n` +
        `  Verification Link: ${url}\n` +
        "=======================================================\n"
    );
    return { success: true, simulated: true };
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Verify your email address - Manara Science Club",
      html: getVerificationEmailHtml({ name, url }),
    });

    if (error) {
      console.warn(
        "\n=======================================================\n" +
          `  [RESEND API NOTICE]: ${error.message}\n` +
          "  (Note: Resend free testing keys can only send to your account owner email).\n" +
          `  To: ${to}\n` +
          `  Name: ${name}\n` +
          `  Verification Link: ${url}\n` +
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
        `  Verification Link: ${url}\n` +
        "=======================================================\n"
    );
    if (process.env.NODE_ENV !== "production") {
      return { success: false, error: message, simulated: true };
    }
    throw err;
  }
}
