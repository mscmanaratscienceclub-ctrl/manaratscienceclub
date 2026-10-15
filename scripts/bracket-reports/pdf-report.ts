/**
 * The printed bracket report: one PDF per event and category, summary first and
 * roster after.
 *
 * The document says what the markdown says, in the order a room needs it — what
 * the bracket is worth, then who is in it. Composition follows the panel's report
 * contract (`document.ts`): masthead, scope strip, body, footer. The roster's
 * heading band repeats on every sheet and each sheet carries a running footer
 * naming its bracket, because a printed bracket leaves this folder and goes to one
 * room on its own.
 *
 * Every figure comes from the analysis module; nothing here recalculates a thing.
 */

import { PDFDocument } from "pdf-lib";

import { getStemfestClassLabel } from "@/lib/data/stemfest-registration";
import { olympiadFormat } from "@/lib/data/stemfest-details";
import type { BracketReport } from "./analysis";
import { festName } from "./brackets";
import { dateTime, dayOnly, money, percent } from "./format";
import { figureRow, meters, notes, sectionHead, stampFooters, statusColor } from "./pdf/blocks";
import { drawFooter, drawMasthead, drawScopeStrip } from "./pdf/document";
import { A4_LANDSCAPE, pt } from "./pdf/geometry";
import { RHYTHM, TYPE } from "./pdf/ladder";
import { MUTED } from "./pdf/palette";
import { Paper } from "./pdf/paper";
import { planColumns, type ReportColumn } from "./pdf/columns";
import { drawTable } from "./pdf/table";
import { embedTypefaces, type Typefaces } from "./pdf/typefaces";

/** Summary tables keep the brief's measure, not the sheet's full width. */
const SUMMARY_WIDTH = pt(150);

/**
 * The printed roster's columns, narrower than the markdown's on purpose.
 *
 * Eleven columns on a landscape sheet leaves each about 25mm, a school name then
 * wraps to three lines, and a 139-entry bracket prints as seventeen sheets. What
 * the room needs is who, from where, and whether the payment is in; gender,
 * reference and the verification's source stay in the markdown and the panel.
 */
const ROSTER: ReportColumn[] = [
  { id: "n", label: "#" },
  { id: "code", label: "Reg ID" },
  { id: "name", label: "Participant" },
  { id: "class", label: "Class" },
  { id: "school", label: "School / college" },
  { id: "amount", label: "Entry", align: "right" },
  { id: "status", label: "Payment" },
];

/** Added back only for the brackets that have teams to call. */
const ROSTER_TEAM: ReportColumn = { id: "team", label: "Team" };

/** The paper's status word, without the evidence behind it. */
function rosterStatus(status: string): string {
  return status === "verified"
    ? "Verified"
    : status === "rejected"
      ? "Rejected"
      : "Pending";
}

const OUTSTANDING: ReportColumn[] = [
  { id: "code", label: "Reg ID" },
  { id: "name", label: "Participant" },
  { id: "class", label: "Class" },
  { id: "school", label: "School / college" },
  { id: "amount", label: "Entry", align: "right" },
  { id: "transaction", label: "TrxID" },
  { id: "phone", label: "bKash number" },
  { id: "submitted", label: "Sent" },
];

const BREAKDOWN: ReportColumn[] = [
  { id: "label", label: "Class" },
  { id: "count", label: "Entries", align: "right" },
  { id: "share", label: "Share", align: "right" },
];

const SCHOOL_BREAKDOWN: ReportColumn[] = [
  { id: "label", label: "School / college" },
  { id: "count", label: "Entries", align: "right" },
  { id: "share", label: "Share", align: "right" },
];

function rosterRows(report: BracketReport): Record<string, string>[] {
  return report.participants.map((participant, index) => ({
    n: String(index + 1),
    code: participant.code,
    name: participant.name,
    gender: participant.gender,
    class: participant.classLabel,
    school: participant.school,
    amount: money(participant.amount),
    status: rosterStatus(participant.status),
    team: participant.teamName
      ? `${participant.teamName}${participant.teamSize ? ` · of ${participant.teamSize}` : ""}`
      : participant.teamSize
        ? `Team of ${participant.teamSize}`
        : "—",
    reference: participant.reference || "—",
    submitted: dayOnly(participant.submittedAt),
  }));
}

