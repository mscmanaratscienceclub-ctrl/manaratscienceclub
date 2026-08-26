"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FlaskConical, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StemFestRow {
  id: string;
  name: string;
  class: string;
  school: string;
  segments: string;
  transactionId: string;
  paymentNumber: string;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function StemFestRegistrationsTable({
  registrations,
}: {
  registrations: StemFestRow[];
}) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.school.toLowerCase().includes(q) ||
        r.class.toLowerCase().includes(q) ||
        r.transactionId.toLowerCase().includes(q)
    );
  }, [query, registrations]);

  return (
    <div className="border border-space-line-soft bg-space-deep/70">
      <div className="border-b border-space-line-soft px-7 py-5">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-space-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, school, class, or TrxID…"
            className="w-full border border-space-line-soft bg-space-deep py-2.5 pl-10 pr-3 font-mono text-xs text-space-ivory outline-none transition-colors placeholder:text-space-muted/60 focus:border-ion"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <FlaskConical className="mb-4 size-10 text-space-line" />
          <p className="font-space-body text-sm text-space-muted">
            {registrations.length === 0
              ? "No STEM Fest registrations yet."
              : "No registrations match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-space-line-soft text-left">
                <th className="w-8 px-3 py-3.5" aria-label="Expand" />
                <th className="px-6 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Name</th>
                <th className="px-6 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Class</th>
                <th className="px-6 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">School</th>
                <th className="px-6 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Transaction ID</th>
                <th className="px-6 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-line-soft">
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
  row: StemFestRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer transition-colors duration-200",
          expanded ? "bg-ion-deep/45" : "hover:bg-ion-deep/30"
        )}
      >
        <td className="px-3 py-4">
          <ChevronDown className={cn("size-4 text-space-muted transition-transform", expanded && "rotate-180")} />
        </td>
        <td className="px-6 py-4 font-space-body text-sm font-medium text-space-ivory">{row.name}</td>
        <td className="px-6 py-4 font-space-body text-sm text-space-muted">{row.class}</td>
        <td className="px-6 py-4 font-space-body text-sm text-space-muted">{row.school}</td>
        <td className="px-6 py-4 font-mono text-xs text-space-muted">{row.transactionId}</td>
        <td className="px-6 py-4 font-mono text-xs text-space-muted">{dateFormatter.format(new Date(row.createdAt))}</td>
      </tr>
      {expanded && (
        <tr className="bg-ion-deep/45">
          <td />
          <td colSpan={5} className="px-6 pb-6 pt-1">
            <p className="mb-1.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.26em] text-ion">
              Segments
            </p>
            <p className="mb-4 max-w-3xl font-space-body text-sm leading-relaxed text-space-ivory/80">
              {row.segments}
            </p>
            <p className="mb-1.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.26em] text-ion">
              Payment Number / ID
            </p>
            <p className="max-w-3xl font-mono text-sm leading-relaxed text-space-ivory/80">
              {row.paymentNumber}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
