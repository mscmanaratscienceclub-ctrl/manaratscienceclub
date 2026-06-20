import { db } from "@/db";
import { betterAuth } from "better-auth";
import { username, admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { restrictedUsernames } from "./usernames";

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
