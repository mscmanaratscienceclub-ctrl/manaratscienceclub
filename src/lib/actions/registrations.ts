"use server";

import { db } from "@/db";
import { campusAmbassadorRegistrations } from "@/db/schema/registrations";
import { volunteerRegistrations } from "@/db/schema/volunteer-registrations";
import { getServerSession } from "@/lib/auth/get-session";
import { desc, sql } from "drizzle-orm";

function assertAdmin(role: string) {
  if (role !== "admin") throw new Error("Unauthorized: Admin only");
}

async function requireAdmin() {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertAdmin(role);
}

export async function getAllAmbassadorRegistrations() {
  await requireAdmin();
  return db
    .select()
    .from(campusAmbassadorRegistrations)
    .orderBy(desc(campusAmbassadorRegistrations.createdAt));
}

export async function getAllVolunteerRegistrations() {
  await requireAdmin();
  return db
    .select()
    .from(volunteerRegistrations)
    .orderBy(desc(volunteerRegistrations.createdAt));
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
