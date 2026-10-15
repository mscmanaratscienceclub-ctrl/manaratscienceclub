/**
 * The two overview documents: one per segment, and one for the whole fest.
 *
 * A bracket PDF answers "who is in this room". These answer the questions above
 * it — which brackets are the big ones, where the unverified money is sitting,
 * and whether the twenty-four files add up to the fest the admin panel shows.
 */

import { PDFDocument } from "pdf-lib";

import type { BracketReport } from "./analysis";
import type { FestTotals } from "./summary";
import { festDates, festName, festVenue, type SegmentGroup } from "./brackets";
import { dateTime, money, percent } from "./format";
import { figureRow, notes, sectionHead, stampFooters } from "./pdf/blocks";
import { drawFooter, drawMasthead, drawScopeStrip } from "./pdf/document";
import { A4_LANDSCAPE } from "./pdf/geometry";
import { RHYTHM } from "./pdf/ladder";
import { Paper } from "./pdf/paper";
import { planColumns, type ReportColumn } from "./pdf/columns";
import { drawTable } from "./pdf/table";
import { embedTypefaces, type Typefaces } from "./pdf/typefaces";

const BRACKETS: ReportColumn[] = [
  { id: "bracket", label: "Bracket" },
  { id: "classes", label: "Classes" },
  { id: "entries", label: "Entries", align: "right" },
  { id: "verified", label: "Verified", align: "right" },
  { id: "pending", label: "Outstanding", align: "right" },
  { id: "rejected", label: "Rejected", align: "right" },
  { id: "value", label: "Entry value", align: "right" },
  { id: "schools", label: "Schools", align: "right" },
];

function bracketRows(reports: BracketReport[]): Record<string, string>[] {
  return reports.map((report) => ({
    bracket: `${report.bracket.eventName} — ${report.bracket.categoryLabel}`,
    classes: report.bracket.classBand,
    entries: String(report.counts.entries),
    verified: `${report.counts.verified} (${percent(report.counts.verified, report.counts.entries)})`,
    pending: String(report.counts.pending),
    rejected: String(report.counts.rejected),
    value: money(report.money.attributed),
    schools: String(report.counts.schools),
  }));
}

/** Masthead, scope strip and figures in the order every overview document uses. */
function open(
  paper: Paper,
  typefaces: Typefaces,
  input: {
    eyebrow: string;
    title: string;
    note: string;
    generatedAt: Date;
    scope: { label: string; value: string }[];
    figures: { label: string; value: string }[];
  },
): void {
  drawMasthead(paper, typefaces, {
    eyebrow: input.eyebrow,
    title: input.title,
    note: input.note,
    metaLabel: "Generated",
    meta: dateTime(input.generatedAt),
  });
  paper.space(RHYTHM.scopeGapBefore);
  drawScopeStrip(paper, typefaces, input.scope);
  paper.space(RHYTHM.scopeGapAfter);
  figureRow(paper, typefaces, input.figures);
}

export async function renderSegmentPdf(
  group: SegmentGroup,
  reports: BracketReport[],
  generatedAt: Date,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const typefaces = await embedTypefaces(doc);
  const paper = new Paper(doc, typefaces, { size: A4_LANDSCAPE });

  const entries = reports.reduce((sum, r) => sum + r.counts.entries, 0);
  const verified = reports.reduce((sum, r) => sum + r.counts.verified, 0);
  const pending = reports.reduce((sum, r) => sum + r.counts.pending, 0);
  const rejected = reports.reduce((sum, r) => sum + r.counts.rejected, 0);
  const value = reports.reduce((sum, r) => sum + r.money.attributed, 0);

  open(paper, typefaces, {
    eyebrow: `${festName} · segment`,
    title: group.name,
    note: group.row.blurb,
    generatedAt,
    scope: [
      { label: "Brackets", value: `${reports.length}: ${group.row.events.map((e) => e.name).join(", ")}` },
      { label: "Events", value: group.row.events.map((e) => `${e.name} (${e.eligibility})`).join(", ") },
      { label: "Prize pool", value: money(group.row.prizePool) },
      { label: "Entries", value: String(entries) },
    ],
    figures: [
      { label: "Brackets", value: String(reports.length) },
      { label: "Entries", value: String(entries) },
      { label: "Verified", value: `${verified} · ${percent(verified, entries)}` },
      { label: "Outstanding", value: `${pending} · ${money(reports.reduce((s, r) => s + r.money.pending, 0))}` },
      { label: "Rejected", value: String(rejected) },
      { label: "Entry value", value: money(value) },
    ],
  });

  sectionHead(paper, typefaces, {
    label: "Brackets",
    title: "Every bracket in the segment",
    note: "Each line is its own report and its own PDF in this folder.",
  });
  const rows = bracketRows(reports);
  const plan = planColumns(typefaces, BRACKETS, rows, paper.box.width);
  drawTable(paper, typefaces, { columns: plan, rows });
  paper.space(RHYTHM.tableGap);

  sectionHead(paper, typefaces, { label: "Reading it", title: `${group.name} in one screen` });
  notes(
    paper,
    reports
      .sort((a, b) => b.counts.entries - a.counts.entries)
      .slice(0, 4)
      .map(
        (report) =>
          `${report.bracket.eventName} ${report.bracket.categoryLabel} is the largest at ${report.counts.entries} entries from ${report.counts.schools} schools, with ${report.counts.pending} still unverified.`,
      )
      .concat([
        pending === 0
          ? "Nothing outstanding in this segment."
          : `${pending} entries across the segment are unverified. Each bracket's report lists the TrxIDs to chase.`,
      ]),
  );

  drawFooter(paper, `${festName} · ${group.name} · generated ${dateTime(generatedAt)}`);
  stampFooters(paper, typefaces, `${festName} · ${group.name}`);

  doc.setTitle(`${group.name} — ${festName}`);
  doc.setAuthor(festName);
  doc.setSubject(`${entries} entries across ${reports.length} brackets`);
  doc.setProducer("Manarat Science Club bracket reports");
  doc.setCreationDate(generatedAt);

  return paper.finish();
}

