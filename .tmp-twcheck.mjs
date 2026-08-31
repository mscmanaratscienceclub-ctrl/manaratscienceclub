import { readFile, writeFile, rm } from "node:fs/promises";
import postcss from "postcss";
import tw from "@tailwindcss/postcss";

const file = "src/app/globals.css";
const current = await readFile(file, "utf8"); // currently variant B
const CUR = '@import "tailwindcss";\n@source "../";';
if (!current.includes(CUR)) throw new Error("unexpected head: " + current.slice(0, 60));

// Probe: a class-like string living OUTSIDE src/ (in the vault docs).
const probePath = "obsidian/tmp-scan-probe.md";
await writeFile(probePath, "utility probe marker: mt-[777px] shadow-[0_0_9px_#123456]\n");

const variants = {
  'A  @import ... source("../")': current.replace(CUR, '@import "tailwindcss" source("../");'),
  "B  @import + @source": current,
  "C  source(none) + @source": current.replace(
    CUR,
    '@import "tailwindcss" source(none);\n@source "../";',
  ),
  "D  plain @import (auto-detect)": current.replace(CUR, '@import "tailwindcss";'),
};

for (const [label, src] of Object.entries(variants)) {
  try {
    const r = await postcss([tw()]).process(src, { from: file });
    const leaked = /777px|0 0 9px/.test(r.css);
    console.log(
      label.padEnd(32),
      "bytes:",
      String(r.css.length).padEnd(8),
      "vault-probe-picked-up:",
      leaked ? "YES (scoping lost)" : "no",
    );
  } catch (e) {
    console.log(label.padEnd(32), "ERROR:", String(e.message).split("\n")[0]);
  }
}

await rm(probePath);
