import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  DoorOpen,
  IdCard,
  LogOut,
  Mail,
  ScanLine,
  Shirt,
  ShieldAlert,
  Smartphone,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import ScrollReveal from "@/components/animations/ScrollReveal";
import { cn } from "@/lib/utils";
import {
  eventRuleGroups,
  eventRulesCopy,
  type EventRuleIconId,
} from "@/lib/data/event-rules";

export const metadata: Metadata = {
  title: "Event Rules — Dress Code, Entry & Conduct | STEM Fest",
  description:
    "The rules for STEM Fest at Manarat Science Club: what participants and visitors must wear, what may be brought through the gate, entry timing, breaks and where to enter.",
};

const RULE_ICONS: Record<EventRuleIconId, LucideIcon> = {
  uniform: Shirt,
  "id-card": IdCard,
  dress: UserRound,
  mail: Mail,
  contraband: ShieldAlert,
  phone: Smartphone,
  exit: LogOut,
  breaks: UtensilsCrossed,
  gate: DoorOpen,
  "participant-id": ScanLine,
};

export default function RulesPage() {
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
          <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.34em] text-ion">
            {eventRulesCopy.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[40rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {eventRulesCopy.heading}
          </h1>
          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-space-muted md:text-lg">
            {eventRulesCopy.subheading}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="space-y-16 lg:space-y-20">
          {eventRuleGroups.map((group) => (
            <ScrollReveal key={group.id} stagger={0.07}>
              <header className="max-w-[46rem] border-t border-space-line-soft pt-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs font-medium tracking-[0.2em] text-ion">
                    {group.index}
                  </span>
                  <h2 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl">
                    {group.heading}
                  </h2>
                </div>
                <p className="mt-3 max-w-[40rem] text-sm leading-relaxed text-space-muted sm:text-base">
                  {group.lead}
                </p>
              </header>

              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.rules.map((rule) => {
                  const Icon = RULE_ICONS[rule.icon];
                  const isAlert = rule.tone === "alert";

                  return (
                    <li
                      key={rule.id}
                      className={cn(
                        "flex flex-col gap-4 border p-6",
                        isAlert
                          ? "border-ion-line bg-space-black/60"
                          : "border-space-line-soft bg-space-black/20 transition-colors hover:border-ion-line hover:bg-space-black/40",
                      )}
                    >
                      <span
                        className={
                          isAlert
                            ? "flex size-10 shrink-0 items-center justify-center border border-ion bg-ion text-space-deep"
                            : "flex size-10 shrink-0 items-center justify-center border border-ion-line text-ion"
                        }
                      >
                        <Icon className="size-4.5" aria-hidden="true" />
                      </span>

                      <p className="font-space-body text-sm leading-relaxed text-pretty text-space-ivory/85">
                        {rule.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="mt-16 border border-space-line-soft bg-space-black/30 p-6 sm:p-8 lg:mt-20">
            <p className="max-w-[52rem] font-space-body text-sm leading-relaxed text-space-muted">
              {eventRulesCopy.note}
            </p>
            <div className="mt-6">
              <Link href="/register" className="msc-btn-pill">
                Register for STEM Fest
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
