/**
 * What one bracket looks like: who is in it, what it is worth, and what needs
 * attention before the paper is set.
 *
 * The analysis is a single pass over the rows `query.ts` fetched, placed into
 * brackets by the prose parser. Every figure it produces is reconcilable against
 * the admin panel because the definitions are the panel's: the same effective
 * payment status, the same host-school name that collapses `%manarat%` spellings,
 * the same catalogue prices.
 */

import {
  getStemfestClassLabel,
  getStemfestGenderLabel,
  isManaratSchool,
  manaratSchoolLabel,
  type StemfestClassId,
} from "@/lib/data/stemfest-registration";
import type { Bracket } from "./brackets";
import { attributeFees, type FeeAttribution } from "./fees";
import { bracketKey, parseSegments, type StoredEntry } from "./parse";
import type { PaymentStatus, RegistrationRow, VerificationSource } from "./query";

export interface Participant {
  code: string;
  name: string;
  gender: string;
  classId: string;
  classLabel: string;
  school: string;
  email: string;
  reference: string;
  transactionId: string;
  /** Why the reported TrxID cannot be matched by the forwarder, or `null`. */
  trxDiagnosis: string | null;
  phone: string;
  status: PaymentStatus;
  source: VerificationSource | null;
  /** This entry's attributed share of the participant's whole registration fee. */
  amount: number;
  teamSize: number | null;
  teamName: string | null;
  submittedAt: Date;
  /** The participant's class sits outside this bracket's band — a catalogue move. */
  outsideBand: boolean;
}

export interface CountRow {
  label: string;
  count: number;
}

export interface BracketReport {
  bracket: Bracket;
  participants: Participant[];
  counts: {
    entries: number;
    verified: number;
    pending: number;
    rejected: number;
    schools: number;
    teams: number;
  };
  money: {
    /** Attributed entry value across every participant. */
    attributed: number;
    verified: number;
    pending: number;
    rejected: number;
  };
  byClass: CountRow[];
  bySchool: CountRow[];
  byGender: CountRow[];
  byReference: CountRow[];
  /** Rows whose attributed entry fees did not add up to what they were charged. */
  feeDrift: { code: string; attributed: number; charged: number | null }[];
  /**
   * Outstanding entries whose reported TrxID can never be matched — a wallet
   * number in the TrxID box, an ID typed over it, or a character dropped from a
   * ten-character bKash ID. The forwarder is not the bottleneck for these; a
   * phone call is.
   */
  unmatchable: Participant[];
  /** TrxIDs this bracket's participants share with anyone else in the fest. */
  duplicateTrx: { transactionId: string; codes: string[] }[];
}

/** One registration, split into the brackets it entered. */
export interface HeldRow {
  row: RegistrationRow;
  entries: StoredEntry[];
  /** Event id → attributed amount. */
  amounts: Map<string, number>;
  drift: FeeAttribution["drift"];
}

/** `Manarat` in any spelling counts as the host school, as the panel groups it. */
function schoolKey(school: string): string {
  return isManaratSchool(school) ? manaratSchoolLabel : school.trim();
}

/**
 * Why a reported TrxID can never be matched by the forwarded-SMS webhook.
 *
 * The rule is read off the data, not invented: all 738 messages
 * `stem_fest_payment_sms` holds carry a ten-character, upper-case alphanumeric
 * TrxID, and 650 of them matched a registration. Anything else shaped is a
 * payment the forwarder cannot close, however faithfully it was sent — which
 * makes it a phone call, not a queue item.
 */
export function diagnoseTrx(transactionId: string): string | null {
  const trx = transactionId.trim().toUpperCase();
  if (/^[A-Z0-9]{10}$/.test(trx)) return null;
  if (/^\d{11}$/.test(trx)) {
    return "an 11-digit wallet number in the TrxID box — the participant sent the number they paid from, not the transaction";
  }
  if (/^DJ[A-Z0-9]{7}$/.test(trx)) {
    return "a bKash TrxID one character short — re-read it against the payment SMS";
  }
  if (/^\d+$/.test(trx)) return "digits only, and not a bKash Transaction ID";
  return "not a bKash Transaction ID — the reference was typed in place of the TrxID";
}

