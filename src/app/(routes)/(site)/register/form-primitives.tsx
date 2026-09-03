"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/**
 * Presentation primitives shared by the ambassador and volunteer application
 * forms. Visual only — no behaviour or form state lives in here.
 */

export function FormSection({
  step,
  title,
  caption,
  children,
}: {
  step: string;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-space-line-soft pt-10">
      <header className="mb-8 flex items-start gap-4">
        <span className="mt-1.5 shrink-0 font-mono text-[0.62rem] font-semibold tracking-[0.24em] text-ion tabular-nums">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="font-space-display text-2xl leading-tight font-medium text-balance text-space-ivory sm:text-[1.75rem]">
            {title}
          </h3>
          <p className="mt-1.5 font-space-body text-sm leading-relaxed text-space-muted">
            {caption}
          </p>
        </div>
      </header>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

export function FieldShell({
  variant = "line",
  invalid,
  children,
}: {
  variant?: "line" | "box";
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-colors",
        variant === "line" && "border-b",
        variant === "box" && "rounded-2xl border bg-space-black/40",
        invalid
          ? "border-space-amber"
          : "border-space-line-soft focus-within:border-ion"
      )}
    >
      {children}
    </div>
  );
}

export function Field({
  index,
  id,
  label,
  error,
  children,
  hint,
}: {
  index: string;
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-3">
      <span
        aria-hidden="true"
        className="hidden pt-2.5 font-mono text-[0.62rem] tracking-[0.2em] text-space-muted tabular-nums sm:block"
      >
        {index}
      </span>
      <div className="min-w-0">
        <Label
          htmlFor={id}
          className="mb-1.5 block font-space-body text-sm font-medium normal-case tracking-normal text-space-ivory/80"
        >
          {label}
        </Label>
        {children}
        <AnimatePresence mode="wait">
          {error ? (
            <motion.p
              key="error"
              initial={reducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 flex items-center gap-1.5 font-space-body text-xs text-space-amber"
            >
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 font-space-body text-xs text-space-muted"
            >
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Explicit standard utilities so they win the cascade against the ui/Input and
// ui/Textarea base classes (twMerge strips the conflicting ones).
export const fieldClass =
  "msc-field h-auto border-0 px-0 py-2.5 placeholder:text-space-muted/50";
export const fieldAreaClass =
  "msc-field-area min-h-40 border-0 px-4 py-3.5 placeholder:text-space-muted/50";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
