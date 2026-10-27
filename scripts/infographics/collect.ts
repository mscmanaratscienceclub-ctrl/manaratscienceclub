/**
 * Every number the STEM Fest forms and the admin panel can give, gathered in one
 * read-only pass and written to `infographics/data/stats.json`.
 *
 * The output is aggregate by construction: no participant name, school name,
 * referrer name, email, phone, bKash number or TrxID is ever written to the file.
 * Where a chart is about a person — the referrer leaderboard, the admins who
 * decided payments — rows are ranked and relabelled, because the shape of the
 * concentration is the statistic and the identity is not.
 *
 * One connection, statements issued sequentially, `max: 1` — the discipline
 * `scripts/bracket-reports/query.ts` documents for this pooler. The effective
 * payment status is restated here as SQL rather than imported from
 * `src/db/queries/stemfest-payment.ts`, because that module speaks Drizzle's
 * builder and this script runs on a bare `postgres` connection.
 *
 * Run with `pnpm reports:infographics`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

import {
  getStemfestClassLabel,
  isManaratSchool,
  manaratSchoolLabel,
  stemfestClasses,
  stemfestEvents,
  stemfestReferencesAll,
  type StemfestClassId,
} from "@/lib/data/stemfest-registration";
import { ADMIN_TIME_ZONE } from "@/lib/admin/filters";

import { diagnoseTrx } from "../bracket-reports/analysis";
import { brackets, festDates, festName, festVenue } from "../bracket-reports/brackets";
import { attributeFees } from "../bracket-reports/fees";
import { bracketKey, parseSegments, type StoredEntry } from "../bracket-reports/parse";

// ── Row shapes ────────────────────────────────────────────────────────────────

type PaymentStatus = "pending" | "verified" | "rejected";

interface RegistrationRow {
  id: string;
  registrationCode: string;
  name: string;
  classId: string;
  school: string;
  segments: string;
  totalFee: number | null;
  gender: string | null;
  email: string | null;
  reference: string | null;
  transactionId: string;
  paymentNumber: string;
  status: PaymentStatus;
  verificationSource: "sms" | "manual" | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  emailSentAt: Date | null;
  attendance: boolean;
  attendanceMarkedAt: Date | null;
  submittedAt: Date;
}

interface SmsRow {
  id: string;
  channel: "phone" | "replay" | "other";
  status: string;
  transactionId: string | null;
  amount: number | null;
  senderNumber: string | null;
  matchedRegistrationId: string | null;
  rawLength: number;
  receivedAt: Date;
  deliveredAt: Date;
}

interface VolunteerRow {
  id: string;
  classSection: string;
  roll: string;
  shift: string;
  studentCode: string;
  attendanceWeek: string;
  parentsComfort: string;
  campusHesitation: string;
  scenarioTaskConflict: string;
  scenarioPeerConduct: string;
  selectionReason: string;
  phonesMatch: boolean;
  personalPhoneLength: number;
  createdAt: Date;
}

interface AmbassadorRow {
  id: string;
  type: string;
  class: string;
  school: string;
  gender: string | null;
  firstTime: boolean;
  experienceLength: number;
  hasPhone: boolean;
  hasEmail: boolean;
  hasFacebook: boolean;
  hasInstagram: boolean;
  createdAt: Date;
}

interface AccountRow {
  role: string;
  emailVerified: boolean;
  banned: boolean | null;
  isTest: boolean;
  createdAt: Date | null;
}

interface CountRow {
  label: string;
  count: number;
}

// ── Statistics helpers ────────────────────────────────────────────────────────

function tally(keys: (string | number | null | undefined)[]): CountRow[] {
  const map = new Map<string, number>();
  for (const key of keys) {
    const label = key === null || key === undefined || key === "" ? "—" : String(key);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countWhere<T>(rows: readonly T[], predicate: (row: T) => boolean): number {
  let total = 0;
  for (const row of rows) if (predicate(row)) total += 1;
  return total;
}

function sumOf<T>(rows: readonly T[], pick: (row: T) => number | null): number {
  return rows.reduce((total, row) => total + (pick(row) ?? 0), 0);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Linear-interpolated quantile over an ascending list. */
function quantile(ascending: number[], q: number): number | null {
  if (ascending.length === 0) return null;
  const position = (ascending.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return round1(ascending[lower]);
  const weight = position - lower;
  return round1(ascending[lower] * (1 - weight) + ascending[upper] * weight);
}

function stats(values: number[]) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    n: sorted.length,
    sum: round1(total),
    mean: sorted.length === 0 ? null : round1(total / sorted.length),
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    p99: quantile(sorted, 0.99),
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
  };
}

function share(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;
}

interface Band {
  label: string;
  test: (value: number) => boolean;
}

/** Histogram over named ranges; each value lands in the first band it satisfies. */
function histogram(values: number[], bands: Band[]): CountRow[] {
  const counts = bands.map((band) => ({ label: band.label, count: 0 }));
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    const index = bands.findIndex((band) => band.test(value));
    if (index >= 0) counts[index].count += 1;
  }
  return counts;
}

// ── BD-local calendar keys ────────────────────────────────────────────────────

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ADMIN_TIME_ZONE,
  hour: "2-digit",
  hour12: false,
});
const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_TIME_ZONE,
  weekday: "short",
});

const dayKey = (at: Date): string => dayFormat.format(at);
const hourKey = (at: Date): string => hourFormat.format(at);
const weekdayKey = (at: Date): string => weekdayFormat.format(at);
const monthKey = (at: Date): string => dayKey(at).slice(0, 7);

