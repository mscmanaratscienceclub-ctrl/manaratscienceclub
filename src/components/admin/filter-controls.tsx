"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  defaultFilterOperator,
  encodeFilterValue,
  filterOperatorLabel,
  filterOperatorOptions,
  readFilterValue,
  type AdminFilterField,
  type AdminFilterOperator,
  type AdminFilterOption,
} from "@/lib/admin/filters";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { adminControl } from "./styles";

/**
 * One filter control, and the comparison it makes.
 *
 * A `text` or `select` field offers an operator as well as a value — "contains",
 * "is exactly", "does not contain" — so the control is the picker plus the value,
 * and what it hands back is the two of them **encoded** the way the URL carries
 * them (`encodeFilterValue`). Nothing above this component has to know that an
 * operator is a prefix: the filter bar, the export dialog, the printed report and
 * the query layer all read and write one string.
 *
 * The chosen operator is local state, not a filter on its own. An operator with no
 * value narrows nothing, so it waits here until there is something to compare —
 * and it is remembered while the admin is still typing, which is why the picker can
 * sit on "Does not contain" in front of an empty box without snapping back.
 *
 * Fields that take no operator — a date bound, an amount bound — render exactly
 * one control, as before.
 */
export function FilterField({
  field,
  value,
  onChange,
  immediate = false,
}: {
  field: AdminFilterField;
  value: string;
  onChange: (id: string, value: string) => void;
  /**
   * Commit every keystroke instead of waiting for a pause. The filter bar
   * debounces because each change is a server query; the export dialog has no
   * query behind it and a download must include the last character typed, even
   * when the admin types it and clicks straight away.
   */
  immediate?: boolean;
}) {
  const reading = readFilterValue(field, value);
  const body = reading?.value ?? "";
  const stored = reading?.operator ?? defaultFilterOperator(field);

  const [operator, setOperator] = useState<AdminFilterOperator>(stored);

  // Something else changed the value — a chip was removed, a link was followed,
  // the export dialog rebuilt its draft — so the picker follows the URL again.
  // Picking an operator while the box is still empty does not trip this: the
  // stored operator is unchanged by a filter that has no value.
  useEffect(() => {
    setOperator(stored);
  }, [stored]);

  /** Writes the operator that is currently in the picker, once there is a value. */
  const commit = (nextBody: string) =>
    onChange(field.id, encodeFilterValue(field, operator, nextBody));

  const chooseOperator = (next: AdminFilterOperator) => {
    setOperator(next);
    // With a value already in the control, changing the comparison is a finished
    // edit and commits now; with none, it is remembered above.
    if (body) onChange(field.id, encodeFilterValue(field, next, body));
  };

  const picker =
    filterOperatorOptions(field).length > 0 ? (
      <OperatorPicker field={field} value={operator} onChange={chooseOperator} />
    ) : null;

  switch (field.kind) {
    case "select":
      return (
        <ChoiceField
          field={field}
          value={body}
          picker={picker}
          onChange={commit}
        />
      );
    case "date":
      return <DateField field={field} value={body} onChange={onChange} />;
    case "number":
      return (
        <TypedField
          field={field}
          value={body}
          onChange={commit}
          immediate={immediate}
          numeric
        />
      );
    case "text":
      return (
        <TypedField
          field={field}
          value={body}
          onChange={commit}
          immediate={immediate}
          picker={picker}
        />
      );
  }
}

/**
 * The comparison picker, in front of the value control.
 *
 * Labelled for assistive technology rather than visually — the field's own label
 * already names the filter it belongs to, and a second visible label above the same
 * control would say "Segment" twice.
 */
function OperatorPicker({
  field,
  value,
  onChange,
}: {
  field: AdminFilterField;
  value: AdminFilterOperator;
  onChange: (operator: AdminFilterOperator) => void;
}) {
  return (
    <select
      aria-label={`${field.label} comparison`}
      value={value}
      onChange={(event) => onChange(event.target.value as AdminFilterOperator)}
      className={cn(adminControl, "w-auto shrink-0 py-1.5 text-xs")}
    >
      {filterOperatorOptions(field).map((operator) => (
        <option key={operator} value={operator}>
          {filterOperatorLabel(field, operator).menu}
        </option>
      ))}
    </select>
  );
}

