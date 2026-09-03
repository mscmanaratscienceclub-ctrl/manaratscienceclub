"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  HandHeart,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import {
  volunteerChecklistLabels,
  volunteerFormCopy,
  volunteerFormSections,
  volunteerIntroParagraphs,
  volunteerTextareaFields,
  type VolunteerQuestion,
} from "@/lib/data/volunteer-form";
import { submitVolunteerForm } from "./volunteer-actions";
import {
  Field,
  FieldShell,
  fieldAreaClass,
  fieldClass,
  formatDate,
  FormSection,
} from "./form-primitives";
import { readStored, removeStored, writeStored } from "./form-storage";
import { volunteerFormSchema, type VolunteerFormValues } from "./volunteer-validate";

const DRAFT_KEY = "msc_stemfest_volunteer_draft";
const SUBMISSION_KEY = "msc_stemfest_volunteer_submission";

const EMPTY_VALUES: VolunteerFormValues = {
  fullName: "",
  classSection: "",
  roll: "",
  shift: "",
  studentCode: "",
  address: "",
  personalPhone: "",
  parentsPhone: "",
  attendanceWeek: "",
  parentsComfort: "",
  campusHesitation: "",
  scenarioTaskConflict: "",
  scenarioPeerConduct: "",
  selectionReason: "",
};

type SavedSubmission = {
  id: string;
  submittedAt: string;
  values: VolunteerFormValues;
};

/** Two `span: "half"` questions share a row; everything else stands alone. */
function groupQuestions(questions: VolunteerQuestion[]): VolunteerQuestion[][] {
  const rows: VolunteerQuestion[][] = [];
  let pending: VolunteerQuestion[] = [];

  for (const question of questions) {
    if (question.span === "half") {
      pending.push(question);
      if (pending.length === 2) {
        rows.push(pending);
        pending = [];
      }
      continue;
    }
    if (pending.length) {
      rows.push(pending);
      pending = [];
    }
    rows.push([question]);
  }

  if (pending.length) rows.push(pending);
  return rows;
}

