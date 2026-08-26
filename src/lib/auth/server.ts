import { db } from "@/db";
import { betterAuth } from "better-auth";
import { username, admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { isValidUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "./usernames";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password";
import { sendResetPasswordEmail, sendVerificationEmail } from "@/lib/email/resend";

// Derive the canonical base URL. In production this MUST be set to the
// public-facing origin (e.g. https://manaratscience.club) in your hosting
// platform's environment variables — leaving it as localhost will cause
// Better Auth to reject requests from the real domain with a 403.
const envBase =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000";

// Strip any trailing slash so URL parsing is consistent.
const baseUrl = envBase.replace(/\/$/, "");
const origin = new URL(baseUrl);

// Normalise: always work with the bare hostname (no leading "www.") so we
// can produce both the apex and www variants deterministically.
const bareHostname = origin.hostname.replace(/^www\./, "");
const apex = `${origin.protocol}//${bareHostname}`;
const www = `${origin.protocol}//www.${bareHostname}`;
const dev = "http://localhost:3000";

// Deduplicated list of every origin Better Auth will accept.
const trustedOrigins = [baseUrl, apex, www, dev].filter(
  (v, i, a) => Boolean(v) && a.indexOf(v) === i,
);

export const auth = betterAuth({
  baseURL: baseUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // Explicit rate limiting — better-auth's default special rules already cap
  // /sign-in, /sign-up, /change-password etc. (3 req / 10s); enabling here
  // makes protection explicit and active in dev too. NOTE: the store is
  // in-memory (resets per instance). For multi-instance deployments add
  // `secondaryStorage` (e.g. Redis/Upstash) so counters are shared.
  rateLimit: {
    enabled: true,
  },
  // Lock CORS to our own origins for the state-changing POST endpoints.
  // Includes apex, www, and localhost (dev) variants; duplicates are deduped.
  trustedOrigins,
  session: {
    // Sessions live a week; endpoints considered sensitive (change password,
    // change email) require a "fresh" sign-in if the session is older than a day.
    expiresIn: 60 * 60 * 24 * 7,
    freshAge: 60 * 60 * 24,
    // Short-lived signed cache cookie so getSession doesn't hit the DB on
    // every request.
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    username({
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      // Shared with the client zod schemas — single source of truth.
      usernameValidator: (value) => isValidUsername(value),
      usernameNormalization: (value) => value.toLowerCase(),
    }),
    admin(),
  ],
  emailAndPassword: {
    enabled: true,
    // Users must verify their email before they can sign in.
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    // Reset links expire quickly; the email instructs the same.
    resetPasswordTokenExpiresIn: 60 * 15,
    sendResetPassword: async ({ user, url }, _request) => {
      try {
        await sendResetPasswordEmail({
          to: user.email,
          name: user.name,
          url,
        });
      } catch (error) {
        console.error("Failed to send reset password email:", error);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, _request) => {
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
        // Account exists but the email failed to send — the /verify-email
        // page's resend button is the recovery path.
        console.error("Failed to send verification email:", error);
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
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
