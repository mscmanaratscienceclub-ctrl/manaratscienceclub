"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Radix Tooltip themed for the dark MSC surfaces.
 *
 * A tooltip is a sighted-hover convenience only — never the sole carrier of
 * information. Radix wires `aria-describedby` from the content to the trigger,
 * so a screen reader still announces the text on focus; the trigger must be a
 * real focusable element (`button` or `a`) for that to work.
 *
 * Each instance brings its own `Provider` because there is no app-level one;
 * hovering is instant-ish (`delayDuration`) rather than the 700ms default so a
 * glance is enough.
 */

function TooltipProvider({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={150} {...props} />;
}

function Tooltip({
  content,
  children,
  side = "top",
  className,
  ...props
}: {
  /** The text shown on hover or focus. */
  content: React.ReactNode;
  /** The trigger element. Rendered `asChild`, so it must be focusable. */
  children: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>["side"];
  className?: string;
} & Omit<
  React.ComponentProps<typeof TooltipPrimitive.Root>,
  "children"
>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root {...props}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              "z-50 max-w-[17rem] border border-ion-line bg-space-black px-3.5 py-2.5",
              "font-space-body text-xs leading-relaxed text-space-ivory/90 text-pretty",
              "shadow-[0_12px_32px_rgba(0,0,0,0.55)]",
              // Discrete state change, so CSS transitions are the right tool.
              "transition-[opacity,transform] duration-150 ease-out",
              "data-[state=closed]:opacity-0 data-[state=delayed-open]:opacity-100",
              "motion-reduce:transition-none",
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipProvider>
  );
}

export { Tooltip, TooltipProvider };
