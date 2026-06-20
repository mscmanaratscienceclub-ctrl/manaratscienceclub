import { createAuthClient } from "better-auth/react";
import { usernameClient, adminClient, magicLinkClient, emailOTPClient } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [usernameClient(), adminClient(), magicLinkClient(), emailOTPClient(), nextCookies()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
