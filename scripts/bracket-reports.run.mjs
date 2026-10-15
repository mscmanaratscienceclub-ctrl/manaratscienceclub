/**
 * One-command runner for the bracket report generator.
 *
 * `scripts/bracket-reports.ts` and the modules under `scripts/bracket-reports/`
 * import the app's own TypeScript — the registration catalogue, the PDF engine —
 * which Node cannot execute directly. esbuild already ships in the store and
 * resolves the `@/…` alias from `tsconfig.json`, so bundle, run with `.env` in
 * hand, then clean up. Same shape as `scripts/verify-pdf-export.run.mjs`.
 *
 * Usage: pnpm reports:brackets   (or: node scripts/bracket-reports.run.mjs)
 */
import { execFileSync } from "node:child_process";
import { globSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const entry = path.join(root, "scripts", "bracket-reports.ts");
const outfile = path.join(root, "scripts", ".bracket-reports.mjs");

/** Highest version wins, so a future bump in the store is picked up automatically. */
function versionRank(dir) {
  const match = /esbuild@(\d+)\.(\d+)\.(\d+)/.exec(dir);
  return match ? Number(match[1]) * 1e6 + Number(match[2]) * 1e3 + Number(match[3]) : -1;
}

const packageDirs = globSync("node_modules/.pnpm/esbuild@*/node_modules/esbuild", { cwd: root });
if (packageDirs.length === 0) {
  console.error("esbuild not found in the store — `pnpm install` first.");
  process.exit(1);
}
const [bestDir] = [...packageDirs].sort((a, b) => versionRank(b) - versionRank(a));
const esbuildEntry = path.join(root, bestDir, "lib", "main.js");

let status = 0;
try {
  const esbuild = await import(pathToFileURL(esbuildEntry).href);
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external", // pdf-lib, fontkit and postgres resolve from node_modules at runtime
    logLevel: "warning",
  });

  try {
    // The generator reads only: `DIRECT_URL` (or `DATABASE_URL`) for the
    // registrations table. `.env` holds the production database, which is the
    // point — these are the fest's real numbers.
    execFileSync(process.execPath, ["--env-file=.env", outfile], {
      cwd: root,
      stdio: "inherit",
    });
  } catch (error) {
    status = error.status ?? 1;
  }
} finally {
  rmSync(outfile, { force: true });
}

process.exit(status);
