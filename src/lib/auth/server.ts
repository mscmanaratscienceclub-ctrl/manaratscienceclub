import { db } from "@/db";
import { betterAuth } from "better-auth";
import { username, admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { restrictedUsernames } from "./usernames";
import { sendVerificationEmail } from "@/lib/email/resend";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [
    username({
      minUsernameLength: 4,
      maxUsernameLength: 10,
      usernameValidator: (value) => {
        const normalized = value.toLowerCase();
        // Regex check matching client-side (only letters and numbers)
        if (!/^[a-zA-Z0-9]+$/.test(value)) {
          return false;
        }
        // Partial match check for restricted usernames
        for (const pattern of restrictedUsernames) {
          if (normalized.includes(pattern.toLowerCase())) {
            return false;
          }
        }
        return true;
      },
      usernameNormalization: (value) => value.toLowerCase(),
    }),
    admin(),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, _request) => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      // Ensure the verification redirect lands on /verify-email?verified=true after verifying the token
      const verificationUrl = url.includes("callbackURL=")
        ? url
        : `${url}&callbackURL=${encodeURIComponent(`${baseUrl}/verify-email?verified=true`)}`;

      try {
        await sendVerificationEmail({
          to: user.email,
          name: user.name,
          url: verificationUrl,
        });
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
        input: false,
      },
      gender: {
        type: "boolean",
        required: true,
        input: true,
      },
      description: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
});
