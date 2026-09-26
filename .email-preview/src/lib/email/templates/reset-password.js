"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResetPasswordEmailHtml = getResetPasswordEmailHtml;
const data_1 = require("@/lib/data");
const shell_1 = require("./shell");
function getResetPasswordEmailHtml({ name, url, }) {
    const safeName = (0, shell_1.escapeHtml)(name || "there");
    return (0, shell_1.page)((0, shell_1.bodyPanel)(`
      ${(0, shell_1.heading)("Reset your password")}
      ${(0, shell_1.paragraph)(`Hello ${safeName},`)}
      ${(0, shell_1.paragraph)(`We received a request to reset the password for your ${data_1.siteConfig.name} account. Click the button below to choose a new one. The link expires in 1 hour.`, 28)}

      ${(0, shell_1.button)(url, "Reset password")}

      <p style="margin: 28px 0 8px 0; font-size: 13px; line-height: 1.5; color: ${shell_1.COLOR_BODY};">
        If the button above doesn't work, paste this link into your browser:
      </p>
      <p style="margin: 0 0 28px 0; font-size: 12px; line-height: 1.5; word-break: break-all;">
        <a href="${url}" style="color: ${shell_1.COLOR_INK};">${(0, shell_1.escapeHtml)(url)}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 0 0 20px 0;" />

      ${(0, shell_1.note)(`If you didn't request a reset, you can safely ignore this email. Your password won't change.`)}
    `), `Reset your password - ${data_1.siteConfig.name}`);
}
