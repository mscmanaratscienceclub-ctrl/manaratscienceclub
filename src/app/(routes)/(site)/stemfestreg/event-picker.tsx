"use client";

import type { UseFormRegister } from "react-hook-form";
import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pricingNote,
  type EligibleSegment,
} from "@/lib/data/stemfest-registration";
import type { StemfestFormValues } from "./validate";

/**
 * Segment-grouped multi-select of every event the participant's class can
 * enter. The category badge is derived, never chosen — see `resolveCategoryRule`.
 */
export function EventPicker({
  segments,
  register,
  error,
}: {
  segments: EligibleSegment[];
  register: UseFormRegister<StemfestFormValues>;
  error?: string;
}) {
  return (
    <div className={cn("space-y-10", error && "rounded-2xl")}>
      {segments.map(({ segment, events }) => (
        <fieldset key={segment.id}>
          <legend className="w-full">
            <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="font-space-display text-xl font-medium text-space-ivory">
                {segment.name}
              </span>
              <span className="font-mono text-[0.62rem] tracking-[0.16em] text-ion uppercase">
                {pricingNote(segment.pricing)}
              </span>
            </span>
            <span className="mt-1 block font-space-body text-sm text-space-muted">
              {segment.blurb}
            </span>
          </legend>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {events.map(({ event, rule }) => (
              <label
                key={event.id}
                className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-space-line-soft bg-space-black/40 p-4 transition-colors hover:border-ion-line has-checked:border-ion has-checked:bg-ion/10 focus-within:border-ion"
              >
                <input
                  type="checkbox"
                  value={event.id}
                  className="sr-only"
                  {...register("eventIds")}
                />
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-space-line text-transparent transition-colors group-has-checked:border-ion group-has-checked:bg-ion group-has-checked:text-space-black"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-space-body text-sm font-medium text-space-ivory">
                    {event.name}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {rule.label ? (
                      <span className="inline-flex items-center rounded-full border border-ion-line px-2 py-0.5 font-mono text-[0.58rem] tracking-[0.12em] text-ion uppercase">
                        {rule.label}
                      </span>
                    ) : null}
                    {event.teamBased ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-space-line-soft px-2 py-0.5 font-mono text-[0.58rem] tracking-[0.12em] text-space-muted uppercase">
                        <Users className="size-2.5" aria-hidden="true" />
                        Team
                      </span>
                    ) : null}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
