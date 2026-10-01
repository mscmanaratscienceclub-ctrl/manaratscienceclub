"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileDown, X } from "lucide-react";

import {
  ADMIN_TIME_ZONE,
  REPORT_ROW_LIMIT,
  activeFilterCount,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import {
  buildExcelHref,
  buildPrintHref,
  columnSelectionParam,
  exportFileName,
  type AdminExportFormat,
} from "@/lib/admin/exports";
import { cn } from "@/lib/utils";
import ExportFieldList from "./export-field-list";
import ExportFilterFields from "./export-filter-fields";
import ExportFormatChoice from "./export-format-choice";

/** Pulls the sentence a route handler refuses with, without trusting its shape. */
async function refusalFrom(response: Response): Promise<string | null> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: unknown }).error;
    if (typeof message === "string") return message;
  }
  return null;
}

/**
 * The export dialog: everything about an export in one place — which format,
 * which fields, which filters — opened from the filter bar it replaced.
 *
 * It is a native `<dialog>` opened with `showModal()`, which is worth more than
 * any wrapper: the browser traps focus inside it, answers Escape, dims the page
 * behind it and marks the rest inert. Nothing is animated, so there is no motion
 * to reduce. Its three sections live in sibling components; what is left here is
 * the state they share and the two ways the export can leave.
 *
 * The three choices are independent of the table behind the dialog: the filters
 * start as a copy of what the admin is looking at — so the default action is
 * "export this list" — and go wherever they are taken from there. Nothing is
 * applied to the URL, so narrowing an export never disturbs the list.
 *
 * Nothing is stored, either. The PDF is the report page handed to the browser's
 * own print dialog, written on the admin's machine; the spreadsheet arrives as
 * one response and is dropped straight into a download. The server keeps no copy
 * of either.
 */
