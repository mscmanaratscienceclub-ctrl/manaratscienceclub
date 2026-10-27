/**
 * Create admin-panel accounts directly in the database.
 *
 * Writes a `user` row (emailVerified = true, role = admin) plus the matching
 * credential `account` row, hashing the password with better-auth's own scrypt
 * helper so `/signin` — which calls `signIn.username` — verifies it unchanged.
 * Nothing goes through the signup endpoint, so no verification email is sent.
 *
 *   node --env-file=.env scripts/create-admin-accounts.mjs
 *   node --env-file=.env scripts/create-admin-accounts.mjs mscdesk4
 *   node --env-file=.env scripts/create-admin-accounts.mjs --delete
 *
 * Positional args select which entries of ACCOUNTS to create (existing ones
 * still abort the run rather than being overwritten). `--delete` removes every
 * listed account (sessions, credentials, then the user row — the FKs have no
 * cascade, so order matters).
 */
import crypto from "node:crypto";
import postgres from "postgres";
import { hashPassword, verifyPassword } from "better-auth/crypto";

const EMAIL_DOMAIN = "manaratscience.club";

const ACCOUNTS = [
  { name: "MSC Desk One", username: "mscdesk1", role: "admin" },
  { name: "MSC Desk Two", username: "mscdesk2", role: "admin" },
  { name: "MSC Desk Three", username: "mscdesk3", role: "admin" },
  { name: "MSC Desk Four", username: "mscdesk4", role: "admin" },
];

// Unambiguous alphabet (no I/l/1/O/0) so passwords survive being read aloud.
const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length, alphabet) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const generateId = () => randomString(32, ID_ALPHABET);
const generatePassword = () => randomString(20, PASSWORD_ALPHABET);

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
});

// Positional args pick which declared accounts to create; --delete always
// covers the whole list. Usernames come from ACCOUNTS only, never from argv.
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const unknown = requested.filter((n) => !ACCOUNTS.some((a) => a.username === n));
if (unknown.length) {
  console.error(`username not declared in ACCOUNTS: ${unknown.join(", ")}`);
  await sql.end();
  process.exit(1);
}
const selected = requested.length
  ? ACCOUNTS.filter((a) => requested.includes(a.username))
  : ACCOUNTS;

if (process.argv.includes("--delete")) {
  for (const { username } of ACCOUNTS) {
    const [existing] = await sql`select "id" from "user" where "username" = ${username}`;
    if (!existing) {
      console.log(`skip ${username} (not found)`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx`delete from "session" where "userId" = ${existing.id}`;
      await tx`delete from "account" where "userId" = ${existing.id}`;
      await tx`delete from "user" where "id" = ${existing.id}`;
    });
    console.log(`deleted ${username}`);
  }
  await sql.end();
  process.exit(0);
}

const clash = [];
for (const { username } of selected) {
  const email = `${username}@${EMAIL_DOMAIN}`;
  const [found] = await sql`
    select "username", "email" from "user"
    where "username" = ${username} or "email" = ${email}
  `;
  if (found) clash.push(found);
}
if (clash.length) {
  console.error("already exists, nothing written:", JSON.stringify(clash));
  await sql.end();
  process.exit(1);
}

const now = new Date();
const created = [];

for (const account of selected) {
  const userId = generateId();
  const password = generatePassword();
  const hash = await hashPassword(password);
  const email = `${account.username}@${EMAIL_DOMAIN}`;

  await sql.begin(async (tx) => {
    await tx`
      insert into "user" ("id", "name", "username", "display_username", "email",
                          "emailVerified", "role", "gender", "banned",
                          "createdAt", "updatedAt")
      values (${userId}, ${account.name}, ${account.username}, ${account.username},
              ${email}, ${true}, ${account.role}, ${false}, ${false},
              ${now}, ${now})
    `;
    await tx`
      insert into "account" ("id", "accountId", "providerId", "userId",
                             "password", "createdAt", "updatedAt")
      values (${generateId()}, ${userId}, ${"credential"}, ${userId},
              ${hash}, ${now}, ${now})
    `;
  });

  // Check the password against the hash that is now stored, so what is printed
  // below is provably what the sign-in path will accept.
  const [row] = await sql`
    select u."email", u."role", u."emailVerified", u."banned", a."password" as hash
    from "user" u join "account" a on a."userId" = u."id"
    where u."id" = ${userId}
  `;

  created.push({
    ...account,
    email,
    password,
    userId,
    acceptsPassword: await verifyPassword({ hash: row.hash, password }),
    emailVerified: row.emailVerified,
    banned: row.banned,
  });
}

console.log("\nAdmin-panel accounts — email marked verified, no email sent\n");
for (const c of created) {
  console.log(`  username  ${c.username}`);
  console.log(`  password  ${c.password}`);
  console.log(`  email     ${c.email}`);
  console.log(
    `  role      ${c.role}   stored hash accepts password: ${c.acceptsPassword}` +
      `   emailVerified: ${c.emailVerified}   banned: ${c.banned}`
  );
  console.log("");
}

if (created.some((c) => !c.acceptsPassword || !c.emailVerified || c.banned)) {
  console.error("an account failed the read-back check — do not use these credentials");
  process.exit(1);
}

console.log("rollback: node --env-file=.env scripts/create-admin-accounts.mjs --delete");
await sql.end();
