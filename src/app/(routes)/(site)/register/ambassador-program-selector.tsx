"use client";

import { HandHeart, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RegistrationType = "campus" | "batch" | "volunteer";

const PROGRAMS = {
  campus: {
    title: "Campus Ambassador",
    description:
      "Represent Manarat Science Club across your school campus and grow a community of curious students.",
    icon: School,
  },
  batch: {
    title: "Batch Ambassador",
    description:
      "Speak for your year group, share opportunities with your classmates, and keep MSC close to your batch.",
    icon: Users,
  },
  volunteer: {
    title: "Volunteer",
    description:
      "Help run MSC events, workshops and programmes — on the ground, behind the scenes, or both.",
    icon: HandHeart,
  },
} as const;

export interface AmbassadorProgramSelectorProps {
  value: RegistrationType;
  onChange: (value: RegistrationType) => void;
}

export function AmbassadorProgramSelector({
  value,
  onChange,
}: AmbassadorProgramSelectorProps) {
  return (
    <section aria-labelledby="ambassador-program-heading" className="mb-14">
      <h2
        id="ambassador-program-heading"
        className="mb-3 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-space-muted"
      >
        I want to apply as
      </h2>
      <div
        role="group"
        aria-label="Choose a programme"
        className="flex flex-col gap-1.5 rounded-full border border-space-line-soft bg-space-black/30 p-1.5 sm:inline-flex sm:flex-row"
      >
        {(Object.entries(PROGRAMS) as [RegistrationType, (typeof PROGRAMS)[RegistrationType]][]).map(
          ([type, program]) => {
            const Icon = program.icon;
            const selected = value === type;

            return (
              <Button
                key={type}
                type="button"
                variant="outline"
                aria-pressed={selected}
                onClick={() => onChange(type)}
                className={cn(
                  "h-auto min-h-0 w-full flex-1 justify-center gap-2.5 rounded-full border-transparent bg-transparent px-5 py-2.5 font-space-body text-sm font-medium normal-case tracking-normal text-space-muted transition-colors hover:border-transparent hover:bg-ion/10 hover:text-space-ivory sm:w-auto sm:flex-none",
                  selected &&
                    "bg-ion text-space-black hover:bg-ion hover:text-space-black"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {program.title}
              </Button>
            );
          }
        )}
      </div>
      <p className="mt-3 max-w-[52ch] font-space-body text-sm leading-relaxed text-space-muted">
        {PROGRAMS[value].description}
      </p>
    </section>
  );
}
