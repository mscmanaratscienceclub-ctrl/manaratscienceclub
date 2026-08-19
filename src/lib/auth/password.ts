import z from "zod/v4";

// Length-based policy (NIST SP 800-63B): length beats composition rules.
// 72-char cap stays safely under common hashing input limits.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  });
