/**
 * A contact sheet of every rendered PNG, for review in one look.
 *
 * Not a deliverable — a check. Written by `node scripts/infographics/contact.mjs`
 * after the PNGs exist, and rendered to `infographics/png/_contact.png`.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pngDir = path.join(root, "infographics", "png");
const html = path.join(root, "infographics", "contact.html");

const names = readdirSync(pngDir).filter((file) => file.endsWith(".png") && !file.startsWith("_")).sort();
const perRow = 4;
const thumb = 400;
const width = perRow * thumb + (perRow + 1) * 24;
const rows = Math.ceil(names.length / perRow);
const height = rows * (thumb * 1.25 + 46) + 120;

writeFileSync(
  html,
  `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#142326;font-family:system-ui,sans-serif;color:#fff8ec;padding:24px}
  .grid{display:grid;grid-template-columns:repeat(${perRow},${thumb}px);gap:24px}
  figure{margin:0}img{width:${thumb}px;display:block;border:1px solid #ffffff33}
  figcaption{font:12px/1.4 ui-monospace,monospace;color:#b7a99e;padding-top:8px}
  </style><h2 style="font:700 20px system-ui">${names.length} sheets · ${width}×${height}</h2>
  <div class="grid">${names
    .map(
      (name) =>
        `<figure><img src="${pathToFileURL(path.join(pngDir, name)).href}"><figcaption>${name.replace(/\.png$/, "")}</figcaption></figure>`,
    )
    .join("")}</div>`,
  "utf8",
);

const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(
  (candidate) => {
    try {
      return readdirSync(path.dirname(candidate)).length > 0;
    } catch {
      return false;
    }
  },
);

execFileSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    `--user-data-dir=${path.join(root, "infographics", ".chrome-profile")}`,
    "--hide-scrollbars",
    `--window-size=${width},${height}`,
    "--virtual-time-budget=20000",
    `--screenshot=${path.join(pngDir, "_contact.png")}`,
    pathToFileURL(html).href,
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);
mkdirSync(pngDir, { recursive: true });
console.log(`contact sheet: infographics/png/_contact.png (${width}×${height})`);
