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
} from "lucide-react";
import { submitAmbassadorForm } from "./actions";

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
        className="flex items-center gap-2 font-display text-sm font-semibold text-ink"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-manara-teal/10 text-manara-teal">
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
            className="flex items-center gap-1.5 font-body text-xs text-red-500"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-body text-xs text-ink/40"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-manara-teal/15 bg-white px-4 py-3 font-body text-sm text-ink placeholder-ink/30 shadow-sm outline-none ring-0 transition-all focus:border-manara-teal focus:ring-2 focus:ring-manara-teal/20";

// ── Main Component ────────────────────────────────────────────────────────────
export default function CampusAmbassadorForm() {
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
    formState: { errors, isSubmitSuccessful },
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
        <Loader2 className="h-8 w-8 animate-spin text-manara-teal/40" />
      </div>
    );
  }

  // ── Previously-submitted view ─────────────────────────────────────────────
  if (previousSubmission && !showForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl border border-manara-teal/10 bg-white shadow-academic"
      >
        {/* Green header banner */}
        <div className="bg-manara-teal px-8 py-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 22 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-white">
            Application Submitted!
          </h2>
          <p className="mt-1 font-body text-sm text-white/70">
            You have already applied as a Campus Ambassador.
          </p>
        </div>

        {/* Details */}
        <div className="space-y-5 px-8 py-8">
          <div className="flex items-center gap-2.5 font-body text-xs text-ink/40">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Submitted on {formatDate(previousSubmission.submittedAt)}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Full Name", value: previousSubmission.name, icon: <User className="h-3.5 w-3.5" /> },
              { label: "Class / Grade", value: previousSubmission.class, icon: <GraduationCap className="h-3.5 w-3.5" /> },
              { label: "School", value: previousSubmission.school, icon: <Building2 className="h-3.5 w-3.5" />, full: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl bg-manara-teal/5 px-4 py-3 ${item.full ? "sm:col-span-2" : ""}`}
              >
                <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-manara-teal">
                  {item.icon}
                  {item.label}
                </div>
                <p className="mt-1 font-body text-sm text-ink">{item.value}</p>
              </div>
            ))}

            <div className="sm:col-span-2 rounded-xl bg-manara-teal/5 px-4 py-3">
              <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-manara-teal">
                <Sparkles className="h-3.5 w-3.5" />
                Experience / Motivation
              </div>
              <p className="mt-1 font-body text-sm leading-relaxed text-ink/80">
                {previousSubmission.experience}
              </p>
            </div>
          </div>

          <div className="border-t border-manara-teal/10 pt-5">
            <p className="mb-4 font-body text-sm text-ink/50">
              Need to update your application? You can resubmit below — this
              will create a new entry.
            </p>
            <button
              onClick={handleResubmit}
              className="inline-flex items-center gap-2 rounded-xl border border-manara-teal/20 bg-white px-5 py-2.5 font-display text-sm font-semibold text-manara-teal shadow-sm transition-all hover:-translate-y-0.5 hover:border-manara-teal/40 hover:shadow-academic"
            >
              <RefreshCw className="h-4 w-4" />
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Card */}
      <div className="overflow-hidden rounded-3xl border border-manara-teal/10 bg-white shadow-academic">
        {/* Header */}
        <div className="border-b border-manara-teal/10 bg-gradient-to-r from-manara-teal to-manara-teal/80 px-8 py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Campus Ambassador Form
              </h2>
              <p className="font-body text-sm text-white/60">
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
            icon={<User className="h-3.5 w-3.5" />}
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
              icon={<GraduationCap className="h-3.5 w-3.5" />}
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
              icon={<Building2 className="h-3.5 w-3.5" />}
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
            icon={<Sparkles className="h-3.5 w-3.5" />}
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
                    ? "text-red-400"
                    : experienceLen > 1400
                    ? "text-manara-yellow"
                    : "text-ink/30"
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
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="font-body text-sm text-red-600">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-save indicator */}
          <p className="font-body text-xs text-ink/35">
            💾 Your progress is automatically saved to this device.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-manara-teal px-6 py-3.5 font-display text-base font-bold text-white shadow-academic transition-all hover:-translate-y-0.5 hover:bg-manara-teal/90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit Application
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 text-center font-body text-xs text-ink/35">
        By submitting, you agree to be contacted by the Manarat Science Club
        regarding your application. We never share your data with third parties.
      </p>
    </motion.div>
  );
}
