/**
 * One-command runner for the PDF export harness.
 *
 * `verify-pdf-export.ts` imports the app's own modules under `src/lib/admin/pdf`,
 * which Node cannot execute directly — the repo has no `tsx`, and the app's graph
 * uses extensionless imports Node's ESM resolver rejects. esbuild already ships
 * in the store (drizzle-kit depends on it), so bundle with that, run the bundle,
 * then clean up. Same shape as `scripts/verify-admin-db.run.mjs`.
 *
 * The bundle is self-contained: the two font programs are inlined as base64 by
 * `src/lib/admin/pdf/font-bytes.ts`, so the harness needs no asset path at
 * runtime — which is also how the deployed route works.
 *
 * Usage: pnpm pdf:verify   (or: node scripts/verify-pdf-export.run.mjs)
 */
import { execFileSync } from "node:child_process";
import { globSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const entry = path.join(root, "scripts", "verify-pdf-export.ts");
const outfile = path.join(root, "scripts", ".verify-pdf-export.mjs");

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
    packages: "external", // pdf-lib and fontkit resolve from node_modules at runtime
    logLevel: "warning",
  });

  try {
    execFileSync(process.execPath, [outfile], { cwd: root, stdio: "inherit" });
  } catch (error) {
    status = error.status ?? 1;
  }
} finally {
  rmSync(outfile, { force: true });
}

process.exit(status);
