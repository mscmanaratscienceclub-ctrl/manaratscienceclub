/**
 * The generator: read the fest, write the folder.
 *
 * `pnpm reports:brackets` produces, for every bracket the fest runs, one detailed
 * markdown report and one printable PDF roster — plus a page per segment, a fest
 * overview, and the README that indexes them all.
 *
 * Output goes to `reports/brackets-<date>/`, gitignored: these files carry
 * participants' names, phone numbers and bKash references, so they are artefacts
 * on a machine rather than a commit. Re-running replaces the day's folder.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isManaratSchool, manaratSchoolLabel } from "@/lib/data/stemfest-registration";
import { ADMIN_TIME_ZONE } from "@/lib/admin/filters";
import {
  buildBracketReport,
  duplicateTransactionIds,
  holdRows,
  unmappedRows,
  unplacedEntries,
} from "./analysis";
import { brackets, segmentGroups } from "./brackets";
import { bracketMarkdown, segmentMarkdown } from "./markdown";
import { renderBracketPdf } from "./pdf-report";
import { renderFestPdf, renderSegmentPdf } from "./pdf-overview";
import { readRegistrations } from "./query";
import { festTotals, indexMarkdown } from "./summary";

/** `YYYY-MM-DD`, in the timezone the reports are read in. */
function folderStamp(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
  }).format(at);
}

/**
 * A segment's folder name.
 *
 * Derived from the segment's own catalogue name rather than hardcoding four
 * spellings, so a fifth segment lands in a folder of its own choosing.
 */
function folderOf(segmentName: string): string {
  return segmentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function write(file: string, contents: string | Uint8Array): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

/**
 * Read the fest, write the folder.
 *
 * Every entry a registration lists should land in exactly one bracket. The rows
 * that do not are named in the README rather than silently dropped from every
 * report — see `unplacedEntries` in `analysis.ts`.
 */
export async function build(): Promise<string> {
  const generatedAt = new Date();
  const root = path.join(process.cwd(), "reports", `brackets-${folderStamp(generatedAt)}`);

  const rows = await readRegistrations();
  const held = holdRows(rows);
  const duplicates = duplicateTransactionIds(held);
  const reports = brackets.map((bracket) => buildBracketReport(bracket, held, duplicates));
  const unplaced = unplacedEntries(held, new Set(brackets.map((bracket) => bracket.id)));

  const schools = new Set(
    rows.map((row) => (isManaratSchool(row.school) ? manaratSchoolLabel : row.school.trim())),
  ).size;
  const totals = festTotals(reports, rows.length, schools, duplicates.size, unplaced.length);

  for (const report of reports) {
    const base = path.join(root, folderOf(report.bracket.segmentName), report.bracket.slug);
    write(`${base}.md`, bracketMarkdown(report, generatedAt));
    write(`${base}.pdf`, await renderBracketPdf(report, generatedAt));
  }

  for (const group of segmentGroups) {
    const folder = path.join(root, folderOf(group.name));
    const own = reports.filter((report) => report.bracket.segmentId === group.id);

    write(path.join(folder, "index.md"), segmentMarkdown(group, own, generatedAt));
    write(path.join(folder, "index.pdf"), await renderSegmentPdf(group, own, generatedAt));
  }

  write(
    path.join(root, "fest-overview.pdf"),
    await renderFestPdf(totals, segmentGroups, reports, generatedAt),
  );
  write(
    path.join(root, "README.md"),
    indexMarkdown(
      totals,
      segmentGroups,
      reports,
      { unplaced, rowsWithoutEntries: unmappedRows(held).length },
      generatedAt,
    ),
  );

  return [
    `${rows.length} registrations read from ${process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL"}.`,
    `${totals.entries} entries placed in ${reports.length} brackets across ${segmentGroups.length} segments.`,
    `${totals.verified} verified · ${totals.pending} outstanding (${totals.pendingValue} BDT) · ${totals.rejected} rejected.`,
    unplaced.length === 0
      ? "Every entry landed in a bracket."
      : `${unplaced.length} ${unplaced.length === 1 ? "entry names" : "entries name"} an event and category no bracket offers — listed in README.md.`,
    `Written to ${root}`,
  ].join("\n");
}
