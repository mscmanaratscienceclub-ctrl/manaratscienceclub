"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Phone,
  ReceiptText,
  Save,
  Ticket,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import {
  computeFeeSummary,
  eligibleSegmentsForClass,
  stemfestClasses,
  stemfestClassGroups,
  stemfestEvents,
  stemfestFormCopy,
  stemfestPaymentCopy,
  type StemfestClassId,
} from "@/lib/data/stemfest-registration";
import {
  Field,
  FieldShell,
  FormSection,
  fieldClass,
} from "../register/form-primitives";
import { readStored, removeStored, writeStored } from "../register/form-storage";
import { submitStemfestRegistration } from "./actions";
import { EventPicker } from "./event-picker";
import { FeeSummary } from "./fee-summary";
import { TeamDetails } from "./team-details";
import {
  SubmissionReceipt,
  type SavedStemfestSubmission,
} from "./submission-receipt";
import {
  EMPTY_STEMFEST_VALUES,
  buildEntries,
  stemfestRegistrationSchema,
  type StemfestFormValues,
} from "./validate";

const DRAFT_KEY = "msc_stemfest_reg_draft";
const SUBMISSION_KEY = "msc_stemfest_reg_submission";

const classLabelById = new Map(
  stemfestClasses.map((entry) => [entry.id, entry.label]),
);

