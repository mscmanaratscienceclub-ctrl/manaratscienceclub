"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  buildFormSchema,
  defaultValues,
  type FieldConfig,
  type FormKey,
} from "@/lib/forms/config";
import { submitDynamicForm } from "@/lib/actions/form-config";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const inputClass = "msc-input";

function draftKey(formKey: FormKey) {
  return `msc_dyn_form_${formKey}`;
}
function submissionKey(formKey: FormKey) {
  return `msc_dyn_submission_${formKey}`;
}

interface SavedSubmission {
  id: string;
  submittedAt: string;
  values: Record<string, string>;
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

export default function DynamicRegisterForm({
  formKey,
  fields,
}: {
  formKey: FormKey;
  fields: FieldConfig[];
}) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [previousSubmission, setPreviousSubmission] =
    useState<SavedSubmission | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Schema rebuilt whenever config changes
  const schema: ZodType<Record<string, string>> = buildFormSchema(fields);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(fields),
  });

  const watchAll = watch();

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(submissionKey(formKey));
      if (raw) {
        setPreviousSubmission(JSON.parse(raw));
        return;
      }
      const draft = localStorage.getItem(draftKey(formKey));
      if (draft) reset({ ...defaultValues(fields), ...JSON.parse(draft) });
    } catch {}
    setShowForm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  useEffect(() => {
    if (!mounted || previousSubmission || !showForm) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(formKey), JSON.stringify(watchAll));
      } catch {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [watchAll, mounted, previousSubmission, showForm, formKey]);

  const onSubmit = useCallback(
    async (values: Record<string, string>) => {
      setSubmitting(true);
      setServerError(null);
      const result = await submitDynamicForm(formKey, values);
      if (!result.success) {
        setServerError(result.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }
      const submission: SavedSubmission = {
        id: result.id!,
        submittedAt: result.submittedAt!,
        values,
      };
      try {
        localStorage.setItem(submissionKey(formKey), JSON.stringify(submission));
        localStorage.removeItem(draftKey(formKey));
      } catch {}
      setPreviousSubmission(submission);
      setShowForm(false);
      setSubmitting(false);
    },
    [formKey]
  );

  function handleResubmit() {
    if (!previousSubmission) return;
    try {
      localStorage.removeItem(submissionKey(formKey));
    } catch {}
    reset(defaultValues(fields));
    setPreviousSubmission(null);
    setShowForm(true);
  }

  if (!fields.length) {
    return (
      <div className="border border-space-line-soft bg-space-deep/60 px-8 py-12 text-center">
        <AlertCircle className="mx-auto mb-3 size-6 text-space-amber" />
        <p className="text-sm text-space-muted">
          This form is not accepting responses right now. Please check back later.
        </p>
      </div>
    );
  }

  if (previousSubmission && !showForm) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden border border-space-line-soft bg-space-deep/60"
      >
        <div className="border-b border-space-line-soft bg-ion-deep px-8 py-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 size-10 text-ion-bright" />
          <h2 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">
            Response Submitted!
          </h2>
          <p className="mt-1 flex items-center justify-center gap-2 text-sm text-space-muted">
            <Clock className="size-3.5" />
            {formatDate(previousSubmission.submittedAt)}
          </p>
        </div>
        <div className="space-y-4 px-8 py-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) =>
              previousSubmission.values[field.name] ? (
                <div
                  key={field.id}
                  className={`border border-space-line-soft bg-space-deep px-4 py-3 ${
                    field.type === "textarea" ? "sm:col-span-2" : ""
                  }`}
                >
                  <dt className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ion">
                    {field.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-space-ivory">
                    {previousSubmission.values[field.name]}
                  </dd>
                </div>
              ) : null
            )}
          </dl>
          <div className="border-t border-space-line-soft pt-5">
            <button onClick={handleResubmit} className="msc-btn-ghost">
              <RefreshCw className="size-4" />
              Submit a new response
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden border border-space-line-soft bg-space-deep/60"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-8 sm:px-8">
        {fields.map((field) => {
          const id = `${formKey}-${field.name}`;
          const error = errors[field.name]?.message as string | undefined;
          return (
            <div key={field.id} className="space-y-1.5">
              <label
                htmlFor={id}
                className="flex items-center gap-2 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-ivory/90"
              >
                {field.label}
                {field.required && <span className="text-manara-red">*</span>}
              </label>

              {(field.type === "text" ||
                field.type === "email" ||
                field.type === "tel" ||
                field.type === "number" ||
                field.type === "date") && (
                <input
                  id={id}
                  type={field.type === "tel" ? "tel" : field.type}
                  placeholder={field.placeholder}
                  className={inputClass}
                  {...register(field.name)}
                />
              )}

              {field.type === "textarea" && (
                <textarea
                  id={id}
                  rows={5}
                  placeholder={field.placeholder}
                  className={`${inputClass} resize-none`}
                  {...register(field.name)}
                />
              )}

              {field.type === "select" && (
                <select id={id} className={inputClass} {...register(field.name)}>
                  <option value="">{field.placeholder || "Choose an option…"}</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "radio" && (
                <div
                  className="flex gap-3"
                  role="radiogroup"
                  aria-label={field.label}
                >
                  {field.options.map((option) => (
                    <label
                      key={option}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 border border-space-line-soft px-4 py-3 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-muted transition-colors has-checked:border-ion has-checked:bg-ion/10 has-checked:text-ion-bright hover:border-ion"
                    >
                      <input
                        type="radio"
                        value={option}
                        className="sr-only"
                        {...register(field.name)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

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
                ) : field.helpText ? (
                  <p className="text-xs text-space-muted">{field.helpText}</p>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}

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

        <p className="flex items-center gap-1.5 text-xs text-space-muted">
          <Save className="size-3.5 text-ion" />
          Your progress is automatically saved to this device.
        </p>

        <button
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
              Submit
              <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
