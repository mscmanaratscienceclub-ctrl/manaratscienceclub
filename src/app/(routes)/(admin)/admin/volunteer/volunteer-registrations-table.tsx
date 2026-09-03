"use client";

import { useMemo, useState } from "react";
import { ChevronDown, HandHeart, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VolunteerRow {
  id: string;
  fullName: string;
  classSection: string;
  roll: string;
  shift: string;
  studentCode: string;
  address: string;
  personalPhone: string;
  parentsPhone: string;
  attendanceWeek: string;
  parentsComfort: string;
  campusHesitation: string;
  scenarioTaskConflict: string;
  scenarioPeerConduct: string;
  selectionReason: string;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Long answers split out of the grid so the table row stays scannable. */
const detailGroups: {
  title: string;
  fields: { label: string; key: keyof VolunteerRow }[];
}[] = [
  {
    title: "Contact",
    fields: [
      { label: "Address", key: "address" },
      { label: "Personal phone", key: "personalPhone" },
      { label: "Parents phone", key: "parentsPhone" },
    ],
  },
  {
    title: "Availability & consent",
    fields: [
      {
        label: "Full presence in the follow-up week",
        key: "attendanceWeek",
      },
      { label: "Parents comfortable with long hours", key: "parentsComfort" },
      { label: "Hesitation staying on campus", key: "campusHesitation" },
    ],
  },
  {
    title: "On the ground",
    fields: [
      { label: "Task vs. another volunteer's request", key: "scenarioTaskConflict" },
      { label: "Peer not doing their job", key: "scenarioPeerConduct" },
      { label: "Why we should select them", key: "selectionReason" },
    ],
  },
];

export default function VolunteerRegistrationsTable({
  registrations,
}: {
  registrations: VolunteerRow[];
}) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter((r) =>
      [r.fullName, r.classSection, r.roll, r.shift, r.studentCode]
        .join(" ")
        .toLowerCase()
        .includes(q)
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
            placeholder="Search by name, roll, class, shift, or code…"
            className="w-full rounded-xl border border-ink/10 bg-cream/40 py-2 pl-9 pr-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-manara-teal"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <HandHeart className="mb-3 h-10 w-10 text-ink/20" />
          <p className="font-body text-ink/50">
            {registrations.length === 0
              ? "No volunteer applications yet."
              : "No applications match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/5 text-left">
                <th className="w-8 px-3 py-3" aria-label="Expand" />
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Name</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Class section</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Roll</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Shift</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Student code</th>
                <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Phone</th>
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
  row: VolunteerRow;
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
        <td className="px-4 py-4 font-body font-medium text-ink">{row.fullName}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.classSection}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.roll}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.shift}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.studentCode}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.personalPhone}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{dateFormatter.format(new Date(row.createdAt))}</td>
      </tr>
      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={7} className="px-4 pb-6 pt-1">
            {detailGroups.map((group) => (
              <section key={group.title} className="mt-5">
                <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
                  {group.title}
                </h3>
                <dl className="space-y-3">
                  {group.fields.map((field) => (
                    <div key={field.key} className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6">
                      <dt className="font-body text-sm text-ink/50">{field.label}</dt>
                      <dd className="max-w-3xl whitespace-pre-wrap font-body text-sm leading-relaxed text-ink/80">
                        {row[field.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
