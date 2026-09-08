"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { AlertCircle, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldShell, fieldClass } from "../register/form-primitives";
import {
  stemfestTeamSizes,
  type StemfestEventOption,
} from "@/lib/data/stemfest-registration";
import {
  TEAMMATE_SLOTS,
  parseTeamSize,
  type StemfestFormValues,
  type TeamFields,
} from "./validate";

/**
 * Team roster blocks, rendered only for the team-based events the participant
 * actually selected. The registrant pays for the whole team, so one person
 * fills this in.
 */

/** RHF types deeply-partial records loosely; index them concretely instead. */
type TeamErrorBag = Record<string, Record<string, { message?: string }>>;

function teamError(
  errors: FieldErrors<StemfestFormValues>,
  eventId: string,
  key: string,
): string | undefined {
  return (errors.teams as TeamErrorBag | undefined)?.[eventId]?.[key]?.message;
}

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 font-space-body text-xs text-space-amber">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function TeamDetails({
  events,
  teams,
  control,
  register,
  errors,
}: {
  events: StemfestEventOption[];
  teams: Record<string, TeamFields>;
  control: Control<StemfestFormValues>;
  register: UseFormRegister<StemfestFormValues>;
  errors: FieldErrors<StemfestFormValues>;
}) {
  return (
    <div className="space-y-6">
      {events.map((event) => {
        const team = teams[event.id];
        const size = parseTeamSize(team?.size);
        const sizeError = teamError(errors, event.id, "size");
        const visibleSlots = size
          ? TEAMMATE_SLOTS.slice(0, size - 1)
          : [];

        return (
          <div
            key={event.id}
            className="rounded-2xl border border-space-line-soft bg-space-black/30 p-5 sm:p-6"
          >
            <h4 className="flex items-center gap-2 font-space-display text-lg font-medium text-space-ivory">
              <Users className="size-4 shrink-0 text-ion" aria-hidden="true" />
              {event.name}
            </h4>

            <div className="mt-5">
              <Controller
                control={control}
                name={`teams.${event.id}.size`}
                render={({ field }) => (
                  <>
                    <Label
                      htmlFor={`team-size-${event.id}`}
                      className="mb-1.5 block font-space-body text-sm font-medium normal-case tracking-normal text-space-ivory/80"
                    >
                      Team size
                    </Label>
                    <FieldShell invalid={Boolean(sizeError)}>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id={`team-size-${event.id}`}
                          className="px-0"
                          aria-invalid={Boolean(sizeError)}
                        >
                          <SelectValue placeholder="How many are in your team?" />
                        </SelectTrigger>
                        <SelectContent>
                          {stemfestTeamSizes.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              Team of {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldShell>
                    <ErrorNote message={sizeError} />
                  </>
                )}
              />
            </div>

            <div className="mt-6">
              <p className="mb-3 font-space-body text-sm font-medium text-space-ivory/80">
                Teammate names
                {size ? (
                  <span className="ml-2 font-mono text-[0.6rem] tracking-[0.16em] text-space-muted uppercase">
                    {size - 1} needed — you are the team lead
                  </span>
                ) : null}
              </p>

              {size ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleSlots.map((slot) => {
                    const key = `teammate${slot}`;
                    const slotError = teamError(errors, event.id, key);
                    return (
                      <div key={key}>
                        <Label
                          htmlFor={`team-${event.id}-${key}`}
                          className="mb-1.5 block font-space-body text-xs tracking-normal text-space-muted normal-case"
                        >
                          Teammate {slot}
                        </Label>
                        <FieldShell invalid={Boolean(slotError)}>
                          <Input
                            id={`team-${event.id}-${key}`}
                            type="text"
                            autoComplete="off"
                            placeholder="Full name"
                            className={fieldClass}
                            aria-invalid={Boolean(slotError)}
                            {...register(`teams.${event.id}.${key}`)}
                          />
                        </FieldShell>
                        <ErrorNote message={slotError} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-space-line-soft px-4 py-5 text-center font-space-body text-xs text-space-muted">
                  Choose a team size to add your teammates.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
