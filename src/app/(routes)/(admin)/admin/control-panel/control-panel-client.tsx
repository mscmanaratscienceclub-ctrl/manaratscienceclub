"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  type FieldConfig,
  type FieldType,
  type FormKey,
} from "@/lib/forms/config";
import {
  createFormField,
  deleteFormField,
  moveFormField,
  toggleFormFieldEnabled,
  updateFormField,
  type FieldInput,
} from "@/lib/actions/form-config";

const TABS: { id: FormKey; label: string }[] = [
  { id: "stem-fest", label: "STEM Fest" },
  { id: "campus-ambassador", label: "Campus Ambassador" },
];

interface EditorState {
  mode: "create" | "edit";
  field: FieldConfig | null;
}

interface FormState {
  name: string;
  label: string;
  type: FieldType;
  placeholder: string;
  helpText: string;
  required: boolean;
  optionsText: string;
}

const emptyForm = (): FormState => ({
  name: "",
  label: "",
  type: "text",
  placeholder: "",
  helpText: "",
  required: false,
  optionsText: "",
});

function toFormState(field: FieldConfig): FormState {
  return {
    name: field.name,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    optionsText: field.options.join("\n"),
  };
}

export default function ControlPanelClient({
  initialFields,
}: {
  initialFields: Record<FormKey, FieldConfig[]>;
}) {
  const [tab, setTab] = useState<FormKey>("stem-fest");
  const [fields, setFields] = useState(initialFields);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [_error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const current = fields[tab];

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setEditor({ mode: "create", field: null });
  }

  function openEdit(field: FieldConfig) {
    setForm(toFormState(field));
    setError(null);
    setEditor({ mode: "edit", field });
  }

  function closeEditor() {
    setEditor(null);
    setError(null);
  }

  function runAction(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  function handleToggle(field: FieldConfig, enabled: boolean) {
    setFields((prev) => ({
      ...prev,
      [field.formKey]: prev[field.formKey].map((f) =>
        f.id === field.id ? { ...f, enabled } : f
      ),
    }));
    runAction(() => toggleFormFieldEnabled(field.id, enabled));
  }

  function handleMove(id: string, direction: "up" | "down") {
    runAction(async () => {
      await moveFormField(id, direction);
      const { getAllFormFields } = await import("@/lib/actions/form-config");
      setFields((prev) => ({ ...prev, [tab]: await getAllFormFields(tab) }));
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this field? Existing responses are kept.")) return;
    runAction(async () => {
      await deleteFormField(id);
      setFields((prev) => ({
        ...prev,
        [tab]: prev[tab].filter((f) => f.id !== id),
      }));
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const input: FieldInput = {
      name: form.name.trim(),
      label: form.label.trim(),
      type: form.type,
      placeholder: form.placeholder,
      helpText: form.helpText,
      required: form.required,
      options:
        form.type === "select" || form.type === "radio"
          ? form.optionsText.split("\n").map((o) => o.trim()).filter(Boolean)
          : [],
    };
    if (!input.name || !input.label) {
      setError("Field name and label are required.");
      return;
    }
    if ((form.type === "select" || form.type === "radio") && input.options.length < 2) {
      setError("Provide at least two options (one per line).");
      return;
    }

    runAction(async () => {
      if (editor?.mode === "edit" && editor.field) {
        const result = await updateFormField(editor.field.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createFormField(tab, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      const { getAllFormFields } = await import("@/lib/actions/form-config");
      setFields((prev) => ({ ...prev, [tab]: await getAllFormFields(tab) }));
      closeEditor();
    });
  }

  const optionInput = (label: string, key: keyof FormState, props: Record<string, string | number> = {}) => (
    <label className="space-y-1.5">
      <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted">
        {label}
      </span>
      <input
        className="msc-input"
        value={String(form[key])}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        {...props}
      />
    </label>
  );

  const hasOptions = form.type === "select" || form.type === "radio";

  return (
    <div className="space-y-6">
      {/* Form switcher */}
      <div className="flex gap-2" role="tablist" aria-label="Forms">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "border px-4 py-2.5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] transition-colors",
              tab === id
                ? "border-ion bg-ion/10 text-ion-bright"
                : "border-space-line-soft text-space-muted hover:border-ion hover:text-ion"
            )}
          >
            {label}
            <span className="ml-2 text-space-muted">{fields[id].length}</span>
          </button>
        ))}
      </div>

      {/* Fields list */}
      <div className="border border-space-line-soft bg-space-deep/60">
        <div className="flex items-center justify-between border-b border-space-line-soft bg-ion-deep/50 px-5 py-4">
          <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.28em] text-space-ivory">
            {TABS.find((t) => t.id === tab)?.label} fields
          </p>
          <button onClick={openCreate} disabled={busy} className="msc-btn-ghost !px-3 !py-1.5 !text-xs">
            <Plus className="size-4" /> Add field
          </button>
        </div>

        <ul className="divide-y divide-space-line-soft">
          {current.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-space-muted">
              No fields yet — add the first one.
            </li>
          )}
          {current.map((field, index) => (
            <li key={field.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex gap-1">
                <button
                  aria-label="Move up"
                  disabled={index === 0 || busy}
                  onClick={() => handleMove(field.id, "up")}
                  className="border border-transparent p-1 text-space-muted transition-colors hover:border-ion-line hover:text-ion disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  aria-label="Move down"
                  disabled={index === current.length - 1 || busy}
                  onClick={() => handleMove(field.id, "down")}
                  className="border border-transparent p-1 text-space-muted transition-colors hover:border-ion-line hover:text-ion disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-space-ivory">
                  {field.label}
                  {field.required && <span className="ml-2 text-manara-red">*</span>}
                </p>
                <p className="mt-0.5 truncate font-mono text-[0.58rem] uppercase tracking-[0.18em] text-space-muted">
                  {field.name} · {FIELD_TYPE_LABELS[field.type]}
                  {!field.enabled && <span className="text-space-amber"> · off</span>}
                </p>
              </div>

              <button
                aria-label={field.enabled ? "Disable responses for this field" : "Enable responses for this field"}
                onClick={() => openEdit(field)}
                className="border border-transparent p-1.5 text-space-muted transition-colors hover:border-ion-line hover:text-ion"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                aria-label="Delete field"
                onClick={() => handleDelete(field.id)}
                disabled={busy}
                className="border border-transparent p-1.5 text-space-muted transition-colors hover:border-manara-red/50 hover:text-manara-red disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>

              <div className="flex items-center gap-2 border-l border-space-line-soft pl-4">
                {field.enabled ? (
                  <Eye className="size-3.5 text-ion" />
                ) : (
                  <EyeOff className="size-3.5 text-space-amber" />
                )}
                <Switch
                  checked={field.enabled}
                  onCheckedChange={(v) => handleToggle(field, v)}
                  aria-label={`Accepting responses for ${field.label}`}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add / edit drawer */}
      {editor && (
        <form onSubmit={handleSave} className="space-y-5 border border-ion-line/60 bg-space-deep p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-voyage text-base font-bold uppercase tracking-tight text-space-ivory">
              {editor.mode === "create" ? "Add field" : `Edit “${editor.field?.label}”`}
            </h2>
            <button type="button" onClick={closeEditor} aria-label="Close" className="p-1 text-space-muted hover:text-space-ivory">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {optionInput("Label", "label")}
            {optionInput("Field name (stored key)", "name")}
            <label className="space-y-1.5">
              <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted">
                Type
              </span>
              <select
                className="msc-input"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FieldType }))}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            {optionInput("Placeholder", "placeholder")}
          </div>

          <label className="block space-y-1.5">
            <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted">
              Help text
            </span>
            <input
              className="msc-input"
              value={form.helpText}
              onChange={(e) => setForm((f) => ({ ...f, helpText: e.target.value }))}
            />
          </label>

          {hasOptions && (
            <label className="block space-y-1.5">
              <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted">
                Options (one per line)
              </span>
              <textarea
                rows={4}
                className="msc-input resize-none"
                value={form.optionsText}
                onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
              />
            </label>
          )}

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-3 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-space-muted">
              <Switch
                checked={form.required}
                onCheckedChange={(v) => setForm((f) => ({ ...f, required: v }))}
              />
              Required
            </label>
            <button type="submit" disabled={busy} className="msc-btn-primary disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {editor.mode === "create" ? "Create field" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
