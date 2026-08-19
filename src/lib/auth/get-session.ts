import { headers } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "./server";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { setSentryUser, clearSentryUser } from "@/lib/sentry-helpers";

export const getServerSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    clearSentryUser();
    return null;
  }

  // better-auth caches the session (incl. the user object) in a signed
  // cookie for 5 minutes, so DB edits (role, username…) would be stale.
  // Always hydrate the user from the DB for server-side decisions.
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id));

  if (!dbUser) {
    clearSentryUser();
    return null;
  }

  setSentryUser({
    id: dbUser.id,
    username: dbUser.username ?? undefined,
    email: dbUser.email,
  });

  return { ...session, user: { ...session.user, ...dbUser } };
});
