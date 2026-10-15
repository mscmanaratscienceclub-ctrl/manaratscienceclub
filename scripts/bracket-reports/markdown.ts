/**
 * The detailed written report for a bracket, a segment, and the fest as a whole.
 *
 * The markdown is the analysis; the PDF is the same document set for print. Both
 * are built from one `BracketReport`, so a figure cannot read differently in the
 * two — and both say what they are derived from, because the categories this
 * report sorts by are read out of the stored `segments` prose rather than from a
 * column.
 */

import { olympiadFormat } from "@/lib/data/stemfest-details";
import type { BracketReport, CountRow } from "./analysis";
import type { Bracket, SegmentGroup } from "./brackets";
import { festDates, festName, festVenue } from "./brackets";
import { dateTime, money, percent, statusText } from "./format";

const LEAD_SCHOOLS = 12;
const LEAD_REFERENCES = 10;

function table(headers: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [
    line(headers),
    line(headers.map(() => "---")),
    ...rows.map(line),
  ].join("\n");
}

function list(rows: CountRow[], limit: number): string[] {
  const head = rows
    .slice(0, limit)
    .map((row) => `- ${row.label} — ${row.count}`);
  const rest = rows.slice(limit);
  if (rest.length > 0) {
    head.push(
      `- ${rest.length} more, each with ${rest[rest.length - 1].count} or fewer`,
    );
  }
  return head;
}

/** The sentence that places a bracket on the run sheet. */
function whenLine(bracket: Bracket): string {
  return bracket.scheduled
    ? `**When** — ${bracket.scheduled}`
    : "**When** — not on the published run sheet; check the segment rulebook.";
}

function attention(report: BracketReport): string[] {
  const { bracket, participants, feeDrift, duplicateTrx } = report;
  const pending = participants.filter((p) => p.status === "pending");
  const rejected = participants.filter((p) => p.status === "rejected");
  const outside = participants.filter((p) => p.outsideBand);

  const body: string[] = [];

  if (pending.length > 0) {
    body.push(
      `**Payment.** ${pending.length} ${pending.length === 1 ? "entry is" : "entries are"} still unverified, worth ${money(pending.reduce((sum, p) => sum + p.amount, 0))} of this bracket. Chasing them is the one task that changes the room list.`,
      table(
        ["ID", "Name", "Class", "School", "This entry", "TrxID", "bKash number", "Email", "Submitted"],
        pending.map((p) => [
          p.code,
          p.name,
          p.classLabel,
          p.school,
          money(p.amount),
          p.transactionId,
          p.phone,
          p.email,
          dateTime(p.submittedAt),
        ]),
      ),
      "A TrxID that never matched is often a retyped `O` for a `0` — reconcile by bKash number and amount before assuming the payment is missing.",
    );
  }

  if (report.unmatchable.length > 0) {
    body.push(
      `**Cannot be matched as reported.** ${report.unmatchable.length} of the outstanding entries carry a TrxID that no forwarded bKash SMS will ever match, so they will sit at pending however correctly the money was sent. Ask for the TrxID from the bKash app or the confirmation SMS.`,
      table(
        ["ID", "Name", "Class", "As reported", "Why", "bKash number"],
        report.unmatchable.map((p) => [
          p.code,
          p.name,
          p.classLabel,
          p.transactionId,
          p.trxDiagnosis ?? "",
          p.phone,
        ]),
      ),
    );
  }

  if (rejected.length > 0) {
    body.push(
      `**Turned down.** ${rejected.length} ${rejected.length === 1 ? "entry has" : "entries have"} been rejected by an admin — listed so the room does not seat them by mistake.`,
      table(
        ["ID", "Name", "Class", "School", "This entry", "TrxID"],
        rejected.map((p) => [p.code, p.name, p.classLabel, p.school, money(p.amount), p.transactionId]),
      ),
    );
  }

  if (duplicateTrx.length > 0) {
    body.push(
      `**One TrxID, several registrations.** ${duplicateTrx
        .map((d) => `${d.transactionId} — ${d.codes.join(", ")}`)
        .join("; ")}. Only one of these can be the payment it refers to.`,
    );
  }

  if (feeDrift.length > 0) {
    body.push(
      `**Fee drift.** ${feeDrift.length} registration(s) in this bracket were charged something other than what today's price list adds up to — the participant paid for everything they entered, so the whole row is shown, and the entry amounts above are scaled to the money that moved.`,
      table(
        ["ID", "Catalogue total", "Charged"],
        feeDrift.map((d) => [d.code, money(d.attributed), d.charged === null ? "not recorded" : money(d.charged)]),
      ),
    );
  }

  if (outside.length > 0) {
    body.push(
      `**Outside this band.** ${outside.length} participant(s) sit in ${bracket.categoryLabel} but their class is not in ${bracket.classBand} any more — a bracket boundary moved after they registered. They still have to be seated somewhere.`,
      table(
        ["ID", "Name", "Class", "Status"],
        outside.map((p) => [p.code, p.name, p.classLabel, statusText(p)]),
      ),
    );
  }

  return [
    "## What needs attention",
    "",
    body.length > 0
      ? body.join("\n\n")
      : "Nothing outstanding — every entry here is verified or accounted for, no shared TrxIDs, no fee drift, no class outside the band.",
  ];
}

