import type { RecentStemfestRegistration } from "@/lib/actions/registrations";
import { stemfestNoReferenceLabel } from "@/lib/data/stemfest-registration";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * The dashboard's "Recent registrations" preview.
 *
 * STEM Fest entries, not ambassador responses: the panel reports the fest's own
 * figures now. Extracted from `admin/page.tsx` so the admin preview surface can
 * render it too — it is one of the five data tables that need to scroll
 * horizontally on a phone, and a table that exists only inline inside a page
 * cannot be checked without an admin session to load that page.
 */
export default function RecentRegistrationsTable({
  rows,
}: {
  rows: RecentStemfestRegistration[];
}) {
  return (
    // The negative margins let the table bleed to the panel's edges, so the
    // scrollbar belongs to the panel rather than floating inside its padding.
    <div className="-mx-6 -mb-5 overflow-x-auto">
      {/* `min-w` is what makes this container scroll at all: a `w-full` table
          shrinks to fit instead of overflowing. */}
      <table className="w-full min-w-[44rem]">
        <thead>
          <tr className="border-b border-ink/5 text-left">
            {["Name", "Class", "School", "Reference", "Submitted"].map(
              (label) => (
                <th
                  key={label}
                  className="px-6 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-cream/50">
              <td className="px-6 py-4 font-body font-medium text-ink">
                {row.name}
              </td>
              <td className="px-6 py-4 font-body text-sm text-ink/60">
                {row.class}
              </td>
              <td className="max-w-xs truncate px-6 py-4 font-body text-sm text-ink/60">
                {row.school}
              </td>
              <td className="px-6 py-4 font-body text-sm text-ink/60">
                {row.reference ?? (
                  <span className="text-ink/35">{stemfestNoReferenceLabel}</span>
                )}
              </td>
              <td className="px-6 py-4 font-body text-sm text-ink/60 tabular-nums">
                {dateFormatter.format(row.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
