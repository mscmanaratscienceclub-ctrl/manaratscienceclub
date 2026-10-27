/**
 * The infographic set itself: 22 poster sheets, drawn from
 * `infographics/data/stats.json`, written to `infographics/html/`.
 *
 * Every figure on every sheet is a count, a share, a rate, a latency or a rank.
 * No sheet can print a name, a school, a referrer, an email, a phone, a bKash
 * number or a TrxID, because the JSON the sheets read never carried one — the
 * leaderboards arrive already ranked and relabelled.
 *
 * Run with `pnpm reports:infographics --sheets`, or through
 * `scripts/infographics.render.mjs`, which also rasterises them.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

import * as C from "./charts.mjs";
import { sheetCss } from "./style.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const statsPath = path.join(root, "infographics", "data", "stats.json");
const htmlDir = path.join(root, "infographics", "html");

const S = JSON.parse(readFileSync(statsPath, "utf8"));

// ── Formatting ────────────────────────────────────────────────────────────────

const n = (value) => Math.round(Number(value)).toLocaleString("en-US");
const money = (value) => `৳${n(value)}`;
const pct = (value) => `${value}%`;
const one = (value) => (value === null || value === undefined ? "—" : Math.round(Number(value) * 10) / 10);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (day) => `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
const weekLabel = (day) => `w/c ${dayLabel(day)}`;
const hours = (value) => (value >= 48 ? `${Math.round(value / 24)} d` : `${Math.round(value)} h`);

const fest = S.meta.fest;
const generated = dayLabel(S.meta.generatedAt.slice(0, 10));

// ── Layout primitives ─────────────────────────────────────────────────────────

const panel = (title, sub, body, opts = {}) =>
  `<section class="panel"${opts.style ? ` style="${opts.style}"` : ""}>
    <div><div class="ptitle">${title}</div>${sub ? `<div class="psub" style="margin-top:8px">${sub}</div>` : ""}</div>
    ${body}
  </section>`;

/**
 * A grid row of panels. When the row holds only KPI cards, the card count sets the
 * columns, so a band never has to be told twice how wide it is.
 */
const row = (cls, ...cells) => {
  const html = cells.join("");
  const cards = html.split('class="kpi').length - 1;
  if (cells.length === 1 && cards > 0) {
    return `<div class="row" style="grid-template-columns:repeat(${Math.min(cards, 4)},1fr)">${html}</div>`;
  }
  return `<div class="row ${cls}">${html}</div>`;
};

/** KPI cards, unwrapped, so the sheet's own row places them. */
const kpi = (cells) => C.kpiCards(cells);
/** A band of KPI cards, for when a panel holds them rather than a row. */
const band = (cells, columns) => C.kpiBand(cells, columns);

const readout = C.readout;

// ── The sheets ────────────────────────────────────────────────────────────────

