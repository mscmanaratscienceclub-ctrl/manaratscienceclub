export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 20;

/** Single source of truth for username rules — used by client zod schemas
 *  and the server-side better-auth usernameValidator. */
export function isValidUsername(value: string): boolean {
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return false;
  }
  if (!/^[a-zA-Z0-9]+$/.test(value)) {
    return false;
  }
  const normalized = value.toLowerCase();
  return !restrictedUsernames.some((pattern) =>
    normalized.includes(pattern.toLowerCase()),
  );
}

export const restrictedUsernames = [
  "admin",
  "administrator",
  "root",
  "superadmin",
  "system",
  "null",
  "undefined",
  "support",
  "help",
  "contact",
  "info",
  "official",
  "owner",
  "moderator",
  "mod",
  "staff",
  "team",
  "server",
  "api",
  "email",
  "security",
  "test",
  "user",
  "users",
  "username",
  "guest",
  "webmaster",
  "manager",
  "operator",
  "dev",
  "developer",
  "emasaji",
  "me",
  "you",
  "bot",
  "god",
  "jesus",
  "allah",
  "cakfan",
];
