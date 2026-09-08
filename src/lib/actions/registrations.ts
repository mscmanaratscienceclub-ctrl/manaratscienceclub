"use server";

import { db } from "@/db";
import {
  campusAmbassadorRegistrations,
  type CampusAmbassadorRegistration,
} from "@/db/schema/registrations";
import {
  volunteerRegistrations,
  type VolunteerRegistration,
} from "@/db/schema/volunteer-registrations";
import {
  stemfestRegistrations,
  type StemfestRegistration,
} from "@/db/schema/stemfest-registrations";
import { getServerSession } from "@/lib/auth/get-session";
import { desc, ilike, or, sql, type SQL } from "drizzle-orm";

function assertAdmin(role: string) {
  if (role !== "admin") throw new Error("Unauthorized: Admin only");
}

async function requireAdmin() {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertAdmin(role);
}

const PAGE_SIZE = 25;

/**
 * Escapes LIKE/ILIKE wildcards so a literal `%`, `_`, or `\` typed in the search
 * box matches itself instead of acting as a wildcard. Postgres' default LIKE
 * escape character is the backslash.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function clampPage(page: number): number {
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
}

export interface AmbassadorSearchResult {
  rows: CampusAmbassadorRegistration[];
  total: number;
  page: number;
  totalPages: number;
}

export async function searchAmbassadorRegistrations(
  query: string,
  page: number,
): Promise<AmbassadorSearchResult> {
  await requireAdmin();
  const t = campusAmbassadorRegistrations;
  const q = query.trim();
  const safePage = clampPage(page);
  const offset = (safePage - 1) * PAGE_SIZE;

  let where: SQL | undefined;
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where = or(
      ilike(t.name, pattern),
      ilike(t.school, pattern),
      ilike(t.class, pattern),
      ilike(t.phone, pattern),
      ilike(t.email, pattern),
      ilike(t.type, pattern),
    );
  }

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(t)
      .where(where)
      .orderBy(desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(t).where(where),
  ]);

  const total = countRow[0]?.total ?? 0;
  return {
    rows,
    total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export interface VolunteerSearchResult {
  rows: VolunteerRegistration[];
  total: number;
  page: number;
  totalPages: number;
}

export async function searchVolunteerRegistrations(
  query: string,
  page: number,
): Promise<VolunteerSearchResult> {
  await requireAdmin();
  const t = volunteerRegistrations;
  const q = query.trim();
  const safePage = clampPage(page);
  const offset = (safePage - 1) * PAGE_SIZE;

  let where: SQL | undefined;
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where = or(
      ilike(t.fullName, pattern),
      ilike(t.classSection, pattern),
      ilike(t.roll, pattern),
      ilike(t.shift, pattern),
      ilike(t.studentCode, pattern),
    );
  }

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(t)
      .where(where)
      .orderBy(desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(t).where(where),
  ]);

  const total = countRow[0]?.total ?? 0;
  return {
    rows,
    total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export interface StemfestSearchResult {
  rows: StemfestRegistration[];
  total: number;
  page: number;
  totalPages: number;
}

export async function searchStemfestRegistrations(
  query: string,
  page: number,
): Promise<StemfestSearchResult> {
  await requireAdmin();
  const t = stemfestRegistrations;
  const q = query.trim();
  const safePage = clampPage(page);
  const offset = (safePage - 1) * PAGE_SIZE;

  let where: SQL | undefined;
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where = or(
      ilike(t.name, pattern),
      ilike(t.class, pattern),
      ilike(t.phone, pattern),
      ilike(t.bkashNumber, pattern),
      ilike(t.bkashTrxId, pattern),
      // Lets admins find rows by event or teammate name; the GIN index on
      // `entries` covers containment, not text search, so this casts.
      sql`${t.entries}::text ilike ${pattern}`,
    );
  }

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(t)
      .where(where)
      .orderBy(desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(t).where(where),
  ]);

  const total = countRow[0]?.total ?? 0;
  return {
    rows,
    total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export interface StemfestStats {
  total: number;
  thisWeek: number;
  expectedRevenue: number;
}

/**
 * `expectedRevenue` is what registrations say should have arrived via bKash —
 * the number the club reconciles its actual bKash statements against.
 */
export async function getStemfestStats(): Promise<StemfestStats> {
  await requireAdmin();
  const t = stemfestRegistrations;
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      thisWeek: sql<number>`count(*) filter (where ${t.createdAt} >= now() - interval '7 days')::int`,
      expectedRevenue: sql<number>`coalesce(sum(${t.totalFee}), 0)::int`,
    })
    .from(t);

  return {
    total: row?.total ?? 0,
    thisWeek: row?.thisWeek ?? 0,
    expectedRevenue: row?.expectedRevenue ?? 0,
  };
}

export interface AmbassadorStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  uniqueSchools: number;
}

/**
 * Dashboard numbers computed in SQL. Pulling every column of every row and
 * counting in JS grows linearly with registrations; these aggregates return a
 * fixed-size result no matter how many applications exist.
 */
export async function getAmbassadorStats(): Promise<AmbassadorStats> {
  await requireAdmin();
  const t = campusAmbassadorRegistrations;
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      thisWeek: sql<number>`count(*) filter (where ${t.createdAt} >= now() - interval '7 days')::int`,
      thisMonth: sql<number>`count(*) filter (where ${t.createdAt} >= date_trunc('month', now()))::int`,
      uniqueSchools: sql<number>`count(distinct lower(btrim(${t.school})))::int`,
    })
    .from(t);

  return {
    total: row?.total ?? 0,
    thisWeek: row?.thisWeek ?? 0,
    thisMonth: row?.thisMonth ?? 0,
    uniqueSchools: row?.uniqueSchools ?? 0,
  };
}

export async function getVolunteerCount(): Promise<number> {
  await requireAdmin();
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(volunteerRegistrations);
  return row?.total ?? 0;
}

export interface RecentAmbassadorRegistration {
  id: string;
  name: string;
  class: string;
  school: string;
  createdAt: Date;
}

/** Selects only the columns the dashboard's recent table renders. */
export async function getRecentAmbassadorRegistrations(
  limit = 5
): Promise<RecentAmbassadorRegistration[]> {
  await requireAdmin();
  const t = campusAmbassadorRegistrations;
  return db
    .select({
      id: t.id,
      name: t.name,
      class: t.class,
      school: t.school,
      createdAt: t.createdAt,
    })
    .from(t)
    .orderBy(desc(t.createdAt))
    .limit(limit);
}
