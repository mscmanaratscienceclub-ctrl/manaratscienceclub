/**
 * The fest-level view: every bracket on one page, and the index that says what
 * the folder holds.
 *
 * The numbers here are sums of the per-bracket reports, which is what makes them
 * worth printing: bracket counts add up to more entries than there are
 * registrations, because a participant who entered three Olympiads is counted in
 * three brackets. Both figures are stated so nobody reads the sum as a headcount.
 */

import type { BracketReport, UnplacedEntry } from "./analysis";
import type { SegmentGroup } from "./brackets";
import { festDates, festName, festVenue } from "./brackets";
import { dateTime, money, percent } from "./format";

export interface FestTotals {
  registrations: number;
  entries: number;
  verified: number;
  pending: number;
  rejected: number;
  attributed: number;
  pendingValue: number;
  brackets: number;
  emptyBrackets: number;
  schools: number;
  sharedTrx: number;
  feeDrift: number;
  outsideBand: number;
  /** Outstanding entries whose TrxID can never be matched by the forwarder. */
  unmatchable: number;
  /**
   * Entries the row's prose describes that match no bracket in the catalogue —
   * a category letter the event no longer offers. Counted here so the folder's
   * arithmetic is checkable: bracket entries plus unplaced equals every entry.
   */
  unplaced: number;
}

export function festTotals(
  reports: BracketReport[],
  registrations: number,
  schools: number,
  sharedTrx: number,
  unplaced: number,
): FestTotals {
  const sum = (pick: (report: BracketReport) => number): number =>
    reports.reduce((total, report) => total + pick(report), 0);

  return {
    registrations,
    entries: sum((report) => report.counts.entries),
    verified: sum((report) => report.counts.verified),
    pending: sum((report) => report.counts.pending),
    rejected: sum((report) => report.counts.rejected),
    attributed: sum((report) => report.money.attributed),
    pendingValue: sum((report) => report.money.pending),
    brackets: reports.length,
    emptyBrackets: reports.filter((report) => report.counts.entries === 0).length,
    schools,
    sharedTrx,
    feeDrift: sum((report) => report.feeDrift.length),
    unmatchable: sum((report) => report.unmatchable.length),
    outsideBand: sum((report) => report.participants.filter((p) => p.outsideBand).length),
    unplaced,
  };
}

