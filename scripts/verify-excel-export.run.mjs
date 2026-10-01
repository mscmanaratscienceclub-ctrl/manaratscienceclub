/**
 * Smoke test for the Excel half of the admin export.
 *
 * The route handler cannot be exercised from this checkout: `/api/admin/export`
 * needs an admin session and the only database here is production. So the one
 * piece that is genuinely untested — the `write-excel-file` call itself, with a
 * two-sheet workbook, a frozen header and the club's own characters in it — is
 * checked here instead, against the same call shape the route makes.
 *
 * It reads the workbook back out of its own ZIP container rather than trusting
 * that "it returned a buffer": an `.xlsx` is a ZIP of XML, so the structure and
 * the text are both verifiable without opening Excel.
 *
 * Usage: pnpm export:verify   (or: node scripts/verify-excel-export.run.mjs)
 */

import { inflateRawSync } from "node:zlib";
import writeXlsxFile from "write-excel-file/node";

const failures = [];
const checks = [];

function check(label, ok, detail = "") {
  checks.push({ label, ok, detail });
  if (!ok) failures.push(label);
}

/**
 * Central-directory walk.
 *
 * The sizes come from here rather than from each local header because the writer
 * streams: a streamed entry sets the local header's sizes to zero and puts the
 * real ones in a data descriptor *after* the data, so the local header cannot be
 * used to find where an entry ends. The central directory always has them.
 */
function zipEntries(buffer) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return [];
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.push({
      name: buffer.toString("utf8", offset + 46, offset + 46 + nameLength),
      method: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      localOffset: buffer.readUInt32LE(offset + 42),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function entryContents(buffer, entry) {
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const data = buffer.subarray(start, start + entry.compressedSize);
  return entry.method === 0 ? data : inflateRawSync(data);
}

// ── The same shape the route builds ──────────────────────────────────────────

const columns = [
  { label: "ID", width: 10 },
  { label: "Student", width: 22 },
  { label: "School / college", width: 30 },
  { label: "Events", width: 40 },
  { label: "Amount", width: 12, align: "right" },
];

const rows = [
  [
    "M9003",
    "Ayesha Rahman",
    "Manarat Dhaka International School & College",
    'Robotics Sprint · Team of 3 · Team "Circuit Breakers"',
    "৳1,450.00",
  ],
  [
    "M9004",
    "Tanvir Hossain",
    "আদমজী ক্যান্টনমেন্ট কলেজ",
    "Science Olympiad · Solo",
    "—",
  ],
];

const header = columns.map((column) => ({
  value: column.label,
  type: String,
  fontWeight: "bold",
  align: column.align ?? "left",
  height: 22,
}));

const body = rows.map((row) =>
  row.map((value, index) => ({
    value,
    type: String,
    align: columns[index].align ?? "left",
  })),
);

const scope = [
  ["Export", "STEM Fest Registrations"],
  ["Active filters", "Payment: Verified · From: 01 Sep 2026"],
];

const buffer = await writeXlsxFile([
  {
    data: [header, ...body],
    sheet: "STEM Fest Registrations",
    columns: columns.map((column) => ({ width: column.width })),
    stickyRowsCount: 1,
    orientation: "landscape",
  },
  {
    data: scope.map(([label, value]) => [
      { value: label, type: String, fontWeight: "bold" },
      { value, type: String },
    ]),
    sheet: "Scope",
    columns: [{ width: 18 }, { width: 80 }],
  },
]).toBuffer();

check("writeXlsxFile returns a Buffer", Buffer.isBuffer(buffer));
check(
  "the buffer is a ZIP container",
  buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  buffer.subarray(0, 4).toString("hex"),
);

const entries = zipEntries(buffer);
const names = entries.map((entry) => entry.name);
const xml = entries
  .filter((entry) => entry.name.endsWith(".xml") || entry.name.endsWith(".rels"))
  .map((entry) => entryContents(buffer, entry).toString("utf8"))
  .join("\n");

check(
  "both worksheets are in the workbook",
  names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).length === 2,
  names.join(", "),
);
check("the workbook has a part list", names.includes("[Content_Types].xml"));
check(
  "the requested column widths are written",
  /<col [^>]*min="1"[^>]*width="10/.test(xml),
);
check("the full report title is the sheet name", xml.includes("STEM Fest Registrations"));
check("the scope sheet name is written", xml.includes("Scope"));
check("a frozen header row is set", /<pane[^>]*state="frozen"/.test(xml));
check("the sheet is set to landscape", xml.includes('orientation="landscape"'));
check("the header row is bold", /<b\/>/.test(xml));
check("the taka sign survives", xml.includes("৳1,450.00"), "৳ not found in the sheet XML");
check("Bengali text survives", xml.includes("আদমজী ক্যান্টনমেন্ট কলেজ"), "Bengali string not found in the sheet XML");
check("an em dash is written as itself", xml.includes("—"));
check("the scope sheet carries the active filters", xml.includes("Payment: Verified"));

// ── Report ───────────────────────────────────────────────────────────────────

for (const { label, ok, detail } of checks) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${ok || !detail ? "" : `\n         ${detail}`}`);
}

console.log(
  `\n${checks.length - failures.length}/${checks.length} checks passed · workbook ${buffer.byteLength} bytes · ${names.length} ZIP entries`,
);

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED: ${failures.join("; ")}`);
  process.exit(1);
}