export async function renderFestPdf(
  totals: FestTotals,
  groups: SegmentGroup[],
  reports: BracketReport[],
  generatedAt: Date,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const typefaces = await embedTypefaces(doc);
  const paper = new Paper(doc, typefaces, { size: A4_LANDSCAPE });

  open(paper, typefaces, {
    eyebrow: "Registration report",
    title: festName,
    note: `${festDates} · ${festVenue}. One detailed report and one printable roster for every bracket the fest runs.`,
    generatedAt,
    scope: [
      { label: "Registrations", value: String(totals.registrations) },
      { label: "Brackets", value: `${totals.brackets} across ${groups.length} segments` },
      { label: "Entries", value: `${totals.entries} — a participant entered in several events counts in each` },
      { label: "Payment", value: `${totals.verified} verified · ${totals.pending} outstanding · ${totals.rejected} rejected` },
    ],
    figures: [
      { label: "Registrations", value: String(totals.registrations) },
      { label: "Entries", value: String(totals.entries) },
      { label: "Verified", value: `${totals.verified} · ${percent(totals.verified, totals.entries)}` },
      { label: "Outstanding", value: `${totals.pending} · ${money(totals.pendingValue)}` },
      { label: "Schools", value: String(totals.schools) },
      { label: "Entry value", value: money(totals.attributed) },
    ],
  });

  sectionHead(paper, typefaces, {
    label: "Every bracket",
    title: "Sorted by entries",
    note: "The roster for a line is `<segment>/<event>-category-<letter>.pdf` in this folder.",
  });
  const ordered = [...reports].sort(
    (a, b) => b.counts.entries - a.counts.entries || a.bracket.eventName.localeCompare(b.bracket.eventName),
  );
  const plan = planColumns(typefaces, BRACKETS, bracketRows(ordered), paper.box.width);
  drawTable(paper, typefaces, { columns: plan, rows: bracketRows(ordered) });
  paper.space(RHYTHM.tableGap);

  sectionHead(paper, typefaces, { label: "Segments", title: "Four segments, one fest" });
  notes(
    paper,
    groups.map((group) => {
      const own = reports.filter((report) => report.bracket.segmentId === group.id);
      return `${group.name} — ${own.length} brackets, ${own.reduce((s, r) => s + r.counts.entries, 0)} entries, ${money(own.reduce((s, r) => s + r.money.attributed, 0))} of entry value, prize pool ${money(group.row.prizePool)}.`;
    }),
  );

  sectionHead(paper, typefaces, { label: "Caveats", title: "What these numbers are" });
  notes(paper, [
    "Categories are not a database column: they are read back out of the stored `segments` prose the registration form writes from the catalogue.",
    "Payment status is the admin panel's own — a stored admin decision wins, otherwise a matched forwarded bKash SMS verifies the row.",
    "Entry value is this bracket's share of a participant's payment, attributed with the catalogue's prices; the Olympiad tier charges ৳400 for the first Olympiad and ৳350 for each further one.",
    totals.sharedTrx > 0
      ? `${totals.sharedTrx} TrxID(s) appear on more than one registration; every bracket they touch lists them.`
      : "No TrxID is shared between registrations.",
    totals.outsideBand > 0
      ? `${totals.outsideBand} entries sit in a bracket whose class band no longer admits the participant's class — flagged in their bracket's report.`
      : "Every participant's class falls inside their bracket's band.",
    "Team-mates are collected by the form but only the team's size and name reach the stored row, so a team bracket's roster is one line per team.",
  ]);

  drawFooter(paper, `${festName} · ${totals.brackets} brackets · generated ${dateTime(generatedAt)}`);
  stampFooters(paper, typefaces, `${festName} · all brackets`);

  doc.setTitle(`${festName} — all brackets`);
  doc.setAuthor(festName);
  doc.setSubject(`${totals.entries} entries across ${totals.brackets} brackets`);
  doc.setProducer("Manarat Science Club bracket reports");
  doc.setCreationDate(generatedAt);

  return paper.finish();
}
