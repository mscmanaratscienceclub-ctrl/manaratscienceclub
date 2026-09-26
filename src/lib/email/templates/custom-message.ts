import { siteConfig } from "@/lib/data";
import { BULK_EMAIL_NAME_TOKEN } from "@/lib/admin/bulk-email";

interface CustomEmailOptions {
  /** Used as the heading, so the body opens under the line the inbox showed. */
  subject: string;
  /** The admin's prose, with `{{name}}` optionally standing in for a name. */
  body: string;
  /** The recipient's name, substituted for the merge tag. */
  name: string;
}

/**
 * The interpolated name and the admin's own prose are arbitrary text, so they are
 * escaped before they reach the markup — an email client is a renderer like any
 * other, and a body pasted out of a document can carry an angle bracket.
 */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

/**
 * The body as paragraphs.
 *
 * A blank line is a new paragraph and a single newline is a line break, which is
 * how prose pasted into the box already reads. The merge tag is resolved *before*
 * escaping, so a name containing `&` survives without letting anything the admin
 * typed through as markup.
 */
function renderBody(body: string, name: string): string {
  return body
    .replaceAll(BULK_EMAIL_NAME_TOKEN, name)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 16px 0;">\n                ${escapeHtml(block).replace(/\n/g, "<br />")}\n              </p>`,
    )
    .join("\n");
}

/**
 * A message an admin wrote, in the shell every other club mail uses.
 *
 * Deliberately no button and no call to action: the sender is free-form — a
 * schedule change, a reminder, a note about a venue — and inventing a link for it
 * would put a dead control in front of a participant. An admin who wants a link
 * can type one; email clients underline it themselves.
 */
export function getCustomEmailHtml({
  subject,
  body,
  name,
}: CustomEmailOptions): string {
  const heading = escapeHtml(subject || `A message from ${siteConfig.name}`);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); max-width: 560px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #ff7053; padding: 32px 24px;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                ${siteConfig.name}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 20px 0;">
                ${heading}
              </h2>
${renderBody(body, name)}

              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

              <p style="font-size: 12px; line-height: 1.5; color: #9ca3af; margin: 0;">
                You are receiving this because you registered for STEM Fest. Reply to this email if anything here looks wrong.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                &copy; ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.
              </p>
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
