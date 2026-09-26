"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerificationEmailHtml = getVerificationEmailHtml;
const data_1 = require("@/lib/data");
const shell_1 = require("./shell");
function getVerificationEmailHtml({ name, url, }) {
    const safeName = (0, shell_1.escapeHtml)(name || "there");
    return (0, shell_1.page)((0, shell_1.bodyPanel)(`
      ${(0, shell_1.heading)("Verify your email address")}
      ${(0, shell_1.paragraph)(`Hello ${safeName},`)}
      ${(0, shell_1.paragraph)(`Thank you for signing up for ${data_1.siteConfig.name}. Confirm your email address by clicking the button below.`, 28)}

      ${(0, shell_1.button)(url, "Verify email address")}

      <p style="margin: 28px 0 8px 0; font-size: 13px; line-height: 1.5; color: ${shell_1.COLOR_BODY};">
        If the button above doesn't work, paste this link into your browser:
      </p>
      <p style="margin: 0 0 28px 0; font-size: 12px; line-height: 1.5; word-break: break-all;">
        <a href="${url}" style="color: ${shell_1.COLOR_INK};">${(0, shell_1.escapeHtml)(url)}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 0 0 20px 0;" />

      ${(0, shell_1.note)(`This link expires in 1 hour. If you didn't sign up, you can safely ignore this email.`)}
    `), `Verify your email - ${data_1.siteConfig.name}`);
}
