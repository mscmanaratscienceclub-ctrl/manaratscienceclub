"use client";

import { useState } from "react";
import { ChevronDown, Search, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminSearch } from "@/lib/hooks/use-admin-search";
import Pagination from "@/components/admin/pagination";
import { formatBdt } from "@/lib/data/stemfest-registration";

export interface StemfestEntryRow {
  label: string;
  teammates: string[];
}

export interface StemfestRow {
  id: string;
  name: string;
  classLabel: string;
  phone: string;
  bkashNumber: string;
  bkashTrxId: string;
  entries: StemfestEntryRow[];
  totalFee: number;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function ScienceCompetitionTable({
  registrations,
  query,
  total,
  page,
  totalPages,
}: {
  registrations: StemfestRow[];
  query: string;
  total: number;
  page: number;
  totalPages: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { input, setInput, isPending, goToPage } = useAdminSearch({
    query,
    basePath: "/admin/science-competition",
  });

  return (
    <div className="rounded-2xl bg-surface shadow-subtle">
      <div className="border-b border-ink/5 px-6 py-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by name, class, event, bKash number or TrxID…"
            className="w-full rounded-xl border border-ink/10 bg-cream/40 py-2 pr-3 pl-9 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-manara-teal"
          />
        </div>
      </div>

      <div
        className={cn(
          "transition-opacity",
          isPending && "pointer-events-none opacity-50",
        )}
      >
        {registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Trophy className="mb-3 h-10 w-10 text-ink/20" />
            <p className="font-body text-ink/50">
              {query.trim()
                ? "No registrations match your search."
                : "No STEM Fest registrations yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/5 text-left">
                  <th className="w-8 px-3 py-3" aria-label="Expand" />
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Class
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Events
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    bKash TrxID
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {registrations.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <RegistrationRow
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

      {total > 0 && (
        <Pagination page={page} totalPages={totalPages} onPage={goToPage} />
      )}
    </div>
  );
}

function RegistrationRow({
  row,
  expanded,
  onToggle,
}: {
  row: StemfestRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer transition-colors",
          expanded ? "bg-cream/60" : "hover:bg-cream/40",
        )}
      >
        <td className="px-3 py-4">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink/40 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </td>
        <td className="px-4 py-4 font-body font-medium text-ink">{row.name}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.classLabel}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.entries.length}
        </td>
        <td className="px-4 py-4 font-body text-sm font-semibold text-ink tabular-nums">
          {formatBdt(row.totalFee)}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.bkashTrxId}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={6} className="px-4 pt-1 pb-6">
            <section className="mt-5">
              <h3 className="mb-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                Entered
              </h3>
              <ul className="space-y-2">
                {row.entries.map((entry) => (
                  <li key={entry.label} className="font-body text-sm text-ink/80">
                    {entry.label}
                    {entry.teammates.length > 0 && (
                      <span className="ml-2 text-ink/50">
                        — with {entry.teammates.join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h3 className="mb-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                Payment & contact
              </h3>
              <dl className="space-y-3">
                {[
                  { label: "Amount recorded", value: formatBdt(row.totalFee) },
                  { label: "bKash number", value: row.bkashNumber },
                  { label: "Transaction ID", value: row.bkashTrxId },
                  { label: "Phone", value: row.phone },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className="font-body text-sm text-ink/50">
                      {field.label}
                    </dt>
                    <dd className="max-w-3xl font-body text-sm leading-relaxed break-words text-ink/80">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </td>
        </tr>
      )}
    </>
  );
}
