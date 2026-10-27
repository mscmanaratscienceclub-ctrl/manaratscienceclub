/**
 * Rasterise the sheets to PNG.
 *
 * Each sheet is a 1600×2000 document, so each screenshot asks headless Chrome for
 * exactly that window and captures the viewport. Chrome is used rather than the
 * in-app browser because the size has to be exact and the run has to be repeatable
 * from the same command.
 *
 * Usage: node scripts/infographics.render.mjs
 *   --sheets-only   stop after writing the HTML
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { writeSheets } from "./infographics/sheets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlDir = path.join(root, "infographics", "html");
const pngDir = path.join(root, "infographics", "png");

const WIDTH = 1600;
const HEIGHT = 2000;

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

function chrome() {
  const found = CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("No Chrome or Edge found — set CHROME_PATH to the binary.");
  return found;
}

const names = writeSheets();
console.log(`${names.length} sheets written.`);

if (process.argv.includes("--sheets-only")) process.exit(0);

mkdirSync(pngDir, { recursive: true });
const binary = chrome();

/** A private profile so parallel headless runs never fight over the default one. */
const profile = path.join(root, "infographics", ".chrome-profile");

let failed = 0;
names.forEach((name, index) => {
  const source = pathToFileURL(path.join(htmlDir, `${name}.html`)).href;
  const target = path.join(pngDir, `${name}.png`);
  rmSync(target, { force: true });
  try {
    execFileSync(
      binary,
      [
        "--headless=new",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        `--user-data-dir=${profile}`,
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${WIDTH},${HEIGHT}`,
        "--virtual-time-budget=10000",
        `--screenshot=${target}`,
        source,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (error) {
    failed += 1;
    console.error(`${name}: ${String(error.stderr ?? error.message).slice(0, 200)}`);
    return;
  }
  if (!existsSync(target)) {
    failed += 1;
    console.error(`${name}: Chrome reported success but wrote no file.`);
    return;
  }
  console.log(`${String(index + 1).padStart(2, "0")} ${name}.png`);
});

rmSync(profile, { recursive: true, force: true });
if (failed > 0) {
  console.error(`${failed} of ${names.length} sheets did not render.`);
  process.exit(1);
}
console.log(`${names.length} PNGs in infographics/png at ${WIDTH}×${HEIGHT}.`);
