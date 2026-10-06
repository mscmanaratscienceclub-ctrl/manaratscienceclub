import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Table2 } from "lucide-react";
import type { ReactNode } from "react";

import { getRegistrationBrief } from "@/lib/actions/registrations";
import { siteConfig } from "@/lib/data";
import {
  ADMIN_TIME_ZONE,
  type RawSearchParams,
} from "@/lib/admin/filters";
import { EXPORT_PRINT_PARAM } from "@/lib/admin/exports";
import {
  formatChange,
  leadingMovement,
  movementDirectionOption,
  referrerKindLabels,
  type Movement,
  type MovementRow,
  type RegistrationBrief,
} from "@/lib/admin/brief";
import { chartToneVar, formatDayLabel } from "@/lib/admin/dashboard";
import AutoPrint from "@/components/admin/auto-print";
import ReportPrintButton from "@/components/admin/report-print-button";
import { adminLabel, adminTag, adminTh } from "@/components/admin/styles";

/** Fixed timezone so the stamp matches the windows the brief measures. */
const generatedFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ADMIN_TIME_ZONE,
  timeZoneName: "short",
});

function wantsPrint(raw: string | string[] | undefined): boolean {
  return (Array.isArray(raw) ? raw[0] : raw) === "1";
}

/**
 * The panel's micro overline, plus the hook the print block sizes on paper.
 *
 * On screen these are `adminLabel` and nothing more; on A4 the label has to come
 * down to 6.5 pt while the panel's own ladder has no idea it is being printed, so
 * the brief marks its own eyebrows rather than restyling the shared string.
 */
const briefEyebrow = `${adminLabel} brief-eyebrow`;

export const metadata: Metadata = { title: "Registration Brief" };

/**
 * The printable registration brief.
 *
 * Five questions, five numbered sections, in the order the club asks them: is
 * registration rising, which segments are booming and which are down, which
 * schools are turning up, who is referring on behalf of the batch and campus
 * ambassador programmes, and what tomorrow is likely to bring.
 *
 * It is a *document*, not a dashboard copy: every figure is server-rendered from
 * one read, so the page and the PDF are the same artefact and no client script
 * has to run to make a number appear. The `@media print` block in `globals.css`
 * styles it onto A4; on screen it reads as the same brief at panel sizes.
 *
 * Like the row-level report, nothing is generated or stored: the browser's own
 * "Save as PDF" writes the file, which is also how the `৳`-free but Bengali-safe
 * typefaces come out right without a font file to carry them.
 */