export default function VolunteerForm() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [previousSubmission, setPreviousSubmission] =
    useState<SavedSubmission | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<VolunteerFormValues>({
    resolver: zodResolver(volunteerFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const watchAll = watch();

  // ── Hydration: restore draft or the submitted receipt ──────────────────────
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setServerError(null);

    const submission = readStored<SavedSubmission>(SUBMISSION_KEY);
    if (submission) {
      setPreviousSubmission(submission);
      return;
    }

    setPreviousSubmission(null);
    reset(readStored<Partial<VolunteerFormValues>>(DRAFT_KEY) ?? EMPTY_VALUES);
  }, [mounted, reset]);

  // ── Auto-save draft ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || previousSubmission) return;
    const timeout = setTimeout(() => writeStored(DRAFT_KEY, watchAll), 500);
    return () => clearTimeout(timeout);
  }, [watchAll, mounted, previousSubmission]);

  const onSubmit = useCallback(async (values: VolunteerFormValues) => {
    setSubmitting(true);
    setServerError(null);

    const result = await submitVolunteerForm(values);
    if (!result.success) {
      setServerError(result.error);
      setSubmitting(false);
      return;
    }

    const submission: SavedSubmission = {
      id: result.id,
      submittedAt: result.submittedAt,
      values,
    };
    writeStored(SUBMISSION_KEY, submission);
    removeStored(DRAFT_KEY);
    setPreviousSubmission(submission);
    setSubmitting(false);
  }, []);

  const handleResubmit = useCallback(() => {
    if (!previousSubmission) return;
    removeStored(SUBMISSION_KEY);
    reset(previousSubmission.values);
    setPreviousSubmission(null);
  }, [previousSubmission, reset]);

  // ── Progress rail (presentational — mirrors the fields above) ──────────────
  const checklist = volunteerFormSections.flatMap((section) =>
    section.questions.map((question) => ({
      label: volunteerChecklistLabels[question.id],
      done: Boolean(watchAll[question.id]?.trim()),
    }))
  );
  const completedCount = checklist.filter((item) => item.done).length;

  // ── SSR guard ──────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-ion" />
      </div>
    );
  }

  // ── Intro copy — shown above both the form and the receipt ─────────────────
  const intro = (
    <section
      aria-labelledby="volunteer-intro-heading"
      className="mb-12 rounded-3xl border border-space-line-soft bg-space-black/30 p-6 sm:p-8"
    >
      <h2
        id="volunteer-intro-heading"
        className="flex items-center gap-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-ion"
      >
        <HandHeart className="size-3.5" aria-hidden="true" />
        {volunteerFormCopy.eyebrow}
      </h2>
      <div className="mt-5 space-y-4">
        {volunteerIntroParagraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="max-w-[62ch] font-space-body text-base leading-relaxed text-pretty text-space-muted"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );

  // ── Previously-submitted receipt ───────────────────────────────────────────
  if (previousSubmission) {
    return (
      <>
        {intro}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-space-line-soft bg-space-black/30"
        >
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
                {volunteerFormCopy.eyebrow}
              </p>
              <h3 className="mt-3 font-space-display text-3xl leading-tight font-medium text-balance text-space-ivory sm:text-4xl">
                Application received
              </h3>
              <p className="mt-3 font-space-body text-sm text-space-muted">
                {volunteerFormCopy.confirmation}
              </p>
            </div>
          </div>

          <div className="px-6 pb-10 sm:px-8">
            <div className="flex items-center gap-2.5 border-t border-space-line-soft py-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-space-muted">
              <Clock className="size-3.5 shrink-0 text-ion" aria-hidden="true" />
              Submitted on {formatDate(previousSubmission.submittedAt)}
            </div>

            <dl className="divide-y divide-space-line-soft border-y border-space-line-soft">
              {volunteerFormSections.flatMap((section) =>
                section.questions.map((question) => (
                  <div
                    key={question.id}
                    className="grid gap-1 py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-space-muted">
                      {question.label}
                    </dt>
                    <dd className="font-space-body text-sm leading-relaxed whitespace-pre-wrap text-space-ivory">
                      {previousSubmission.values[question.id]}
                    </dd>
                  </div>
                ))
              )}
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
      </>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  let fieldNumber = 0;

  return (
    <>
      {intro}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <header className="mb-12">
          <h2 className="max-w-[16ch] font-space-display text-4xl leading-[1.05] font-medium text-balance text-space-ivory sm:text-5xl">
            {volunteerFormCopy.heading}
          </h2>
          <p className="mt-5 max-w-[48ch] font-space-body text-base leading-relaxed text-pretty text-space-muted">
            {volunteerFormCopy.subheading}
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start lg:gap-14">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {volunteerFormSections.map((section) => (
              <FormSection
                key={section.step}
                step={section.step}
                title={section.title}
                caption={section.caption}
              >
                {groupQuestions(section.questions).map((row) => (
                  <div
                    key={row[0].id}
                    className={cn("grid gap-8", row.length > 1 && "sm:grid-cols-2")}
                  >
                    {row.map((question) => {
                      fieldNumber += 1;
                      const isTextarea = volunteerTextareaFields.includes(
                        question.id
                      );
                      const error = errors[question.id]?.message;
                      const fieldId = `volunteer-${question.id}`;

                      return (
                        <Field
                          key={question.id}
                          index={String(fieldNumber).padStart(2, "0")}
                          id={fieldId}
                          label={question.label}
                          hint={question.hint}
                          error={error}
                        >
                          {isTextarea ? (
                            <FieldShell variant="box" invalid={Boolean(error)}>
                              <Textarea
                                id={fieldId}
                                rows={4}
                                placeholder={question.placeholder}
                                className={`${fieldAreaClass} resize-none`}
                                aria-invalid={Boolean(error)}
                                {...register(question.id)}
                              />
                            </FieldShell>
                          ) : (
                            <FieldShell invalid={Boolean(error)}>
                              <Input
                                id={fieldId}
                                type="text"
                                placeholder={question.placeholder}
                                className={fieldClass}
                                aria-invalid={Boolean(error)}
                                {...register(question.id)}
                              />
                            </FieldShell>
                          )}
                        </Field>
                      );
                    })}
                  </div>
                ))}
              </FormSection>
            ))}

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
                    {volunteerFormCopy.submitLabel}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>

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
                <Save
                  className="mt-0.5 size-3.5 shrink-0 text-ion"
                  aria-hidden="true"
                />
                Saved automatically on this device.
              </p>
            </div>
          </aside>
        </div>

        <p className="mt-14 max-w-[56ch] border-t border-space-line-soft pt-6 font-space-body text-xs leading-relaxed text-space-muted">
          {volunteerFormCopy.disclaimer}
        </p>
      </motion.div>
    </>
  );
}