/** Monday-keyed week label for a `YYYY-MM-DD` day. */
function weekOf(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** Every day from the first to the last, so a quiet day reads as zero. */
function eachDay(ascendingDays: string[]): string[] {
  if (ascendingDays.length === 0) return [];
  const out: string[] = [];
  const cursor = new Date(`${ascendingDays[0]}T12:00:00Z`);
  const last = new Date(`${ascendingDays[ascendingDays.length - 1]}T12:00:00Z`);
  while (cursor <= last) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

const hoursBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / 3_600_000;

/** Series of `{day,count}` over a set of rows, with the empty days filled in. */
function daySeries(rows: { at: Date }[]): { day: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = dayKey(row.at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return eachDay([...counts.keys()].sort()).map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

// ── Normalizers for the prose the forms collect ───────────────────────────────

/** School as the panel groups it: every Manarat spelling is one school. */
function schoolKey(school: string): string {
  const trimmed = (school ?? "").trim();
  if (!trimmed) return "(school not given)";
  return isManaratSchool(trimmed) ? manaratSchoolLabel : trimmed;
}

/** `8C`, `Grade 8`, `12` → a comparable level; `null` when the answer has no level in it. */
function levelOf(answer: string): string | null {
  const text = (answer ?? "").toLowerCase();
  if (!text.trim()) return null;
  if (/\b(a2|al\s*level\s*2|class\s*12|hsc)\b/.test(text) || /\b12\b/.test(text)) return "A2/12";
  if (/\b(as|al\s*level\s*1|class\s*11)\b/.test(text) || /\b11\b/.test(text)) return "AS/11";
  const digits = text.match(/\d{1,2}/);
  if (!digits) return null;
  const value = Number(digits[0]);
  return value >= 3 && value <= 12 ? `Class ${value}` : null;
}

const LEVEL_ORDER = [
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "AS/11",
  "A2/12",
  "Unparseable",
];

function levelMix(answers: string[]): CountRow[] {
  const counts = new Map(tally(answers.map((answer) => levelOf(answer) ?? "Unparseable")).map((row) => [row.label, row.count]));
  return LEVEL_ORDER.filter((label) => counts.has(label)).map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

const AFFIRMATIVE = /^\s*(yes|yeah|yup|yess?|sure|absolutely|definitely|ok|okay|i\s*(can|will|am)|of\s+course|in\s*sha)/i;
const NEGATIVE = /^\s*(no|not|nah|can'?t|cannot|unfortunately|sorry)|\b(can'?t|cannot|will not|not able)\b/i;
const HEDGE = /\b(but|if|unless|may|maybe|might|not sure|unsure|try|partially|only|up to|except|however)\b/i;

/** Consent prose → yes, no, or a yes-with-conditions. */
function consentOf(answer: string): "yes" | "no" | "qualified" | "unclear" {
  const text = (answer ?? "").trim();
  if (!text) return "unclear";
  const saysNo = NEGATIVE.test(text);
  const saysYes = AFFIRMATIVE.test(text);
  if (saysNo && !saysYes) return "no";
  if (saysYes) return HEDGE.test(text) || saysNo ? "qualified" : "yes";
  if (HEDGE.test(text)) return "qualified";
  return saysNo ? "no" : "unclear";
}

/** A shift as the club means it, whatever the applicant typed. */
function shiftOf(answer: string): string {
  const text = (answer ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!text) return "Blank";
  if (text.startsWith("morning")) return "Morning";
  if (text.startsWith("day")) return "Day";
  if (text.startsWith("evening") || text.startsWith("night")) return "Evening";
  return "Other wording";
}

function rollShape(roll: string): string {
  const text = (roll ?? "").trim();
  if (!text) return "Blank";
  if (!/^\d+$/.test(text)) return "Not a plain number";
  if (text.length > 4) return "Too long for a roll";
  return /^0\d+$/.test(text) ? "Zero-padded" : "Plain digits";
}

// ── Queries ───────────────────────────────────────────────────────────────────

const EFFECTIVE_STATUS = `
  coalesce(
    r.payment_decision,
    case when exists (
      select 1 from stem_fest_payment_sms s
      where s.status = 'matched'
        and upper(s.transaction_id) = upper(r.transaction_id)
    ) then 'verified' else 'pending' end
  )`;

const REGISTRATION_SELECT = `
  select
    r.id::text as id,
    r.registration_code as "registrationCode",
    r.name,
    r.class as "classId",
    r.school,
    r.segments,
    r.total_fee as "totalFee",
    r.gender,
    r.email,
    r.reference,
    r.transaction_id as "transactionId",
    r.payment_number as "paymentNumber",
    ${EFFECTIVE_STATUS} as status,
    case
      when r.payment_decision is not null then 'manual'
      when exists (
        select 1 from stem_fest_payment_sms s
        where s.status = 'matched'
          and upper(s.transaction_id) = upper(r.transaction_id)
      ) then 'sms'
      else null
    end as "verificationSource",
    r.payment_decided_by as "decidedBy",
    r.payment_decided_at as "decidedAt",
    r.payment_email_sent_at as "emailSentAt",
    r.attendance,
    r.attendance_marked_at as "attendanceMarkedAt",
    r.created_at as "submittedAt"
  from stem_fest_registrations r
  order by r.created_at asc`;

const SMS_SELECT = `
  select
    id::text as id,
    case
      when client_message_id like 'manual-replay:%' or sender = 'bkash' then 'replay'
      when lower(sender) = 'bkash' then 'phone'
      else 'other'
    end as channel,
    status,
    transaction_id as "transactionId",
    amount::float as amount,
    sender_number as "senderNumber",
    matched_registration_id::text as "matchedRegistrationId",
    char_length(raw_message) as "rawLength",
    received_at as "receivedAt",
    created_at as "deliveredAt"
  from stem_fest_payment_sms
  order by created_at asc`;

const VOLUNTEER_SELECT = `
  select
    id::text as id,
    class_section as "classSection",
    roll,
    shift,
    student_code as "studentCode",
    attendance_week as "attendanceWeek",
    parents_comfort as "parentsComfort",
    campus_hesitation as "campusHesitation",
    scenario_task_conflict as "scenarioTaskConflict",
    scenario_peer_conduct as "scenarioPeerConduct",
    selection_reason as "selectionReason",
    personal_phone = parents_phone as "phonesMatch",
    char_length(personal_phone) as "personalPhoneLength",
    created_at as "createdAt"
  from volunteer_registrations
  order by created_at asc`;

const AMBASSADOR_SELECT = `
  select
    id::text as id,
    type,
    class,
    school,
    gender,
    first_time_ca as "firstTime",
    char_length(experience) as "experienceLength",
    coalesce(phone, '') <> '' as "hasPhone",
    coalesce(email, '') <> '' as "hasEmail",
    facebook is not null as "hasFacebook",
    instagram is not null as "hasInstagram",
    created_at as "createdAt"
  from campus_ambassador_registrations
  order by created_at asc`;

const ACCOUNT_SELECT = `
  select
    role,
    "emailVerified" as "emailVerified",
    banned,
    coalesce(username, '') like 'mscdesk%' as "isTest",
    "createdAt" as "createdAt"
  from "user"`;

interface Snapshot {
  registrations: RegistrationRow[];
  sms: SmsRow[];
  volunteers: VolunteerRow[];
  ambassadors: AmbassadorRow[];
  accounts: AccountRow[];
  counters: { prefix: string; lastNumber: number }[];
  sessions: { total: number; distinctUsers: number; live: number };
  providers: CountRow[];
  posts: number;
}

async function readAll(): Promise<Snapshot> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required.");

  const db = postgres(url, { max: 1, connect_timeout: 30, idle_timeout: 20 });
  try {
    const registrations = (await db.unsafe(REGISTRATION_SELECT)) as RegistrationRow[];
    const sms = (await db.unsafe(SMS_SELECT)) as SmsRow[];
    const volunteers = (await db.unsafe(VOLUNTEER_SELECT)) as VolunteerRow[];
    const ambassadors = (await db.unsafe(AMBASSADOR_SELECT)) as AmbassadorRow[];
    const accounts = (await db.unsafe(ACCOUNT_SELECT)) as AccountRow[];
    const counters = (await db.unsafe(
      `select prefix, last_number as "lastNumber" from stem_fest_registration_counters order by prefix`,
    )) as { prefix: string; lastNumber: number }[];
    const sessions = (
      await db.unsafe(`
        select
          count(*)::int as total,
          count(distinct "userId")::int as "distinctUsers",
          count(*) filter (where "expiresAt" > now())::int as live
        from session`)
    )[0] as unknown as Snapshot["sessions"];
    const providers = (await db.unsafe(
      `select "providerId" as label, count(*)::int as count from account group by 1 order by 2 desc`,
    )) as CountRow[];
    const posts = (await db.unsafe(`select count(*)::int as n from posts`))[0].n as number;

    return { registrations, sms, volunteers, ambassadors, accounts, counters, sessions, providers, posts };
  } finally {
    await db.end();
  }
}

// ── The statistics ────────────────────────────────────────────────────────────

function buildStats(data: Snapshot) {
  const { registrations, sms, volunteers, ambassadors, accounts, counters } = data;
  const now = new Date();

  const held = registrations.map((row) => {
    const entries = parseSegments(row.segments);
    const { amounts, drift } = attributeFees(entries, row.school, row.totalFee);
    return { row, entries, amounts, drift };
  });

  const verified = registrations.filter((row) => row.status === "verified");
  const pending = registrations.filter((row) => row.status === "pending");
  const rejected = registrations.filter((row) => row.status === "rejected");

  const allEntries = held.flatMap((row) => row.entries);
  const days = registrations.map((row) => dayKey(row.submittedAt));
  const sortedDays = [...days].sort();
  const openDays = eachDay(sortedDays).length;
  const schoolCounts = new Map<string, number>();
  for (const row of registrations) {
    const key = schoolKey(row.school);
    schoolCounts.set(key, (schoolCounts.get(key) ?? 0) + 1);
  }
  const collected = sumOf(verified, (row) => row.totalFee);
  const expected = sumOf(registrations.filter((row) => row.status !== "rejected"), (row) => row.totalFee);
  const markedCount = countWhere(registrations, (row) => row.attendance);

  // ── Payments ───────────────────────────────────────────────────────────────
  const decided = registrations.filter((row) => row.decidedAt !== null);
  const decisionHours = decided.map((row) => hoursBetween(row.submittedAt, row.decidedAt as Date));
  const backlogDays = pending.map((row) => hoursBetween(row.submittedAt, now) / 24);
  const referred = registrations.filter((row) => (row.reference ?? "").trim() !== "");

  const adminAlias = new Map<string, string>();
  for (const row of decided) {
    const key = (row.decidedBy ?? "(nothing recorded)").toLowerCase();
    if (!adminAlias.has(key)) adminAlias.set(key, `Admin ${String.fromCharCode(65 + adminAlias.size)}`);
  }
  const aliasFor = (row: RegistrationRow) =>
    adminAlias.get((row.decidedBy ?? "(nothing recorded)").toLowerCase()) ?? "Unattributed";

  const payments = {
    statusMix: tally(registrations.map((row) => row.status)),
    verificationSource: tally(verified.map((row) => row.verificationSource)),
    adminTouched: decided.length,
    smsDerived: registrations.length - decided.length,
    decisionLatency: {
      ...stats(decisionHours),
      unit: "hours",
      buckets: histogram(decisionHours, [
        { label: "Under 1 hour", test: (h) => h < 1 },
        { label: "1–24 hours", test: (h) => h >= 1 && h < 24 },
        { label: "1–3 days", test: (h) => h >= 24 && h < 72 },
        { label: "3–7 days", test: (h) => h >= 72 && h < 168 },
        { label: "Over 7 days", test: (h) => h >= 168 },
      ]),
    },
    backlogAge: {
      ...stats(backlogDays),
      unit: "days",
      buckets: histogram(backlogDays, [
        { label: "Under 1 day", test: (d) => d < 1 },
        { label: "1–2 days", test: (d) => d >= 1 && d < 2 },
        { label: "2–4 days", test: (d) => d >= 2 && d < 4 },
        { label: "4–7 days", test: (d) => d >= 4 && d < 7 },
        { label: "Over a week", test: (d) => d >= 7 },
      ]),
    },
    money: {
      collected,
      expected,
      outstanding: expected - collected,
      collectedShare: share(collected, expected),
      byStatus: [
        { label: "Collected (verified)", count: collected },
        { label: "At stake (pending)", count: sumOf(pending, (row) => row.totalFee) },
        { label: "Walked (rejected)", count: sumOf(rejected, (row) => row.totalFee) },
      ],
      feeTiers: tally(registrations.filter((row) => row.totalFee !== null).map((row) => row.totalFee as number)),
      feeStats: stats(registrations.map((row) => row.totalFee).filter((v): v is number => v !== null)),
      rowsWithoutFee: countWhere(registrations, (row) => row.totalFee === null),
      attributionDrift: countWhere(held, (row) => row.drift !== null),
      emailSent: countWhere(registrations, (row) => row.emailSentAt !== null),
      emailSentShareOfVerified: share(countWhere(registrations, (row) => row.emailSentAt !== null), verified.length),
      decisionsByAdmin: tally(decided.map(aliasFor)).map((row, index) => ({ rank: index + 1, label: row.label, count: row.count })),
      decisionsPerDay: daySeries(decided.map((row) => ({ at: row.decidedAt as Date }))),
      decisionDaysActive: new Set(decided.map((row) => dayKey(row.decidedAt as Date))).size,
    },
  };

  // ── Time ───────────────────────────────────────────────────────────────────
  const dailySeries = daySeries(registrations.map((row) => ({ at: row.submittedAt })));
  const perWeek = new Map<string, number>();
  for (const point of dailySeries) {
    const week = weekOf(point.day);
    perWeek.set(week, (perWeek.get(week) ?? 0) + point.count);
  }
  const weeklySeries = [...perWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count], index, list) => ({
      week,
      count,
      change: index === 0 ? null : count - list[index - 1][1],
    }));

  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour: String(hour).padStart(2, "0"),
    count: countWhere(registrations, (row) => Number(hourKey(row.submittedAt)) === hour),
  }));
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({
    label,
    count: countWhere(registrations, (row) => weekdayKey(row.submittedAt) === label),
  }));

  const ordered = [...registrations].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const gaps: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    gaps.push(hoursBetween(ordered[index - 1].submittedAt, ordered[index].submittedAt) * 60);
  }
  const peakDay = [...dailySeries].sort((a, b) => b.count - a.count)[0] ?? null;
  const peakHour = [...hourly].sort((a, b) => b.count - a.count)[0] ?? null;
  const lastSeven = dailySeries.slice(-7).reduce((total, point) => total + point.count, 0);
  const perDayAverage = registrations.length / Math.max(openDays, 1);

  const time = {
    firstDay: sortedDays[0] ?? null,
    lastDay: sortedDays[sortedDays.length - 1] ?? null,
    openDays,
    perDayAverage: round1(perDayAverage),
    dailySeries,
    weeklySeries,
    hourly,
    weekdays,
    peakDay,
    peakHour,
    quietHours: hourly.filter((row) => row.count === 0).map((row) => row.hour),
    interArrival: {
      ...stats(gaps),
      unit: "minutes",
      buckets: histogram(gaps, [
        { label: "Under a minute", test: (m) => m < 1 },
        { label: "1–10 minutes", test: (m) => m >= 1 && m < 10 },
        { label: "10–60 minutes", test: (m) => m >= 10 && m < 60 },
        { label: "1–6 hours", test: (m) => m >= 60 && m < 360 },
        { label: "Over 6 hours", test: (m) => m >= 360 },
      ]),
    },
    lastSeven,
    lastSevenPerDay: round1(lastSeven / 7),
    velocityVsAverage: round1(lastSeven / 7 / Math.max(perDayAverage, 0.001)),
    partOfDay: histogram(
      registrations.map((row) => Number(hourKey(row.submittedAt))),
      [
        { label: "Night 00–06", test: (h) => h < 6 },
        { label: "Morning 06–12", test: (h) => h >= 6 && h < 12 },
        { label: "Afternoon 12–18", test: (h) => h >= 12 && h < 18 },
        { label: "Evening 18–24", test: (h) => h >= 18 },
      ],
    ),
  };

  // ── Who entered ────────────────────────────────────────────────────────────
  const classCounts = new Map(tally(registrations.map((row) => row.classId)).map((row) => [row.label, row.count]));
  const classOrder = stemfestClasses.map((row) => row.id);
  const classMix = classOrder.map((id) => ({ id, label: getStemfestClassLabel(id), count: classCounts.get(id) ?? 0 }));
  const entriesPerRow = held.map((row) => row.entries.length);

  const people = {
    classMix,
    classGroups: [
      { label: "School (Class 3–10)", count: countWhere(registrations, (row) => /^class-(3|4|5|6|7|8|9|10)$/.test(row.classId)) },
      { label: "College (AS / A2)", count: countWhere(registrations, (row) => row.classId === "as" || row.classId === "a2") },
      { label: "University", count: countWhere(registrations, (row) => row.classId === "university") },
      { label: "Off-catalogue answer", count: countWhere(registrations, (row) => !classOrder.includes(row.classId as StemfestClassId)) },
    ],
    genderMix: tally(registrations.map((row) => row.gender)),
    genderByClass: classOrder.map((id) => {
      const rows = registrations.filter((row) => row.classId === id);
      return {
        label: getStemfestClassLabel(id),
        male: countWhere(rows, (row) => row.gender === "male"),
        female: countWhere(rows, (row) => row.gender === "female"),
        other: countWhere(rows, (row) => row.gender === "other"),
        total: rows.length,
      };
    }),
    genderMissing: countWhere(registrations, (row) => !row.gender),
    entriesPerRegistration: {
      ...stats(entriesPerRow),
      buckets: histogram(entriesPerRow, [
        { label: "1 event", test: (n) => n === 1 },
        { label: "2 events", test: (n) => n === 2 },
        { label: "3 events", test: (n) => n === 3 },
        { label: "4+ events", test: (n) => n >= 4 },
        { label: "Nothing readable", test: (n) => n === 0 },
      ]),
    },
    codePrefixes: (() => {
      // The trigger's own prefix vocabulary, longest first, so `MA2` is not read
      // as `M`. A code whose prefix has no counter row is filed under its gender
      // letter alone.
      const prefixes = [...new Set([...counters.map((counter) => counter.prefix)])]
        .sort((a, b) => b.length - a.length);
      const counts = new Map<string, number>();
      for (const row of registrations) {
        const hit =
          prefixes.find((prefix) => row.registrationCode.startsWith(prefix)) ??
          row.registrationCode.slice(0, 1);
        counts.set(hit, (counts.get(hit) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([prefix, count]) => ({ prefix, count }))
        .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix));
    })(),
    genderLetters: (() => {
      const names: Record<string, string> = { M: "Male", F: "Female", X: "Gender not given", O: "Other" };
      const counts = new Map<string, number>();
      for (const row of registrations) {
        const letter = row.registrationCode.slice(0, 1);
        counts.set(letter, (counts.get(letter) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([letter, count]) => ({ label: names[letter] ?? `Unknown (${letter})`, count }))
        .sort((a, b) => b.count - a.count);
    })(),
    counterVsRows: counters
      .map((counter) => ({
        prefix: counter.prefix,
        issued: counter.lastNumber,
        rows: countWhere(registrations, (row) => row.registrationCode.startsWith(counter.prefix)),
      }))
      .filter((row) => row.issued !== row.rows),
    duplicateNameAndSchool: (() => {
      const seen = new Map<string, number>();
      for (const row of registrations) {
        const key = `${row.name.trim().toLowerCase()}|${schoolKey(row.school).toLowerCase()}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      return [...seen.values()].filter((n) => n > 1).reduce((total, n) => total + n, 0);
    })(),
    messyNames: countWhere(registrations, (row) => row.name !== row.name.trim() || /\s{2,}/.test(row.name)),
  };

  // ── Events and brackets ────────────────────────────────────────────────────
  const eventById = new Map(stemfestEvents.map((event) => [event.id, event]));
  const entriesByEvent = new Map<string, StoredEntry[]>();
  for (const row of held) {
    for (const entry of row.entries) {
      entriesByEvent.set(entry.eventId, [...(entriesByEvent.get(entry.eventId) ?? []), entry]);
    }
  }

  const eventRows = stemfestEvents.map((event) => {
    const entries = entriesByEvent.get(event.id) ?? [];
    const rows = held.filter(({ entries: mine }) => mine.some((entry) => entry.eventId === event.id));
    const participants = rows.map((row) => row.row);
    return {
      id: event.id,
      name: event.name,
      segmentId: event.segmentId,
      teamBased: event.teamBased,
      categories: event.categories.length,
      entries: entries.length,
      participants: participants.length,
      verified: countWhere(participants, (row) => row.status === "verified"),
      pending: countWhere(participants, (row) => row.status === "pending"),
      rejected: countWhere(participants, (row) => row.status === "rejected"),
      male: countWhere(participants, (row) => row.gender === "male"),
      female: countWhere(participants, (row) => row.gender === "female"),
      present: countWhere(participants, (row) => row.attendance),
      money: rows.reduce((total, row) => total + (row.amounts.get(event.id) ?? 0), 0),
      classesCovered: new Set(participants.map((row) => row.classId)).size,
    };
  });

  const bracketCounts = new Map<string, number>();
  for (const entry of allEntries) {
    const key = bracketKey(entry.eventId, entry.categoryId);
    bracketCounts.set(key, (bracketCounts.get(key) ?? 0) + 1);
  }
  const bracketFill = brackets
    .map((bracket) => ({
      id: bracket.id,
      event: bracket.eventName,
      segment: bracket.segmentName,
      category: bracket.categoryLabel,
      band: bracket.classBand,
      teamBased: bracket.teamBased,
      scheduled: bracket.scheduled,
      count: bracketCounts.get(bracket.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  const knownBracketKeys = new Set(brackets.map((bracket) => bracket.id));
  const outsideBand = held.reduce((total, row) => {
    let hit = 0;
    for (const entry of row.entries) {
      const bracket = brackets.find(
        (candidate) => candidate.eventId === entry.eventId && candidate.categoryId === entry.categoryId,
      );
      if (bracket && !bracket.classes.includes(row.row.classId as StemfestClassId)) hit += 1;
    }
    return total + hit;
  }, 0);
  const teamEntries = allEntries.filter((entry) => entry.teamSize !== null);

  const events = {
    totalEntries: allEntries.length,
    perEvent: eventRows,
    perSegment: (() => {
      const buckets = new Map<string, { entries: number; ids: Set<string>; money: number }>();
      for (const row of held) {
        for (const entry of row.entries) {
          const segmentId = eventById.get(entry.eventId)?.segmentId ?? "unmapped";
          const bucket = buckets.get(segmentId) ?? { entries: 0, ids: new Set<string>(), money: 0 };
          bucket.entries += 1;
          bucket.ids.add(row.row.id);
          bucket.money += row.amounts.get(entry.eventId) ?? 0;
          buckets.set(segmentId, bucket);
        }
      }
      return [...buckets.entries()]
        .map(([id, bucket]) => ({ id, entries: bucket.entries, participants: bucket.ids.size, money: bucket.money }))
        .sort((a, b) => b.entries - a.entries);
    })(),
    brackets: {
      total: brackets.length,
      filled: countWhere(bracketFill, (row) => row.count > 0),
      empty: countWhere(bracketFill, (row) => row.count === 0),
      largest: bracketFill.slice(0, 14),
      /** All of them, so a sheet can show the whole grid rather than its head. */
      all: bracketFill,
      emptyList: bracketFill.filter((row) => row.count === 0),
      unplaced: [...bracketCounts.entries()]
        .filter(([key, count]) => !knownBracketKeys.has(key) && count > 0)
        .map(([key, count]) => ({ key, count })),
      outsideEligibleBand: outsideBand,
    },
    categoryMix: tally(
      allEntries
        .filter((entry) => entry.categoryId !== null)
        .map((entry) => `${eventById.get(entry.eventId)?.name ?? entry.eventId} · ${entry.categoryId}`),
    ),
    teams: {
      sized: teamEntries.length,
      sizeMix: tally(teamEntries.map((entry) => `Team of ${entry.teamSize}`)),
      named: countWhere(teamEntries, (entry) => (entry.teamName ?? "").trim() !== ""),
      robotics: countWhere(allEntries, (entry) => entry.eventId === "lfr" || entry.eventId === "robosoccer"),
      projectDisplay: countWhere(allEntries, (entry) => entry.eventId === "project-display"),
    },
    unmappedRegistrations: countWhere(held, (row) => row.entries.length === 0),
  };

  // ── Schools ────────────────────────────────────────────────────────────────
  const schoolValues = [...schoolCounts.values()].sort((a, b) => b - a);
  const hostRows = registrations.filter((row) => isManaratSchool(row.school));
  const newSchoolPerWeek = new Map<string, number>();
  const cumulativeSchoolPerWeek = new Map<string, number>();
  {
    const seen = new Set<string>();
    for (const row of ordered) {
      const week = weekOf(dayKey(row.submittedAt));
      const key = schoolKey(row.school);
      if (!seen.has(key)) {
        seen.add(key);
        newSchoolPerWeek.set(week, (newSchoolPerWeek.get(week) ?? 0) + 1);
      }
      cumulativeSchoolPerWeek.set(week, seen.size);
    }
  }

  const schools = {
    distinct: schoolCounts.size,
    withVerifiedPayment: new Set(verified.map((row) => schoolKey(row.school))).size,
    host: {
      entries: hostRows.length,
      share: share(hostRows.length, registrations.length),
      spellingsCollapsed: new Set(hostRows.map((row) => row.school.trim().toLowerCase())).size,
    },
    nonHost: registrations.length - hostRows.length,
    entriesPerSchool: {
      mean: round1(registrations.length / Math.max(schoolCounts.size, 1)),
      median: quantile([...schoolValues].sort((a, b) => a - b), 0.5),
      max: schoolValues[0] ?? 0,
      buckets: histogram(schoolValues, [
        { label: "1 entry", test: (n) => n === 1 },
        { label: "2–4 entries", test: (n) => n >= 2 && n <= 4 },
        { label: "5–9 entries", test: (n) => n >= 5 && n <= 9 },
        { label: "10–19 entries", test: (n) => n >= 10 && n <= 19 },
        { label: "20–49 entries", test: (n) => n >= 20 && n <= 49 },
        { label: "50+ entries", test: (n) => n >= 50 },
      ]),
    },
    concentration: {
      top1: schoolValues[0] ?? 0,
      top1Share: share(schoolValues[0] ?? 0, registrations.length),
      top3Share: share(schoolValues.slice(0, 3).reduce((a, b) => a + b, 0), registrations.length),
      top10Share: share(schoolValues.slice(0, 10).reduce((a, b) => a + b, 0), registrations.length),
      schoolsOfOne: schoolValues.filter((n) => n === 1).length,
      tailShare: share(schoolValues.filter((n) => n === 1).reduce((a, b) => a + b, 0), registrations.length),
    },
    ranked: schoolValues.map((count, index) => ({ rank: index + 1, count })),
    perWeek: [...perWeek.keys()].sort().map((week) => ({
      week,
      newSchools: newSchoolPerWeek.get(week) ?? 0,
      cumulative: cumulativeSchoolPerWeek.get(week) ?? 0,
    })),
  };

  // ── Referrers ──────────────────────────────────────────────────────────────
  const refCounts = new Map<string, number>();
  for (const row of referred) {
    const key = (row.reference as string).trim().toLowerCase();
    refCounts.set(key, (refCounts.get(key) ?? 0) + 1);
  }
  const rankedRefs = [...refCounts.values()].sort((a, b) => b - a);
  const roster = new Set(stemfestReferencesAll.map((name) => name.trim().toLowerCase()));
  const referredVerified = countWhere(referred, (row) => row.status === "verified");

  const referrers = {
    recorded: referred.length,
    recordedShare: share(referred.length, registrations.length),
    blank: registrations.length - referred.length,
    blankShare: share(registrations.length - referred.length, registrations.length),
    distinct: refCounts.size,
    rosterMatched: [...refCounts.keys()].filter((name) => roster.has(name)).length,
    offRoster: [...refCounts.keys()].filter((name) => !roster.has(name)).length,
    concentration: {
      top1: rankedRefs[0] ?? 0,
      top1Share: share(rankedRefs[0] ?? 0, referred.length),
      top3Share: share(rankedRefs.slice(0, 3).reduce((a, b) => a + b, 0), referred.length),
      top5Share: share(rankedRefs.slice(0, 5).reduce((a, b) => a + b, 0), referred.length),
    },
    // Ranked, never named: the shape of the leaderboard is the statistic.
    leaderboard: rankedRefs.map((count, index) => ({ rank: index + 1, count })),
    reach: histogram(rankedRefs, [
      { label: "1 entry", test: (n) => n === 1 },
      { label: "2–4 entries", test: (n) => n >= 2 && n <= 4 },
      { label: "5–9 entries", test: (n) => n >= 5 && n <= 9 },
      { label: "10–19 entries", test: (n) => n >= 10 && n <= 19 },
      { label: "20+ entries", test: (n) => n >= 20 },
    ]),
    referredVerifiedRate: share(referredVerified, referred.length),
    unreferredVerifiedRate: share(
      countWhere(registrations.filter((row) => !referred.includes(row)), (row) => row.status === "verified"),
      registrations.length - referred.length,
    ),
  };

  // ── SMS reconciliation ─────────────────────────────────────────────────────
  const amounts = sms.map((row) => row.amount).filter((value): value is number => value !== null);
  const ingestLagHours = sms.map((row) => hoursBetween(row.receivedAt, row.deliveredAt));
  const smsByTrx = new Map<string, SmsRow[]>();
  for (const row of sms) {
    const trx = (row.transactionId ?? "").trim().toUpperCase();
    if (!trx) continue;
    smsByTrx.set(trx, [...(smsByTrx.get(trx) ?? []), row]);
  }
  const regByTrx = new Map<string, RegistrationRow>();
  for (const row of registrations) regByTrx.set(row.transactionId.trim().toUpperCase(), row);
  const canonical = (trx: string) => trx.replace(/O/g, "0").replace(/I/g, "1").replace(/l/g, "1");

  const unmatchedSms = sms.filter((row) => row.status !== "matched");
  let o0Recoverable = 0;
  for (const row of unmatchedSms) {
    const trx = (row.transactionId ?? "").trim().toUpperCase();
    if (!trx || regByTrx.has(trx)) continue;
    if (regByTrx.has(canonical(trx))) o0Recoverable += 1;
  }
  const walletAndFee = new Set(
    registrations
      .filter((row) => row.status !== "verified")
      .map((row) => `${row.paymentNumber.trim()}|${row.totalFee ?? 0}`),
  );
  const walletRecoverable = countWhere(unmatchedSms, (row) =>
    walletAndFee.has(`${(row.senderNumber ?? "").trim()}|${row.amount ?? 0}`),
  );

  const perSmsDay = new Map<string, number>();
  for (const row of sms) {
    const key = dayKey(row.deliveredAt);
    perSmsDay.set(key, (perSmsDay.get(key) ?? 0) + 1);
  }
  const wallets = new Map<string, number>();
  for (const row of registrations) {
    const key = row.paymentNumber.trim();
    if (!key) continue;
    wallets.set(key, (wallets.get(key) ?? 0) + 1);
  }
  const walletValues = [...wallets.values()].sort((a, b) => b - a);
  const trxFailures = registrations
    .map((row) => ({ row, reason: diagnoseTrx(row.transactionId) }))
    .filter((entry): entry is { row: RegistrationRow; reason: string } => entry.reason !== null);
  const reconcileLags: number[] = [];
  for (const [trx, rows] of smsByTrx) {
    const registration = regByTrx.get(trx);
    if (!registration) continue;
    const earliest = Math.min(...rows.map((row) => row.deliveredAt.getTime()));
    const lag = (earliest - registration.submittedAt.getTime()) / 3_600_000;
    if (lag >= 0) reconcileLags.push(lag);
  }

  const smsStats = {
    total: sms.length,
    statusMix: tally(sms.map((row) => row.status)),
    channelMix: tally(sms.map((row) => (row.channel === "replay" ? "Replayed by hand" : row.channel === "phone" ? "Forwarded by the phone" : "Other"))),
    matchedRegistrations: countWhere(registrations, (row) => row.verificationSource === "sms"),
    amounts: {
      ...stats(amounts),
      distinct: new Set(amounts).size,
      buckets: histogram(amounts, [
        { label: "৳200", test: (a) => a === 200 },
        { label: "৳350", test: (a) => a === 350 },
        { label: "৳400", test: (a) => a === 400 },
        { label: "৳500–999", test: (a) => a >= 500 && a < 1000 },
        { label: "৳1,000–1,999", test: (a) => a >= 1000 && a < 2000 },
        { label: "৳2,000+", test: (a) => a >= 2000 },
      ]),
    },
    distinctWallets: wallets.size,
    /**
     * How much of the SMS log is fest money. A payment number and an amount that
     * equal no row's fee is money the club received for something else.
     */
    amountVsFee: (() => {
      const fees = new Set(registrations.map((row) => row.totalFee ?? 0));
      const withAmount = sms.filter((row) => row.amount !== null);
      const matches = countWhere(withAmount, (row) => fees.has(Math.round(row.amount as number)));
      const bigOnes = withAmount.filter((row) => (row.amount as number) > 5000);
      return {
        messages: withAmount.length,
        equalToFees: matches,
        otherAmounts: withAmount.length - matches,
        aboveFiveThousand: bigOnes.length,
        aboveFiveThousandSum: round1(sumOf(bigOnes, (row) => row.amount)),
      };
    })(),
    walletConcentration: {
      top1: walletValues[0] ?? 0,
      top3Share: share(walletValues.slice(0, 3).reduce((a, b) => a + b, 0), registrations.length),
      multiUse: walletValues.filter((n) => n > 1).length,
      buckets: histogram(walletValues, [
        { label: "1 registration", test: (n) => n === 1 },
        { label: "2–3", test: (n) => n >= 2 && n <= 3 },
        { label: "4–6", test: (n) => n >= 4 && n <= 6 },
        { label: "7+", test: (n) => n >= 7 },
      ]),
    },
    duplicateTrxInSms: [...smsByTrx.values()].filter((rows) => rows.length > 1).length,
    sharedTrxAcrossRegistrations: (() => {
      const seen = new Map<string, number>();
      for (const row of registrations) {
        const key = row.transactionId.trim().toUpperCase();
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      return [...seen.values()].filter((n) => n > 1).reduce((total, n) => total + n, 0);
    })(),
    ingestLag: {
      ...stats(ingestLagHours),
      unit: "hours",
      buckets: histogram(ingestLagHours, [
        { label: "Under 1 hour", test: (h) => h < 1 },
        { label: "1–6 hours", test: (h) => h >= 1 && h < 6 },
        { label: "6–24 hours", test: (h) => h >= 6 && h < 24 },
        { label: "1–3 days", test: (h) => h >= 24 && h < 72 },
        { label: "Over 3 days", test: (h) => h >= 72 },
      ]),
      clockSkew: countWhere(ingestLagHours, (h) => h < 0),
    },
    reconcileLag: { ...stats(reconcileLags), unit: "hours" },
    dailySeries: daySeries(sms.map((row) => ({ at: row.deliveredAt }))),
    daysActive: perSmsDay.size,
    recovery: {
      unmatched: countWhere(sms, (row) => row.status === "unmatched"),
      ignored: countWhere(sms, (row) => row.status === "ignored"),
      o0Transpositions: o0Recoverable,
      walletPlusAmount: walletRecoverable,
    },
    messageLength: stats(sms.map((row) => row.rawLength)),
    hygiene: {
      failures: trxFailures.length,
      failureShare: share(trxFailures.length, registrations.length),
      reasons: tally(trxFailures.map((entry) => entry.reason)),
      byStatus: (["pending", "verified", "rejected"] as PaymentStatus[]).map((status) => ({
        status,
        failures: countWhere(trxFailures, (entry) => entry.row.status === status),
      })),
    },
  };

  // ── Attendance ─────────────────────────────────────────────────────────────
  const marked = registrations.filter((row) => row.attendance);
  const markedAt = registrations.filter((row) => row.attendanceMarkedAt !== null);

  const attendance = {
    marked: marked.length,
    unmarked: registrations.length - marked.length,
    rate: share(marked.length, registrations.length),
    cross: {
      verifiedAndPresent: countWhere(marked, (row) => row.status === "verified"),
      unverifiedButPresent: countWhere(marked, (row) => row.status !== "verified"),
      verifiedButAbsent: countWhere(verified, (row) => !row.attendance),
      rejectedButPresent: countWhere(marked, (row) => row.status === "rejected"),
    },
    byClass: classOrder.map((id) => {
      const rows = registrations.filter((row) => row.classId === id);
      return {
        label: getStemfestClassLabel(id),
        marked: countWhere(rows, (row) => row.attendance),
        total: rows.length,
        rate: share(countWhere(rows, (row) => row.attendance), rows.length),
      };
    }),
    byGender: tally(registrations.map((row) => row.gender)).map((row) => {
      const rows = registrations.filter((candidate) => (candidate.gender ?? "—") === row.label);
      return {
        label: row.label,
        marked: countWhere(rows, (candidate) => candidate.attendance),
        total: rows.length,
        rate: share(countWhere(rows, (candidate) => candidate.attendance), rows.length),
      };
    }),
    byEvent: eventRows
      .map((event) => {
        const participants = held
          .filter((row) => row.entries.some((entry) => entry.eventId === event.id))
          .map((row) => row.row);
        return {
          label: event.name,
          marked: countWhere(participants, (row) => row.attendance),
          total: participants.length,
          rate: share(countWhere(participants, (row) => row.attendance), participants.length),
        };
      })
      .sort((a, b) => b.rate - a.rate),
    markingSeries: daySeries(markedAt.map((row) => ({ at: row.attendanceMarkedAt as Date }))),
    markingDays: perDayCount(markedAt.map((row) => dayKey(row.attendanceMarkedAt as Date))),
    cursorRows: markedAt.length,
    sameDayMarks: countWhere(markedAt, (row) => dayKey(row.attendanceMarkedAt as Date) === dayKey(row.submittedAt)),
  };

  // ── Volunteer form ─────────────────────────────────────────────────────────
  /**
   * Which way an answer reads *for the club*. The hesitation question is negated
   * — "No, I won't be nervous" is the reassuring answer — so a plain yes/no tally
   * would colour 97 good applicants as refusals.
   */
  const consentQuestions = [
    { label: "Available the whole week", field: "attendanceWeek" as const, desired: "yes" as const },
    { label: "Parents comfortable with long hours", field: "parentsComfort" as const, desired: "yes" as const },
    { label: "No hesitation about campus", field: "campusHesitation" as const, desired: "no" as const },
  ];

  const consentVerdict = (answer: string, desired: "yes" | "no"): string => {
    const read = consentOf(answer);
    if (read === "qualified") return "Conditional";
    if (read === "unclear") return "Reads neither way";
    if (read === desired) return desired === "yes" ? "Yes, plainly" : "No hesitation";
    return desired === "yes" ? "No" : "Hesitation";
  };

  const volunteersOut = {
    total: volunteers.length,
    firstDay: volunteers.length ? dayKey(volunteers[0].createdAt) : null,
    lastDay: volunteers.length ? dayKey(volunteers[volunteers.length - 1].createdAt) : null,
    daysActive: new Set(volunteers.map((row) => dayKey(row.createdAt))).size,
    shiftMix: tally(volunteers.map((row) => shiftOf(row.shift))),
    rawShiftVariants: new Set(volunteers.map((row) => (row.shift ?? "").trim().toLowerCase())).size,
    levelMix: levelMix(volunteers.map((row) => row.classSection)),
    unparsableLevel: countWhere(volunteers, (row) => levelOf(row.classSection) === null),
    consent: consentQuestions.map((question) => ({
      label: question.label,
      buckets: tally(volunteers.map((row) => consentVerdict(row[question.field], question.desired))),
      copyLength: stats(volunteers.map((row) => (row[question.field] ?? "").length)),
    })),
    essayLength: {
      taskConflict: stats(volunteers.map((row) => row.scenarioTaskConflict.length)),
      peerConduct: stats(volunteers.map((row) => row.scenarioPeerConduct.length)),
      selectionReason: stats(volunteers.map((row) => row.selectionReason.length)),
    },
    oneWordScenarios: countWhere(
      volunteers,
      (row) =>
        row.scenarioTaskConflict.trim().split(/\s+/).length <= 2 ||
        row.scenarioPeerConduct.trim().split(/\s+/).length <= 2,
    ),
    longestEssay: stats([
      ...volunteers.map((row) => row.scenarioTaskConflict.length),
      ...volunteers.map((row) => row.scenarioPeerConduct.length),
      ...volunteers.map((row) => row.selectionReason.length),
    ]),
    phonesIdentical: countWhere(volunteers, (row) => row.phonesMatch),
    phoneShape: tally(volunteers.map((row) => String(row.personalPhoneLength))),
    rollShape: tally(volunteers.map((row) => rollShape(row.roll))),
    duplicateStudentCodes: (() => {
      const seen = new Map<string, number>();
      for (const row of volunteers) {
        const key = row.studentCode.trim().toLowerCase();
        if (!key) continue;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      return [...seen.values()].filter((n) => n > 1).reduce((total, n) => total + n, 0);
    })(),
    dailySeries: daySeries(volunteers.map((row) => ({ at: row.createdAt }))),
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour: String(hour).padStart(2, "0"),
      count: countWhere(volunteers, (row) => Number(hourKey(row.createdAt)) === hour),
    })),
    peakDay: tally(volunteers.map((row) => dayKey(row.createdAt)))[0] ?? null,
  };

  // ── Campus Ambassador form ─────────────────────────────────────────────────
  const ambassadorsOut = {
    total: ambassadors.length,
    typeMix: tally(ambassadors.map((row) => (row.type === "batch" ? "Batch" : "Campus"))),
    firstDay: ambassadors.length ? dayKey(ambassadors[0].createdAt) : null,
    lastDay: ambassadors.length ? dayKey(ambassadors[ambassadors.length - 1].createdAt) : null,
    daysActive: new Set(ambassadors.map((row) => dayKey(row.createdAt))).size,
    distinctSchools: new Set(ambassadors.map((row) => schoolKey(row.school))).size,
    levelMix: levelMix(ambassadors.map((row) => row.class)),
    rawClassVariants: new Set(ambassadors.map((row) => (row.class ?? "").trim().toLowerCase())).size,
    genderMix: tally(ambassadors.map((row) => row.gender ?? "—")),
    firstTime: {
      yes: countWhere(ambassadors, (row) => row.firstTime),
      no: countWhere(ambassadors, (row) => !row.firstTime),
      share: share(countWhere(ambassadors, (row) => row.firstTime), ambassadors.length),
    },
    contactCoverage: [
      { label: "Phone", count: countWhere(ambassadors, (row) => row.hasPhone) },
      { label: "Email", count: countWhere(ambassadors, (row) => row.hasEmail) },
      { label: "Facebook", count: countWhere(ambassadors, (row) => row.hasFacebook) },
      { label: "Instagram", count: countWhere(ambassadors, (row) => row.hasInstagram) },
    ],
    socialMatrix: tally(
      ambassadors.map((row) =>
        row.hasFacebook && row.hasInstagram
          ? "Both"
          : row.hasFacebook
            ? "Facebook only"
            : row.hasInstagram
              ? "Instagram only"
              : "Neither",
      ),
    ),
    experienceLength: stats(ambassadors.map((row) => row.experienceLength)),
    experienceBuckets: histogram(
      ambassadors.map((row) => row.experienceLength),
      [
        { label: "Blank", test: (n) => n === 0 },
        { label: "Under 50 chars", test: (n) => n > 0 && n < 50 },
        { label: "50–150", test: (n) => n >= 50 && n < 150 },
        { label: "150–400", test: (n) => n >= 150 && n < 400 },
        { label: "400+", test: (n) => n >= 400 },
      ],
    ),
    weeklySeries: (() => {
      const counts = new Map<string, number>();
      for (const row of ambassadors) {
        const week = weekOf(dayKey(row.createdAt));
        counts.set(week, (counts.get(week) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, count]) => ({ week, count }));
    })(),
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour: String(hour).padStart(2, "0"),
      count: countWhere(ambassadors, (row) => Number(hourKey(row.createdAt)) === hour),
    })),
    typeByGender: ["campus", "batch"].map((type) => {
      const rows = ambassadors.filter((row) => row.type === type);
      return {
        label: type === "campus" ? "Campus" : "Batch",
        male: countWhere(rows, (row) => row.gender === "male"),
        female: countWhere(rows, (row) => row.gender === "female"),
        total: rows.length,
      };
    }),
  };

  // ── Accounts and sessions ──────────────────────────────────────────────────
  const realAccounts = accounts.filter((row) => !row.isTest);
  const accountsOut = {
    total: accounts.length,
    testAccounts: countWhere(accounts, (row) => row.isTest),
    real: realAccounts.length,
    roleMix: tally(accounts.map((row) => row.role)),
    realRoleMix: tally(realAccounts.map((row) => row.role)),
    emailVerified: countWhere(accounts, (row) => row.emailVerified),
    banned: countWhere(accounts, (row) => row.banned === true),
    providers: data.providers,
    sessions: data.sessions,
    perMonth: (() => {
      const counts = new Map<string, number>();
      for (const row of accounts) {
        if (!row.createdAt) continue;
        const key = monthKey(row.createdAt);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));
    })(),
    posts: data.posts,
  };

  // ── Completeness of the fest form ──────────────────────────────────────────
  const completeness = [
    { label: "bKash Transaction ID typed", present: countWhere(registrations, (row) => row.transactionId.trim() !== "") },
    { label: "Payment number given", present: countWhere(registrations, (row) => row.paymentNumber.trim() !== "") },
    { label: "Email address", present: countWhere(registrations, (row) => !!row.email) },
    { label: "Referrer named", present: referred.length },
    { label: "Gender", present: countWhere(registrations, (row) => !!row.gender) },
    { label: "Fee recorded on the row", present: countWhere(registrations, (row) => row.totalFee !== null) },
    { label: "Readable entries in the prose", present: countWhere(held, (row) => row.entries.length > 0) },
    { label: "An admin has touched it", present: decided.length },
    { label: "Confirmation email sent", present: countWhere(registrations, (row) => row.emailSentAt !== null) },
    { label: "Attendance cursor written", present: markedAt.length },
  ].map((row) => ({
    ...row,
    missing: registrations.length - row.present,
    share: share(row.present, registrations.length),
  }));

  /**
   * The journey one registration takes, each step read as a share of the entries
   * filed. The steps are not nested — an admin acceptance and an SMS match are two
   * routes to the same verified row — so this reads as a set of rates rather than
   * a waterfall.
   */
  const funnel = [
    { label: "Form submitted", value: registrations.length },
    { label: "TrxID matched a forwarded SMS", value: countWhere(registrations, (row) => row.verificationSource === "sms") },
    { label: "Accepted by an admin with no match", value: countWhere(verified, (row) => row.verificationSource === "manual") },
    { label: "Payment verified", value: verified.length },
    { label: "Rejected by an admin", value: rejected.length },
    { label: "Confirmation email accepted by Resend", value: countWhere(registrations, (row) => row.emailSentAt !== null) },
    { label: "Marked present at the desk", value: marked.length },
  ].map((step) => ({ ...step, share: share(step.value, registrations.length) }));

  return {
    meta: {
      generatedAt: now.toISOString(),
      timezone: ADMIN_TIME_ZONE,
      source: "Live Supabase database, read-only aggregate pass",
      fest: { name: festName, dates: festDates, venue: festVenue },
      note: "Aggregates only: no name, school, referrer, email, phone, bKash number or TrxID is in this file.",
    },
    headline: {
      registrations: registrations.length,
      entries: allEntries.length,
      verified: verified.length,
      pending: pending.length,
      rejected: rejected.length,
      collected,
      expected,
      outstanding: expected - collected,
      schools: schools.distinct,
      eventsWithEntries: countWhere(eventRows, (row) => row.entries > 0),
      events: stemfestEvents.length,
      brackets: brackets.length,
      bracketsFilled: countWhere(bracketFill, (row) => row.count > 0),
      attendanceMarked: marked.length,
      sms: sms.length,
      volunteers: volunteers.length,
      ambassadors: ambassadors.length,
      accounts: accountsOut.real,
      openDays,
      avgPerDay: round1(registrations.length / Math.max(openDays, 1)),
      entriesPerParticipant: round1(allEntries.length / Math.max(registrations.length, 1)),
      verifiedShare: share(verified.length, registrations.length),
      attendanceShare: share(marked.length, registrations.length),
      smsMatchRate: share(countWhere(sms, (row) => row.status === "matched"), sms.length),
      rejectedShare: share(rejected.length, registrations.length),
      hostSchoolShare: share(hostRows.length, registrations.length),
    },
    payments,
    time,
    people,
    events,
    schools,
    referrers,
    sms: smsStats,
    attendance,
    volunteers: volunteersOut,
    ambassadors: ambassadorsOut,
    accounts: accountsOut,
    completeness,
    funnel,
  };
}

function perDayCount(days: string[]): number {
  return new Set(days).size;
}

const outDir = path.resolve(process.cwd(), "infographics", "data");
mkdirSync(outDir, { recursive: true });
const snapshot = await readAll();
const result = buildStats(snapshot);
writeFileSync(path.join(outDir, "stats.json"), `${JSON.stringify(result, null, 1)}\n`, "utf8");
console.log(
  `infographics/data/stats.json — ${result.headline.registrations} registrations, ` +
    `${result.headline.sms} SMS, ${result.headline.volunteers} volunteers, ` +
    `${result.headline.ambassadors} ambassadors, ${result.headline.accounts} staff accounts.`,
);
