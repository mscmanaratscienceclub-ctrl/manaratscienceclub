"use server";

import { db } from "@/db";
import { campusAmbassadorRegistrations } from "@/db/schema/registrations";
import { volunteerRegistrations } from "@/db/schema/volunteer-registrations";
import { getServerSession } from "@/lib/auth/get-session";
import { desc } from "drizzle-orm";

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
