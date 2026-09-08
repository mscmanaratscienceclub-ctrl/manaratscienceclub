"use client";

import { useState } from "react";
import { ChevronDown, GraduationCap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminSearch } from "@/lib/hooks/use-admin-search";
import Pagination from "@/components/admin/pagination";
import type { AmbassadorType } from "@/app/(routes)/(site)/register/validate";

export interface RegistrationRow {
  id: string;
  type: AmbassadorType;
  name: string;
  phone: string;
  email: string;
  class: string;
  school: string;
  gender: string | null;
  facebook: string | null;
  instagram: string | null;
  experience: string;
  firstTimeCa: boolean;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

interface RegistrationsTableProps {
  registrations: RegistrationRow[];
  query: string;
  total: number;
  page: number;
  totalPages: number;
}

export default function RegistrationsTable({
  registrations,
  query,
  total,
  page,
  totalPages,
}: RegistrationsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { input, setInput, isPending, goToPage } = useAdminSearch({
    query,
    basePath: "/admin/campus-ambassador",
  });

  return (
    <div className="rounded-2xl bg-surface shadow-subtle">
      <div className="border-b border-ink/5 px-6 py-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by name, school, or class…"
            className="w-full rounded-xl border border-ink/10 bg-cream/40 py-2 pl-9 pr-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-manara-teal"
          />
        </div>
      </div>

      <div className={cn("transition-opacity", isPending && "pointer-events-none opacity-50")}>
        {registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <GraduationCap className="mb-3 h-10 w-10 text-ink/20" />
            <p className="font-body text-ink/50">
              {query.trim()
                ? "No registrations match your search."
                : "No registrations yet."}
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
                {registrations.map((row) => {
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

      {total > 0 && <Pagination page={page} totalPages={totalPages} onPage={goToPage} />}
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
            <dl className="mb-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Phone", value: row.phone },
                { label: "Email", value: row.email },
                { label: "Gender", value: row.gender },
                { label: "Facebook", value: row.facebook },
                { label: "Instagram", value: row.instagram },
              ]
                .filter((item) => item.value)
                .map((item) => (
                  <div key={item.label}>
                    <dt className="font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 font-body text-sm break-words text-ink/80 capitalize">
                      {item.value}
                    </dd>
                  </div>
                ))}
            </dl>
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