const sheets = [
  {
    tag: "Overview",
    slug: "the-fest-in-one-screen",
    title: "The fest in one screen",
    dek: `Everything the three public forms and the admin panel have recorded for ${fest.name}, read straight off the live database.`,
    build: () =>
      [
        row(
          "c4",
          kpi([
            { value: n(S.headline.registrations), label: "Competitions entered", eyebrow: "STEM Fest form", note: `${n(S.headline.entries)} event entries, ${one(S.headline.entriesPerParticipant)} per person`, className: "accent" },
            { value: pct(S.headline.verifiedShare), label: "Payments verified", eyebrow: "bKash reconciliation", note: `${n(S.headline.verified)} of ${n(S.headline.registrations)} rows closed`, className: "accent g" },
            { value: money(S.headline.collected), label: "Collected", eyebrow: "Fee on the row", note: `${money(S.payments.money.byStatus[2].count)} walked with the ${n(S.headline.rejected)} rejections`, className: "accent y" },
            { value: n(S.headline.attendanceMarked), label: "Marked present", eyebrow: "Attendance desk", note: `${pct(S.headline.attendanceShare)} of the roster`, className: "accent p" },
          ]),
        ),
        row(
          "c21",
          panel(
            "Entries a day, from the first submission to the last",
            `${dayLabel(S.time.firstDay)} to ${dayLabel(S.time.lastDay)} — ${S.time.openDays} days of intake, ${one(S.time.perDayAverage)} entries a day.`,
            C.area(series(S.time.dailySeries), { width: C.W.wide, height: 360 }),
          ),
          panel(
            "The three forms",
            "Rows each surface has ever written.",
            C.hBars(
              [
                { label: "STEM Fest", value: S.headline.registrations, color: "c1" },
                { label: "Campus Ambassador", value: S.headline.ambassadors, color: "c3" },
                { label: "Volunteer", value: S.headline.volunteers, color: "c4" },
              ],
              { width: C.W.narrow, labelWidth: 210, valueWidth: 80, barHeight: 42, gap: 24 },
            ),
          ),
        ),
        row(
          "c3",
          panel("Reach", `${S.schools.distinct} schools, one of them the host.`, band([
            { value: n(S.schools.distinct), label: "Schools represented", note: `${n(S.schools.withVerifiedPayment)} with a verified payment` },
            { value: pct(S.schools.host.share), label: "Entered by the host school", note: `every spelling collapsed into one` },
          ], 1)),
          panel("Competition coverage", "Every bracket in the catalogue took entries.", band([
            { value: `${S.events.brackets.filled}/${S.events.brackets.total}`, label: "Brackets filled", note: `${S.events.brackets.empty} left empty` },
            { value: `${S.headline.eventsWithEntries}/${S.headline.events}`, label: "Events entered", note: `${n(S.headline.entries)} entries in total` },
          ], 1)),
          panel("Money and messages", "The reconciliation's two halves.", band([
            { value: n(S.sms.total), label: "Payment SMS logged", note: `${pct(S.headline.smsMatchRate)} matched a TrxID` },
            { value: money(S.sms.amounts.sum), label: "Moved through the wallet", note: `${money(S.headline.collected)} of it is fest fees` },
          ], 1)),
        ),
        readout([
          `Registration closed ${dayLabel(S.time.lastDay)}; the fest runs ${fest.dates} at ${fest.venue}.`,
          `${n(S.headline.rejected)} rows were rejected by an admin (${pct(S.headline.rejectedShare)}) and nothing is left pending — the queue was emptied before the doors opened.`,
        ]),
      ].join(""),
  },

  {
    tag: "Payments",
    slug: "how-the-money-closed",
    title: "How the money closed",
    dek: "Two routes take a registration to verified: a forwarded bKash SMS that matches the TrxID, or an admin who read the proof themselves.",
    build: () =>
      [
        panel(
          "Every step a row can reach, as a share of the entries filed",
          "The steps are not nested — an SMS match and an admin acceptance are two doors to the same room.",
          C.steps(
            S.funnel.map((step, index) => ({
              label: step.label,
              value: step.value,
              display: n(step.value),
              share: step.share,
              color: `var(--${["c1", "c5", "c3", "c6", "c2", "c4", "c7"][index % 7]})`,
            })),
            { rowHeight: 88 },
          ),
        ),
        row(
          "c2",
          panel(
            "Who closed the payment",
            "An SMS match closes the row itself; a manual acceptance is a person's judgement.",
            [
              C.donut(
                [
                  { label: "Matched by SMS", value: S.payments.verificationSource.find((r) => r.label === "sms")?.count ?? 0, color: "c1" },
                  { label: "Accepted by an admin", value: S.payments.verificationSource.find((r) => r.label === "manual")?.count ?? 0, color: "c3" },
                ],
                { width: C.W.half, size: 360, center: pct(S.headline.verifiedShare), caption: "verified" },
              ),
              C.legend([
                { label: "SMS-matched", value: S.payments.verificationSource.find((r) => r.label === "sms")?.count ?? 0, color: "c1" },
                { label: "Admin-accepted", value: S.payments.verificationSource.find((r) => r.label === "manual")?.count ?? 0, color: "c3" },
              ]),
            ].join(""),
          ),
          panel(
            "The decision queue",
            `${n(S.payments.adminTouched)} rows carry an admin's own decision; ${n(S.payments.smsDerived)} were never touched because the SMS closed them.`,
            [
              C.hBars(
                S.payments.statusMix.map((row) => ({
                  label: `${row.label[0].toUpperCase()}${row.label.slice(1)}`,
                  value: row.count,
                  color: row.label === "verified" ? "c6" : row.label === "rejected" ? "c7" : "c1",
                })),
                { width: C.W.half, labelWidth: 160, barHeight: 40, gap: 26, showShare: true, total: S.headline.registrations },
              ),
              readout([`Admins acted on ${S.payments.money.decisionDaysActive} separate days.`, `${n(S.payments.money.emailSent)} confirmation emails were accepted by Resend — ${pct(S.payments.money.emailSentShareOfVerified)} of the verified rows.`]),
            ].join(""),
          ),
        ),
        readout([
          `${pct(S.headline.verifiedShare)} of entries finished verified, ${pct(S.headline.rejectedShare)} rejected, ${pct(100 - S.headline.verifiedShare - S.headline.rejectedShare)} never needed a human.`,
        ]),
      ].join(""),
  },

  {
    tag: "Money",
    slug: "what-the-fees-added-up-to",
    title: "What the fees added up to",
    dek: "One payment per participant, whatever they entered. The tiered catalogue makes the bill a small set of round numbers.",
    build: () =>
      [
        row(
          "c3",
          kpi([
            { value: money(S.payments.money.collected), label: "Collected", eyebrow: "Verified rows only", className: "accent g" },
            { value: money(S.payments.money.byStatus[2].count), label: "Walked away", eyebrow: "Rejected rows", note: `${n(S.headline.rejected)} registrations`, className: "accent r" },
            { value: money(S.payments.money.feeStats.mean), label: "Average bill", eyebrow: "Per participant", note: `median ${money(S.payments.money.feeStats.median)}, top ${money(S.payments.money.feeStats.max)}`, className: "accent y" },
          ]),
        ),
        panel(
          "The bill, tier by tier",
          `${n(S.payments.money.feeTiers.length)} distinct totals were charged. Nothing is outstanding — ${n(S.payments.money.rowsWithoutFee)} rows have no fee recorded at all.`,
          C.hBars(
            S.payments.money.feeTiers.slice(0, 12).map((tier, index) => ({ label: `৳${tier.label}`, value: tier.count, color: index < 3 ? "c1" : "c5" })),
            { width: C.W.full, labelWidth: 150, valueWidth: 210, barHeight: 34, gap: 14, valueFormat: (v) => `${n(v)} entries`, showShare: true, total: S.headline.registrations },
          ),
        ),
        row(
          "c2",
          panel(
            "Where the money sits",
            "Nothing is pending: every taka is either banked or walked.",
            [
              C.split(
                [
                  { label: "Collected", value: S.payments.money.collected, color: "c6" },
                  { label: "Walked", value: S.payments.money.byStatus[2].count, color: "c5" },
                ],
                { width: C.W.half, height: 120 },
              ),
              C.legend([
                { label: "Collected", value: S.payments.money.collected, color: "c6" },
                { label: "Walked (rejected)", value: S.payments.money.byStatus[2].count, color: "c5" },
              ]),
              readout([`${pct(S.payments.money.collectedShare)} of everything asked for was paid.`]),
            ].join(""),
          ),
          panel(
            "Spread of the bills",
            "Percentiles of `total_fee` as the row holds it.",
            C.hBars(
              [
                { label: "Minimum", value: S.payments.money.feeStats.min },
                { label: "Median", value: S.payments.money.feeStats.median, color: "c1" },
                { label: "Mean", value: S.payments.money.feeStats.mean, color: "c2" },
                { label: "90th", value: S.payments.money.feeStats.p90, color: "c3" },
                { label: "99th", value: S.payments.money.feeStats.p99, color: "c4" },
                { label: "Maximum", value: S.payments.money.feeStats.max, color: "c5" },
              ],
              { width: C.W.half, labelWidth: 150, valueWidth: 150, barHeight: 34, gap: 16, valueFormat: money },
            ),
          ),
        ),
        readout([
          `${n(S.payments.money.attributionDrift)} rows were charged a total that the current price list no longer reproduces — a fee table that moved after the payment.`,
        ]),
      ].join(""),
  },

  {
    tag: "Timing",
    slug: "the-intake-curve",
    title: "The intake curve",
    dek: "Twenty-four days of opening, and the last week of it carrying more than a third of everything.",
    build: () =>
      [
        panel(
          "Entries filed each day",
          `${S.time.openDays} days from ${dayLabel(S.time.firstDay)} to ${dayLabel(S.time.lastDay)}; the peak is ${dayLabel(S.time.peakDay.day)} with ${n(S.time.peakDay.count)}.`,
          C.columns(series(S.time.dailySeries), { height: 430, labelEvery: 2, color: "var(--c1)" }),
        ),
        row(
          "c2",
          panel(
            "By week, and what each week added",
            "Weeks run Monday to Sunday in Bangladesh time.",
            [
              C.hBars(
                S.time.weeklySeries.map((week, index) => ({
                  label: weekLabel(week.week),
                  value: week.count,
                  sub: week.change === null ? "first week" : `+${week.change} on the week before`,
                  color: ["c4", "c3", "c2", "c1"][index % 4],
                })),
                { width: C.W.half, labelWidth: 170, valueWidth: 100, barHeight: 38, gap: 28, sub: (row) => row.sub },
              ),
              readout(S.time.weeklySeries.map((week) => `${weekLabel(week.week)}: ${n(week.count)} entries${week.change === null ? "" : ` (${week.change > 0 ? "+" : ""}${week.change})`}`)),
            ].join(""),
          ),
          panel(
            "Momentum",
            "The closing week against the whole window.",
            band([
              { value: n(S.time.lastSeven), label: "Last 7 days", eyebrow: "Entries", className: "accent" },
              { value: one(S.time.lastSevenPerDay), label: "A day, in the last week", note: `against ${one(S.time.perDayAverage)} across the whole window`, className: "accent y" },
              { value: `${one(S.time.velocityVsAverage)}×`, label: "Velocity vs average", note: "the run-in did slow, it only looked fast", className: "accent g" },
            ], 1),
          ),
        ),
        readout([
          `${n(S.time.dailySeries.filter((day) => day.count === 0).length)} days took no entries at all; the quietest day with traffic carried ${n(Math.min(...S.time.dailySeries.filter((d) => d.count > 0).map((d) => d.count)))}.`,
        ]),
      ].join(""),
  },

  {
    tag: "Timing",
    slug: "when-they-actually-typed",
    title: "When they actually typed",
    dek: "The clock the forms write to is Bangladesh time. Nearly seven in ten entries were filed after six in the evening.",
    build: () =>
      [
        panel(
          "A whole day of submissions, hour by hour",
          `The busiest hour is ${S.time.peakHour.hour}:00 with ${n(S.time.peakHour.count)} entries; ${
            S.time.quietHours.length === 0
              ? "every hour of the day took at least one."
              : `${S.time.quietHours.length} hours took nothing at all.`
          }`,
          C.radial(
            S.time.hourly.map((hour) => ({ label: Number(hour.hour), value: hour.count })),
            { size: 620, highlight: Number(S.time.peakHour.hour), color: "var(--c3)", format: n },
          ),
        ),
        row(
          "c2",
          panel(
            "Four parts of the day",
            "Evening is the whole story.",
            [
              C.split(S.time.partOfDay.map((part, index) => ({ label: part.label.split(" ")[0], value: part.count, color: ["c5", "c1", "c2", "c3"][index] })), { width: C.W.half, height: 118 }),
              C.legend(S.time.partOfDay.map((part, index) => ({ label: part.label, value: part.count, color: ["c5", "c1", "c2", "c3"][index] }))),
            ].join(""),
          ),
          panel(
            "The week's shape",
            "Entries filed per weekday across the whole window.",
            C.columns(
              S.time.weekdays.map((day) => ({ day: day.label, value: day.count })),
              { width: C.W.half, height: 300, labelEvery: 1, color: "var(--c1)", axisFormat: (label) => label, showTopValue: true },
            ),
          ),
        ),
        readout([
          `${pct(Math.round((S.time.partOfDay[3].count / S.headline.registrations) * 1000) / 10)} of entries arrived between 18:00 and midnight — homework time, not school time.`,
          (() => {
            const top3 = [...S.time.hourly].sort((a, b) => b.count - a.count).slice(0, 3);
            const sum = top3.reduce((total, hour) => total + hour.count, 0);
            return `Three hours — ${top3.map((hour) => `${hour.hour}:00`).join(", ")} — carry ${pct(Math.round((sum / S.headline.registrations) * 1000) / 10)} of every entry.`;
          })(),
        ]),
      ].join(""),
  },

  {
    tag: "Timing",
    slug: "the-gap-between-entries",
    title: "The gap between entries",
    dek: "How long the club waited between two submissions — the difference between a steady trickle and a burst that hits the database at once.",
    build: () =>
      [
        row(
          "c3",
          kpi([
            { value: `${one(S.time.interArrival.median)}`, label: "Median gap", eyebrow: "Minutes between two entries", note: "across 803 gaps", className: "accent" },
            { value: `${one(S.time.interArrival.mean)}`, label: "Mean gap", note: "the bursts drag it up", className: "accent y" },
            { value: `${Math.round(S.time.interArrival.max / 60)}`, label: "Longest silence", eyebrow: "Hours with nothing filed", className: "accent p" },
            { value: n(S.time.interArrival.buckets[0].count), label: "Under a minute apart", eyebrow: "Bursts", note: "same family, several siblings", className: "accent r" },
          ]),
        ),
        panel(
          "Every gap, sorted into ranges",
          "A short gap means one person filed for several children in one sitting.",
          C.hBars(
            S.time.interArrival.buckets.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: ["c2", "c1", "c5", "c3", "c4"][index] })),
            { width: C.W.full, labelWidth: 220, valueWidth: 220, barHeight: 40, gap: 20, showShare: true, total: S.time.interArrival.n },
          ),
        ),
        row(
          "c21",
          panel(
            "Distribution of the gaps",
            "Percentiles in minutes.",
            C.hBars(
              [
                { label: "Median (p50)", value: S.time.interArrival.median, color: "c1" },
                { label: "p90", value: S.time.interArrival.p90, color: "c2" },
                { label: "p99", value: S.time.interArrival.p99, color: "c3" },
                { label: "Longest", value: S.time.interArrival.max, color: "c5" },
              ],
              { width: C.W.wide, labelWidth: 200, valueWidth: 170, barHeight: 42, gap: 26, valueFormat: (v) => `${one(v)} min` },
            ),
          ),
          panel(
            "What it means",
            "Capacity, not curiosity.",
            readout([
              `${n(S.time.interArrival.buckets[0].count + S.time.interArrival.buckets[1].count)} gaps are under ten minutes: the queue arrives in clusters.`,
              `At ${one(S.time.perDayAverage)} entries a day the panel is never busy for long — but a burst of ${n(Math.max(...S.time.dailySeries.map((d) => d.count)))} in one day is what the pooler has to survive.`,
            ]),
          ),
        ),
        row(
          "c2",
          panel(
            "The five days that arrived at once",
            "A day's entries against the day's average.",
            C.hBars(
              [...S.time.dailySeries]
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((day) => ({ label: dayLabel(day.day), value: day.count, sub: `${one(day.count / S.time.perDayAverage)}× the daily average` })),
              { width: C.W.half, labelWidth: 130, valueWidth: 110, barHeight: 34, gap: 26, sub: (row) => row.sub },
            ),
          ),
          panel(
            "The five hours that carry the queue",
            "Entries filed in each hour, across the whole window.",
            C.hBars(
              [...S.time.hourly]
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((hour) => ({ label: `${hour.hour}:00`, value: hour.count })),
              { width: C.W.half, labelWidth: 110, valueWidth: 110, barHeight: 34, gap: 26, showShare: true, total: S.headline.registrations, color: "c3" },
            ),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Participants",
    slug: "who-entered",
    title: "Who entered",
    dek: "Eleven class options, and an entry count that says how much the form was used as a family ticket.",
    build: () =>
      [
        row(
          "c21",
          panel(
            "Entries by class",
            "The catalogue's own eleven options, youngest first.",
            C.columns(series(S.people.classMix.map((row) => ({ day: row.label, value: row.count }))), {
              width: C.W.wide,
              height: 380,
              labelEvery: 1,
              axisFormat: (label) => label.replace("Class ", "").replace("University", "Univ"),
              color: "var(--c1)",
            }),
          ),
          panel(
            "Three bands",
            "School, college and beyond.",
            [
              C.donut(
                S.people.classGroups
                  .filter((group) => group.count > 0)
                  .map((group, index) => ({ label: group.label, value: group.count, color: ["c1", "c3", "c4"][index] })),
                { width: C.W.narrow, size: 330, center: n(S.people.classGroups[0].count), caption: "school pupils" },
              ),
              C.legend(S.people.classGroups.filter((g) => g.count > 0).map((group, index) => ({ label: group.label, value: group.count, color: ["c1", "c3", "c4"][index] }))),
            ].join(""),
          ),
        ),
        row(
          "c2",
          panel(
            "Events per participant",
            "Some entered two competitions, some six.",
            [
              C.hBars(
                S.people.entriesPerRegistration.buckets.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: ["c1", "c5", "c3", "c2", "c4"][index] })),
                { width: C.W.half, labelWidth: 220, valueWidth: 120, barHeight: 32, gap: 14, showShare: true, total: S.headline.registrations },
              ),
              readout([`mean ${one(S.people.entriesPerRegistration.mean)}, maximum ${n(S.people.entriesPerRegistration.max)} events on one form.`]),
            ].join(""),
          ),
          panel(
            "The IDs the database minted",
            "Gender letter + class + sequence, issued by a trigger, never renumbered.",
            C.hBars(
              S.people.codePrefixes.slice(0, 10).map((prefix, index) => ({ label: prefix.prefix, value: prefix.count, color: prefix.prefix.startsWith("F") ? "c4" : prefix.prefix.startsWith("M") ? "c1" : "c3" })),
              { width: C.W.half, labelWidth: 110, valueWidth: 90, barHeight: 30, gap: 12 },
            ),
          ),
        ),
        readout([
          (() => {
            const top = [...S.people.classMix].sort((a, b) => b.count - a.count).slice(0, 2);
            const sum = top.reduce((total, row) => total + row.count, 0);
            return `${top.map((row) => `${row.label} (${n(row.count)})`).join(" and ")} take ${pct(Math.round((sum / S.headline.registrations) * 100))} of every entry between them.`;
          })(),
          S.people.counterVsRows.length
            ? `${S.people.counterVsRows.length} ID counters are one ahead of the rows they issued, which is what a rolled-back insert looks like.`
            : "Every ID counter matches its rows exactly.",
        ]),
      ].join(""),
  },

  {
    tag: "Participants",
    slug: "the-gender-split",
    title: "The gender split",
    dek: "Ask for a gender and it becomes the first character of a registration ID — so the split is visible in the codes themselves.",
    build: () =>
      [
        row(
          "c4",
          kpi([
            ...S.people.genderLetters.map((letter) => ({
              value: n(letter.count),
              label: letter.label,
              eyebrow: "ID letter",
              note: `${Math.round((letter.count / S.headline.registrations) * 100)}% of entries`,
              className: letter.label === "Female" ? "accent k" : letter.label === "Male" ? "accent" : "accent p",
            })),
            { value: n(S.people.genderMissing), label: "Gender left blank", eyebrow: "Rows before the question", className: "accent y" },
          ]),
        ),
        panel(
          "Male and female entries in every class",
          "Stacked, so the width of a bar is the class's size and the split is the colour.",
          C.stacked(
            S.people.genderByClass.map((row) => ({
              label: row.label,
              values: { male: row.male, female: row.female, other: row.other },
            })),
            [
              { key: "male", label: "Male", color: "c1" },
              { key: "female", label: "Female", color: "c4" },
              { key: "other", label: "Other", color: "c3" },
            ],
            { width: C.W.full, barHeight: 30, gap: 14, labelWidth: 140 },
          ),
        ),
        row(
          "c2",
          panel(
            "Where the girls are",
            "Female share inside each class.",
            C.rates(
              S.people.genderByClass
                .filter((row) => row.total >= 20)
                .map((row) => ({ label: row.label, rate: Math.round((row.female / row.total) * 100), note: `${row.female}/${row.total}` })),
              { width: C.W.half, color: "var(--c4)", labelWidth: 130 },
            ),
          ),
          panel(
            "Attendance by gender",
            "Of the entries each gender filed, how many turned up.",
            C.rates(
              S.attendance.byGender.map((row) => ({ label: `${row.label} — ${n(row.total)} entries`, rate: row.rate })),
              { width: C.W.half, color: "var(--c6)", labelWidth: 250 },
            ),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Competition",
    slug: "which-events-people-wanted",
    title: "Which events people wanted",
    dek: "Eleven events across five segments. Mathematics alone took half of all the entries.",
    build: () =>
      [
        panel(
          "Entries per event",
          "A person entering three events appears in three bars.",
          C.hBars(
            [...S.events.perEvent]
              .sort((a, b) => b.entries - a.entries)
              .map((event) => ({
                label: event.name,
                value: event.entries,
                sub: `${event.participants} participants · ${n(event.verified)} verified · ${n(event.present)} present`,
                color: event.segmentId === "olympiads" ? "c1" : event.segmentId === "esports" ? "c3" : event.segmentId === "robotics" ? "c2" : "c4",
              })),
            { width: C.W.full, labelWidth: 300, valueWidth: 130, barHeight: 30, gap: 22, showShare: true, total: S.events.totalEntries, sub: (row) => row.sub },
          ),
        ),
        row(
          "c2",
          panel(
            "The five segments",
            "Where the entries and the money went.",
            C.hBars(
              S.events.perSegment.map((segment, index) => ({ label: segmentName(segment.id), value: segment.entries, color: ["c1", "c3", "c4", "c2", "c5"][index] })),
              { width: C.W.half, labelWidth: 190, valueWidth: 145, barHeight: 40, gap: 26, showShare: true, total: S.events.totalEntries },
            ),
          ),
          panel(
            "Money attributed to each event",
            "The row's single fee, split across the entries it lists.",
            C.hBars(
              [...S.events.perEvent]
                .sort((a, b) => b.money - a.money)
                .slice(0, 8)
                .map((event) => ({ label: event.name, value: event.money })),
              { width: C.W.half, labelWidth: 190, valueWidth: 150, barHeight: 30, gap: 14, valueFormat: money, color: "c6" },
            ),
          ),
        ),
        readout([
          `${n(S.events.perEvent.find((e) => e.id === "mathematics").entries)} entries — ${pct(Math.round((S.events.perEvent.find((e) => e.id === "mathematics").entries / S.events.totalEntries) * 100))} of them — went to Mathematics.`,
          `E-sports took ${n(S.events.perSegment.find((s) => s.id === "esports").entries)} entries at ${money(200)} a title, the cheapest way to enter the fest.`,
        ]),
      ].join(""),
  },

  {
    tag: "Competition",
    slug: "bracket-fill",
    title: "How full each bracket is",
    dek: "Twenty-four brackets in the catalogue. Every one of them took entries — no bracket had to be cancelled.",
    build: () =>
      [
        row(
          "c4",
          kpi([{ value: `${S.events.brackets.filled}`, label: "Brackets with entries", eyebrow: `of ${S.events.brackets.total}`, className: "accent g" }]),
          kpi([{ value: `${S.events.brackets.empty}`, label: "Brackets left empty", className: "accent" }]),
          kpi([{ value: `${S.events.brackets.unplaced.length}`, label: "Entries in no catalogue bracket", note: "a category letter the event dropped", className: "accent y" }]),
          kpi([{ value: `${S.events.brackets.outsideEligibleBand}`, label: "Entries outside their band", note: "the class is not in that bracket's band", className: "accent r" }]),
        ),
        panel(
          "The fourteen largest brackets",
          "Event · category, with the class band the bracket is sat in.",
          C.hBars(
            S.events.brackets.largest.map((bracket, index) => ({
              label: `${bracket.event} · ${bracket.category.replace("Category ", "")}`,
              sub: bracket.band,
              value: bracket.count,
              color: index === 0 ? "c2" : "c1",
            })),
            { width: C.W.full, labelWidth: 360, valueWidth: 120, barHeight: 26, gap: 16, sub: (row) => row.sub, showShare: true, total: S.events.totalEntries },
          ),
        ),
        row(
          "c2",
          panel(
            "Category letters across the Olympiads",
            "The catalogue's own split, by how many entries each letter took.",
            C.hBars(
              S.events.categoryMix.slice(0, 12).map((row) => ({ label: row.label, value: row.count })),
              { width: C.W.half, labelWidth: 260, valueWidth: 80, barHeight: 24, gap: 10, color: "c3" },
            ),
          ),
          panel(
            "All twenty-four brackets, smallest first",
            "Event · category. The scheduled slot each one is sat in is the run sheet's problem, not the count's.",
            C.hBars(
              [...S.events.brackets.all].reverse().map((bracket) => ({
                label: `${bracket.event} · ${bracket.category.replace("Category ", "")}`,
                value: bracket.count,
                color: bracket.count === 0 ? "c5" : "c1",
              })),
              { width: C.W.half, labelWidth: 290, valueWidth: 70, barHeight: 18, gap: 8 },
            ),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Competition",
    slug: "teams-and-squads",
    title: "Teams and squads",
    dek: "Robotics and Project Display are entered by squad, so the team size is a price decision as much as a logistics one.",
    build: () =>
      [
        row(
          "c3",
          kpi([{ value: n(S.events.teams.sized), label: "Entries with a team size", eyebrow: "Squad events", className: "accent" }]),
          kpi([{ value: n(S.events.teams.named), label: "Teams that named themselves", note: `${pct(Math.round((S.events.teams.named / Math.max(S.events.teams.sized, 1)) * 100))} of the squads`, className: "accent p" }]),
          kpi([{ value: `${n(tier("1500"))} / ${n(tier("2000"))}`, label: "Rows billed ৳1,500 / ৳2,000", eyebrow: "Squad fees", note: "four to a squad, five to the other", className: "accent y" }]),
        ),
        row(
          "c2",
          panel(
            "Four or five",
            "Squad size as the form recorded it.",
            [
              C.donut(
                S.events.teams.sizeMix.map((size, index) => ({ label: size.label, value: size.count, color: ["c1", "c3"][index] })),
                { width: C.W.half, size: 380, center: n(S.events.teams.sized), caption: "squads" },
              ),
              C.legend(S.events.teams.sizeMix.map((size, index) => ({ label: size.label, value: size.count, color: ["c1", "c3"][index] }))),
            ].join(""),
          ),
          panel(
            "Squad events against solo events",
            "Robotics and Project Display need floor space; the Olympiads need desks.",
            C.hBars(
              [
                { label: "Project Display", value: S.events.teams.projectDisplay, color: "c4" },
                { label: "Robotics (LFR + Robosoccer)", value: S.events.teams.robotics, color: "c2" },
                { label: "Olympiad entries", value: S.events.perSegment.find((s) => s.id === "olympiads")?.entries ?? 0, color: "c1" },
                { label: "E-sports entries", value: S.events.perSegment.find((s) => s.id === "esports")?.entries ?? 0, color: "c3" },
              ],
              { width: C.W.half, labelWidth: 280, valueWidth: 100, barHeight: 38, gap: 24 },
            ),
          ),
        ),
        readout([
          `${n(S.events.teams.sized - S.events.teams.named)} squads entered without giving a team a name — the desk will know them by their captain's ID.`,
        ]),
      ].join(""),
  },

  {
    tag: "Reach",
    slug: "the-school-landscape",
    title: "The school landscape",
    dek: "Eighty-nine schools entered. Sixty-four of them sent exactly one person, and the host school sent more than eight in ten.",
    build: () =>
      [
        row(
          "c2",
          panel(
            "Host against everyone else",
            "Every spelling of the host school counts as one school, exactly as the panel groups it.",
            [
              C.split(
                [
                  { label: "Host school", value: S.schools.host.entries, color: "c1" },
                  { label: "Other schools", value: S.schools.nonHost, color: "c2" },
                ],
                { width: C.W.half, height: 130 },
              ),
              C.legend([
                { label: "Host school entries", value: S.schools.host.entries, color: "c1" },
                { label: "From other schools", value: S.schools.nonHost, color: "c2" },
              ]),
              readout([
                `${S.schools.host.spellingsCollapsed} different spellings of the host name were collapsed into one school.`,
                `${n(S.schools.distinct - 1)} outside schools sent ${n(S.schools.nonHost)} entries between them.`,
              ]),
            ].join(""),
          ),
          panel(
            "How many entries a school sends",
            "The tail is the point: most schools arrive once.",
            C.hBars(
              S.schools.entriesPerSchool.buckets.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: index === 0 ? "c5" : "c1" })),
              { width: C.W.half, labelWidth: 200, valueWidth: 140, barHeight: 32, gap: 14, valueFormat: (v) => `${v} ${v === 1 ? "school" : "schools"}` },
            ),
          ),
        ),
        row(
          "c2",
          panel(
            "Concentration",
            "What share of entries the biggest schools carry.",
            C.rates(
              [
                { label: "Single biggest school", rate: S.schools.concentration.top1Share },
                { label: "Top three", rate: S.schools.concentration.top3Share },
                { label: "Top ten", rate: S.schools.concentration.top10Share },
                { label: "Schools that sent one entry", rate: S.schools.concentration.tailShare, color: "var(--c5)" },
              ],
              { width: C.W.half, labelWidth: 280, color: "var(--c1)" },
            ),
          ),
          panel(
            "Reach grew week by week",
            "Schools that entered for the first time, and the running total.",
            [
              C.columns(
                S.schools.perWeek.map((week) => ({ day: weekLabel(week.week), value: week.newSchools })),
                { width: C.W.half, height: 260, labelEvery: 1, axisFormat: (label) => label, color: "var(--c2)" },
              ),
              readout(S.schools.perWeek.map((week) => `${weekLabel(week.week)}: +${week.newSchools} new, ${week.cumulative} in all`)),
            ].join(""),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Reach",
    slug: "who-brought-them",
    title: "Who brought them",
    dek: "The reference question is optional, and more than half the entries leave it empty. Those who answer it name someone on the club's own roster.",
    build: () =>
      [
        row(
          "c4",
          kpi([{ value: n(S.referrers.recorded), label: "Entries naming a referrer", eyebrow: `${pct(S.referrers.recordedShare)}`, className: "accent" }]),
          kpi([{ value: n(S.referrers.blank), label: "Left blank", note: `${pct(S.referrers.blankShare)} of entries`, className: "accent y" }]),
          kpi([{ value: n(S.referrers.distinct), label: "Distinct referrers", note: `${S.referrers.rosterMatched} of them on the roster`, className: "accent p" }]),
          kpi([{ value: pct(S.referrers.concentration.top5Share), label: "Carried by five people", eyebrow: "Of referred entries", className: "accent k" }]),
        ),
        row(
          "c21",
          panel(
            "The whole leaderboard, ranked and unnamed",
            `All ${n(S.referrers.distinct)} referrers. How many entries each one brought — the identity is not the statistic, the shape is.`,
            C.ladder(
              S.referrers.leaderboard.map((row) => ({ value: row.count, note: `#${row.rank}` })),
              { width: C.W.wide, perRow: 34, color: "var(--c4)", valueFormat: (v) => `${v}` },
            ),
          ),
          panel(
            "How far each referrer reaches",
            "Most referrers bring one person.",
            C.hBars(
              S.referrers.reach.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: ["c5", "c1", "c2", "c3", "c4"][index] })),
              { width: C.W.narrow, labelWidth: 150, valueWidth: 70, barHeight: 30, gap: 14, valueFormat: (v) => `${v}` },
            ),
          ),
        ),
        row(
          "c2",
          panel(
            "Did a referrer make payment more likely?",
            "Verification rate of referred entries against entries that named nobody.",
            C.rates(
              [
                { label: "Named a referrer", rate: S.referrers.referredVerifiedRate, note: `${n(S.referrers.recorded)} rows` },
                { label: "Named nobody", rate: S.referrers.unreferredVerifiedRate, note: `${n(S.referrers.blank)} rows`, color: "var(--c2)" },
              ],
              { width: C.W.half, labelWidth: 240, color: "var(--c4)" },
            ),
          ),
          panel(
            "Concentration",
            "Share of referred entries held by the top referrers.",
            C.rates(
              [
                { label: "Top 1", rate: S.referrers.concentration.top1Share },
                { label: "Top 3", rate: S.referrers.concentration.top3Share },
                { label: "Top 5", rate: S.referrers.concentration.top5Share },
              ],
              { width: C.W.half, labelWidth: 150, color: "var(--c4)" },
            ),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Reconciliation",
    slug: "the-sms-ledger",
    title: "The SMS ledger",
    dek: "Every payment message the club has, how it was captured, and what the matcher made of it.",
    build: () =>
      [
        row(
          "c3",
          kpi([
            { value: n(S.sms.total), label: "Messages in the log", eyebrow: "All time", className: "accent" },
            { value: pct(S.headline.smsMatchRate), label: "Matched a TrxID", note: `${n(S.sms.statusMix.find((s) => s.label === "matched").count)} of ${n(S.sms.total)}`, className: "accent g" },
            { value: n(S.sms.recovery.unmatched), label: "Still unmatched", note: `${n(S.sms.recovery.ignored)} ignored by the webhook`, className: "accent r" },
            { value: money(S.sms.amounts.sum), label: "Total that moved", note: `${n(S.sms.amounts.distinct)} distinct amounts`, className: "accent y" },
          ]),
        ),
        row(
          "c2",
          panel(
            "How each message arrived",
            "The Android forwarder sends its own; the club replays a backlog by hand when the phone lags.",
            [
              C.donut(
                S.sms.channelMix.map((channel, index) => ({ label: channel.label, value: channel.count, color: ["c1", "c3", "c5"][index] })),
                { width: C.W.half, size: 370, center: n(S.sms.total), caption: "messages" },
              ),
              C.legend(S.sms.channelMix.map((channel, index) => ({ label: channel.label, value: channel.count, color: ["c1", "c3", "c5"][index] }))),
            ].join(""),
          ),
          panel(
            "What the matcher decided",
            "A status is the webhook's, not an admin's.",
            C.hBars(
              S.sms.statusMix.map((status, index) => ({ label: status.label, value: status.count, color: ["c6", "c2", "c5"][index] })),
              { width: C.W.half, labelWidth: 160, valueWidth: 160, barHeight: 42, gap: 26, showShare: true, total: S.sms.total },
            ),
          ),
        ),
        row(
          "c21",
          panel(
            "Messages received per day",
            `${S.sms.daysActive} days carried traffic. A gap here is a phone that was off, not a day without payments.`,
            C.columns(series(S.sms.dailySeries), { width: C.W.wide, height: 320, labelEvery: 3, color: "var(--c5)" }),
          ),
          panel(
            "Duplication",
            "The same TrxID arriving twice is cosmetic; used by two registrations it is money.",
            readout([
              `${n(S.sms.duplicateTrxInSms)} TrxIDs were logged twice — a replay and a later delivery of one message.`,
              `${n(S.sms.sharedTrxAcrossRegistrations)} registrations share a TrxID with another row.`,
              `${n(S.sms.matchedRegistrations)} rows were closed by a match rather than a person.`,
            ]),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Reconciliation",
    slug: "how-late-the-proof-arrives",
    title: "How late the proof arrives",
    dek: "Two clocks matter: the phone's delay in forwarding a message that landed on a handset, and the delay before that message closes a registration.",
    build: () =>
      [
        row(
          "c2",
          panel(
            "Forwarding lag, message to database",
            "Median 6.8 hours. The phone drains its queue in bursts, so a payment can read as missing for a day.",
            [
              C.hBars(
                S.sms.ingestLag.buckets.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: ["c6", "c1", "c2", "c3", "c5"][index] })),
                { width: C.W.half, labelWidth: 190, valueWidth: 130, barHeight: 32, gap: 14, showShare: true, total: S.sms.ingestLag.n },
              ),
              readout([
                `median ${hours(S.sms.ingestLag.median)} · p90 ${hours(S.sms.ingestLag.p90)} · worst ${hours(S.sms.ingestLag.max)}`,
                `${n(S.sms.ingestLag.buckets[4].count)} messages took over three days to reach the database.`,
              ]),
            ].join(""),
          ),
          panel(
            "Reconciliation lag, entry to matched SMS",
            "How long a participant's own payment took to close their row.",
            [
              C.hBars(
                [
                  { label: "Median", value: S.sms.reconcileLag.median, color: "c1" },
                  { label: "Mean", value: S.sms.reconcileLag.mean, color: "c5" },
                  { label: "90th percentile", value: S.sms.reconcileLag.p90, color: "c2" },
                  { label: "Longest", value: S.sms.reconcileLag.max, color: "c3" },
                ],
                { width: C.W.half, labelWidth: 190, valueWidth: 130, barHeight: 34, gap: 18, valueFormat: hours },
              ),
              readout([`measured on ${n(S.sms.reconcileLag.n)} registrations that a message answered.`]),
            ].join(""),
          ),
        ),
        panel(
          "Decision latency, once an admin is involved",
          `${n(S.payments.adminTouched)} rows were decided by a person. The clock starts at submission.`,
          C.hBars(
            S.payments.decisionLatency.buckets.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: ["c6", "c1", "c2", "c3", "c5"][index] })),
            { width: C.W.full, labelWidth: 220, valueWidth: 240, barHeight: 38, gap: 18, showShare: true, total: S.payments.decisionLatency.n },
          ),
        ),
        row(
          "c3",
          kpi([{ value: hours(S.payments.decisionLatency.median), label: "Median wait for a human", className: "accent" }]),
          kpi([{ value: hours(S.payments.decisionLatency.p90), label: "90th percentile", className: "accent y" }]),
          kpi([{ value: n(S.payments.decisionLatency.buckets[0].count), label: "Decided within an hour", note: `${pct(Math.round((S.payments.decisionLatency.buckets[0].count / S.payments.decisionLatency.n) * 100))} of the queue`, className: "accent g" }]),
          kpi([{ value: n(S.payments.decisionLatency.buckets[4].count), label: "Waited over a week", className: "accent r" }]),
        ),
      ].join(""),
  },

  {
    tag: "Reconciliation",
    slug: "the-trxid-that-cannot-match",
    title: "The TrxID that cannot match",
    dek: "A bKash TrxID is exactly ten upper-case alphanumeric characters. Anything else shaped can never be closed by the webhook, however correctly the money was sent.",
    build: () =>
      [
        row(
          "c3",
          kpi([{ value: n(S.sms.hygiene.failures), label: "Rows with an unmatchable TrxID", eyebrow: `${pct(S.sms.hygiene.failureShare)} of entries`, className: "accent r" }]),
          kpi([{ value: n(S.sms.hygiene.byStatus.find((s) => s.status === "rejected").failures), label: "Of those, rejected", note: "a person had to decide", className: "accent y" }]),
          kpi([{ value: n(S.sms.recovery.o0Transpositions), label: "Recoverable by an O↔0 typo", note: "the SMS and the form differ by one character", className: "accent g" }]),
        ),
        panel(
          "Why each one cannot match",
          "Read off the shape of the string, not guessed.",
          C.hBars(
            S.sms.hygiene.reasons.map((reason, index) => ({
              label: shorten(reason.label),
              value: reason.count,
              color: ["c5", "c2", "c3", "c4"][index] ?? "c1",
            })),
            { width: C.W.full, labelWidth: 700, valueWidth: 130, barHeight: 44, gap: 24, showShare: true, total: S.sms.hygiene.failures },
          ),
        ),
        row(
          "c2",
          panel(
            "Failures by payment status",
            "An unmatchable ID is not an unpaid entry — it is a phone call.",
            C.hBars(
              S.sms.hygiene.byStatus.map((row, index) => ({ label: row.status, value: row.failures, color: ["c2", "c6", "c5"][index] })),
              { width: C.W.half, labelWidth: 150, valueWidth: 120, barHeight: 44, gap: 26 },
            ),
          ),
          panel(
            "What the log still offers",
            "Recovery paths the club can actually use.",
            readout([
              `${n(S.sms.recovery.unmatched)} messages sit unmatched and ${n(S.sms.recovery.ignored)} were ignored.`,
              `${n(S.sms.recovery.walletPlusAmount)} of them carry a wallet number and an amount that equal a row no one verified — the money is there, the reference is not.`,
              `${S.sms.ingestLag.clockSkew} message arrived stamped before it was sent, which is a handset clock, not a fraud.`,
            ]),
          ),
        ),
        panel(
          "The log that did not close, and what can still be recovered",
          "Every message the matcher left behind, and the two ways a person can still be found.",
          C.hBars(
            [
              { label: "Unmatched messages", value: S.sms.recovery.unmatched, color: "c5" },
              { label: "Ignored by the webhook", value: S.sms.recovery.ignored, color: "c3" },
              { label: "Recoverable by an O↔0 typo", value: S.sms.recovery.o0Transpositions, color: "c6" },
              { label: "Recoverable by wallet + amount", value: S.sms.recovery.walletPlusAmount, color: "c6" },
            ],
            { width: C.W.full, labelWidth: 420, valueWidth: 140, barHeight: 40, gap: 22, showShare: true, total: S.sms.total },
          ),
        ),
        readout([
          "Ten characters, upper-case letters and digits. A phone number in that box, a dropped character, or a typed name — the webhook is right to leave it unmatched.",
        ]),
      ].join(""),
  },

  {
    tag: "Money",
    slug: "wallets-and-what-is-not-fest-money",
    title: "Wallets, and what is not fest money",
    dek: "The payment number participants send to, and how much of the SMS log is money the fest never asked for.",
    build: () =>
      [
        row(
          "c4",
          kpi([{ value: n(S.sms.distinctWallets), label: "Distinct wallet numbers used", eyebrow: "to send payment", className: "accent" }]),
          kpi([{ value: n(S.sms.walletConcentration.multiUse), label: "Used more than once", note: "a parent paying for two children", className: "accent p" }]),
          kpi([{ value: n(S.sms.amountVsFee.otherAmounts), label: "Messages whose amount is no fee", note: `${money(S.sms.amountVsFee.aboveFiveThousandSum)} in four of them over ৳5,000`, className: "accent y" }]),
          kpi([{ value: money(S.headline.collected), label: "Fest fees collected", note: "against the wallet's whole ledger", className: "accent g" }]),
        ),
        row(
          "c2",
          panel(
            "Registrations per wallet number",
            "One number takes a family's whole payment, so the concentration is a household effect.",
            C.hBars(
              S.sms.walletConcentration.buckets.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: ["c1", "c5", "c2", "c3"][index] })),
              { width: C.W.half, labelWidth: 210, valueWidth: 140, barHeight: 36, gap: 20, valueFormat: (v) => `${v} wallets` },
            ),
          ),
          panel(
            "Amounts in the SMS log",
            "The fee tiers dominate; the tail is money from somewhere else.",
            C.hBars(
              S.sms.amounts.buckets.map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: index < 3 ? "c6" : "c2" })),
              { width: C.W.half, labelWidth: 210, valueWidth: 120, barHeight: 32, gap: 14, showShare: true, total: S.sms.amounts.n },
            ),
          ),
        ),
        row(
          "c2",
          panel(
            "Does the amount match a fee?",
            "A message whose amount equals some row's fee is almost certainly fest money.",
            [
              C.split(
                [
                  { label: "Equal to a fee", value: S.sms.amountVsFee.equalToFees, color: "c6" },
                  { label: "Other amounts", value: S.sms.amountVsFee.otherAmounts, color: "c2" },
                ],
                { width: C.W.half, height: 120 },
              ),
              C.legend([
                { label: "Amount equals a recorded fee", value: S.sms.amountVsFee.equalToFees, color: "c6" },
                { label: "No fee of that size", value: S.sms.amountVsFee.otherAmounts, color: "c2" },
              ]),
            ].join(""),
          ),
          panel(
            "Size of the log",
            "Percentiles of the amounts the wallet received.",
            C.hBars(
              [
                { label: "Median", value: S.sms.amounts.median, color: "c1" },
                { label: "Mean", value: S.sms.amounts.mean, color: "c5" },
                { label: "90th", value: S.sms.amounts.p90, color: "c2" },
                { label: "99th", value: S.sms.amounts.p99, color: "c3" },
                { label: "Largest", value: S.sms.amounts.max, color: "c4" },
              ],
              { width: C.W.half, labelWidth: 160, valueWidth: 150, barHeight: 34, gap: 16, valueFormat: money },
            ),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Attendance",
    slug: "who-turned-up",
    title: "Who turned up",
    dek: "One bit per participant at the desk, read here as a rate: 579 of 804 entries were marked present.",
    build: () =>
      [
        row(
          "c4",
          kpi([{ value: n(S.attendance.marked), label: "Marked present", eyebrow: pct(S.attendance.rate), className: "accent g" }]),
          kpi([{ value: n(S.attendance.cross.verifiedAndPresent), label: "Paid and present", className: "accent" }]),
          kpi([{ value: n(S.attendance.cross.unverifiedButPresent), label: "Present without a verified payment", note: "the desk let them in", className: "accent y" }]),
          kpi([{ value: n(S.attendance.cross.verifiedButAbsent), label: "Paid but absent", note: "refunds nobody has asked for", className: "accent r" }]),
        ),
        row(
          "c2",
          panel(
            "Attendance rate by class",
            "Only classes with entries; the number in brackets is the class's size.",
            C.rates(
              S.attendance.byClass.filter((row) => row.total >= 20).map((row) => ({ label: row.label, rate: row.rate, note: `${row.marked}/${row.total}` })),
              { width: C.W.half, labelWidth: 150, color: "var(--c6)" },
            ),
          ),
          panel(
            "Attendance rate by event",
            "A person entered in three events counts in three bars.",
            C.rates(
              S.attendance.byEvent.map((row) => ({ label: row.label, rate: row.rate, note: `${row.marked}/${row.total}` })),
              { width: C.W.half, labelWidth: 280, color: "var(--c1)" },
            ),
          ),
        ),
        row(
          "c21",
          panel(
            "The desk's own arithmetic",
            "Verified, present, and the two combinations the club has to explain.",
            C.heat(
              ["Verified", "Rejected"],
              ["Present", "Absent"],
              [
                [S.attendance.cross.verifiedAndPresent, S.attendance.cross.verifiedButAbsent],
                [S.attendance.cross.rejectedButPresent, S.headline.rejected - S.attendance.cross.rejectedButPresent],
              ],
              { width: C.W.wide, cellHeight: 92, labelWidth: 150, color: "--c6" },
            ),
          ),
          panel(
            "Marking window",
            "The days the desk actually moved the switch.",
            [
              C.hBars(
                S.attendance.markingSeries.map((day) => ({ label: dayLabel(day.day), value: day.count })),
                { width: C.W.narrow, labelWidth: 130, valueWidth: 110, barHeight: 40, gap: 26, valueFormat: (v) => `${n(v)} marks` },
              ),
              readout([
                `${n(S.attendance.cursorRows)} rows carry a marking timestamp — ${n(S.attendance.cursorRows - S.attendance.marked)} were switched back to absent.`,
                `${S.attendance.markingDays} separate days of marking.`,
              ]),
            ].join(""),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Admin work",
    slug: "the-queue-a-person-worked",
    title: "The queue a person worked",
    dek: "Most rows never needed a human. The ones that did were decided in two bursts of desk work.",
    build: () =>
      [
        row(
          "c4",
          kpi([{ value: n(S.payments.adminTouched), label: "Rows an admin decided", eyebrow: `${pct(Math.round((S.payments.adminTouched / S.headline.registrations) * 100))}`, className: "accent" }]),
          kpi([{ value: n(S.payments.money.decisionDaysActive), label: "Days of decision work", note: "out of 24 days of intake", className: "accent y" }]),
          kpi([{ value: n(S.payments.money.decisionsByAdmin.length), label: "Accounts that decided", note: "named here only as Admin A, B, C…", className: "accent p" }]),
          kpi([{ value: n(S.payments.money.emailSent), label: "Confirmation emails sent", note: `${pct(S.payments.money.emailSentShareOfVerified)} of verified rows`, className: "accent g" }]),
        ),
        row(
          "c2",
          panel(
            "Decisions per day",
            "The panel's own working sessions.",
            C.columns(
              S.payments.money.decisionsPerDay.map((day) => ({ day: day.day, value: day.count })),
              { width: C.W.half, height: 300, labelEvery: 2, color: "var(--c3)" },
            ),
          ),
          panel(
            "Who did the work",
            "Rows decided per account, ranked and relabelled.",
            C.ladder(
              S.payments.money.decisionsByAdmin.map((admin) => ({ value: admin.count, note: admin.label })),
              { width: C.W.half, perRow: 46, color: "var(--c3)", valueFormat: (v) => `${v} rows` },
            ),
          ),
        ),
        row(
          "c2",
          panel(
            "Accept or reject",
            "Of the decisions an admin made.",
            C.split(
              [
                { label: "Verified by hand", value: S.payments.verificationSource.find((r) => r.label === "manual")?.count ?? 0, color: "c6" },
                { label: "Rejected", value: S.headline.rejected, color: "c5" },
              ],
              { width: C.W.half, height: 116 },
            ),
          ),
          panel(
            "What the queue looked like at the end",
            "Nothing is left pending — every row was closed before the doors opened.",
            C.hBars(
              [
                { label: "Closed by a matched SMS", value: S.payments.smsDerived, color: "c1" },
                { label: "Needed a person", value: S.payments.adminTouched, color: "c3" },
              ],
              { width: C.W.half, labelWidth: 250, valueWidth: 110, barHeight: 40, gap: 24, showShare: true, total: S.headline.registrations },
            ),
          ),
        ),
        row(
          "c4",
          kpi([
            { value: pct(Math.round((S.payments.adminTouched / S.headline.registrations) * 1000) / 10), label: "Of entries needed a human", eyebrow: "The rest closed themselves", className: "accent" },
            { value: one(S.payments.adminTouched / Math.max(S.payments.money.decisionDaysActive, 1)), label: "Decisions per working day", note: `across ${S.payments.money.decisionDaysActive} days`, className: "accent y" },
            { value: one(S.payments.adminTouched / Math.max(S.payments.money.decisionsByAdmin.length, 1)), label: "Rows per deciding account", note: `${S.payments.money.decisionsByAdmin.length} accounts decided`, className: "accent p" },
            { value: `${one((S.payments.verificationSource.find((r) => r.label === "manual")?.count ?? 0) / Math.max(S.headline.rejected, 1))} : 1`, label: "Accepted for every rejected row", note: `${n(S.payments.verificationSource.find((r) => r.label === "manual")?.count ?? 0)} accepted by hand, ${n(S.headline.rejected)} rejected`, className: "accent g" },
          ]),
        ),
      ].join(""),
  },

  {
    tag: "Volunteer form",
    slug: "the-volunteer-applications",
    title: "The volunteer applications",
    dek: "One hundred and twenty-four students offered two days of their week. Sixty per cent of the answers are prose the club has to read.",
    build: () =>
      [
        row(
          "c4",
          kpi([{ value: n(S.volunteers.total), label: "Applications", eyebrow: `${dayLabel(S.volunteers.firstDay)} – ${dayLabel(S.volunteers.lastDay)}`, className: "accent" }]),
          kpi([{ value: n(S.volunteers.shiftMix[0].count), label: "Morning shift", note: `${n(S.volunteers.rawShiftVariants)} spellings, one meaning`, className: "accent y" }]),
          kpi([{ value: n(S.volunteers.levelMix.find((l) => l.label === "Class 8").count), label: "Class 8 applicants", note: "the largest single cohort", className: "accent p" }]),
          kpi([{ value: n(S.volunteers.unparsableLevel), label: "Class answers with no level in them", note: "typed `B`, `F`, `E`", className: "accent r" }]),
        ),
        row(
          "c2",
          panel(
            "Consent, read the way the club needs it",
            "Three questions, each scored for whether the answer is reassuring.",
            C.stacked(
              S.volunteers.consent.map((question) => ({
                label: short(question.label),
                values: Object.fromEntries(question.buckets.map((bucket) => [bucketKey(bucket.label), bucket.count])),
              })),
              [
                { key: "reassuring", label: "Reassuring", color: "c6" },
                { key: "conditional", label: "Conditional", color: "c2" },
                { key: "concerning", label: "Concerning", color: "c5" },
                { key: "unclear", label: "Reads neither way", color: "c3" },
              ],
              { width: C.W.half, barHeight: 40, gap: 26, labelWidth: 170 },
            ),
          ),
          panel(
            "Level, as it was typed",
            "Class and section in one free-text box.",
            C.columns(
              S.volunteers.levelMix.map((level) => ({ day: level.label.replace("Class ", ""), value: level.count })),
              { width: C.W.half, height: 280, labelEvery: 1, axisFormat: (label) => label, color: "var(--c1)" },
            ),
          ),
        ),
        row(
          "c3",
          panel(
            "How much they wrote",
            "Median characters per answer.",
            C.hBars(
              [
                { label: "Task conflict", value: Math.round(S.volunteers.essayLength.taskConflict.median) },
                { label: "Peer conduct", value: Math.round(S.volunteers.essayLength.peerConduct.median) },
                { label: "Why select me", value: Math.round(S.volunteers.essayLength.selectionReason.median) },
              ],
              { width: C.W.third, labelWidth: 150, valueWidth: 80, barHeight: 28, gap: 14 },
            ),
          ),
          panel(
            "Hygiene",
            "What the desk has to clean up.",
            readout([
              `${n(S.volunteers.duplicateStudentCodes)} applications share a student code with another.`,
              `${n(S.volunteers.phonesIdentical)} gave the same phone number for themselves and their parents.`,
              `${n(S.volunteers.rollShape.find((r) => r.label === "Zero-padded").count)} rolls are zero-padded, ${n(S.volunteers.rollShape.find((r) => r.label === "Plain digits").count)} are not.`,
            ]),
          ),
          panel(
            "When they applied",
            `Peak ${dayLabel(S.volunteers.peakDay.label)} with ${S.volunteers.peakDay.count}.`,
            C.columns(series(S.volunteers.dailySeries), { width: C.W.third, height: 220, labelEvery: 6, color: "var(--c4)" }),
          ),
        ),
      ].join(""),
  },

  {
    tag: "Ambassador form",
    slug: "the-campus-ambassadors",
    title: "The campus ambassadors",
    dek: "The club's recruiting form, and the only one of the three that has been open longest.",
    build: () =>
      [
        row(
          "c4",
          kpi([{ value: n(S.ambassadors.total), label: "Applications", eyebrow: `${dayLabel(S.ambassadors.firstDay)} – ${dayLabel(S.ambassadors.lastDay)}`, className: "accent" }]),
          kpi([{ value: `${S.ambassadors.typeMix[0].count} / ${S.ambassadors.typeMix[1].count}`, label: "Campus / batch", className: "accent p" }]),
          kpi([{ value: pct(S.ambassadors.firstTime.share), label: "Applying for the first time", note: `${n(S.ambassadors.firstTime.yes)} of ${n(S.ambassadors.total)}`, className: "accent y" }]),
          kpi([{ value: n(S.ambassadors.distinctSchools), label: "Schools recruiting", note: `${n(S.ambassadors.rawClassVariants)} ways of writing a class`, className: "accent g" }]),
        ),
        row(
          "c2",
          panel(
            "Where the contact details reach",
            "Every field the ambassador form asks for, and how often it was filled.",
            C.rates(
              S.ambassadors.contactCoverage.map((field) => ({ label: field.label, rate: Math.round((field.count / S.ambassadors.total) * 100), note: `${field.count}/${S.ambassadors.total}` })),
              { width: C.W.half, labelWidth: 170, color: "var(--c3)" },
            ),
          ),
          panel(
            "Social handles",
            "The outreach channel the club actually has.",
            [
              C.split(S.ambassadors.socialMatrix.map((row, index) => ({ label: row.label, value: row.count, color: ["c3", "c5", "c4", "c2"][index] })), { width: C.W.half, height: 118 }),
              C.legend(S.ambassadors.socialMatrix.map((row, index) => ({ label: row.label, value: row.count, color: ["c3", "c5", "c4", "c2"][index] }))),
            ].join(""),
          ),
        ),
        row(
          "c2",
          panel(
            "Level of the applicants",
            "Class as typed, then read for a level.",
            C.columns(
              S.ambassadors.levelMix.map((level) => ({ day: level.label.replace("Class ", ""), value: level.count })),
              { width: C.W.half, height: 280, labelEvery: 1, axisFormat: (label) => label, color: "var(--c1)" },
            ),
          ),
          panel(
            "Experience, by how much they wrote",
            "One free-text box about what they have done before.",
            C.hBars(
              S.ambassadors.experienceBuckets.filter((bucket) => bucket.count > 0).map((bucket, index) => ({ label: bucket.label, value: bucket.count, color: ["c1", "c5", "c2", "c3", "c4"][index] })),
              { width: C.W.half, labelWidth: 220, valueWidth: 120, barHeight: 32, gap: 14, showShare: true, total: S.ambassadors.total },
            ),
          ),
        ),
        row(
          "c2",
          panel(
            "Applications by week",
            "The recruiting form has been open longest, and the weeks are uneven.",
            C.columns(
              S.ambassadors.weeklySeries.map((week) => ({ day: week.week, value: week.count })),
              { width: C.W.half, height: 300, labelEvery: 1, axisFormat: (day) => `w/c ${dayLabel(day)}`, color: "var(--c3)" },
            ),
          ),
          panel(
            "The hour they applied",
            "Same evening habit as the fest form.",
            C.columns(
              S.ambassadors.hourly.filter((hour) => hour.count > 0).map((hour) => ({ day: hour.hour, value: hour.count })),
              { width: C.W.half, height: 300, labelEvery: 3, axisFormat: (hour) => `${hour}h`, color: "var(--c1)" },
            ),
          ),
        ),
        readout([
          `Gender split ${n(S.ambassadors.genderMix[0].count)} / ${n(S.ambassadors.genderMix[1].count)} — the one form whose applicant pool is level.`,
          `Median experience answer: ${n(S.ambassadors.experienceLength.median)} characters; the longest runs to ${n(S.ambassadors.experienceLength.max)}.`,
        ]),
      ].join(""),
  },

  {
    tag: "Data quality",
    slug: "what-the-data-is-honest-about",
    title: "What the data is honest about",
    dek: "Every form field, how full it is, and the handful of places where the stored value disagrees with the catalogue.",
    build: () =>
      [
        row(
          "c21",
          panel(
            "Field completeness on the STEM Fest form",
            "Share of the 804 rows that carry a value.",
            C.rates(
              S.completeness.map((field) => ({
                label: field.label,
                rate: field.share,
                note: `${n(field.present)} / ${n(field.missing)} missing`,
                color: field.share > 95 ? "var(--c6)" : field.share > 50 ? "var(--c1)" : "var(--c2)",
              })),
              { width: C.W.wide, labelWidth: 340, barHeight: 24, gap: 16 },
            ),
          ),
          panel(
            "Drift worth knowing",
            "Small, and all of it explainable.",
            readout([
              `${n(S.people.duplicateNameAndSchool)} rows share a name and a school with another — siblings, mostly, filed with the same spelling.`,
              `${n(S.people.messyNames)} names carry a stray space the form did not strip.`,
              `${S.people.counterVsRows.length} ID counters sit one ahead of their rows.`,
              `${n(S.events.unmappedRegistrations)} rows describe no catalogue event.`,
              `${n(S.payments.money.attributionDrift)} rows were charged a total the current price list does not reproduce.`,
            ]),
          ),
        ),
        row(
          "c3",
          panel(
            "The other two forms",
            "Rows the club has never had to reconcile.",
            C.hBars(
              [
                { label: "Ambassador", value: S.headline.ambassadors, color: "c3" },
                { label: "Volunteer", value: S.headline.volunteers, color: "c4" },
                { label: "CMS posts", value: S.accounts.posts, color: "c5" },
              ],
              { width: C.W.third, labelWidth: 140, valueWidth: 70, barHeight: 34, gap: 20 },
            ),
          ),
          panel(
            "Accounts behind the panel",
            "Real staff, with the four seeded test accounts held apart.",
            readout([
              `${n(S.accounts.real)} real accounts, ${n(S.accounts.testAccounts)} seeded for testing.`,
              `${S.accounts.roleMix.map((role) => `${role.count} ${role.label}`).join(", ")} — the panel is currently closed to everyone.`,
              `${n(S.accounts.sessions.total)} sessions across ${n(S.accounts.sessions.distinctUsers)} accounts, ${n(S.accounts.sessions.live)} still live.`,
              `${n(S.accounts.banned)} account banned.`,
            ]),
          ),
          panel(
            "Sign-ups by month",
            "When the club's own accounts arrived.",
            C.columns(
              S.accounts.perMonth.map((month) => ({ day: month.month, value: month.count })),
              { width: C.W.third, height: 210, labelEvery: 1, axisFormat: (label) => label.slice(2), color: "var(--c1)" },
            ),
          ),
        ),
      ].join(""),
  },
];

function series(rows) {
  return rows.map((row) => ({ day: row.day ?? row.label, value: row.count ?? row.value }));
}
function tier(label) {
  return S.payments.money.feeTiers.find((row) => row.label === label)?.count ?? 0;
}
function short(text) {
  return text.length > 30 ? `${text.slice(0, 28)}…` : text;
}
function shorten(text) {
  return text
    .replace("an 11-digit wallet number in the TrxID box — the participant sent the number they paid from, not the transaction", "11-digit wallet number typed into the TrxID box")
    .replace("not a bKash Transaction ID — the reference was typed in place of the TrxID", "a reference or a name typed instead of a TrxID")
    .replace("a bKash TrxID one character short — re-read it against the payment SMS", "a TrxID one character short")
    .replace("digits only, and not a bKash Transaction ID", "digits only, too short or too long to be one")
    .replace("an 11-digit wallet number in the TrxID box", "wallet number in the TrxID box");
}
function segmentName(id) {
  return (
    {
      olympiads: "Olympiads",
      esports: "E-sports",
      robotics: "Robotics",
      "project-display": "Project Display",
      "fun-segment": "Fun segment",
    }[id] ?? id
  );
}
function bucketKey(label) {
  if (label === "Yes, plainly" || label === "No hesitation") return "reassuring";
  if (label === "Conditional") return "conditional";
  if (label === "No" || label === "Hesitation") return "concerning";
  return "unclear";
}

// ── Writing ───────────────────────────────────────────────────────────────────

const total = sheets.length;
const cssPath = path.join(htmlDir, "sheets.css");

function renderSheet(sheet, index) {
  const number = String(index + 1).padStart(2, "0");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${sheet.title} — ${fest.name}</title>
    <link rel="stylesheet" href="sheets.css">
  </head>
  <body>
    <article class="sheet" id="sheet-${number}">
      <header class="mast">
        <div class="no">${number}<small>SHEET ${number} / ${total}</small></div>
        <div>
          <h1 class="title">${sheet.title}</h1>
          <p class="dek">${sheet.dek}</p>
        </div>
        <div class="tag">${sheet.tag}</div>
      </header>
      <div class="body">${sheet.build()}</div>
      <footer class="foot">
        <span>${fest.name} · ${fest.dates}</span>
        <span>Source: live database, read-only aggregate pass · ${generated}</span>
        <span>Counts, shares and rates only — no participant data</span>
      </footer>
    </article>
  </body>
</html>
`;
}

export function writeSheets() {
  mkdirSync(htmlDir, { recursive: true });
  writeFileSync(cssPath, sheetCss(root), "utf8");
  const names = sheets.map((sheet, index) => {
    const number = String(index + 1).padStart(2, "0");
    const file = path.join(htmlDir, `${number}-${sheet.slug}.html`);
    writeFileSync(file, renderSheet(sheet, index), "utf8");
    return `${number}-${sheet.slug}`;
  });
  writeFileSync(
    path.join(htmlDir, "manifest.json"),
    `${JSON.stringify(
      names.map((name) => ({ file: `${name}.html`, png: `${name}.png`, width: 1600, height: 2000 })),
      null,
      1,
    )}\n`,
    "utf8",
  );
  return names;
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith("sheets.mjs")) {
  const names = writeSheets();
  console.log(`${names.length} sheets written to infographics/html (${S.headline.registrations} registrations behind them).`);
}