function row(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

/** Every bracket, largest first, with what each one still needs. */
export function leaderboardMarkdown(totals: FestTotals, reports: BracketReport[]): string {
  const ordered = [...reports].sort(
    (a, b) => b.counts.entries - a.counts.entries || a.bracket.eventName.localeCompare(b.bracket.eventName),
  );

  return [
    row(["Bracket", "Segment", "Classes", "Entries", "Verified", "Pending", "Entry value"]),
    row(["---", "---", "---", "---", "---", "---", "---"]),
    ...ordered.map((report) =>
      row([
        `${report.bracket.eventName} — ${report.bracket.categoryLabel}`,
        report.bracket.segmentName,
        report.bracket.classBand,
        String(report.counts.entries),
        `${report.counts.verified} (${percent(report.counts.verified, report.counts.entries)})`,
        String(report.counts.pending),
        money(report.money.attributed),
      ]),
    ),
    "",
    `**Totals.** ${totals.entries} entries across ${totals.brackets} brackets, from ${totals.registrations} registrations — a participant entered in several events is counted in each of those brackets, so the entry figure is a headcount per paper, not per child. ${totals.verified} verified, ${totals.pending} pending (${money(totals.pendingValue)} outstanding), ${totals.rejected} rejected. ${totals.schools} schools, ${money(totals.attributed)} of entry value.`,
  ].join("\n");
}

/** What the brackets did not account for, in the two ways that can happen. */
export interface Reconciliation {
  /** Entries naming a category no bracket offers. */
  unplaced: UnplacedEntry[];
  /** Registrations whose prose names no catalogue event at all. */
  rowsWithoutEntries: number;
}

/** The folder's own README: what was built, what each file is, what to act on. */
export function indexMarkdown(
  totals: FestTotals,
  groups: SegmentGroup[],
  reports: BracketReport[],
  reconciliation: Reconciliation,
  generatedAt: Date,
): string {
  const { unplaced, rowsWithoutEntries } = reconciliation;
  const bySegment = groups.map((group) => {
    const own = reports.filter((report) => report.bracket.segmentId === group.id);
    return [
      `### ${group.name}`,
      "",
      own.length === 1
        ? `One bracket: ${own[0].bracket.categoryLabel} — ${own[0].bracket.classBand}.`
        : `${own.length} brackets: ${own
            .map((report) => `${report.bracket.eventName} ${report.bracket.categoryLabel} (${report.bracket.classBand})`)
            .join("; ")}.`,
      "",
      own
        .map(
          (report) =>
            `- \`${report.bracket.slug}.pdf\` / \`.md\` — ${report.counts.entries} entries, ${report.counts.pending} pending.`,
        )
        .join("\n"),
    ].join("\n");
  });

  const needsAttention = reports
    .filter((report) => report.counts.pending > 0 || report.duplicateTrx.length > 0)
    .sort((a, b) => b.counts.pending - a.counts.pending)
    .slice(0, 8);

  return [
    `# ${festName} — bracket reports`,
    "",
    `One detailed report and one printable roster for every bracket the fest runs: each event's category, for every segment. Generated ${dateTime(generatedAt)} from the live registrations table. Fest dates ${festDates}, venue ${festVenue}.`,
    "",
    "## What is in this folder",
    "",
    "- `README.md` — this page.",
    "- `fest-overview.pdf` — every bracket, the payment position, and the biggest rooms.",
    "- `<segment>/index.md` and `<segment>/index.pdf` — one segment's brackets side by side.",
    "- `<segment>/<bracket>.md` — the detailed report: counts, money, class mix, schools, referrers, what needs attention, and the full roster.",
    "- `<segment>/<bracket>.pdf` — the same document set as print: a summary page, then the roster with a repeating header and page numbers.",
    "",
    "## The brackets",
    "",
    bySegment.join("\n\n"),
    "",
    "## All brackets at a glance",
    "",
    leaderboardMarkdown(totals, reports),
    "",
    "## Where to start",
    "",
    needsAttention.length === 0
      ? "Nothing is outstanding: every bracket is fully verified."
      : [
          `${totals.pending} entries are still unverified, worth ${money(totals.pendingValue)}. The brackets with the most to chase:`,
          "",
          ...needsAttention.map(
            (report) =>
              `- **${report.bracket.eventName} ${report.bracket.categoryLabel}** — ${report.counts.pending} pending (${money(report.money.pending)}). Each report lists the TrxIDs and bKash numbers to chase.`,
          ),
        ].join("\n"),
    "",
    totals.unmatchable > 0
      ? `**${totals.unmatchable} outstanding ${totals.unmatchable === 1 ? "entry cannot" : "entries cannot"} be matched as reported** — the TrxID is a wallet number, a typed reference, or a character short of a bKash ID. Every forwarded, matched message the system holds carries a ten-character alphanumeric TrxID, so these stay pending until the participant gives the real one. Each bracket's report names them and says why.`
      : "Every outstanding entry carries a TrxID the payment forwarder could match.",
    "",
    "## Caveats",
    "",
    `- Categories are not a database column. They are read back out of the stored \`segments\` prose — \`Mathematics · Category A\` — the text the registration form writes from the catalogue.`,
    totals.unplaced > 0
      ? `- ${totals.unplaced} ${totals.unplaced === 1 ? "entry names" : "entries name"} an event and category the catalogue no longer offers, so no bracket claims them; they are listed at the foot of this page. Bracket entries (${totals.entries}) plus ${totals.unplaced} unplaced equals every entry the rows list.`
      : `- Every entry the rows list landed in a bracket: ${totals.entries} bracket entries, nothing unplaced.`,
    rowsWithoutEntries > 0
      ? `- ${rowsWithoutEntries} registration(s) name no catalogue event at all in their \`segments\` text, so they are in no bracket. They appear in the panel's table but not in these files.`
      : "- Every registration names at least one catalogue event.",
    totals.emptyBrackets > 0
      ? `- ${totals.emptyBrackets} bracket(s) have no entries at all; their reports say so rather than being left out, because an empty bracket is also an answer.`
      : "- Every bracket has at least one entry.",
    totals.sharedTrx > 0
      ? `- ${totals.sharedTrx} TrxID(s) appear on more than one registration. Each bracket they touch lists them.`
      : "- No TrxID is shared between registrations.",
    totals.feeDrift > 0
      ? `- ${totals.feeDrift} bracket-entry rows were charged a total that today's price list does not add up to — the entry amounts shown are scaled to the money that actually moved.`
      : "- Every registration's entry amounts add up to the total it was charged.",
    totals.outsideBand > 0
      ? `- ${totals.outsideBand} entries sit in a bracket whose class band no longer admits the participant's class — a boundary that moved after they registered. They are flagged inside their bracket's report.`
      : "- Every participant's class falls inside their bracket's band.",
    "- Team-mates are not in the database. The form collects each teammate's name, email and school, but only the team's size and name reach the stored row, so a team bracket's roster is one line per team, led by whoever registered it.",
    "",
    ...(unplaced.length > 0
      ? [
          [
            `## Entries no bracket claims (${unplaced.length})`,
            "",
            "Stored prose names an event and category the catalogue no longer offers — a bracket boundary that moved after the payment. No bracket report counts them, so they are listed here instead.",
            "",
            [
              "| ID | Participant | Class | Event | Category | As stored |",
              "| --- | --- | --- | --- | --- | --- |",
              ...unplaced.map(
                (entry) =>
                  `| ${entry.code} | ${entry.name} | ${entry.classLabel} | ${entry.eventId} | ${entry.categoryId ?? "—"} | ${entry.segments} |`,
              ),
            ].join("\n"),
          ].join("\n"),
        ]
      : []),

    "## Regenerate",
    "",
    "```",
    "pnpm reports:brackets          # writes reports/brackets-<date>/",
    "```",
    "",
  ].join("\n");
}
