/**
 * One-command runner for the admin database regression harness.
 *
 * `verify-admin-db.ts` imports the app's own TypeScript modules
 * (`src/db/query`, `src/db/schema/*`), which Node cannot execute directly — the
 * repo has no `tsx`, and the app's module graph uses extensionless imports that
 * Node's ESM resolver rejects. esbuild already ships in the store (drizzle-kit
 * depends on it), so bundle with that, run the bundle, then clean up.
 *
 * Chosen over adding `tsx` or `esbuild` as a direct dependency: this is a
 * diagnostic tool, not something the app ships.
 *
 * Usage:  pnpm db:verify
 */
import { execFileSync } from "node:child_process";
import { globSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const entry = path.join(root, "scripts", "verify-admin-db.ts");
const outfile = path.join(root, "scripts", ".verify-admin-db.mjs");

/** Highest version wins, so a future bump in the store is picked up automatically. */
function versionRank(dir) {
  const match = /esbuild@(\d+)\.(\d+)\.(\d+)/.exec(dir);
  return match ? Number(match[1]) * 1e6 + Number(match[2]) * 1e3 + Number(match[3]) : -1;
}

const packageDirs = globSync("node_modules/.pnpm/esbuild@*/node_modules/esbuild", { cwd: root });
if (packageDirs.length === 0) {
  console.error("esbuild not found under node_modules/.pnpm — run `pnpm install` first.");
  process.exit(1);
}
const [bestDir] = [...packageDirs].sort((a, b) => versionRank(b) - versionRank(a));
const esbuildEntry = path.join(root, bestDir, "lib", "main.js");

try {
  const esbuild = await import(pathToFileURL(esbuildEntry).href);
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external", // resolve drizzle-orm/postgres at runtime, not into the bundle
    logLevel: "warning",
  });

  // --env-file matches the other scripts/ probes, which all read DATABASE_URL.
  execFileSync(process.execPath, ["--env-file=.env", outfile], { cwd: root, stdio: "inherit" });
} finally {
  rmSync(outfile, { force: true });
}
