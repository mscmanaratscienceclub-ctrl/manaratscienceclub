import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { registrationClosedNotice } from "@/lib/data/registration-status";

/**
 * The whole of a closed registration surface: `/register`, `/stemfestreg` and
 * `/volunteer` each render this in place of their form, so the three paths that
 * once forked into intake all end on one statement of it.
 */
export default function RegistrationClosedNotice() {
  return (
    <div className="min-h-screen bg-space-deep">
      <section className="relative overflow-hidden border-b border-space-line-soft">
        <div
          aria-hidden="true"
          className="msc-atmosphere pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="space-grain pointer-events-none absolute inset-0"
        />

        <div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <span className="inline-flex items-center gap-2 border border-space-amber/40 px-4 py-1.5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-amber">
            <Lock className="size-3.5" aria-hidden="true" />
            {registrationClosedNotice.eyebrow}
          </span>
          <h1 className="mt-5 max-w-[36rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {registrationClosedNotice.heading}
          </h1>
          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-space-muted md:text-lg">
            {registrationClosedNotice.message}
          </p>

          <Link
            href={registrationClosedNotice.href}
            prefetch={false}
            className="mt-9 inline-flex h-10 items-center justify-center gap-2 border border-ion-line px-5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ion transition-colors hover:border-ion hover:text-ion-bright focus-visible:border-ion focus-visible:text-ion-bright focus-visible:outline-none"
          >
            {registrationClosedNotice.ctaLabel}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
