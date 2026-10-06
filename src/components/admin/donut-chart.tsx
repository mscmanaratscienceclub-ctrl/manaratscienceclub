"use client";

import { useState } from "react";

import { chartToneVar, type ChartTone } from "@/lib/admin/dashboard";
import { cn } from "@/lib/utils";

/**
 * A share-of-total ring: how much of the pile each status owns.
 *
 * A client leaf for one reason. Pointing at a slice should answer the question the
 * ring is asked — *how many, and what share* — in the middle of the ring, where the
 * eye already is, instead of making the reader scan a legend for the number that
 * belongs to the arc under the cursor. Hovering either the arc or its legend row
 * swaps the centre readout; leaving it returns to the total.
 *
 * The arcs stay flat. Their three colours are the panel's status inks, the same
 * reading the table pills use, and a gradient across a status slice would make
 * "pending" look different from the "pending" pill two rows below it. Volume gets
 * gradient treatment (the activity chart's bars); meaning does not.
 *
 * Slices are laid out cumulatively with a negative dash offset so each arc starts
 * where the previous ended. A small gap is subtracted from every dash when the ring
 * is split, which stops two adjacent arcs reading as one.
 */

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  tone: ChartTone;
}

export default function DonutChart({
  slices,
  ariaLabel,
  centerValue,
  centerCaption,
  className,
}: {
  slices: DonutSlice[];
  ariaLabel: string;
  centerValue: string;
  centerCaption: string;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const drawn = slices.filter((slice) => slice.value > 0);
  const gap = drawn.length > 1 ? 2 : 0;

  const focused = drawn.find((slice) => slice.id === active) ?? null;
  const readoutValue = focused ? String(focused.value) : centerValue;
  const readoutCaption = focused
    ? `${focused.label} · ${total > 0 ? Math.round((focused.value / total) * 100) : 0}%`
    : centerCaption;

  let offset = 0;

  return (
    <div
      className={cn(
        // A 144px ring and its legend cannot share a phone's width, so they stack
        // until there is room for the two to sit side by side.
        "flex flex-col items-center gap-6 sm:flex-row",
        className,
      )}
    >
      {/* The ring is a positioned box so the readout can sit in its hole as real
          type rather than as SVG text. */}
      <div className="relative size-36 shrink-0 sm:size-40">
        <svg
          viewBox="0 0 100 100"
          className="size-full"
          role="img"
          aria-label={ariaLabel}
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--admin-line)"
            strokeWidth="12"
          />

          {drawn.map((slice) => {
            const share = total > 0 ? slice.value / total : 0;
            const length = share * circumference;
            const dash = Math.max(length - gap, 0.5);
            const dimmed = focused !== null && focused.id !== slice.id;

            const arc = (
              <circle
                key={slice.id}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={chartToneVar[slice.tone]}
                strokeWidth="12"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
                className="motion-safe:transition-opacity motion-safe:duration-200"
                opacity={dimmed ? 0.35 : 1}
                onMouseEnter={() => setActive(slice.id)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${slice.label}: ${slice.value}`}</title>
              </circle>
            );

            offset += length;
            return arc;
          })}
        </svg>

        {/* The readout is HTML, not SVG text. Inside a 100-unit viewBox scaled to a
            144px ring, a `fontSize="6"` caption measures under 9px and answers to
            nothing in the type ladder; overlaid, both lines are real type tokens. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center"
        >
          <p className="font-space-display text-2xl leading-none font-medium text-admin-ink tabular-nums">
            {readoutValue}
          </p>
          <p className="w-[68%] font-space-body text-2xs leading-tight text-admin-muted">
            {readoutCaption}
          </p>
        </div>
      </div>

      {/* The legend is the chart's data table: every slice prints its own count and
          share whether or not anything is hovered, so the ring is a picture of the
          numbers rather than the only place they exist. */}
      <ul className="w-full min-w-0 space-y-2.5 sm:w-auto">
        {slices.map((slice) => {
          const isFocused = focused?.id === slice.id;

          return (
            <li
              key={slice.id}
              onMouseEnter={() => setActive(slice.id)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "flex items-baseline gap-2.5 rounded-[6px] px-2 py-1 motion-safe:transition-colors",
                isFocused ? "bg-admin-sunken" : "bg-transparent",
              )}
            >
              <span
                className="size-2.5 shrink-0 translate-y-px rounded-[2px]"
                style={{ backgroundColor: chartToneVar[slice.tone] }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-space-body text-sm text-admin-ink-soft">{slice.label}</p>
                <p className="font-space-body text-xs tabular-nums text-admin-muted">
                  {slice.value}
                  {total > 0 && (
                    <span className="ml-1.5">
                      {Math.round((slice.value / total) * 100)}%
                    </span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
