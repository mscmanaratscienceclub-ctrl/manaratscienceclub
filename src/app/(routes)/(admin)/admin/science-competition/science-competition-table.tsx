"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock, Search, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminSearch } from "@/lib/hooks/use-admin-search";
import Pagination from "@/components/admin/pagination";

export interface StemfestRow {
  id: string;
  name: string;
  classLabel: string;
  school: string;
  segments: string;
  transactionId: string;
  paymentNumber: string;
  isVerified?: boolean;
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
            placeholder="Search by name, class, school, segments, or TrxID…"
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
                    School
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Segments
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Payment No.
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    TrxID
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Status
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
          {row.school}
        </td>
        <td className="max-w-xs truncate px-4 py-4 font-body text-sm text-ink/60">
          {row.segments}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.paymentNumber}
        </td>
        <td className="px-4 py-4 font-body text-sm font-medium text-ink">
          {row.transactionId}
        </td>
        <td className="px-4 py-4 font-body text-sm">
          {row.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              Pending
            </span>
          )}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={8} className="px-4 pt-1 pb-6">
            <section className="mt-4">
              <h3 className="mb-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                Registration Details
              </h3>
              <dl className="space-y-3">
                {[
                  { label: "Full Name", value: row.name },
                  { label: "Class", value: row.classLabel },
                  { label: "School / College", value: row.school },
                  { label: "Segments / Events", value: row.segments },
                  { label: "Payment Number", value: row.paymentNumber },
                  { label: "Transaction ID", value: row.transactionId },
                  {
                    label: "Payment Verification",
                    value: row.isVerified
                      ? "Verified (Matched with Forwarded SMS)"
                      : "Pending (Awaiting Confirmation SMS)",
                  },
                  {
                    label: "Submitted",
                    value: new Date(row.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  },
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
