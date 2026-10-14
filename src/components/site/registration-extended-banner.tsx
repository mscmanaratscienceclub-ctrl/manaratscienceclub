import { CalendarClock, Lock, type LucideIcon } from "lucide-react";

import { stemfestExtensionNotice } from "@/lib/data/stemfest-registration";
import {
  registrationClosedBanner,
  registrationIsClosed,
} from "@/lib/data/registration-status";

/**
 * Site-wide notice strip, rendered once in the public site layout above the
 * sticky header so every page carries the same message.
 *
 * Carries either the extension announcement or the closure, on the strength of
 * `registrationIsClosed` (`src/lib/data/registration-status.ts`) — the strip
 * advertises intake on every page, so it must not promise open registration
 * while the submit actions refuse it.
 *
 * Deliberately heading-free: the strip sits before each page's `<h1>` in the
 * document outline, so a heading here would put an `<h2>` above every page
 * title.
 */
export default function RegistrationExtendedBanner() {
  const Icon: LucideIcon = registrationIsClosed ? Lock : CalendarClock;

  return (
    <aside
      aria-label={
        registrationIsClosed
          ? registrationClosedBanner.label
          : stemfestExtensionNotice.label
      }
      className="border-b border-space-amber/40 bg-space-amber/10"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:px-8 lg:px-16">
        <Icon
          className="size-4 shrink-0 text-space-amber"
          aria-hidden="true"
        />
        <p className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-amber">
          {registrationIsClosed
            ? registrationClosedBanner.label
            : stemfestExtensionNotice.label}
        </p>
        <p className="text-sm leading-relaxed text-space-muted">
          {registrationIsClosed
            ? registrationClosedBanner.message
            : stemfestExtensionNotice.message}
        </p>
        {!registrationIsClosed && stemfestExtensionNotice.deadline ? (
          <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-space-amber-bright">
            {stemfestExtensionNotice.deadlineLabel}{" "}
            {stemfestExtensionNotice.deadline}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
