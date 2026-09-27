import { siteConfig } from "@/lib/data";
import { BULK_EMAIL_NAME_TOKEN } from "@/lib/admin/bulk-email";
import sanitizeHtml from "sanitize-html";
import {
  bodyPanel,
  escapeHtml,
  heading,
  note,
  pageTransparent,
  paragraph,
} from "./shell";

interface CustomEmailOptions {
  /** Used as the heading, so the body opens under the line the inbox showed. */
  subject: string;
  /** The admin's prose, with `{{name}}` optionally standing in for a name. */
  body: string;
  /** The recipient's name, substituted for the merge tag. */
  name: string;
  /**
   * When `true` the body is treated as HTML and sanitised before it reaches the
   * markup; when `false` the body is plain text (prose) and escaped.
   */
  allowHtml?: boolean;
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
 * Sanitises an admin's HTML body before it reaches the mail.
 *
 * An admin explicitly opted into "allow HTML", so they get the tags a normal
 * email needs — links, emphasis, headings, lists, a button — but nothing that
 * would execute or track: scripts, iframes, objects, event handlers and
 * `javascript:` links are stripped, and any link that opens a new tab is forced
 * to carry `rel="noopener noreferrer"`. The merge tag is resolved first, so
 * a name containing `&` stays literal through the whitelist.
 */
function renderHtmlBody(body: string, name: string): string {
  const resolved = body.replaceAll(BULK_EMAIL_NAME_TOKEN, name);
  return sanitizeHtml(resolved, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "h3",
      "p",
      "img",
      "a",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "br",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "div",
      "blockquote",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      "*": ["style", "align", "valign"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          const currentRel = attribs.rel ? attribs.rel.split(/\s+/) : [];
          if (!currentRel.includes("noopener")) currentRel.push("noopener");
          if (!currentRel.includes("noreferrer")) currentRel.push("noreferrer");
          return {
            tagName,
            attribs: { ...attribs, rel: currentRel.join(" ") },
          };
        }
        return { tagName, attribs };
      },
    },
    disallowedTagsMode: "discard",
  });
}

/**
 * A message an admin wrote, in the shell every other club mail uses.
 *
 * Deliberately no button and no call to action: the sender is free-form — a
 * schedule change, a reminder, a note about a venue — and inventing a link for
 * it would put a dead control in front of a participant. An admin who wants a
 * link can type one; email clients underline it themselves. When `allowHtml` is
 * set, the body is sanitised HTML instead of escaped prose, so an admin can lay
 * out a richer message.
 *
 * The mail renders on a transparent page — no painted backdrop behind the card — so
 * the message reads as correspondence on whatever the reader's client puts behind it.
 */
export function getCustomEmailHtml({
  subject,
  body,
  name,
  allowHtml = false,
}: CustomEmailOptions): string {
  const fallbackHeading = `A message from ${siteConfig.name}`;

  return pageTransparent(
    bodyPanel(`
      ${heading(subject || fallbackHeading)}
      ${allowHtml ? renderHtmlBody(body, name) : renderBody(body, name)}

      <hr style="border: 0; border-top: 1px solid #f0f2f3; margin: 24px 0 20px 0;" />

      ${note(
        `You are receiving this because you registered for STEM Fest. Reply to this email if anything here looks wrong.`,
      )}
    `),
    subject || fallbackHeading,
  );
}

