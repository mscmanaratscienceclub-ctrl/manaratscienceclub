"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AdminFilterField } from "@/lib/admin/filters";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";

/**
 * The control classes every filter shares. Matches the search box the tables used
 * before the filter bar existed, so the panel reads as one surface.
 */
const controlClass =
  "w-full rounded-xl border border-ink/10 bg-cream/40 px-3 py-2 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-manara-teal";

export function FilterField({
  field,
  value,
  onChange,
}: {
  field: AdminFilterField;
  value: string;
  onChange: (id: string, value: string) => void;
}) {
  switch (field.kind) {
    case "select":
      return <ChoiceField field={field} value={value} onChange={onChange} />;
    case "date":
      return <DateField field={field} value={value} onChange={onChange} />;
    case "number":
      return <TypedField field={field} value={value} onChange={onChange} numeric />;
    case "text":
      return <TypedField field={field} value={value} onChange={onChange} />;
  }
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
        className="mb-1 block font-body text-xs font-semibold tracking-wider text-ink/40 uppercase"
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
  onChange,
}: {
  field: AdminFilterField;
  value: string;
  onChange: (id: string, value: string) => void;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={field.label}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(field.id, event.target.value)}
        className={controlClass}
      >
        <option value="">Any</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
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
        className={controlClass}
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
  numeric = false,
}: {
  field: AdminFilterField;
  value: string;
  onChange: (id: string, value: string) => void;
  numeric?: boolean;
}) {
  const id = useId();
  const [input, setInput] = useState(value);
  const committed = useRef(value);
  const debounced = useDebouncedValue(input, 350);

  useEffect(() => {
    if (value === committed.current) return;
    committed.current = value;
    setInput(value);
  }, [value]);

  useEffect(() => {
    if (debounced === committed.current) return;
    committed.current = debounced;
    onChange(field.id, debounced);
  }, [debounced, field.id, onChange]);

  return (
    <FieldShell id={id} label={field.label}>
      <input
        id={id}
        type="text"
        inputMode={numeric ? "decimal" : "text"}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={field.placeholder}
        className={controlClass}
      />
    </FieldShell>
  );
}
