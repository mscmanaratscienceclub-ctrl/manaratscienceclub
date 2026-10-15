/**
 * Every school in the fest and how many entries it brought — as a PDF.
 *
 * Two columns and nothing else: school, entries. Counting only entries an admin
 * has not rejected keeps the sheet honest about who is expected on the day, and
 * the document says nothing about payments, statuses or exclusions.
 *
 * Output: `reports/schools-<date>/schools.pdf`, ignored by git — school lists of
 * named participants are artefacts on a machine, not a commit.
 *
 * Run with `pnpm reports:schools`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

import { isManaratSchool, manaratSchoolLabel } from "@/lib/data/stemfest-registration";
import { ADMIN_TIME_ZONE } from "@/lib/admin/filters";
import { festDates, festName, festVenue } from "./bracket-reports/brackets";
import { dateTime } from "./bracket-reports/format";
import { readRegistrations, type RegistrationRow } from "./bracket-reports/query";
import { figureRow, meters, notes, sectionHead, stampFooters } from "./bracket-reports/pdf/blocks";
import { drawFooter, drawMasthead, drawScopeStrip } from "./bracket-reports/pdf/document";
import { planColumns, type ReportColumn } from "./bracket-reports/pdf/columns";
import { A4_LANDSCAPE } from "./bracket-reports/pdf/geometry";
import { RHYTHM } from "./bracket-reports/pdf/ladder";
import { Paper } from "./bracket-reports/pdf/paper";
import { drawTable } from "./bracket-reports/pdf/table";
import { embedTypefaces } from "./bracket-reports/pdf/typefaces";

const COLUMNS: ReportColumn[] = [
  { id: "school", label: "School" },
  { id: "entries", label: "Entries", align: "right" },
];

/** The host school collapses every spelling into one line, exactly as the panel groups it. */
function schoolKey(school: string): string {
  const trimmed = (school ?? "").trim();
  if (!trimmed) return "(school not given)";
  return isManaratSchool(trimmed) ? manaratSchoolLabel : trimmed;
}

function tallySchools(rows: RegistrationRow[]): { school: string; entries: number }[] {
  const bySchool = new Map<string, number>();
  for (const row of rows) bySchool.set(schoolKey(row.school), (bySchool.get(schoolKey(row.school)) ?? 0) + 1);
  return [...bySchool.entries()]
    .map(([school, entries]) => ({ school, entries }))
    .sort((a, b) => b.entries - a.entries || a.school.localeCompare(b.school));
}

function stamp(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
  }).format(at);
}

async function renderSchoolsPdf(tallies: { school: string; entries: number }[], generatedAt: Date): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const typefaces = await embedTypefaces(doc);
  const paper = new Paper(doc, typefaces, { size: A4_LANDSCAPE });

  const entries = tallies.reduce((sum, t) => sum + t.entries, 0);
  const [largest, ...rest] = tallies;

  drawMasthead(paper, typefaces, {
    eyebrow: "Registration report",
    title: "Schools",
    note: `${festName} · ${festDates} · ${festVenue}. Every school represented at the fest, and how many entries each brought.`,
    metaLabel: "Generated",
    meta: dateTime(generatedAt),
  });
  paper.space(RHYTHM.scopeGapBefore);
  drawScopeStrip(paper, typefaces, [
    { label: "Schools", value: String(tallies.length) },
    { label: "Entries", value: String(entries) },
    { label: "Order", value: "Most entries first, then alphabetical" },
    { label: "Counted as", value: "One line per school, however it is spelled" },
  ]);
  paper.space(RHYTHM.scopeGapAfter);
  figureRow(paper, typefaces, [
    { label: "Schools", value: String(tallies.length) },
    { label: "Entries", value: String(entries) },
    { label: "Largest school", value: largest ? String(largest.entries) : "0" },
    { label: "Other schools", value: String(rest.reduce((sum, t) => sum + t.entries, 0)) },
  ]);

  sectionHead(paper, typefaces, {
    label: "Every school",
    title: "Schools and entries",
    note: "A child entered in several events is one registration, so each row is registrations from that school.",
  });
  const rows = tallies.map((t) => ({ school: t.school, entries: String(t.entries) }));
  drawTable(paper, typefaces, { columns: planColumns(typefaces, COLUMNS, rows, paper.box.width), rows });
  paper.space(RHYTHM.tableGap);

  const top = tallies.slice(0, 10);
  if (top.length > 1) {
    sectionHead(paper, typefaces, {
      label: "Weight",
      title: "The ten largest schools",
      note: "Bars are measured against the biggest school, not against the fest.",
    });
    meters(paper, typefaces, top.map((t) => ({ label: t.school, fraction: t.entries / top[0].entries, right: String(t.entries) })));
  }

  sectionHead(paper, typefaces, { label: "Reading it", title: "How the list is built" });
  notes(paper, [
    "Schools are typed by the participant, so the same school can arrive in several spellings; every spelling of the host school is one line here, grouped the way the admin panel groups it.",
    "Entries are registrations, not distinct children — a re-submission from the same family adds a line until an admin removes it.",
    largest
      ? `${largest.school} brings ${largest.entries} of the ${entries} entries; ${rest.filter((t) => t.entries === 1).length} schools bring one entry each.`
      : "No entries.",
  ]);

  drawFooter(paper, `${festName} · schools · ${tallies.length} schools · generated ${dateTime(generatedAt)}`);
  stampFooters(paper, typefaces, `${festName} · schools`);

  doc.setTitle(`Schools — ${festName}`);
  doc.setAuthor(festName);
  doc.setSubject(`${entries} entries across ${tallies.length} schools`);
  doc.setProducer("Manarat Science Club registration reports");
  doc.setCreationDate(generatedAt);

  return paper.finish();
}

function markdown(tallies: { school: string; entries: number }[], generatedAt: Date): string {
  const entries = tallies.reduce((sum, t) => sum + t.entries, 0);
  return [
    `# Schools — ${festName}`,
    "",
    `${entries} entries across ${tallies.length} schools. Generated ${dateTime(generatedAt)}.`,
    "",
    "| School | Entries |",
    "| --- | ---: |",
    ...tallies.map((t) => `| ${t.school} | ${t.entries} |`),
    "",
  ].join("\n");
}

const generatedAt = new Date();
const tallies = tallySchools((await readRegistrations()).filter((row) => row.status !== "rejected"));

const folder = path.join("reports", `schools-${stamp(generatedAt)}`);
mkdirSync(folder, { recursive: true });
writeFileSync(path.join(folder, "schools.pdf"), await renderSchoolsPdf(tallies, generatedAt));
writeFileSync(path.join(folder, "schools.md"), markdown(tallies, generatedAt));

const entries = tallies.reduce((sum, t) => sum + t.entries, 0);
console.log(`${path.join(folder, "schools.pdf")}`);
console.log(`${tallies.length} schools, ${entries} entries`);
for (const t of tallies.slice(0, 12)) console.log(`  ${String(t.entries).padStart(3)}  ${t.school}`);
console.log(`  … ${Math.max(tallies.length - 12, 0)} more schools in the PDF`);
