"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomEmailHtml = getCustomEmailHtml;
const data_1 = require("@/lib/data");
const bulk_email_1 = require("@/lib/admin/bulk-email");
const shell_1 = require("./shell");
/**
 * The body as paragraphs.
 *
 * A blank line is a new paragraph and a single newline is a line break, which
 * is how prose pasted into the box already reads. The merge tag is resolved
 * *before* escaping, so a name containing `&` survives without letting
 * anything the admin typed through as markup.
 */
function renderBody(body, name) {
    return body
        .replaceAll(bulk_email_1.BULK_EMAIL_NAME_TOKEN, name)
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => (0, shell_1.paragraph)((0, shell_1.escapeHtml)(block).replace(/\n/g, "<br />")))
        .join("\n");
}
/**
 * A message an admin wrote, in the shell every other club mail uses.
 *
 * Deliberately no button and no call to action: the sender is free-form — a
 * schedule change, a reminder, a note about a venue — and inventing a link for
 * it would put a dead control in front of a participant. An admin who wants a
 * link can type one; email clients underline it themselves.
 */
function getCustomEmailHtml({ subject, body, name, }) {
    const fallbackHeading = `A message from ${data_1.siteConfig.name}`;
    return (0, shell_1.page)((0, shell_1.bodyPanel)(`
      ${(0, shell_1.heading)(subject || fallbackHeading)}
      ${renderBody(body, name)}

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 24px 0 20px 0;" />

      ${(0, shell_1.note)(`You are receiving this because you registered for STEM Fest. Reply to this email if anything here looks wrong.`)}
    `), subject || fallbackHeading);
}
