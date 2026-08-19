"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  GraduationCap,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  ChevronRight,
  Save,
} from "lucide-react";
import { submitAmbassadorForm } from "./actions";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

// ── Schema ──────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  class: z.string().min(1, "Please enter your class / grade").max(50),
  school: z.string().min(2, "School name must be at least 2 characters").max(200),
  experience: z
    .string()
    .min(20, "Please write at least 20 characters about your experience")
    .max(2000, "Keep it under 2 000 characters"),
});

type FormValues = z.infer<typeof schema>;

const LS_KEY = "msc_ambassador_form";
const LS_SUBMISSION_KEY = "msc_ambassador_submission";

type SavedSubmission = {
  id: string;
  submittedAt: string;
  name: string;
  class: string;
  school: string;
  experience: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadDraft(): Partial<FormValues> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(values: Partial<FormValues>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(values));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

function loadSubmission(): SavedSubmission | null {
  try {
    const raw = localStorage.getItem(LS_SUBMISSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSubmission(s: SavedSubmission) {
  try {
    localStorage.setItem(LS_SUBMISSION_KEY, JSON.stringify(s));
  } catch {}
}

function clearSubmission() {
  try {
    localStorage.removeItem(LS_SUBMISSION_KEY);
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

// ── Field component ──────────────────────────────────────────────────────────
function Field({
  id,
  label,
  icon,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="group space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-2 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-ivory/90"
      >
        <span className="flex size-6 items-center justify-center border border-ion-line text-ion">
          {icon}
        </span>
        {label}
      </label>
      {children}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 text-xs text-space-amber"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-space-muted"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const inputClass = "signal-input";

// ── Main Component ────────────────────────────────────────────────────────────
export default function CampusAmbassadorForm() {
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", class: "", school: "", experience: "" },
  });

  const watchAll = watch();

  // ── Hydration: load localStorage ──────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const submission = loadSubmission();
    if (submission) {
      setPreviousSubmission(submission);
    } else {
      const draft = loadDraft();
      if (draft) {
        reset(draft);
      }
      setShowForm(true);
    }
  }, [reset]);

  // ── Auto-save draft on every change ───────────────────────────────────────
  useEffect(() => {
    if (!mounted || previousSubmission) return;
    const timeout = setTimeout(() => saveDraft(watchAll), 500);
    return () => clearTimeout(timeout);
  }, [watchAll, mounted, previousSubmission]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setSubmitting(true);
      setServerError(null);

      const result = await submitAmbassadorForm(values);

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
      };

      saveSubmission(submission);
      clearDraft();
      setPreviousSubmission(submission);
      setShowForm(false);
      setSubmitting(false);
    },
    []
  );

  const handleResubmit = useCallback(() => {
    if (!previousSubmission) return;
    clearSubmission();
    reset({
      name: previousSubmission.name,
      class: previousSubmission.class,
      school: previousSubmission.school,
      experience: previousSubmission.experience,
    });
    setPreviousSubmission(null);
    setShowForm(true);
  }, [previousSubmission, reset]);

  const experienceLen = watchAll.experience?.length ?? 0;

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
        className="overflow-hidden border border-space-line-soft bg-space-deep/60"
      >
        {/* Confirmation banner */}
        <div className="border-b border-space-line-soft bg-ion-deep px-8 py-8 text-center">
          <motion.div
            initial={reducedMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 22 }}
            className="mx-auto mb-4 flex size-16 items-center justify-center border border-ion-line bg-ion/10"
          >
            <CheckCircle2 className="size-8 text-ion-bright" />
          </motion.div>
          <h2 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">
            Application Submitted!
          </h2>
          <p className="mt-1 text-sm text-space-muted">
            You have already applied as a Campus Ambassador.
          </p>
        </div>

        {/* Details */}
        <div className="space-y-5 px-8 py-8">
          <div className="flex items-center gap-2.5 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-space-muted">
            <Clock className="size-3.5 shrink-0 text-ion" />
            Submitted on {formatDate(previousSubmission.submittedAt)}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Full Name", value: previousSubmission.name, icon: <User className="size-3.5" /> },
              { label: "Class / Grade", value: previousSubmission.class, icon: <GraduationCap className="size-3.5" /> },
              { label: "School", value: previousSubmission.school, icon: <Building2 className="size-3.5" />, full: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`border border-space-line-soft bg-space-deep px-4 py-3 ${item.full ? "sm:col-span-2" : ""}`}
              >
                <div className="flex items-center gap-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ion">
                  {item.icon}
                  {item.label}
                </div>
                <p className="mt-1 text-sm text-space-ivory">{item.value}</p>
              </div>
            ))}

            <div className="border border-space-line-soft bg-space-deep px-4 py-3 sm:col-span-2">
              <div className="flex items-center gap-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ion">
                <Sparkles className="size-3.5" />
                Experience / Motivation
              </div>
              <p className="mt-1 text-sm leading-relaxed text-space-ivory/80">
                {previousSubmission.experience}
              </p>
            </div>
          </div>

          <div className="border-t border-space-line-soft pt-5">
            <p className="mb-4 text-sm text-space-muted">
              Need to update your application? You can resubmit below — this
              will create a new entry.
            </p>
            <button onClick={handleResubmit} className="signal-btn-ghost">
              <RefreshCw className="size-4" />
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
      {/* Card */}
      <div className="overflow-hidden border border-space-line-soft bg-space-deep/60">
        {/* Header */}
        <div className="border-b border-space-line-soft bg-ion-deep/70 px-8 py-7">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center border border-ion-line bg-ion/10">
              <Sparkles className="size-5 text-ion-bright" />
            </div>
            <div>
              <h2 className="font-voyage text-lg font-bold uppercase tracking-tight text-space-ivory">
                Campus Ambassador Form
              </h2>
              <p className="text-sm text-space-muted">
                Fill in all fields — your draft is saved automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-8 py-8">
          {/* Name */}
          <Field
            id="name"
            label="Full Name"
            icon={<User className="size-3.5" />}
            error={errors.name?.message}
          >
            <input
              id="name"
              type="text"
              placeholder="e.g. Ahmed Al-Rashid"
              className={inputClass}
              {...register("name")}
            />
          </Field>

          {/* Class + School in a responsive grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="class"
              label="Class / Grade"
              icon={<GraduationCap className="size-3.5" />}
              error={errors.class?.message}
              hint="e.g. Grade 10, Class XI"
            >
              <input
                id="class"
                type="text"
                placeholder="e.g. Grade 11"
                className={inputClass}
                {...register("class")}
              />
            </Field>

            <Field
              id="school"
              label="School"
              icon={<Building2 className="size-3.5" />}
              error={errors.school?.message}
            >
              <input
                id="school"
                type="text"
                placeholder="Your school name"
                className={inputClass}
                {...register("school")}
              />
            </Field>
          </div>

          {/* Experience */}
          <Field
            id="experience"
            label="Experience & Motivation"
            icon={<Sparkles className="size-3.5" />}
            error={errors.experience?.message}
            hint="Tell us about any clubs, leadership roles, or why you want to be an ambassador."
          >
            <div className="relative">
              <textarea
                id="experience"
                rows={6}
                placeholder="Share your story — your involvement in science, leadership experience, or why Manarat Science Club excites you…"
                className={`${inputClass} resize-none`}
                {...register("experience")}
              />
              <span
                className={`absolute bottom-3 right-3 font-mono text-xs tabular-nums ${
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

          {/* Server error */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-3 border border-space-amber/40 bg-space-amber/10 px-4 py-3.5"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-space-amber" />
                <p className="text-sm text-space-amber-bright">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-save indicator */}
          <p className="flex items-center gap-1.5 text-xs text-space-muted">
            <Save className="size-3.5 text-ion" />
            Your progress is automatically saved to this device.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="signal-btn-primary group w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit Application
                <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 text-center text-xs text-space-muted">
        By submitting, you agree to be contacted by the Manarat Science Club
        regarding your application. We never share your data with third parties.
      </p>
    </motion.div>
  );
}
