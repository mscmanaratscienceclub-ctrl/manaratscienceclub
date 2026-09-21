import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HandHeart, Lock, Trophy, type LucideIcon } from "lucide-react";
import {
  registrationChoiceCopy,
  registrationChoices,
  type RegistrationChoice,
} from "@/lib/data/register-choices";

export const metadata: Metadata = {
  title: "Register — STEM Fest",
  description:
    "Register for the Manarat Science Club STEM Fest events, or apply to volunteer on the ground. Volunteer applications are open to Manarat students only.",
};

const CHOICE_ICONS: Record<RegistrationChoice["id"], LucideIcon> = {
  stemfest: Trophy,
  volunteer: HandHeart,
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-space-deep">
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
          <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.34em] text-ion">
            {registrationChoiceCopy.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[40rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {registrationChoiceCopy.heading}
          </h1>
          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-space-muted md:text-lg">
            {registrationChoiceCopy.subheading}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          {registrationChoices.map((choice, index) => {
            const Icon = CHOICE_ICONS[choice.id];

            return (
              <article
                key={choice.id}
                className="group flex flex-col border border-space-line-soft bg-space-black/30 transition-colors hover:border-ion-line"
              >
                <div className="flex min-h-[3.5rem] items-center justify-between gap-3 border-b border-space-line-soft px-6 py-3.5">
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-space-muted">
                    {`Option 0${index + 1}`}
                  </span>
                  {choice.badge ? (
                    <span className="inline-flex items-center gap-1.5 bg-ion px-3 py-1.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.24em] text-space-deep">
                      <Lock className="size-3" aria-hidden="true" />
                      {choice.badge}
                    </span>
                  ) : (
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-space-sage">
                      Open to all
                    </span>
                  )}
                </div>

                <div className="px-6 pt-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center border border-ion-line text-ion transition-colors group-hover:border-ion">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <h2 className="font-voyage text-xl font-bold uppercase leading-snug tracking-tight text-space-ivory">
                      {choice.title}
                    </h2>
                  </div>

                  <p className="mt-5 font-space-body text-sm leading-relaxed text-pretty text-space-muted">
                    {choice.description}
                  </p>

                  {choice.eligibilityNote ? (
                    <p className="mt-4 font-space-body text-sm font-semibold leading-relaxed text-ion-bright">
                      {choice.eligibilityNote}
                    </p>
                  ) : null}
                </div>

                <ul className="mt-6 space-y-2.5 px-6">
                  {choice.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 font-space-body text-sm leading-snug text-space-ivory/85"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-1.5 shrink-0 bg-ion"
                      />
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto px-6 pb-7 pt-8">
                  <Link href={choice.href} className="msc-btn-pill w-full">
                    {choice.ctaLabel}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
