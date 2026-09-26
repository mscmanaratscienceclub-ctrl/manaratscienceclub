import { siteConfig } from "@/lib/data";
import { COLOR_BODY, COLOR_INK, escapeHtml, heading, page, note, bodyPanel, paragraph, button } from "./shell";

interface ResetPasswordEmailOptions {
  name: string;
  url: string;
}

export function getResetPasswordEmailHtml({
  name,
  url,
}: ResetPasswordEmailOptions): string {
  const safeName = escapeHtml(name || "there");

  return page(
    bodyPanel(`
      ${heading("Reset your password")}
      ${paragraph(`Hello ${safeName},`)}
      ${paragraph(
        `We received a request to reset the password for your ${siteConfig.name} account. Click the button below to choose a new one. The link expires in 1 hour.`,
        28,
      )}

      ${button(url, "Reset password")}

      <p style="margin: 28px 0 8px 0; font-size: 13px; line-height: 1.5; color: ${COLOR_BODY};">
        If the button above doesn't work, paste this link into your browser:
      </p>
      <p style="margin: 0 0 28px 0; font-size: 12px; line-height: 1.5; word-break: break-all;">
        <a href="${url}" style="color: ${COLOR_INK};">${escapeHtml(url)}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 0 0 20px 0;" />

      ${note(
        `If you didn't request a reset, you can safely ignore this email. Your password won't change.`,
      )}
    `),
    `Reset your password - ${siteConfig.name}`,
  );
}
