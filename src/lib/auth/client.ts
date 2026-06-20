import { createAuthClient } from "better-auth/react";
import { usernameClient, adminClient } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [usernameClient(), adminClient(), nextCookies()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
