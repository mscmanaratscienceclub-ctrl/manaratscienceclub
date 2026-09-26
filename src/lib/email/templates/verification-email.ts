import { siteConfig } from "@/lib/data";
import { COLOR_BODY, COLOR_INK, escapeHtml, heading, page, note, bodyPanel, paragraph, button } from "./shell";

interface VerificationEmailOptions {
  name: string;
  url: string;
}

export function getVerificationEmailHtml({
  name,
  url,
}: VerificationEmailOptions): string {
  const safeName = escapeHtml(name || "there");

  return page(
    bodyPanel(`
      ${heading("Verify your email address")}
      ${paragraph(`Hello ${safeName},`)}
      ${paragraph(
        `Thank you for signing up for ${siteConfig.name}. Confirm your email address by clicking the button below.`,
        28,
      )}

      ${button(url, "Verify email address")}

      <p style="margin: 28px 0 8px 0; font-size: 13px; line-height: 1.5; color: ${COLOR_BODY};">
        If the button above doesn't work, paste this link into your browser:
      </p>
      <p style="margin: 0 0 28px 0; font-size: 12px; line-height: 1.5; word-break: break-all;">
        <a href="${url}" style="color: ${COLOR_INK};">${escapeHtml(url)}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 0 0 20px 0;" />

      ${note(
        `This link expires in 1 hour. If you didn't sign up, you can safely ignore this email.`,
      )}
    `),
    `Verify your email - ${siteConfig.name}`,
  );
}
