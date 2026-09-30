"use client";

import { Mail } from "lucide-react";
import type { BulkEmailRecipient } from "@/lib/admin/bulk-email";

/**
 * The actual email addresses a blast will reach, shown so an admin can see exactly who
 * is on the list rather than trusting a count. The audience is read from the URL on
 * every render, so this list is always the truth of what the buttons below would send
 * to.
 *
 * A large audience (up to `BULK_EMAIL_MAX_RECIPIENTS`) must not turn the page
 * into a mile of text, so the list scrolls inside a bounded box and the heading
 * states the total up front.
 */
export default function AudienceEmailList({
  recipients,
}: {
  recipients: BulkEmailRecipient[];
}) {
  if (recipients.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-ink/10 bg-cream/40">
      <header className="flex items-center gap-2 border-b border-ink/10 px-3 py-2">
        <Mail className="h-3.5 w-3.5 text-ink/40" aria-hidden="true" />
        <p className="font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
          Going to {recipients.length}{" "}
          {recipients.length === 1 ? "address" : "addresses"}
        </p>
      </header>
      <ul className="max-h-56 divide-y divide-ink/5 overflow-y-auto">
        {recipients.map((recipient) => (
          <li
            key={recipient.id}
            className="flex flex-wrap items-baseline gap-x-2 px-3 py-1.5 font-body text-sm"
          >
            <span className="font-medium text-ink/80">{recipient.name}</span>
            <span className="break-all font-mono text-xs text-ink/55">
              {recipient.email}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
