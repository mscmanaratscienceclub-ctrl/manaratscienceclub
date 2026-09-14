"use client";

import { useState } from "react";
import { ChevronDown, GraduationCap } from "lucide-react";
import {
  activeFilterCount,
  emptyStateLabel,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import { useAdminFilters } from "@/lib/hooks/use-admin-filters";
import { cn } from "@/lib/utils";
import AdminEmptyState from "@/components/admin/admin-empty-state";
import FilterBar from "@/components/admin/filter-bar";
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
  source: AdminSourceConfig;
  /** Validated filter state — the table renders what the URL says, nothing else. */
  state: AdminQueryState;
  registrations: RegistrationRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function RegistrationsTable({
  source,
  state,
  registrations,
  total,
  page,
  totalPages,
}: RegistrationsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const controls = useAdminFilters({
    sourceId: source.id,
    basePath: source.path,
    state,
  });
  const filtering = activeFilterCount(source, state) > 0;

  return (
    <div className="rounded-2xl bg-surface shadow-subtle">
      <FilterBar source={source} state={state} controls={controls} />

      <div
        className={cn(
          "transition-opacity",
          controls.isPending && "pointer-events-none opacity-50",
        )}
      >
        {registrations.length === 0 ? (
          <AdminEmptyState
            icon={GraduationCap}
            label={emptyStateLabel(source, state)}
            onClearAll={filtering ? controls.clearAll : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/5 text-left">
                  <th className="w-8 px-3 py-3" aria-label="Expand" />
                  {[
                    "Type",
                    "Name",
                    "Class",
                    "School",
                    "First time",
                    "Submitted",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase"
                    >
                      {label}
                    </th>
                  ))}
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

      {total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={controls.goToPage}
        />
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
  const details = [
    { label: "Phone", value: row.phone },
    { label: "Email", value: row.email },
    { label: "Gender", value: row.gender },
    { label: "Facebook", value: row.facebook },
    { label: "Instagram", value: row.instagram },
  ].filter((item) => item.value);

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
            aria-hidden="true"
          />
        </td>
        <td className="px-4 py-4 font-body text-sm font-medium text-manara-teal capitalize">
          {row.type}
        </td>
        <td className="px-4 py-4 font-body font-medium text-ink">{row.name}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.class}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.school}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.firstTimeCa ? "Yes" : "No"}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={6} className="px-4 pt-1 pb-5">
            <dl className="mb-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {details.map((item) => (
                <div key={item.label}>
                  <dt className="font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 font-body text-sm break-words text-ink/80 capitalize">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mb-1.5 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
              Experience
            </p>
            <p className="max-w-3xl font-body text-sm leading-relaxed whitespace-pre-wrap text-ink/80">
              {row.experience}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

