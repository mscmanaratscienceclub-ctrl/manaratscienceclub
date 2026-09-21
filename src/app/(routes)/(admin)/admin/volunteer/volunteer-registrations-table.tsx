"use client";

import { useState } from "react";
import { ChevronDown, HandHeart } from "lucide-react";
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

const COLUMNS = [
  "Name",
  "Class section",
  "Roll",
  "Shift",
  "Student code",
  "Phone",
  "Submitted",
];

interface VolunteerRegistrationsTableProps {
  source: AdminSourceConfig;
  state: AdminQueryState;
  registrations: VolunteerRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function VolunteerRegistrationsTable({
  source,
  state,
  registrations,
  total,
  page,
  totalPages,
}: VolunteerRegistrationsTableProps) {
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
            icon={HandHeart}
            label={emptyStateLabel(source, state)}
            onClearAll={filtering ? controls.clearAll : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/5 text-left">
                  <th className="w-8 px-3 py-3" aria-label="Expand" />
                  {COLUMNS.map((label) => (
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
                    <VolunteerRowView
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

function VolunteerRowView({
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
        <td className="px-4 py-4 font-body font-medium text-ink">
          {row.fullName}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.classSection}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">{row.roll}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60 capitalize">
          {row.shift}
        </td>
        <td className="px-4 py-4 font-mono text-sm text-ink/60">
          {row.studentCode}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.personalPhone}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={7} className="px-4 pt-1 pb-6">
            {detailGroups.map((group) => (
              <section key={group.title} className="mt-4">
                <h3 className="mb-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                  {group.title}
                </h3>
                <dl className="space-y-3">
                  {group.fields.map((field) => (
                    <div
                      key={field.label}
                      className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
                    >
                      <dt className="font-body text-sm text-ink/50">
                        {field.label}
                      </dt>
                      <dd className="max-w-3xl font-body text-sm leading-relaxed break-words whitespace-pre-wrap text-ink/80">
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
