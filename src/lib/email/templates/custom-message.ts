import { siteConfig } from "@/lib/data";
import { BULK_EMAIL_NAME_TOKEN } from "@/lib/admin/bulk-email";
import {
  bodyPanel,
  escapeHtml,
  heading,
  note,
  page,
  paragraph,
} from "./shell";

interface CustomEmailOptions {
  /** Used as the heading, so the body opens under the line the inbox showed. */
  subject: string;
  /** The admin's prose, with `{{name}}` optionally standing in for a name. */
  body: string;
  /** The recipient's name, substituted for the merge tag. */
  name: string;
}

/**
 * The body as paragraphs.
 *
 * A blank line is a new paragraph and a single newline is a line break, which
 * is how prose pasted into the box already reads. The merge tag is resolved
 * *before* escaping, so a name containing `&` survives without letting
 * anything the admin typed through as markup.
 */
function renderBody(body: string, name: string): string {
  return body
    .replaceAll(BULK_EMAIL_NAME_TOKEN, name)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraph(escapeHtml(block).replace(/\n/g, "<br />")))
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
export function getCustomEmailHtml({
  subject,
  body,
  name,
}: CustomEmailOptions): string {
  const fallbackHeading = `A message from ${siteConfig.name}`;

  return page(
    bodyPanel(`
      ${heading(subject || fallbackHeading)}
      ${renderBody(body, name)}

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 24px 0 20px 0;" />

      ${note(
        `You are receiving this because you registered for STEM Fest. Reply to this email if anything here looks wrong.`,
      )}
    `),
    subject || fallbackHeading,
  );
}
