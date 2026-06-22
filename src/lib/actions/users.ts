"use server";

import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function assertAdmin(role: string) {
  if (role !== "admin") throw new Error("Unauthorized: Admin only");
}

export async function getAllUsers(limit = 20, offset = 0) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertAdmin(role);
  return db
    .select({ id: user.id, name: user.name, email: user.email, username: user.username, role: user.role, createdAt: user.createdAt })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateUserRole(userId: string, newRole: "admin" | "writer" | "member") {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertAdmin(role);
  if (userId === session.user.id) throw new Error("You cannot change your own role");
  await db.update(user).set({ role: newRole }).where(eq(user.id, userId));
  revalidatePath("/cms/users");
}
