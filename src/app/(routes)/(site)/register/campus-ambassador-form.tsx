"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitAmbassadorForm } from "./actions";
import {
  ambassadorFormSchema,
  type AmbassadorFormValues,
  type AmbassadorType,
} from "./validate";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const AMBASSADOR_PROGRAMS = {
  campus: { title: "Campus Ambassador", shortTitle: "Campus" },
  batch: { title: "Batch Ambassador", shortTitle: "Batch" },
} as const;

function draftKey(type: AmbassadorType) {
  return `msc_${type}_ambassador_form`;
}

function submissionKey(type: AmbassadorType) {
  return `msc_${type}_ambassador_submission`;
}

type SavedSubmission = {
  id: string;
  submittedAt: string;
  name: string;
  class: string;
  school: string;
  experience: string;
  firstTimeCa?: "yes" | "no";
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadDraft(type: AmbassadorType): Partial<AmbassadorFormValues> | null {
  try {
    const raw = localStorage.getItem(draftKey(type));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(type: AmbassadorType, values: Partial<AmbassadorFormValues>) {
  try {
    localStorage.setItem(draftKey(type), JSON.stringify(values));
  } catch {}
}

function clearDraft(type: AmbassadorType) {
  try {
    localStorage.removeItem(draftKey(type));
  } catch {}
}

function loadSubmission(type: AmbassadorType): SavedSubmission | null {
  try {
    const raw = localStorage.getItem(submissionKey(type));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSubmission(type: AmbassadorType, submission: SavedSubmission) {
  try {
    localStorage.setItem(submissionKey(type), JSON.stringify(submission));
  } catch {}
}

function clearSubmission(type: AmbassadorType) {
  try {
    localStorage.removeItem(submissionKey(type));
  } catch {}
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Presentation primitives (visual variant — no behaviour lives here) ─────────
function FormSection({
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
        <span className="mt-1.5 shrink-0 font-mono text-[0.62rem] tracking-[0.24em] text-ion tabular-nums">
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

function FieldShell({
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

function Field({
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
          className="mb-1.5 font-space-body text-sm font-medium normal-case tracking-normal text-space-ivory/80"
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
const fieldClass =
  "msc-field h-auto border-0 px-0 py-2.5 placeholder:text-space-muted/50";
const fieldAreaClass =
  "msc-field-area min-h-40 border-0 px-4 py-3.5 placeholder:text-space-muted/50";

// ── Main Component ────────────────────────────────────────────────────────────
export interface CampusAmbassadorFormProps {
  type: AmbassadorType;
}

export default function CampusAmbassadorForm({
  type: selectedType,
}: CampusAmbassadorFormProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [previousSubmission, setPreviousSubmission] =
    useState<SavedSubmission | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AmbassadorFormValues>({
    resolver: zodResolver(ambassadorFormSchema),
    defaultValues: { name: "", class: "", school: "", experience: "", firstTimeCa: undefined },
  });

  const watchAll = watch();

  // ── Hydration: load type-specific localStorage ─────────────────────────────
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    setServerError(null);
    const submission = loadSubmission(selectedType);
    setPreviousSubmission(submission);

    if (submission) {
      setShowForm(false);
      return;
    }

    reset(
      loadDraft(selectedType) ?? {
        name: "",
        class: "",
        school: "",
        experience: "",
        firstTimeCa: undefined,
      }
    );
    setShowForm(true);
  }, [mounted, reset, selectedType]);

  // ── Auto-save draft on every change ───────────────────────────────────────
  useEffect(() => {
    if (!mounted || previousSubmission) return;
    const timeout = setTimeout(() => saveDraft(selectedType, watchAll), 500);
    return () => clearTimeout(timeout);
  }, [watchAll, mounted, previousSubmission, selectedType]);

  const onSubmit = useCallback(
    async (values: AmbassadorFormValues) => {
      setSubmitting(true);
      setServerError(null);

      const result = await submitAmbassadorForm({ ...values, type: selectedType });

      if (!result.success) {
        setServerError(result.error);
        setSubmitting(false);
        return;
      }

      const submission: SavedSubmission = {
        id: result.id,
        submittedAt: result.submittedAt,
        name: values.name,
        class: values.class,
        school: values.school,
        experience: values.experience,
        firstTimeCa: values.firstTimeCa,
      };

      saveSubmission(selectedType, submission);
      clearDraft(selectedType);
      setPreviousSubmission(submission);
      setShowForm(false);
      setSubmitting(false);
    },
    [selectedType]
  );

  const handleResubmit = useCallback(() => {
    if (!previousSubmission) return;
    clearSubmission(selectedType);
    reset({
      name: previousSubmission.name,
      class: previousSubmission.class,
      school: previousSubmission.school,
      experience: previousSubmission.experience,
      ...(previousSubmission.firstTimeCa ? { firstTimeCa: previousSubmission.firstTimeCa } : {}),
    });
    setPreviousSubmission(null);
    setShowForm(true);
  }, [previousSubmission, reset, selectedType]);

  const experienceLen = watchAll.experience?.length ?? 0;

  // Presentational only — mirrors the fields above to drive the progress rail.
  const checklist = [
    { label: "Full name", done: Boolean(watchAll.name?.trim()) },
    { label: "Class / grade", done: Boolean(watchAll.class?.trim()) },
    { label: "School", done: Boolean(watchAll.school?.trim()) },
    { label: "Experience", done: Boolean(watchAll.experience?.trim()) },
    { label: "First-time answer", done: Boolean(watchAll.firstTimeCa) },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const activeProgram = AMBASSADOR_PROGRAMS[selectedType];

  // ── SSR guard ─────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-ion" />
      </div>
    );
  }

  // ── Previously-submitted view ─────────────────────────────────────────────
  if (previousSubmission && !showForm) {
    return (
      <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-space-line-soft bg-space-black/30"
        >
        {/* Confirmation banner */}
        <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
          <motion.div
            initial={reducedMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 22 }}
            className="flex size-16 items-center justify-center rounded-full border border-ion-line bg-ion/10"
          >
            <CheckCircle2 className="size-7 text-ion" />
          </motion.div>
          <div>
            <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-ion">
              {activeProgram.title} application
            </p>
            <h2 className="mt-3 font-space-display text-3xl leading-tight font-medium text-balance text-space-ivory sm:text-4xl">
              Application received
            </h2>
            <p className="mt-3 font-space-body text-sm text-space-muted">
              You have already applied as a {activeProgram.title}.
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 pb-10 sm:px-8">
          <div className="flex items-center gap-2.5 border-t border-space-line-soft py-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-space-muted">
            <Clock className="size-3.5 shrink-0 text-ion" aria-hidden="true" />
            Submitted on {formatDate(previousSubmission.submittedAt)}
          </div>

          <dl className="divide-y divide-space-line-soft border-y border-space-line-soft">
            {[
              { label: "Full name", value: previousSubmission.name },
              { label: "Class / grade", value: previousSubmission.class },
              { label: "School", value: previousSubmission.school },
              { label: "Experience", value: previousSubmission.experience },
              ...(previousSubmission.firstTimeCa
                ? [
                    {
                      label: `First time being a ${activeProgram.title}`,
                      value:
                        previousSubmission.firstTimeCa === "yes" ? "Yes" : "No",
                    },
                  ]
                : []),
            ].map((item) => (
              <div
                key={item.label}
                className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
              >
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-space-muted">
                  {item.label}
                </dt>
                <dd className="font-space-body text-sm leading-relaxed text-space-ivory">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[36ch] font-space-body text-sm leading-relaxed text-space-muted">
              Need to update your application? Resubmitting below creates a new
              entry.
            </p>
            <button
              type="button"
              onClick={handleResubmit}
              className="msc-btn-pill-ghost shrink-0"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Submit a new application
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Editorial header */}
        <header className="mb-12">
          <p className="flex items-center gap-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-ion">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {activeProgram.title} application
          </p>
          <h2 className="mt-5 max-w-[16ch] font-space-display text-4xl leading-[1.05] font-medium text-balance text-space-ivory sm:text-5xl">
            Tell us who you are
          </h2>
          <p className="mt-5 max-w-[48ch] font-space-body text-base leading-relaxed text-pretty text-space-muted">
            Five short questions — about a minute of your time. Everything you
            type is saved as you go, so you can close the tab and finish later.
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start lg:gap-14">
          {/* Body */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormSection
              step="01"
              title="Your details"
              caption="Where you study and how we can reach you."
            >
              <Field index="01" id="name" label="Full name" error={errors.name?.message}>
                <FieldShell invalid={Boolean(errors.name)}>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Ahmed Al-Rashid"
                    className={fieldClass}
                    aria-invalid={Boolean(errors.name)}
                    {...register("name")}
                  />
                </FieldShell>
              </Field>

              <div className="grid gap-8 sm:grid-cols-2">
                <Field
                  index="02"
                  id="class"
                  label="Class / grade"
                  error={errors.class?.message}
                  hint="e.g. Grade 10, Class XI"
                >
                  <FieldShell invalid={Boolean(errors.class)}>
                    <Input
                      id="class"
                      type="text"
                      placeholder="e.g. Grade 11"
                      className={fieldClass}
                      aria-invalid={Boolean(errors.class)}
                      {...register("class")}
                    />
                  </FieldShell>
                </Field>

                <Field
                  index="03"
                  id="school"
                  label="School"
                  error={errors.school?.message}
                >
                  <FieldShell invalid={Boolean(errors.school)}>
                    <Input
                      id="school"
                      type="text"
                      placeholder="Your school name"
                      className={fieldClass}
                      aria-invalid={Boolean(errors.school)}
                      {...register("school")}
                    />
                  </FieldShell>
                </Field>
              </div>
            </FormSection>

            <FormSection
              step="02"
              title="Your experience"
              caption="What you have done so far, and whether this is new ground for you."
            >
              <Field
                index="04"
                id="experience"
                label="Experience"
                error={errors.experience?.message}
                hint="Tell us about any clubs, leadership roles, or relevant experience."
              >
                <FieldShell variant="box" invalid={Boolean(errors.experience)}>
                  <Textarea
                    id="experience"
                    rows={6}
                    className={`${fieldAreaClass} resize-none`}
                    aria-invalid={Boolean(errors.experience)}
                    {...register("experience")}
                  />
                </FieldShell>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="relative h-1 flex-1 overflow-hidden rounded-full bg-space-line-soft"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-ion transition-[width] duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, (experienceLen / 2000) * 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      experienceLen > 1800
                        ? "text-space-amber"
                        : experienceLen > 1400
                          ? "text-space-amber-bright"
                          : "text-space-muted"
                    }`}
                  >
                    {experienceLen}/2000
                  </span>
                </div>
              </Field>

              <Field
                index="05"
                id="firstTimeCa"
                label={`Is this your first time being a ${activeProgram.title}?`}
                error={errors.firstTimeCa?.message}
              >
                <div
                  className="flex flex-col gap-1.5 rounded-full border border-space-line-soft bg-space-black/40 p-1.5 sm:flex-row"
                  role="radiogroup"
                  aria-label={`Is this your first time being a ${activeProgram.title}?`}
                >
                  {(["yes", "no"] as const).map((option) => (
                    <label
                      key={option}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-2.5 text-center font-space-body text-sm font-medium text-space-muted transition-colors hover:text-space-ivory has-checked:bg-ion has-checked:text-space-black has-checked:hover:text-space-black"
                    >
                      <input
                        type="radio"
                        value={option}
                        className="sr-only"
                        {...register("firstTimeCa")}
                      />
                      {option === "yes" ? "Yes, first time" : "No, I have before"}
                    </label>
                  ))}
                </div>
              </Field>
            </FormSection>

            {/* Server error */}
            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-10 flex items-start gap-3 rounded-2xl border border-space-amber/40 bg-space-amber/10 px-4 py-3.5"
                >
                  <AlertCircle
                    className="mt-0.5 size-4 shrink-0 text-space-amber"
                    aria-hidden="true"
                  />
                  <p className="font-space-body text-sm text-space-amber-bright">
                    {serverError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-12 flex flex-col gap-5 border-t border-space-line-soft pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[28ch] font-space-body text-xs leading-relaxed text-space-muted">
                Double-check your details before sending them our way.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="msc-btn-pill w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit {activeProgram.shortTitle} application
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Progress rail — mirrors the fields above, no extra state */}
          <aside
            aria-label="Application progress"
            className="mt-14 lg:sticky lg:top-28 lg:mt-0"
          >
            <div className="rounded-3xl border border-space-line-soft bg-space-black/30 p-6">
              <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-space-muted">
                Progress
              </p>
              <p className="mt-3 font-space-display text-4xl leading-none font-medium text-space-ivory tabular-nums">
                {completedCount}
                <span className="text-xl text-space-muted">
                  {" / "}
                  {checklist.length}
                </span>
              </p>
              <div
                aria-hidden="true"
                className="mt-4 h-1 overflow-hidden rounded-full bg-space-line-soft"
              >
                <div
                  className="h-full rounded-full bg-ion transition-[width] duration-500 ease-out"
                  style={{
                    width: `${(completedCount / checklist.length) * 100}%`,
                  }}
                />
              </div>
              <ul className="mt-6 space-y-2.5">
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-2.5 font-space-body text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        item.done
                          ? "border-ion bg-ion text-space-black"
                          : "border-space-line-soft text-transparent"
                      )}
                    >
                      <Check className="size-2.5" />
                    </span>
                    <span
                      className={
                        item.done ? "text-space-ivory" : "text-space-muted"
                      }
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-start gap-2 border-t border-space-line-soft pt-5 font-space-body text-xs leading-relaxed text-space-muted">
                <Save className="mt-0.5 size-3.5 shrink-0 text-ion" aria-hidden="true" />
                Saved automatically on this device.
              </p>
            </div>
          </aside>
        </div>

        {/* Disclaimer */}
        <p className="mt-14 max-w-[56ch] border-t border-space-line-soft pt-6 font-space-body text-xs leading-relaxed text-space-muted">
          By submitting, you agree to be contacted by the Manarat Science Club
          regarding your application. We never share your data with third
          parties.
        </p>
    </motion.div>
  );
}
