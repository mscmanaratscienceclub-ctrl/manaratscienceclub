import { createAuthClient } from "better-auth/react";
import { usernameClient, adminClient } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [usernameClient(), adminClient(), nextCookies()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
