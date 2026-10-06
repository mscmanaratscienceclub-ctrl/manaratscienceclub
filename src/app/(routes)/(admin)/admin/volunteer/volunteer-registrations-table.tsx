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
import {
  adminDetailLabel,
  adminDetailValue,
  adminLabel,
  adminPanel,
  adminTableScroller,
  adminTh,
} from "@/components/admin/styles";
import { adminRowDisclosure } from "@/components/admin/row-disclosure";

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
            icon={HandHeart}
            label={emptyStateLabel(source, state)}
            onClearAll={filtering ? controls.clearAll : undefined}
          />
        ) : (
          <div className={adminTableScroller}>
            {/* `min-w` is what makes the container above scroll at all: a
                `w-full` table shrinks to fit instead of overflowing. */}
            <table className="w-full min-w-[56rem]">
              <thead>
                <tr className="border-b border-admin-line text-left">
                  <th className="w-8 bg-admin-accent-soft px-3 py-3" aria-label="Expand" />
                  {COLUMNS.map((label) => (
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
        <td className="px-4 py-4 font-space-body text-base font-medium text-admin-ink">
          {row.fullName}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.classSection}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">{row.roll}</td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft capitalize">
          {row.shift}
        </td>
        <td className="px-4 py-4 font-mono text-sm text-admin-ink-soft">
          {row.studentCode}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.personalPhone}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>

      {expanded && (
        <tr id={`${row.id}-detail`} className="bg-admin-accent-soft/60">
          <td />
          <td colSpan={7} className="px-4 pt-1 pb-6">
            {detailGroups.map((group) => (
              <section key={group.title} className="mt-4">
                <h3 className={cn(adminLabel, "mb-3")}>{group.title}</h3>
                <dl className="space-y-3">
                  {group.fields.map((field) => (
                    <div
                      key={field.label}
                      className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
                    >
                      <dt className={adminDetailLabel}>{field.label}</dt>
                      <dd className={cn(adminDetailValue, "whitespace-pre-wrap")}>
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
