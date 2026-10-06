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
import {
  adminDetailValue,
  adminLabel,
  adminPanel,
  adminTableScroller,
  adminTh,
} from "@/components/admin/styles";
import { adminRowDisclosure } from "@/components/admin/row-disclosure";
import type { CampusAmbassadorRegistration } from "@/db/schema/registrations";

/**
 * The public ambassador form was retired; the table still reads historical rows,
 * so the type now comes from the table these rows actually live in.
 */
type AmbassadorType = CampusAmbassadorRegistration["type"];

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
    basePath: source.path,
    state,
  });
  const filtering = activeFilterCount(source, state) > 0;

  return (
    <div className={adminPanel}>
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
          <div className={adminTableScroller}>
            {/* `min-w` is what makes the container above scroll at all: a
                `w-full` table shrinks to fit instead of overflowing. */}
            <table className="w-full min-w-[52rem]">
              <thead>
                <tr className="border-b border-admin-line text-left">
                  <th className="w-8 bg-admin-accent-soft px-3 py-3" aria-label="Expand" />
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
                      className={adminTh}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
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
        {...adminRowDisclosure({
          expanded,
          onToggle,
          detailId: `${row.id}-detail`,
        })}
      >
        <td className="px-3 py-4">
          <ChevronDown
            className={cn(
              "size-4 text-admin-muted transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </td>
        <td className="px-4 py-4 font-space-body text-sm font-medium text-admin-ink capitalize">
          {row.type}
        </td>
        <td className="px-4 py-4 font-space-body text-base font-medium text-admin-ink">{row.name}</td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">{row.class}</td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.school}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.firstTimeCa ? "Yes" : "No"}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>
      {expanded && (
        <tr id={`${row.id}-detail`} className="bg-admin-accent-soft/60">
          <td />
          <td colSpan={6} className="px-4 pt-1 pb-5">
            <dl className="mb-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {details.map((item) => (
                <div key={item.label}>
                  <dt className={adminLabel}>{item.label}</dt>
                  <dd className={cn(adminDetailValue, "mt-0.5 capitalize")}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className={cn(adminLabel, "mb-1.5")}>Experience</p>
            <p className="max-w-3xl font-space-body text-sm leading-relaxed whitespace-pre-wrap text-admin-ink-soft">
              {row.experience}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

