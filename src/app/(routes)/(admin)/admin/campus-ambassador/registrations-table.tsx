"use client";

import { useMemo, useState } from "react";
import { ChevronDown, GraduationCap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AmbassadorType } from "@/app/(routes)/(site)/register/validate";

export interface RegistrationRow {
  id: string;
  type: AmbassadorType;
  name: string;
  class: string;
  school: string;
  experience: string;
  firstTimeCa: boolean;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function RegistrationsTable({ registrations }: { registrations: RegistrationRow[] }) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.type.includes(q) ||
        r.school.toLowerCase().includes(q) ||
        r.class.toLowerCase().includes(q)
    );
  }, [query, registrations]);

  return (
    <div className="rounded-2xl bg-surface shadow-subtle">
      <div className="border-b border-ink/5 px-6 py-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, school, or class…"
            className="w-full rounded-xl border border-ink/10 bg-cream/40 py-2 pl-9 pr-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-manara-teal"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <GraduationCap className="mb-3 h-10 w-10 text-ink/20" />
          <p className="font-body text-ink/50">
            {registrations.length === 0
              ? "No registrations yet."
              : "No registrations match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/5 text-left">
                <th className="w-8 px-3 py-3" aria-label="Expand" />
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Type</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Name</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Class</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">School</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">First time</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {filtered.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <FragmentRow
                    key={row.id}
                    row={row}
                    expanded={expanded}
                    onToggle={() => setExpandedId(expanded ? null : row.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  row,
  expanded,
  onToggle,
}: {
  row: RegistrationRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn("cursor-pointer transition-colors", expanded ? "bg-cream/60" : "hover:bg-cream/40")}
      >
        <td className="px-3 py-4">
          <ChevronDown className={cn("h-4 w-4 text-ink/40 transition-transform", expanded && "rotate-180")} />
        </td>
        <td className="px-4 py-4 font-body text-sm font-medium text-manara-teal capitalize">{row.type}</td>
        <td className="px-4 py-4 font-body font-medium text-ink">{row.name}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.class}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.school}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.firstTimeCa ? "Yes" : "No"}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{dateFormatter.format(new Date(row.createdAt))}</td>
      </tr>
      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={6} className="px-4 pb-5 pt-1">
            <p className="mb-1.5 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
              Experience
            </p>
            <p className="max-w-3xl whitespace-pre-wrap font-body text-sm leading-relaxed text-ink/80">
              {row.experience}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
