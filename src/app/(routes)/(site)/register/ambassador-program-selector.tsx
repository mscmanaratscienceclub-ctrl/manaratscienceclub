"use client";

import { School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AmbassadorType } from "./validate";

const PROGRAMS = {
  campus: {
    title: "Campus Ambassador",
    description: "Represent MSC across your school campus.",
    icon: School,
  },
  batch: {
    title: "Batch Ambassador",
    description: "Represent MSC within your year group.",
    icon: Users,
  },
} as const;

export interface AmbassadorProgramSelectorProps {
  value: AmbassadorType;
  onChange: (value: AmbassadorType) => void;
}

export function AmbassadorProgramSelector({
  value,
  onChange,
}: AmbassadorProgramSelectorProps) {
  return (
    <section aria-labelledby="ambassador-program-heading" className="mb-8">
      <h2
        id="ambassador-program-heading"
        className="mb-3 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-muted"
      >
        Choose an ambassador programme
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.entries(PROGRAMS) as [AmbassadorType, (typeof PROGRAMS)[AmbassadorType]][]).map(
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
                  "h-auto min-h-24 justify-start gap-4 border-space-line-soft bg-space-deep/60 px-5 py-4 text-left normal-case tracking-normal text-space-ivory hover:border-ion hover:bg-ion/10 hover:text-space-ivory",
                  selected && "border-ion bg-ion/10"
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center border border-ion-line text-ion">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-voyage text-sm font-bold uppercase tracking-tight">
                    {program.title}
                  </span>
                  <span className="mt-1 block font-space-body text-xs leading-relaxed font-normal text-space-muted">
                    {program.description}
                  </span>
                </span>
              </Button>
            );
          }
        )}
      </div>
    </section>
  );
}