function roster(report: BracketReport): string {
  return table(
    ["#", "ID", "Name", "Gender", "Class", "School / college", "Entry", "Payment", "TrxID", "bKash number", "Email", "Reference", "Team", "Submitted"],
    report.participants.map((p, index) => [
      String(index + 1),
      p.code,
      p.name,
      p.gender,
      p.classLabel,
      p.school,
      money(p.amount),
      statusText(p),
      p.transactionId,
      p.phone,
      p.email,
      p.reference || "—",
      p.teamName ? `${p.teamName}${p.teamSize ? ` (of ${p.teamSize})` : ""}` : "—",
      dateTime(p.submittedAt),
    ]),
  );
}

/** One bracket's full report, as written for the club. */
export function bracketMarkdown(report: BracketReport, generatedAt: Date): string {
  const { bracket, counts, money: totals, participants } = report;
  const brief = bracket.eventRow.detail
    ? `**The event** — ${bracket.eventRow.detail}`
    : `**The event** — run off the segment rulebook; see /resources.`;

  const sections: string[] = [
    `# ${bracket.eventName} — ${bracket.categoryLabel}`,
    "",
    `${festName} · ${bracket.segmentName} segment · ${bracket.classBand}`,
    "",
    `Generated ${dateTime(generatedAt)} from ${counts.entries} entries in this bracket. Categories and class bands are the registration catalogue's own; the fest ran on ${festDates} at ${festVenue}.`,
    "",
    "## At a glance",
    "",
    table(
      ["Entries", "Verified", "Pending", "Rejected", "Distinct schools", "Teams"],
      [[
        String(counts.entries),
        `${counts.verified} (${percent(counts.verified, counts.entries)})`,
        `${counts.pending} (${percent(counts.pending, counts.entries)})`,
        String(counts.rejected),
        String(counts.schools),
        String(counts.teams),
      ]],
    ),
    "",
    `- ${whenLine(bracket)}`,
    `- **Entry value** — ${money(totals.attributed)} attributed to this bracket, of which ${money(totals.verified)} is verified, ${money(totals.pending)} outstanding and ${money(totals.rejected)} turned down.`,
    `- **Entry mode** — ${bracket.eventRow.entryMode}.`,
    `- **Who may sit here** — ${bracket.segmentNote}`,
    `- **Segment prize pool** — ${money(bracket.prizePool)}.`,
    "",
    `## The brief`,
    "",
    brief,
  ];

  if (bracket.segmentId === "olympiads") {
    sections.push(
      "",
      "Every individual Olympiad paper runs to the same format:",
      "",
      ...olympiadFormat.map((line) => `- ${line}`),
    );
  }

  for (const point of bracket.eventRow.points) {
    sections.push(`- ${point}`);
  }

  sections.push(
    "",
    "## Class mix",
    "",
    participants.length === 0
      ? "No entries."
      : table(
          ["Class", "Entries", "Share"],
          report.byClass.map((row) => [
            row.label,
            String(row.count),
            percent(row.count, counts.entries),
          ]),
        ),
    "",
    "## Schools",
    "",
    report.bySchool.length === 0
      ? "No entries."
      : list(report.bySchool, LEAD_SCHOOLS).join("\n"),
    "",
    "## Gender",
    "",
    table(
      ["Gender", "Entries", "Share"],
      report.byGender.map((row) => [
        row.label,
        String(row.count),
        percent(row.count, counts.entries),
      ]),
    ),
    "",
    "## Who referred them",
    "",
    report.byReference.length === 0
      ? "No entries."
      : list(report.byReference, LEAD_REFERENCES).join("\n"),
    "",
    ...attention(report),
    "",
    `## Roster — ${counts.entries} ${counts.entries === 1 ? "entry" : "entries"}`,
    "",
    "Ordered by registration ID, the number the gate checks a participant against. Sort by school or by name for a different cut — the same file in Excel gives that.",
    "",
    participants.length === 0 ? "No entries in this bracket." : roster(report),
    "",
    "## How this was derived",
    "",
    `- One row per registration; a participant entered in ${bracket.eventName} ${bracket.categoryLabel} is one line here. A participant entered in several events appears in each of those brackets, so bracket counts add up to more than the number of registrations.`,
    "- Payment status is the admin panel's own: a stored admin decision wins, otherwise a matched forwarded bKash SMS verifies the row.",
    "- `Entry` is the catalogue's price for this one event, not the amount the participant sent: an Olympiad entrant pays ৳400 for their first Olympiad and ৳350 for each further one, so the entry figures add up to their total.",
    `- Source: ${counts.entries} rows read from \`stem_fest_registrations\` on ${dateTime(generatedAt)}.`,
  );

  return `${sections.join("\n")}\n`;
}