function InlineError({ message }: { message?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {message ? (
        <motion.p
          key="error"
          initial={reducedMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-3 flex items-center gap-1.5 font-space-body text-xs text-space-amber"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export default function StemfestRegistrationForm() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [previousSubmission, setPreviousSubmission] =
    useState<SavedStemfestSubmission | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StemfestFormValues>({
    resolver: zodResolver(stemfestRegistrationSchema),
    defaultValues: EMPTY_STEMFEST_VALUES,
  });

  const values = watch();
  const classId = values.classId as StemfestClassId | "";
  const selectedEventIds = values.eventIds ?? [];

  // ── Hydration: restore the draft, or the receipt if they already submitted ──
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setServerError(null);

    const submission = readStored<SavedStemfestSubmission>(SUBMISSION_KEY);
    if (submission) {
      setPreviousSubmission(submission);
      return;
    }

    setPreviousSubmission(null);
    const draft = readStored<Partial<StemfestFormValues>>(DRAFT_KEY);
    reset({
      ...EMPTY_STEMFEST_VALUES,
      ...draft,
      // A draft saved before a team event existed would be missing its slots.
      teams: { ...EMPTY_STEMFEST_VALUES.teams, ...draft?.teams },
    });
  }, [mounted, reset]);

  // ── Auto-save draft ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || previousSubmission) return;
    const timeout = setTimeout(() => writeStored(DRAFT_KEY, values), 500);
    return () => clearTimeout(timeout);
  }, [values, mounted, previousSubmission]);

  // ── Drop picks the newly-chosen class isn't eligible for ───────────────────
  useEffect(() => {
    if (!classId) return;
    const eligible = new Set(
      eligibleSegmentsForClass(classId).flatMap((segment) =>
        segment.events.map((entry) => entry.event.id),
      ),
    );
    const pruned = selectedEventIds.filter((id) => eligible.has(id));
    if (pruned.length !== selectedEventIds.length) setValue("eventIds", pruned);
  }, [classId, selectedEventIds, setValue]);

  const eligibleSegments = useMemo(
    () => (classId ? eligibleSegmentsForClass(classId) : []),
    [classId],
  );

  const entries = useMemo(() => buildEntries(values), [values]);
  const fee = useMemo(() => computeFeeSummary(entries), [entries]);

  const selectedTeamEvents = useMemo(
    () =>
      stemfestEvents.filter(
        (event) => event.teamBased && selectedEventIds.includes(event.id),
      ),
    [selectedEventIds],
  );

  const onSubmit = useCallback(async (submitted: StemfestFormValues) => {
    setSubmitting(true);
    setServerError(null);

    const result = await submitStemfestRegistration(submitted);
    if (!result.success) {
      setServerError(result.error);
      setSubmitting(false);
      return;
    }

    const submission: SavedStemfestSubmission = {
      id: result.id,
      submittedAt: result.submittedAt,
      totalFee: result.totalFee,
      entries: buildEntries(submitted),
      participant: {
        name: submitted.name,
        classId: submitted.classId,
        phone: submitted.phone,
        bkashNumber: submitted.bkashNumber,
        bkashTrxId: submitted.bkashTrxId.toUpperCase(),
      },
    };
    writeStored(SUBMISSION_KEY, submission);
    removeStored(DRAFT_KEY);
    setPreviousSubmission(submission);
    setSubmitting(false);
  }, []);

  const handleResubmit = useCallback(() => {
    removeStored(SUBMISSION_KEY);
    reset(EMPTY_STEMFEST_VALUES);
    setPreviousSubmission(null);
  }, [reset]);

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-ion" />
      </div>
    );
  }

  if (previousSubmission) {
    return (
      <SubmissionReceipt
        submission={previousSubmission}
        onResubmit={handleResubmit}
      />
    );
  }

  const eventError =
    errors.eventIds?.message ?? errors.eventIds?.root?.message;

  let fieldNumber = 0;
  const nextIndex = () => String(++fieldNumber).padStart(2, "0");

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-14">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* ── 01 Participant ─────────────────────────────────────────────── */}
          <FormSection
            step="01"
            title="Who is registering"
            caption="Your class decides which events and categories are open to you."
          >
            <Field
              index={nextIndex()}
              id="stemfest-name"
              label="Full name"
              error={errors.name?.message}
            >
              <FieldShell invalid={Boolean(errors.name)}>
                <Input
                  id="stemfest-name"
                  type="text"
                  autoComplete="name"
                  placeholder="As it should appear on your certificate"
                  className={fieldClass}
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
              </FieldShell>
            </Field>

            <Field
              index={nextIndex()}
              id="stemfest-class"
              label="Class"
              error={errors.classId?.message}
              hint="Everything below is filtered to match this."
            >
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <FieldShell invalid={Boolean(errors.classId)}>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="stemfest-class"
                        aria-invalid={Boolean(errors.classId)}
                      >
                        <SelectValue placeholder="Select your class" />
                      </SelectTrigger>
                      <SelectContent>
                        {stemfestClassGroups.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.classIds.map((id) => (
                              <SelectItem key={id} value={id}>
                                {classLabelById.get(id)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldShell>
                )}
              />
            </Field>

            <Field
              index={nextIndex()}
              id="stemfest-phone"
              label="Phone number"
              error={errors.phone?.message}
              hint="Where we reach you about schedules and results."
            >
              <FieldShell invalid={Boolean(errors.phone)}>
                <Input
                  id="stemfest-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  className={fieldClass}
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone")}
                />
              </FieldShell>
            </Field>
          </FormSection>

          {/* ── 02 Events ──────────────────────────────────────────────────── */}
          <FormSection
            step="02"
            title="Choose your events"
            caption="Pick as many as you like — your category is worked out from your class."
          >
            {eligibleSegments.length > 0 ? (
              <EventPicker
                segments={eligibleSegments}
                register={register}
                error={eventError}
              />
            ) : (
              <p className="flex items-start gap-3 rounded-2xl border border-dashed border-space-line-soft px-5 py-8 font-space-body text-sm leading-relaxed text-space-muted">
                <Ticket className="mt-0.5 size-4 shrink-0 text-ion" aria-hidden="true" />
                {stemfestFormCopy.classPrompt}
              </p>
            )}
            <InlineError message={eventError} />
          </FormSection>

          {/* ── 03 Teams ───────────────────────────────────────────────────── */}
          <AnimatePresence initial={false}>
            {selectedTeamEvents.length > 0 ? (
              <motion.div
                key="teams"
                initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <FormSection
                  step="03"
                  title="Your team"
                  caption={stemfestFormCopy.teamCaption}
                >
                  <TeamDetails
                    events={selectedTeamEvents}
                    teams={values.teams}
                    control={control}
                    register={register}
                    errors={errors}
                  />
                </FormSection>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* ── 04 Payment ─────────────────────────────────────────────────── */}
          <FormSection
            step={selectedTeamEvents.length > 0 ? "04" : "03"}
            title="bKash payment"
            caption="Send the total shown in your summary, then give us the reference."
          >
            <div className="rounded-2xl border border-ion-line bg-ion/5 p-5">
              <p className="font-mono text-[0.6rem] font-semibold tracking-[0.24em] text-ion uppercase">
                Send to
              </p>
              <p className="mt-2 font-space-display text-2xl font-medium text-space-ivory tabular-nums">
                {stemfestPaymentCopy.merchantNumber}
              </p>
              <p className="mt-1 font-space-body text-xs text-space-muted">
                {stemfestPaymentCopy.merchantLabel}
              </p>
              <ol className="mt-4 space-y-2 border-t border-ion-line pt-4">
                {stemfestPaymentCopy.instructions.map((line, position) => (
                  <li
                    key={line}
                    className="flex gap-2.5 font-space-body text-xs leading-relaxed text-space-muted"
                  >
                    <span className="shrink-0 font-mono text-ion tabular-nums">
                      {position + 1}
                    </span>
                    {line}
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <Field
                index={nextIndex()}
                id="stemfest-bkash-number"
                label="bKash number"
                error={errors.bkashNumber?.message}
                hint="The number you sent the money from."
              >
                <FieldShell invalid={Boolean(errors.bkashNumber)}>
                  <Input
                    id="stemfest-bkash-number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="01XXXXXXXXX"
                    className={fieldClass}
                    aria-invalid={Boolean(errors.bkashNumber)}
                    {...register("bkashNumber")}
                  />
                </FieldShell>
              </Field>

              <Field
                index={nextIndex()}
                id="stemfest-bkash-trxid"
                label="bKash Transaction ID"
                error={errors.bkashTrxId?.message}
                hint={stemfestPaymentCopy.trxIdHint}
              >
                <FieldShell invalid={Boolean(errors.bkashTrxId)}>
                  <Input
                    id="stemfest-bkash-trxid"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="8N7A2B1C2D"
                    className={`${fieldClass} uppercase`}
                    aria-invalid={Boolean(errors.bkashTrxId)}
                    {...register("bkashTrxId")}
                  />
                </FieldShell>
              </Field>
            </div>
          </FormSection>

          <AnimatePresence>
            {serverError ? (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="alert"
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
            ) : null}
          </AnimatePresence>

          <div className="mt-12 flex flex-col gap-5 border-t border-space-line-soft pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[30ch] font-space-body text-xs leading-relaxed text-space-muted">
              Check the total matches what you sent before submitting.
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
                  {stemfestFormCopy.submitLabel}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Running total ────────────────────────────────────────────────── */}
        <aside
          aria-label="Registration summary"
          className="mt-14 space-y-5 lg:sticky lg:top-28 lg:mt-0"
        >
          <FeeSummary fee={fee} entryCount={entries.length} />

          <div className="rounded-3xl border border-space-line-soft bg-space-black/30 p-6">
            <p className="flex items-center gap-2 font-space-body text-xs leading-relaxed text-space-muted">
              <Save className="size-3.5 shrink-0 text-ion" aria-hidden="true" />
              Saved automatically on this device.
            </p>
            <p className="mt-4 flex items-start gap-2 border-t border-space-line-soft pt-4 font-space-body text-xs leading-relaxed text-space-muted">
              <Phone className="mt-0.5 size-3.5 shrink-0 text-ion" aria-hidden="true" />
              <span>{stemfestFormCopy.disclaimer}</span>
            </p>
            <p className="mt-4 flex items-start gap-2 border-t border-space-line-soft pt-4 font-space-body text-xs leading-relaxed text-space-muted">
              <ReceiptText className="mt-0.5 size-3.5 shrink-0 text-ion" aria-hidden="true" />
              One registration covers one participant. Teams register through a
              single member.
            </p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