/** Top schools, with the tail folded into one line so the page stays a page. */
function schoolRows(report: BracketReport, limit = 12): Record<string, string>[] {
  const head = report.bySchool.slice(0, limit).map((row) => ({
    label: row.label,
    count: String(row.count),
    share: percent(row.count, report.counts.entries),
  }));
  const rest = report.bySchool.slice(limit);
  const restTotal = rest.reduce((sum, row) => sum + row.count, 0);

  if (rest.length > 0) {
    head.push({
      label: `${rest.length} more schools, ${rest[rest.length - 1].count} or fewer each`,
      count: String(restTotal),
      share: percent(restTotal, report.counts.entries),
    });
  }
  return head;
}

function breakdown(
  paper: Paper,
  typefaces: Typefaces,
  columns: ReportColumn[],
  label: string,
  title: string,
  rows: Record<string, string>[],
): void {
  sectionHead(paper, typefaces, { label, title });
  const plan = planColumns(typefaces, columns, rows, SUMMARY_WIDTH);
  drawTable(paper, typefaces, { columns: plan, rows, width: SUMMARY_WIDTH });
  paper.space(RHYTHM.tableGap);
}

export async function renderBracketPdf(
  report: BracketReport,
  generatedAt: Date,
): Promise<Uint8Array> {
  const { bracket, counts, money: totals, participants } = report;
  const title = `${bracket.eventName} — ${bracket.categoryLabel}`;
  const pending = participants.filter((p) => p.status === "pending");
  const rejected = participants.filter((p) => p.status === "rejected");

  const doc = await PDFDocument.create();
  const typefaces = await embedTypefaces(doc);
  const paper = new Paper(doc, typefaces, { size: A4_LANDSCAPE });

  drawMasthead(paper, typefaces, {
    eyebrow: `${festName} · ${bracket.segmentName}`,
    title,
    note: `${bracket.classBand} · ${bracket.eventRow.entryMode}. ${
      bracket.eventRow.detail ?? `Format and kit rules are in the ${bracket.segmentName.toLowerCase()} rulebook.`
    }`,
    metaLabel: "Generated",
    meta: dateTime(generatedAt),
  });

  paper.space(RHYTHM.scopeGapBefore);
  drawScopeStrip(paper, typefaces, [
    { label: "Bracket", value: `${title} (${bracket.classBand})` },
    { label: "Segment", value: bracket.segmentName },
    { label: "Entries", value: String(counts.entries) },
    { label: "Payment", value: `${counts.verified} verified · ${counts.pending} outstanding · ${counts.rejected} rejected` },
    { label: "Entry value", value: money(totals.attributed) },
    { label: "On the day", value: bracket.scheduled ?? "Not on the published run sheet" },
  ]);
  paper.space(RHYTHM.scopeGapAfter);

  figureRow(paper, typefaces, [
    { label: "Entries", value: String(counts.entries) },
    { label: "Verified", value: `${counts.verified} · ${percent(counts.verified, counts.entries)}` },
    { label: "Outstanding", value: `${counts.pending} · ${money(totals.pending)}` },
    { label: "Rejected", value: String(counts.rejected) },
    { label: "Schools", value: String(counts.schools) },
    { label: "Entry value", value: money(totals.attributed) },
  ]);

  meters(paper, typefaces, [
    {
      label: "Verified",
      fraction: counts.entries === 0 ? 0 : counts.verified / counts.entries,
      right: `${counts.verified} · ${money(totals.verified)}`,
      color: statusColor("verified"),
    },
    {
      label: "Outstanding",
      fraction: counts.entries === 0 ? 0 : counts.pending / counts.entries,
      right: `${counts.pending} · ${money(totals.pending)}`,
      color: statusColor("pending"),
    },
    {
      label: "Rejected",
      fraction: counts.entries === 0 ? 0 : counts.rejected / counts.entries,
      right: `${counts.rejected} · ${money(totals.rejected)}`,
      color: statusColor("rejected"),
    },
  ]);

  breakdown(
    paper,
    typefaces,
    BREAKDOWN,
    "Composition",
    `Classes sitting ${bracket.categoryLabel}`,
    report.byClass.map((row) => ({
      label: getStemfestClassLabel(row.label),
      count: String(row.count),
      share: percent(row.count, counts.entries),
    })),
  );

  breakdown(
    paper,
    typefaces,
    SCHOOL_BREAKDOWN,
    "Composition",
    "Where they come from",
    schoolRows(report),
  );

  sectionHead(paper, typefaces, {
    label: bracket.segmentId === "olympiads" ? "The paper" : "The event",
    title: bracket.segmentId === "olympiads" ? "How every individual Olympiad runs" : bracket.eventRow.entryMode,
    note: bracket.segmentNote,
  });
  notes(paper, [
    ...(bracket.segmentId === "olympiads" ? olympiadFormat : bracket.eventRow.points),
    `On the run sheet: ${bracket.scheduled ?? "not listed — check the segment rulebook"}.`,
    `${bracket.segmentName} prize pool ${money(bracket.prizePool)}.`,
  ]);

  if (pending.length + rejected.length > 0) {
    sectionHead(paper, typefaces, {
      label: "Before the day",
      title: `${pending.length} outstanding, ${rejected.length} turned down`,
      note: "Status is the admin panel's own: a stored decision wins, otherwise a matched forwarded bKash SMS verifies the row.",
    });
    const rows = [...pending, ...rejected].map((p) => ({
      code: p.code,
      name: p.name,
      class: p.classLabel,
      school: p.school,
      amount: money(p.amount),
      transaction: p.transactionId,
      phone: p.phone,
      submitted: dateTime(p.submittedAt),
    }));
    const plan = planColumns(typefaces, OUTSTANDING, rows, paper.box.width);
    drawTable(paper, typefaces, { columns: plan, rows });
    paper.space(RHYTHM.tableGap);
  }

  if (report.unmatchable.length > 0) {
    sectionHead(paper, typefaces, {
      label: "Cannot be matched",
      title: `${report.unmatchable.length} outstanding ${report.unmatchable.length === 1 ? "entry carries" : "entries carry"} a TrxID the payment forwarder will never close`,
      note: "Every forwarded, matched bKash message the system holds carries a ten-character alphanumeric TrxID. These need a phone call, not another day in the queue.",
    });
    notes(
      paper,
      report.unmatchable.map(
        (p) => `${p.code} ${p.name} — reported as ${p.transactionId}: ${p.trxDiagnosis ?? ""}.`,
      ),
    );
  }

  if (report.duplicateTrx.length > 0) {
    notes(
      paper,
      report.duplicateTrx.map(
        (d) =>
          `One TrxID on ${d.codes.length} registrations — ${d.transactionId}: ${d.codes.join(", ")}. Only one can be the payment it refers to.`,
      ),
    );
  }

  paper.newPage();
  sectionHead(paper, typefaces, {
    label: "Roster",
    title: `${title} · ${bracket.classBand}`,
    note: "Ordered by registration ID — the number the gate checks a participant against.",
  });

  const rows = rosterRows(report);
  if (rows.length === 0) {
    paper.text("No entries in this bracket.", { size: TYPE.body.size, color: MUTED }, { align: "center" });
  } else {
    const columns = bracket.teamBased ? [...ROSTER, ROSTER_TEAM] : ROSTER;
    const plan = planColumns(typefaces, columns, rows, paper.box.width);
    drawTable(paper, typefaces, { columns: plan, rows });
  }

  drawFooter(
    paper,
    `${festName} · ${bracket.segmentName} · ${counts.entries} entries · generated ${dateTime(generatedAt)} · figures attributed from the registration price list`,
  );
  stampFooters(paper, typefaces, `${festName} · ${title}`);

  doc.setTitle(`${title} — ${festName}`);
  doc.setAuthor(festName);
  doc.setSubject(`${bracket.segmentName} · ${bracket.classBand} · ${counts.entries} entries`);
  doc.setProducer("Manarat Science Club bracket reports");
  doc.setCreationDate(generatedAt);

  return paper.finish();
}