/** Visible label + control. Every field is labelled, never placeholder-only. */
function FieldShell({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-40 flex-1">
      <label
        htmlFor={id}
        className="mb-1.5 block font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-muted uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ChoiceField({
  field,
  value,
  picker,
  onChange,
}: {
  field: AdminFilterField;
  value: string;
  picker: React.ReactNode;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={field.label}>
      <div className="flex items-stretch gap-1.5">
        {picker}
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={adminControl}
        >
          <option value="">Any</option>
          {groupedOptions(field.options).map((run) =>
            run.type === "option" ? (
              <option key={run.value} value={run.value}>
                {run.label}
              </option>
            ) : (
              <optgroup key={run.label} label={run.label}>
                {run.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      </div>
    </FieldShell>
  );
}

type OptionRun =
  | { type: "option"; value: string; label: string }
  | { type: "group"; label: string; options: AdminFilterOption[] };

/**
 * Options as the catalogue declared them, gathered in one pass.
 *
 * A `group` is a presentation hint only — validation reads `value` — so an
 * ungrouped field comes back as bare options and a grouped one as runs sharing a
 * heading. Runs follow first appearance, which keeps a catalogue that
 * interleaves groups down to one heading per group.
 */
function groupedOptions(options: AdminFilterField["options"]): OptionRun[] {
  const runs: OptionRun[] = [];
  const groupByLabel = new Map<string, Extract<OptionRun, { type: "group" }>>();

  for (const option of options ?? []) {
    if (!option.group) {
      runs.push({ type: "option", value: option.value, label: option.label });
      continue;
    }
    let run = groupByLabel.get(option.group);
    if (!run) {
      run = { type: "group", label: option.group, options: [] };
      groupByLabel.set(option.group, run);
      runs.push(run);
    }
    run.options.push(option);
  }

  return runs;
}

/** A calendar day commits immediately — one interaction, one choice. */
function DateField({
  field,
  value,
  onChange,
}: {
  field: AdminFilterField;
  value: string;
  onChange: (id: string, value: string) => void;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={field.label}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(field.id, event.target.value)}
        className={adminControl}
      />
    </FieldShell>
  );
}

/**
 * A free-text or numeric filter, debounced.
 *
 * Typing deliberately does not reach the URL on each keystroke: every change
 * re-runs the server query, and one query per character would spend the pooler's
 * connections on half-typed words. The box stays local and commits once the admin
 * pauses, exactly like the search box — and it resyncs when something *else*
 * changes the value, such as removing this filter's chip or clearing all.
 */
function TypedField({
  field,
  value,
  onChange,
  immediate = false,
  numeric = false,
  picker,
}: {
  field: AdminFilterField;
  value: string;
  onChange: (value: string) => void;
  immediate?: boolean;
  numeric?: boolean;
  /** The comparison picker, for a text field. Numeric fields get none. */
  picker?: React.ReactNode;
}) {
  const id = useId();
  const [input, setInput] = useState(value);
  const committed = useRef(value);
  const debounced = useDebouncedValue(input, immediate ? 0 : 350);

  useEffect(() => {
    if (value === committed.current) return;
    committed.current = value;
    setInput(value);
  }, [value]);

  useEffect(() => {
    if (debounced === committed.current) return;
    committed.current = debounced;
    onChange(debounced);
  }, [debounced, onChange]);

  const commitNow = () => {
    if (input === committed.current) return;
    committed.current = input;
    onChange(input);
  };

  return (
    <FieldShell id={id} label={field.label}>
      <div className="flex items-stretch gap-1.5">
        {picker}
        <input
          id={id}
          type="text"
          inputMode={numeric ? "decimal" : "text"}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitNow();
          }}
          onBlur={commitNow}
          placeholder={field.placeholder}
          className={adminControl}
        />
      </div>
    </FieldShell>
  );
}
