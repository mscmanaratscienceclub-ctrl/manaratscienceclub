"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAmbassadorForm } from "./actions";
import { AmbassadorProgramSelector } from "./ambassador-program-selector";
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
      <Label
        htmlFor={id}
        className="flex items-center gap-2 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-ivory/90"
      >
        <span className="flex size-6 items-center justify-center border border-ion-line text-ion">
          {icon}
        </span>
        {label}
      </Label>
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

const inputClass = "msc-input";

// ── Main Component ────────────────────────────────────────────────────────────
export default function CampusAmbassadorForm() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [selectedType, setSelectedType] = useState<AmbassadorType>("campus");
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
      console.log("[CampusAmbassadorForm] onSubmit fired", { type: selectedType, values });
      setSubmitting(true);
      setServerError(null);

      const result = await submitAmbassadorForm({ ...values, type: selectedType });
      console.log("[CampusAmbassadorForm] server result:", result);

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
      <>
        <AmbassadorProgramSelector value={selectedType} onChange={setSelectedType} />
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
            You have already applied as a {activeProgram.title}.
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
                Experience
              </div>
              <p className="mt-1 text-sm leading-relaxed text-space-ivory/80">
                {previousSubmission.experience}
              </p>
            </div>

            {previousSubmission.firstTimeCa && (
              <div className="border border-space-line-soft bg-space-deep px-4 py-3 sm:col-span-2">
                <div className="flex items-center gap-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ion">
                  <HelpCircle className="size-3.5" />
                   First time being a {activeProgram.shortTitle} Ambassador
                 </div>
                 <p className="mt-1 text-sm text-space-ivory capitalize">{previousSubmission.firstTimeCa}</p>
              </div>
            )}
          </div>

          <div className="border-t border-space-line-soft pt-5">
            <p className="mb-4 text-sm text-space-muted">
              Need to update your application? You can resubmit below — this
              will create a new entry.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResubmit}
              className="msc-btn-ghost"
            >
              <RefreshCw className="size-4" />
              Submit a new application
            </Button>
          </div>
        </div>
        </motion.div>
      </>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <>
      <AmbassadorProgramSelector value={selectedType} onChange={setSelectedType} />
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
                {activeProgram.title} Form
              </h2>
              <p className="text-sm text-space-muted">
                Fill in all fields — your draft is saved automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit(onSubmit, (fieldErrors) => {
            console.warn("[CampusAmbassadorForm] Validation failed — field errors:", fieldErrors);
          })}
          className="space-y-6 px-8 py-8"
        >
          {/* Name */}
          <Field
            id="name"
            label="Full Name"
            icon={<User className="size-3.5" />}
            error={errors.name?.message}
          >
            <Input
              id="name"
              type="text"
              placeholder="e.g. Ahmed Al-Rashid"
              className={inputClass}
              aria-invalid={Boolean(errors.name)}
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
              <Input
                id="class"
                type="text"
                placeholder="e.g. Grade 11"
                className={inputClass}
                aria-invalid={Boolean(errors.class)}
                {...register("class")}
              />
            </Field>

            <Field
              id="school"
              label="School"
              icon={<Building2 className="size-3.5" />}
              error={errors.school?.message}
            >
              <Input
                id="school"
                type="text"
                placeholder="Your school name"
                className={inputClass}
                aria-invalid={Boolean(errors.school)}
                {...register("school")}
              />
            </Field>
          </div>

          {/* Experience */}
          <Field
            id="experience"
            label="Experience"
            icon={<Sparkles className="size-3.5" />}
            error={errors.experience?.message}
            hint="Tell us about any clubs, leadership roles, or relevant experience."
          >
            <div className="relative">
              <Textarea
                id="experience"
                rows={6}
                className={`${inputClass} resize-none`}
                aria-invalid={Boolean(errors.experience)}
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

          {/* Previous ambassador experience */}
          <Field
            id="firstTimeCa"
            label={`Is this your first time being a ${activeProgram.title}?`}
            icon={<HelpCircle className="size-3.5" />}
            error={errors.firstTimeCa?.message}
          >
            <div
              className="flex gap-3"
              role="radiogroup"
              aria-label={`Is this your first time being a ${activeProgram.title}?`}
            >
              {(["yes", "no"] as const).map((option) => (
                <label
                  key={option}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 border border-space-line-soft px-4 py-3 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-muted transition-colors has-checked:border-ion has-checked:bg-ion/10 has-checked:text-ion-bright hover:border-ion"
                >
                  <input
                    type="radio"
                    value={option}
                    className="sr-only"
                    {...register("firstTimeCa")}
                  />
                  {option}
                </label>
              ))}
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
          <Button
            type="submit"
            disabled={submitting}
            className="msc-btn-primary group w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit {activeProgram.shortTitle} Application
                <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 text-center text-xs text-space-muted">
        By submitting, you agree to be contacted by the Manarat Science Club
        regarding your application. We never share your data with third parties.
      </p>
      </motion.div>
    </>
  );
}