export default async function RegistrationBriefPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const brief = await getRegistrationBrief();
  const generated = generatedFormatter.format(new Date());

  const windowDays = brief.windowDays;
  const days = brief.trend.days;
  const windowSlice = days.slice(-windowDays);
  const windowFrom = windowSlice[0]?.day;
  const windowTo = windowSlice.at(-1)?.day;
  const rising = leadingMovement(brief.segments, "rising");
  const falling = leadingMovement(brief.segments, "falling");
  const entryTotal = brief.segments.reduce((sum, row) => sum + row.current, 0);
  const schoolPeak = brief.schools[0]?.total ?? 1;

  return (
    <div
      data-print="report"
      className="brief-document mx-auto w-full max-w-[880px] px-4 py-6 md:px-8"
    >
      <div
        data-print="chrome"
        className="mb-6 flex flex-wrap items-center justify-between gap-4"
      >
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 font-space-body text-sm text-admin-muted transition-colors hover:text-admin-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/reports/stemfest"
            className="inline-flex items-center gap-2 rounded-[6px] border border-admin-line bg-admin-surface px-3 py-1.5 font-space-body text-xs font-medium text-admin-ink-soft transition-colors hover:border-admin-ink/35 hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
          >
            <Table2 className="size-3.5" aria-hidden="true" />
            Full registrations table
          </Link>
          <ReportPrintButton />
        </div>
      </div>

      {/* ── Masthead ─────────────────────────────────────────────────────────── */}
      {/* Same shape the row-level report uses, so the print rules for a masthead
          style both documents and a saved brief carries the club's rule and
          eyebrow exactly as a saved report does. */}
      <header className="border-b-4 border-manara-teal pb-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-space-body text-2xs font-semibold tracking-[0.16em] text-manara-teal uppercase">
              {siteConfig.name} · Admin brief
            </p>
            <h1 className="mt-2 font-space-display text-4xl leading-tight font-medium tracking-[-0.02em] text-admin-ink">
              Registration Brief
            </h1>
            <p className="mt-2 max-w-xl font-space-body text-sm leading-relaxed text-admin-muted">
              STEM Fest registration over the last {brief.spanDays} days: the
              direction of travel, which segments are moving, the schools and
              referrers behind the entries, and what tomorrow is likely to bring.
            </p>
          </div>
          <div className="shrink-0 border-l border-admin-line pl-5 text-right">
            <p className={briefEyebrow}>Generated</p>
            <p className="mt-1 font-mono text-sm text-admin-ink">{generated}</p>
          </div>
        </div>
      </header>

      {/* ── Scope block ──────────────────────────────────────────────────────── */}
      <section aria-label="Report scope" className="my-5">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className={briefEyebrow}>Window</dt>
            <dd className="font-space-body text-sm font-medium text-admin-ink">
              {windowFrom && windowTo
                ? `${formatDayLabel(windowFrom)} – ${formatDayLabel(windowTo)}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className={briefEyebrow}>Span</dt>
            <dd className="font-space-body text-sm font-medium text-admin-ink">
              {brief.spanDays} days
            </dd>
          </div>
          <div>
            <dt className={briefEyebrow}>On register</dt>
            <dd className="font-space-body text-sm font-medium text-admin-ink tabular-nums">
              {brief.totals.allTime} entries
            </dd>
          </div>
          <div>
            <dt className={briefEyebrow}>Sources</dt>
            <dd className="font-space-body text-sm font-medium text-admin-ink">
              STEM Fest + ambassador register
            </dd>
          </div>
        </dl>
      </section>

      {/* ── 1. Trend ─────────────────────────────────────────────────────────── */}
      <BriefSection
        index={1}
        title="Where registrations are going"
        question={`Has the form picked up or slowed down since the week before?`}
      >
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className={briefEyebrow}>Last {windowDays} days</p>
            <p className="brief-figure mt-1 font-space-display text-5xl leading-none font-medium text-admin-ink tabular-nums">
              {brief.trend.current}
            </p>
          </div>
          <DirectionPill movement={brief.trend} />
          <p className="brief-body max-w-md font-space-body text-sm leading-relaxed text-admin-ink-soft">
            {brief.trend.spanTotal === 0
              ? `Nothing has arrived in the ${brief.spanDays} days this brief covers, so there is no direction to report yet.`
              : `${brief.trend.current} entr${brief.trend.current === 1 ? "y" : "ies"} in the window, ${formatChange(
                  brief.trend,
                )} against the ${windowDays} days before it (${
                  brief.trend.previous
                } then). Across the span the form has averaged ${
                  brief.trend.averagePerDay
                } a day${
                  brief.trend.busiest
                    ? `, with ${brief.trend.busiest.count} on ${formatDayLabel(
                        brief.trend.busiest.day,
                      )} the busiest day.`
                    : "."
                }`}
          </p>
        </div>

        <TrendBars
          days={days}
          windowDays={windowDays}
          empty={brief.trend.spanTotal === 0}
        />
      </BriefSection>

      {/* ── 2. Segments ──────────────────────────────────────────────────────── */}
      <BriefSection
        index={2}
        title="What is booming and what is down"
        question="Each segment's entries in the window, against the same number of days before it."
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-admin-line">
              <th scope="col" className={`${adminTh} px-2`}>
                Segment
              </th>
              <th scope="col" className={`${adminTh} px-2 text-right`}>
                Last {windowDays}
              </th>
              <th scope="col" className={`${adminTh} px-2 text-right`}>
                Previous {windowDays}
              </th>
              <th scope="col" className={`${adminTh} px-2 text-right`}>
                Change
              </th>
              <th scope="col" className={`${adminTh} px-2`}>
                Reading
              </th>
            </tr>
          </thead>
          <tbody>
            {brief.segments.map((row) => (
              <tr
                key={row.id}
                className="border-b border-admin-line align-middle"
              >
                <td className="px-2 py-2 font-space-body text-sm font-medium text-admin-ink">
                  {row.label}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-admin-ink-soft tabular-nums">
                  {row.current}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-admin-muted tabular-nums">
                  {row.previous}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-admin-ink-soft tabular-nums">
                  {formatChange(row)}
                </td>
                <td className="px-2 py-2">
                  <DirectionTag movement={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="brief-body mt-4 font-space-body text-sm leading-relaxed text-admin-ink-soft">
          {rising === null && falling === null
            ? "No segment moved enough in either direction to call — the window is level with the week before it."
            : [
                rising
                  ? `Booming: ${rising.label}, ${formatChange(rising)} (${rising.current} entries in ${windowDays} days).`
                  : `Nothing is rising yet — every segment is level or down against the previous ${windowDays} days.`,
                falling
                  ? `Slowing: ${falling.label}, ${formatChange(falling)} (${falling.previous} then, ${falling.current} now).`
                  : "Nothing is falling either.",
              ].join(" ")}
        </p>

        {brief.events.length > 0 && (
          <div className="mt-5">
            <p className={briefEyebrow}>Events behind the move</p>
            <ul className="brief-events mt-2 space-y-1.5">
              {brief.events.slice(0, 5).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dashed border-admin-line pb-1.5 font-space-body text-sm"
                >
                  <span className="text-admin-ink-soft">
                    {row.label}
                    <span className="ml-2 text-xs text-admin-muted">
                      {row.sublabel}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-admin-muted tabular-nums">
                    {row.current} now · {row.previous} before ·{" "}
                    <span className="text-admin-ink-soft">
                      {formatChange(row)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {entryTotal > brief.trend.current && (
          <p className="brief-note mt-4 font-space-body text-xs leading-relaxed text-admin-muted">
            These are event entries, not people: {entryTotal} against{" "}
            {brief.trend.current} registrations in the {windowDays} days, because
            one form that entered two events is counted under both. Section 1
            counts the forms.
          </p>
        )}
      </BriefSection>

      {/* ── 3. Schools ───────────────────────────────────────────────────────── */}
      <BriefSection
        index={3}
        title="Which school registers the most"
        question={
          brief.uniqueSchools === 0
            ? "No school has registered anyone yet."
            : `Ranked across the whole register; ${brief.uniqueSchools} distinct ${
                brief.uniqueSchools === 1 ? "school" : "schools"
              } have entered, and every Manarat spelling counts as one.`
        }
      >
        {brief.schools.length === 0 ? (
          <p className="font-space-body text-sm text-admin-muted">
            Nothing to rank yet — the first entries will appear here.
          </p>
        ) : (
          <ol className="brief-rank space-y-3">
            {brief.schools.map((row, index) => (
              <li key={row.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-space-body text-sm text-admin-ink-soft">
                    <span className="mr-2 font-mono text-xs text-admin-muted tabular-nums">
                      {index + 1}
                    </span>
                    {row.school}
                  </p>
                  <p className="shrink-0 font-space-display text-sm font-medium text-admin-ink tabular-nums">
                    {row.total}
                    <span className="ml-2 font-space-body text-xs font-normal text-admin-muted">
                      {row.recent} in the window
                    </span>
                  </p>
                </div>
                <Meter value={row.total} peak={schoolPeak} tone="teal" />
              </li>
            ))}
          </ol>
        )}
      </BriefSection>

      {/* ── 4. Referrers ─────────────────────────────────────────────────────── */}
      <BriefSection
        index={4}
        title="Which batch and campus ambassadors refer the most"
        question="Names come from the STEM Fest form; the kind is read off the ambassador register."
      >
        <KindTally brief={brief} />

        {brief.referrers.length === 0 ? (
          <p className="mt-4 font-space-body text-sm text-admin-muted">
            No entry names a referrer yet, so there is nothing to rank.
          </p>
        ) : (
          <table className="mt-4 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-admin-line">
                <th scope="col" className={`${adminTh} px-2`}>
                  Referrer
                </th>
                <th scope="col" className={`${adminTh} px-2 text-right`}>
                  Referrals
                </th>
                <th scope="col" className={`${adminTh} px-2 text-right`}>
                  Last {windowDays}
                </th>
                <th scope="col" className={`${adminTh} px-2`}>
                  Through
                </th>
              </tr>
            </thead>
            <tbody>
              {brief.referrers.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-admin-line align-middle"
                >
                  <td className="px-2 py-2 font-space-body text-sm font-medium text-admin-ink">
                    {row.name}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm text-admin-ink-soft tabular-nums">
                    {row.total}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm text-admin-muted tabular-nums">
                    {row.recent}
                  </td>
                  <td className="px-2 py-2">
                    <span className="font-space-body text-xs text-admin-ink-soft">
                      {referrerKindLabels[row.kind]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="brief-note mt-4 max-w-xl font-space-body text-xs leading-relaxed text-admin-muted">
          The form records a referrer&apos;s <em>name</em>; only the ambassador
          form records whether that person signed up as a campus or a batch
          ambassador. A name the register has no row for is printed as
          &ldquo;{referrerKindLabels.unmatched}&rdquo; rather than guessed at, and
          a name on both registers is printed as
          &ldquo;{referrerKindLabels.both}&rdquo;.
        </p>
      </BriefSection>

      {/* ── 5. Tomorrow ──────────────────────────────────────────────────────── */}
      <BriefSection
        index={5}
        title={`Tomorrow: ${brief.estimate.label}`}
        question="An estimate, with the arithmetic it came from printed beside it."
      >
        <div className="brief-forecast flex flex-wrap items-end gap-x-8 gap-y-4 rounded-[10px] border border-admin-line bg-admin-sunken p-5">
          <div>
            <p className={briefEyebrow}>Expected entries</p>
            <p className="brief-figure mt-1 font-space-display text-5xl leading-none font-medium text-admin-ink tabular-nums">
              {brief.estimate.expected}
            </p>
          </div>
          <div>
            <p className={briefEyebrow}>Planning range</p>
            <p className="brief-range mt-1 font-space-display text-2xl leading-none font-medium text-admin-ink-soft tabular-nums">
              {brief.estimate.low} – {brief.estimate.high}
            </p>
          </div>
          <span
            className={`${adminTag} ml-auto ${
              brief.estimate.confidence === "moderate"
                ? "bg-admin-info-bg text-admin-info-ink"
                : "bg-admin-warn-bg text-admin-warn-ink"
            }`}
          >
            {brief.estimate.confidence === "moderate"
              ? "Moderate confidence"
              : "Low confidence"}
          </span>
        </div>

        <p className="brief-body mt-4 font-space-body text-sm leading-relaxed text-admin-ink-soft">
          <span className={briefEyebrow}>Method · </span>
          {brief.estimate.basis}
        </p>

        {brief.estimate.notes.length > 0 && (
          <ul className="brief-notes mt-3 space-y-1.5">
            {brief.estimate.notes.map((note) => (
              <li
                key={note}
                className="flex gap-2 font-space-body text-xs leading-relaxed text-admin-muted"
              >
                <span aria-hidden="true" className="text-admin-accent-ink">
                  ·
                </span>
                {note}
              </li>
            ))}
          </ul>
        )}
      </BriefSection>

      <p
        data-print="footer"
        className="mt-6 border-t border-admin-line pt-3 text-center font-space-body text-xs text-admin-muted"
      >
        {siteConfig.name} — Registration Brief · Generated {generated}
      </p>

      {wantsPrint(raw[EXPORT_PRINT_PARAM]) && <AutoPrint />}
    </div>
  );
}

// ── Pieces of the document ───────────────────────────────────────────────────

/**
 * One numbered section of the brief.
 *
 * The heading block is its own element because the print rules keep it glued to
 * the figure or table under it — a section title alone at the foot of a page is
 * how a printed report ends up with orphaned headings.
 */
function BriefSection({
  index,
  title,
  question,
  children,
}: {
  index: number;
  title: string;
  question: string;
  children: ReactNode;
}) {
  return (
    <section className="brief-section mt-8 border-t border-admin-line pt-5">
      <div className="brief-section-head flex items-baseline gap-3">
        <p className="brief-index font-mono text-xs text-admin-accent-ink tabular-nums">
          {String(index).padStart(2, "0")}
        </p>
        <h2 className="font-space-display text-2xl leading-tight font-medium tracking-[-0.01em] text-admin-ink">
          {title}
        </h2>
      </div>
      <p className="brief-question mt-1 max-w-2xl font-space-body text-sm leading-relaxed text-admin-muted">
        {question}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** The trend's headline reading, as the sentence the admin actually needs. */
function DirectionPill({ movement }: { movement: Movement }) {
  const option = movementDirectionOption(movement.direction);

  return (
    <div className="flex flex-col gap-1">
      <p className={briefEyebrow}>Direction</p>
      <span className={`${adminTag} self-start ${option.tone}`}>
        {movement.direction === "flat"
          ? "Level"
          : `${option.label} ${formatChange(movement)}`}
      </span>
    </div>
  );
}

/** The same reading at table size, without the count the row already carries. */
function DirectionTag({ movement }: { movement: MovementRow }) {
  const option = movementDirectionOption(movement.direction);

  return (
    <span className={`${adminTag} ${option.tone}`}>{option.label}</span>
  );
}

/**
 * The span as 21 bars.
 *
 * Days outside the window are drawn at rest rather than in a second colour: the
 * one question the chart answers is "is the window higher than what came before",
 * so the only encoding it needs is which bars are in the comparison. Zero days
 * keep a stub, so a quiet week reads as quiet rather than as a missing chart.
 */
function TrendBars({
  days,
  windowDays,
  empty,
}: {
  days: { day: string; count: number }[];
  windowDays: number;
  empty: boolean;
}) {
  const peak = Math.max(...days.map((day) => day.count), 1);
  const windowStart = days.length - windowDays;
  const firstDay = days[0]?.day;
  const lastDay = days[days.length - 1]?.day;

  return (
    <figure className="mt-6">
      <div
        className="brief-bars flex h-20 items-end gap-[2px] border-b border-admin-line pb-0"
        role="img"
        aria-label={`STEM Fest entries per day across ${days.length} days, oldest on the left. The last ${windowDays} days are marked.`}
      >
        {days.map((day, index) => {
          const inWindow = index >= windowStart;
          return (
            <div
              key={day.day}
              className="brief-bar min-h-[2px] flex-1 rounded-t-[1px]"
              style={{
                height: `${Math.max((day.count / peak) * 100, day.count > 0 ? 6 : 2)}%`,
                backgroundColor: chartToneVar.purple,
                opacity: empty ? 0.15 : inWindow ? 1 : 0.3,
              }}
              title={`${formatDayLabel(day.day)}: ${day.count}`}
            />
          );
        })}
      </div>
      <figcaption className="brief-caption mt-1.5 flex items-center justify-between font-mono text-2xs text-admin-muted">
        <span>{firstDay ? formatDayLabel(firstDay) : ""}</span>
        <span>{lastDay ? formatDayLabel(lastDay) : ""}</span>
      </figcaption>
    </figure>
  );
}

/** A share bar under a ranked row: the count is the answer, the bar the ranking. */
function Meter({
  value,
  peak,
  tone,
}: {
  value: number;
  peak: number;
  tone: "teal";
}) {
  return (
    <div className="brief-meter mt-1.5 h-1.5 overflow-hidden rounded-[2px] bg-admin-neutral-bg">
      <div
        className="h-full rounded-[2px]"
        style={{
          width: `${Math.max((value / Math.max(peak, 1)) * 100, value > 0 ? 3 : 0)}%`,
          backgroundColor: chartToneVar[tone],
        }}
      />
    </div>
  );
}

/**
 * The campus-versus-batch answer, stated as a total before the leaderboard.
 *
 * The question the club asks is "which programme is referring more", and a
 * leaderboard ranked by name does not answer that on its own — the two halves of
 * the register could each be represented by six names and still be uneven in
 * volume. So the rollup comes first, and the names come under it.
 */
function KindTally({ brief }: { brief: RegistrationBrief }) {
  const byKind = new Map(
    brief.referrerTallies.map((tally) => [tally.kind, tally.referrals]),
  );
  const campus = byKind.get("campus") ?? 0;
  const batch = byKind.get("batch") ?? 0;
  const both = byKind.get("both") ?? 0;
  const unmatched = byKind.get("unmatched") ?? 0;
  const attributed = campus + batch + both;

  const leader =
    campus === batch
      ? null
      : campus > batch
        ? ("Campus ambassadors" as const)
        : ("Batch ambassadors" as const);

  return (
    <div>
      <p className="brief-body font-space-body text-sm leading-relaxed text-admin-ink-soft">
        {brief.referredTotal === 0
          ? "No entry names a referrer, so neither programme has anything attributed to it yet."
          : leader === null
            ? `Both programmes are level: ${attributed} of ${brief.referredTotal} referred entries arrive through a name on either the campus or the batch register.`
            : `${leader} bring the most: ${
                campus > batch ? campus : batch
              } of ${brief.referredTotal} referred entries (${Math.round(
                ((campus > batch ? campus : batch) / brief.referredTotal) * 100,
              )} %).`}
      </p>
      <dl className="brief-tally mt-3 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
        {[
          { label: referrerKindLabels.campus, value: campus },
          { label: referrerKindLabels.batch, value: batch },
          { label: referrerKindLabels.both, value: both },
          { label: referrerKindLabels.unmatched, value: unmatched },
        ].map((item) => (
          <div key={item.label}>
            <dt className={briefEyebrow}>{item.label}</dt>
            <dd className="mt-0.5 font-space-display text-xl font-medium text-admin-ink tabular-nums">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