export default function ExportDialog({
  source,
  state,
}: {
  source: AdminSourceConfig;
  /**
   * The filter state to open on. Comes from `useAdminFilters().exportState`,
   * which includes a search term still being typed and a filter still being
   * fetched — an export should never miss the last thing the admin set.
   */
  state: AdminQueryState;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** The first format option — where focus is put when the dialog opens. */
  const firstFormatRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<AdminExportFormat>("pdf");
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(source.reportColumns.map((column) => column.id)),
  );
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...state.values,
  }));
  const [query, setQuery] = useState(state.query);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `showModal`/`close` are imperative; `onClose` is what keeps the React state
  // in step when Escape is pressed rather than the Close button. `showModal`
  // would otherwise put focus on the Close button, where the next Enter press
  // dismisses the dialog — so focus is moved to the first real choice instead.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      firstFormatRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /**
   * Opens on the current view, every time.
   *
   * The draft is rebuilt rather than kept: an admin who exports a filtered list,
   * exports another one and reopens the dialog must not find the previous
   * dialog's filters still in it.
   */
  const startExport = () => {
    setFormat("pdf");
    setSelected(new Set(source.reportColumns.map((column) => column.id)));
    setValues({ ...state.values });
    setQuery(state.query);
    setError(null);
    setOpen(true);
  };

  const draft: AdminQueryState = {
    query: query.trim(),
    values,
    sort: state.sort,
    page: 1,
  };
  const activeCount = activeFilterCount(source, draft);
  const allSelected = selected.size === source.reportColumns.length;

  const runExport = async () => {
    setError(null);
    const columns = columnSelectionParam(source, selected);

    if (format === "pdf") {
      // A new tab, so the filtered list stays exactly where it was. `print=1`
      // makes the report open its print dialog — "Save as PDF" is then one
      // click, and the file is written by the browser, on the admin's machine.
      const tab = window.open(
        buildPrintHref(source.id, draft, columns),
        "_blank",
        "noopener",
      );
      // A browser that blocks the tab answers null rather than throwing. Saying
      // so beats a click that appears to have done nothing at all.
      if (!tab) {
        setError(
          "Your browser blocked the report tab. Allow pop-ups for this site and try again.",
        );
        return;
      }
      setOpen(false);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(buildExcelHref(source.id, draft, columns), {
        cache: "no-store",
      });
      if (!response.ok) {
        setError(
          (await refusalFrom(response)) ??
            "The spreadsheet could not be built. Try again.",
        );
        return;
      }
      // Held in this tab's memory just long enough to hand to the browser; the
      // server stored no copy and neither does anything here.
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(source, "xlsx", new Date(), ADMIN_TIME_ZONE);
      link.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      setError("The export could not be reached. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={startExport}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 font-body text-sm font-medium text-ink/70 transition-colors hover:border-manara-teal hover:text-manara-teal"
      >
        <FileDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        Export
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        // The backdrop is the dialog's own `::backdrop`, so a click that lands on
        // it reports the dialog itself as the target — the same "click the scrim
        // to dismiss" the nav drawer offers. Anything inside reports a child, and
        // leaves the chosen format and fields alone.
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        aria-labelledby={titleId}
        className={cn(
          // `max-w-none` is not decoration: a dialog ships with a user-agent
          // `max-width` that a plain `width` cannot override, and it silently
          // capped this one 31px narrower than the width asked for on a phone.
          // The width is `100%` rather than `100vw` because a fixed dialog's
          // containing block excludes the scrollbar — `100vw` counts it and eats
          // the gutter on exactly the screens with the least room for one.
          "m-auto w-[min(44rem,calc(100%-1.5rem))] max-w-none max-h-[calc(100dvh-1.5rem)] overflow-hidden",
          "rounded-2xl border border-ink/10 bg-surface p-0 text-ink shadow-xl",
          // Display is only flex while open: a plain `flex` here would beat the
          // sheet's `dialog:not([open]) { display: none }` and the dialog would
          // stand open on the page from the first render.
          "open:flex open:flex-col open:backdrop:bg-ink/45",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/5 px-5 py-4">
          <div>
            <p className="font-body text-xs font-semibold tracking-[0.18em] text-manara-teal uppercase">
              Export
            </p>
            <h2 id={titleId} className="mt-1 font-display text-xl font-bold text-ink">
              {source.reportTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close export options"
            className="rounded-xl p-2.5 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <ExportFormatChoice
            value={format}
            onChange={setFormat}
            firstOptionRef={firstFormatRef}
          />

          <div>
            <h3 className="mb-2 font-body text-xs font-semibold tracking-wider text-ink/45 uppercase">
              Fields
            </h3>
            <ExportFieldList
              columns={source.reportColumns}
              selected={selected}
              onToggle={(id, checked) =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) next.add(id);
                  else next.delete(id);
                  return next;
                })
              }
              onSelectAll={(checked) =>
                setSelected(
                  checked
                    ? new Set(source.reportColumns.map((column) => column.id))
                    : new Set(),
                )
              }
            />
          </div>

          <ExportFilterFields
            source={source}
            query={query}
            values={values}
            activeCount={activeCount}
            onQueryChange={setQuery}
            onValueChange={(id, value) =>
              setValues((current) => {
                const next = { ...current };
                if (value) next[id] = value;
                else delete next[id];
                return next;
              })
            }
            onClearAll={() => {
              setValues({});
              setQuery("");
            }}
          />
        </div>

        <div className="border-t border-ink/5 px-5 py-4">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-rose-50 px-3 py-2 font-body text-sm text-rose-800"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-xs text-ink/50">
              {allSelected
                ? "Every field"
                : `${selected.size} of ${source.reportColumns.length} fields`}
              {activeCount === 0
                ? " · every row"
                : ` · ${activeCount} filter${activeCount === 1 ? "" : "s"}`}
              {` · up to ${REPORT_ROW_LIMIT} rows`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 font-body text-sm text-ink/60 transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runExport}
                disabled={busy || selected.size === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-manara-teal px-4 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-manara-teal/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {format === "pdf" ? "Save as PDF" : "Download Excel"}
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