function tally(map: Map<string, number>): CountRow[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function holdRows(rows: RegistrationRow[]): HeldRow[] {
  return rows.map((row) => {
    const entries = parseSegments(row.segments);
    const { amounts, drift } = attributeFees(entries, row.school, row.totalFee);
    return { row, entries, amounts, drift };
  });
}

/** Every TrxID used by more than one registration, across the whole fest. */
export function duplicateTransactionIds(held: HeldRow[]): Map<string, string[]> {
  const byTrx = new Map<string, string[]>();
  for (const { row } of held) {
    const key = row.transactionId.toUpperCase();
    byTrx.set(key, [...(byTrx.get(key) ?? []), row.registrationCode]);
  }
  return new Map([...byTrx.entries()].filter(([, codes]) => codes.length > 1));
}

/**
 * The report for one bracket.
 *
 * `held` is the whole fest: a duplicated TrxID is only visible against every
 * registration, not only the ones in this bracket.
 */
export function buildBracketReport(
  bracket: Bracket,
  held: HeldRow[],
  duplicates: Map<string, string[]>,
): BracketReport {
  const key = bracketKey(bracket.eventId, bracket.categoryId);
  const band = new Set<StemfestClassId>(bracket.classes);
  const participants: Participant[] = [];
  const drift: BracketReport["feeDrift"] = [];

  const classes = new Map<string, number>();
  const schools = new Map<string, number>();
  const genders = new Map<string, number>();
  const references = new Map<string, number>();

  for (const item of held) {
    const entry = item.entries.find(
      (candidate) => bracketKey(candidate.eventId, candidate.categoryId) === key,
    );
    if (!entry) continue;

    const { row } = item;
    participants.push({
      code: row.registrationCode,
      name: row.name,
      gender: getStemfestGenderLabel(row.gender) ?? "—",
      classId: row.classId,
      classLabel: getStemfestClassLabel(row.classId),
      school: schoolKey(row.school),
      email: row.email ?? "",
      reference: row.reference ?? "",
      transactionId: row.transactionId,
      trxDiagnosis: diagnoseTrx(row.transactionId),
      phone: row.paymentNumber,
      status: row.status,
      source: row.verificationSource,
      amount: item.amounts.get(bracket.eventId) ?? 0,
      teamSize: entry.teamSize,
      teamName: entry.teamName,
      submittedAt: row.submittedAt,
      outsideBand: !band.has(row.classId as StemfestClassId),
    });

    drift.push(...(item.drift ? [{ code: row.registrationCode, ...item.drift }] : []));

    classes.set(row.classId, (classes.get(row.classId) ?? 0) + 1);
    const school = schoolKey(row.school);
    schools.set(school, (schools.get(school) ?? 0) + 1);
    const gender = getStemfestGenderLabel(row.gender) ?? "Not stated";
    genders.set(gender, (genders.get(gender) ?? 0) + 1);
    const reference = row.reference ?? "Not referred by anyone";
    references.set(reference, (references.get(reference) ?? 0) + 1);
  }

  const money = { attributed: 0, verified: 0, pending: 0, rejected: 0 };
  for (const participant of participants) {
    money.attributed += participant.amount;
    money[participant.status] += participant.amount;
  }

  const shared = new Set(
    participants.map((participant) => participant.transactionId.toUpperCase()),
  );

  return {
    bracket,
    participants,
    counts: {
      entries: participants.length,
      verified: participants.filter((p) => p.status === "verified").length,
      pending: participants.filter((p) => p.status === "pending").length,
      rejected: participants.filter((p) => p.status === "rejected").length,
      schools: schools.size,
      teams: participants.filter((p) => p.teamSize !== null).length,
    },
    money,
    byClass: tally(classes).map((row) => ({
      label: getStemfestClassLabel(row.label),
      count: row.count,
    })),
    bySchool: tally(schools),
    byGender: tally(genders),
    byReference: tally(references),
    feeDrift: drift,
    unmatchable: participants.filter(
      (p) => p.status === "pending" && p.trxDiagnosis !== null,
    ),
    duplicateTrx: [...duplicates.entries()]
      .filter(([trx]) => shared.has(trx))
      .map(([transactionId, codes]) => ({ transactionId, codes })),
  };
}

/** Registrations whose prose named no catalogue event — counted, never dropped. */
export function unmappedRows(held: HeldRow[]): RegistrationRow[] {
  return held.filter((item) => item.entries.length === 0).map((item) => item.row);
}

export interface UnplacedEntry {
  code: string;
  name: string;
  classLabel: string;
  eventId: string;
  categoryId: string | null;
  segments: string;
}

/**
 * Entries no bracket claims — the difference between the entries rows list and
 * the entries the brackets hold.
 *
 * This happens when stored prose names a category letter the event no longer
 * offers: a bracket boundary that moved after the participant paid. They are
 * named in the index rather than left out of every report, because they still
 * have to be seated on the day.
 */
export function unplacedEntries(
  held: HeldRow[],
  bracketIds: Set<string>,
): UnplacedEntry[] {
  const out: UnplacedEntry[] = [];

  for (const { row, entries } of held) {
    for (const entry of entries) {
      if (bracketIds.has(bracketKey(entry.eventId, entry.categoryId))) continue;
      out.push({
        code: row.registrationCode,
        name: row.name,
        classLabel: getStemfestClassLabel(row.classId),
        eventId: entry.eventId,
        categoryId: entry.categoryId,
        segments: row.segments,
      });
    }
  }

  return out;
}
