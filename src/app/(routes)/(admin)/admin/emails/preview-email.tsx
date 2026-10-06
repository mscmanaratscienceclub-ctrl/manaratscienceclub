"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { BulkEmailPreview } from "@/lib/admin/bulk-email";
import { adminLabel } from "@/components/admin/styles";

/**
 * A full-width dialog that renders an email exactly as a recipient would read it.
 *
 * The email ships with inline styles and table layout — markup that a browser
 * renders correctly and text-only tools do not — so it is shown in an `<iframe
 * srcDoc>` rather than as a string or a sanitised preview. That is the same
 * isolation a real email client gives it, and it lets the rendered card fill the
 * dialog without the admin page's own CSS leaking in.
 *
 * Nothing here sends mail. The dialog is purely a look before the (separate)
 * send button is pressed.
 */
export default function EmailPreviewModal({
  preview,
  onClose,
}: {
  preview: BulkEmailPreview;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close email preview"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-admin-ink/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Email preview"
        className="absolute inset-x-0 top-0 bottom-0 flex flex-col border-l border-admin-line bg-admin-surface sm:inset-x-auto sm:right-0 sm:w-full sm:max-w-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-admin-line px-6 py-4">
          <div className="min-w-0">
            <p className={adminLabel}>
              Preview · {preview.sample.name
                ? `${preview.sample.name} <${preview.sample.email}>`
                : "No recipient in audience"}
            </p>
            <h3 className="mt-1.5 truncate font-space-display text-xl font-medium tracking-tight text-admin-ink">
              {preview.subject}
            </h3>
            <p className="mt-1 font-space-body text-xs text-admin-muted">
              What the first recipient in this audience would receive. Nothing has
              been sent.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-admin-line text-admin-ink-soft transition-colors hover:bg-admin-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-admin-canvas">
          <div className="h-full overflow-y-auto">
            {preview.recipients.length > 0 && (
              <section className="border-b border-admin-line bg-admin-surface px-6 py-3">
                <p className={adminLabel}>
                  Sending to {preview.recipients.length}{" "}
                  {preview.recipients.length === 1 ? "address" : "addresses"}
                </p>
                <ul className="mt-1 max-h-36 divide-y divide-admin-line overflow-y-auto">
                  {preview.recipients.map((recipient, index) => (
                    <li
                      key={`${recipient.email}-${index}`}
                      className="flex flex-wrap items-baseline gap-x-2 py-1 font-space-body text-sm"
                    >
                      <span className="font-medium text-admin-ink">
                        {recipient.name}
                      </span>
                      <span className="break-all font-mono text-xs text-admin-muted">
                        {recipient.email}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <iframe
              title={`Email preview for ${preview.sample.name}`}
              srcDoc={preview.html}
              className="h-[60vh] min-h-[480px] w-full border-0 bg-transparent"
              sandbox=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
