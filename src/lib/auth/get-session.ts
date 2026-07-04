import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./server";
import { setSentryUser, clearSentryUser } from "@/lib/sentry-helpers";

export const getServerSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    setSentryUser({
      id: session.user.id,
      username: (session.user as { username?: string }).username,
      email: session.user.email,
    });
  } else {
    clearSentryUser();
  }
  return session;
});