/** A segment's own page: its brackets side by side, and the fest's share. */
export function segmentMarkdown(
  group: SegmentGroup,
  reports: BracketReport[],
  generatedAt: Date,
): string {
  const entries = reports.reduce((sum, r) => sum + r.counts.entries, 0);
  const pending = reports.reduce((sum, r) => sum + r.counts.pending, 0);
  const verified = reports.reduce((sum, r) => sum + r.counts.verified, 0);
  const attributed = reports.reduce((sum, r) => sum + r.money.attributed, 0);

  return [
    `# ${group.name} — segment overview`,
    "",
    `${festName} · ${group.row.blurb}`,
    "",
    `Generated ${dateTime(generatedAt)}. Prize pool ${money(group.row.prizePool)}.`,
    "",
    "## Brackets",
    "",
    table(
      ["Bracket", "Classes", "Entries", "Verified", "Pending", "Entry value", "Roster"],
      reports.map((report) => [
        `${report.bracket.eventName} — ${report.bracket.categoryLabel}`,
        report.bracket.classBand,
        String(report.counts.entries),
        `${report.counts.verified} (${percent(report.counts.verified, report.counts.entries)})`,
        String(report.counts.pending),
        money(report.money.attributed),
        `${report.bracket.slug}.pdf`,
      ]),
    ),
    "",
    "## Reading the segment",
    "",
    `- ${entries} entries across ${reports.length} brackets: ${verified} verified, ${pending} still outstanding.`,
    `- ${money(attributed)} of entry value sits in this segment.`,
    `- ${group.row.events.length} ${group.row.events.length === 1 ? "event" : "events"}: ${group.row.events
      .map((event) => `${event.name} (${event.eligibility})`)
      .join(", ")}.`,
    "",
  ].join("\n");
}
