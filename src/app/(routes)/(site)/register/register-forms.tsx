"use client";

import { useState } from "react";
import { Sparkles, FlaskConical } from "lucide-react";
import DynamicRegisterForm from "./dynamic-register-form";
import type { FieldConfig, FormKey } from "@/lib/forms/config";
import { cn } from "@/lib/utils";

const tabs: { id: FormKey; label: string; icon: typeof Sparkles }[] = [
  { id: "stem-fest", label: "STEM Fest", icon: FlaskConical },
  { id: "campus-ambassador", label: "Campus Ambassador", icon: Sparkles },
];

export default function RegisterForms({
  fields,
}: {
  fields: Record<FormKey, FieldConfig[]>;
}) {
  const [tab, setTab] = useState<FormKey>("stem-fest");

  return (
    <div className="space-y-8">
      {/* Tab switcher */}
      <div
        className="flex gap-2"
        role="tablist"
        aria-label="Registration forms"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 border px-4 py-3 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] transition-colors sm:flex-none",
              tab === id
                ? "border-ion bg-ion/10 text-ion-bright"
                : "border-space-line-soft text-space-muted hover:border-ion hover:text-ion"
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        <DynamicRegisterForm formKey={tab} fields={fields[tab]} />
      </div>
    </div>
  );
}
