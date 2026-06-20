import { db } from "@/db";
import { betterAuth } from "better-auth";
import { username, admin, magicLink, emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { restrictedUsernames } from "./usernames";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_CLIENT_SECRET",
    },
  },
  plugins: [
    username({
      minUsernameLength: 4,
      maxUsernameLength: 10,
      usernameValidator: (value) => !restrictedUsernames.includes(value),
      usernameNormalization: (value) => value.toLowerCase(),
    }),
    admin(),
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        console.log(`[Magic Link] Send to ${email}: ${url}`);
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        console.log(`[Email OTP] Send to ${email}: ${otp} (${type})`);
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
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
