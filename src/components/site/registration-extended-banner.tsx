import { CalendarClock } from "lucide-react";

import { stemfestExtensionNotice } from "@/lib/data/stemfest-registration";

/**
 * Site-wide notice strip, rendered once in the public site layout above the
 * sticky header so every page carries the same message.
 *
 * Deliberately heading-free: the strip sits before each page's `<h1>` in the
 * document outline, so a heading here would put an `<h2>` above every page
 * title. Copy lives in `stemfestExtensionNotice`
 * (`src/lib/data/stemfest-registration.ts`).
 */
export default function RegistrationExtendedBanner() {
  return (
    <aside
      aria-label={stemfestExtensionNotice.label}
      className="border-b border-space-amber/40 bg-space-amber/10"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:px-8 lg:px-16">
        <CalendarClock
          className="size-4 shrink-0 text-space-amber"
          aria-hidden="true"
        />
        <p className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-amber">
          {stemfestExtensionNotice.label}
        </p>
        <p className="text-sm leading-relaxed text-space-muted">
          {stemfestExtensionNotice.message}
        </p>
        {stemfestExtensionNotice.deadline ? (
          <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-space-amber-bright">
            {stemfestExtensionNotice.deadlineLabel}{" "}
            {stemfestExtensionNotice.deadline}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
