/**
 * The chart primitives every sheet draws with.
 *
 * Each function returns an `<svg>` string whose viewBox is the real pixel width of
 * the panel it sits in, so a 20-unit font is a 20-pixel font on the 1600×2000
 * canvas and nothing has to be re-measured at render time. Colours are CSS custom
 * properties, never literals, so the palette in `style.mjs` stays the only place a
 * hue is decided.
 */

/** Usable inner width of each grid column, matching `style.mjs`'s paddings. */
export const W = {
  full: 1396,
  wide: 827,
  narrow: 479,
  half: 653,
  third: 405,
  quarter: 281,
};

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const n = (value) => Math.round(Number(value)).toLocaleString("en-US");

/**
 * A colour may arrive as a token (`c3`), a full `var(--c3)`, a hex or a `--c3`.
 * Every chart resolves it the same way, so a sheet cannot accidentally draw black
 * by passing the short name.
 */
function paint(value, fallback) {
  if (!value) return fallback;
  if (/^(var\(|#|rgb|oklch)/.test(value)) return value;
  return `var(--${value.replace(/^--/, "")})`;
}

function svg(width, height, inner, cls = "") {
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="${cls}" role="img" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

const tone = (index) => `var(--c${(index % 6) + 1})`;

/** Horizontal ranked bars: label, bar, value. The workhorse of the set. */
export function hBars(items, opts = {}) {
  const {
    width = W.full,
    color = null,
    valueFormat = (n) => n,
    sub = (row) => row.sub ?? "",
    barHeight = 30,
    gap = 18,
    labelWidth = 300,
    valueWidth = 116,
    showShare = false,
    total = 0,
  } = opts;
  const max = Math.max(...items.map((item) => item.value), 1);
  const rowHeight = barHeight + gap;
  // A share sits beside the count, so the gutter has to hold both.
  const valueSpace = valueWidth + (showShare ? 46 : 0);
  const trackWidth = width - labelWidth - valueSpace - 16;
  const fit = (label) => {
    const room = Math.floor(labelWidth / 10.5);
    return label.length > room ? `${label.slice(0, room - 1)}…` : label;
  };
  const rows = items
    .map((item, index) => {
      const y = index * rowHeight;
      const barWidth = Math.max((item.value / max) * trackWidth, item.value > 0 ? 3 : 0);
      const fill = item.color ? paint(item.color) : paint(color, tone(index));
      const share = showShare && total > 0 ? `  ${Math.round((item.value / total) * 1000) / 10}%` : "";
      return `<g transform="translate(0 ${y})">
        <text class="label" x="0" y="${barHeight * 0.68}">${esc(fit(item.label))}</text>
        ${sub(item) ? `<text class="tnote" x="0" y="${barHeight + 16}">${esc(sub(item))}</text>` : ""}
        <rect x="${labelWidth + 8}" y="0" width="${trackWidth}" height="${barHeight}" rx="4" fill="var(--line-soft)"/>
        <rect x="${labelWidth + 8}" y="0" width="${barWidth}" height="${barHeight}" rx="4" fill="${fill}"/>
        <text class="value" x="${width}" y="${barHeight * 0.68}" text-anchor="end">${esc(valueFormat(item.value))}${share}</text>
      </g>`;
    })
    .join("");
  return svg(width, items.length * rowHeight + 6, rows);
}

/** Vertical columns for a dated series, with every n-th day labelled. */
export function columns(series, opts = {}) {
  const {
    width = W.full,
    height = 380,
    color = "var(--c1)",
    labelEvery = 4,
    valueFormat = (n) => n,
    showTopValue = true,
    axisFormat = (day) => day.slice(8).replace(/^0/, ""),
  } = opts;
  const max = Math.max(...series.map((point) => point.value), 1);
  const pad = 34;
  const plot = height - pad - 34;
  const slot = (width - 8) / series.length;
  const bar = Math.max(slot - 8, 3);
  const bars = series
    .map((point, index) => {
      const h = Math.max((point.value / max) * plot, point.value > 0 ? 2 : 0);
      const x = 4 + index * slot + (slot - bar) / 2;
      const y = pad + plot - h;
      const label = index % labelEvery === 0 || index === series.length - 1 ? axisFormat(point.day ?? point.label) : "";
      const top = showTopValue && (index % labelEvery === 0 || point.value === max) ? valueFormat(point.value) : "";
      return `<rect x="${x}" y="${y}" width="${bar}" height="${h}" rx="3" fill="${paint(point.color ?? color, "var(--c1)")}"/>
        ${label ? `<text class="axis" x="${x + bar / 2}" y="${height - 6}" text-anchor="middle">${esc(label)}</text>` : ""}
        ${top ? `<text class="tnote" x="${x + bar / 2}" y="${y - 10}" text-anchor="middle">${esc(top)}</text>` : ""}`;
    })
    .join("");
  const grid = [0.25, 0.5, 0.75, 1]
    .map((step) => `<line x1="0" x2="${width}" y1="${pad + plot - step * plot}" y2="${pad + plot - step * plot}" stroke="var(--line-soft)" stroke-width="1"/>`)
    .join("");
  return svg(width, height, `${grid}<line x1="0" x2="${width}" y1="${pad + plot}" y2="${pad + plot}" stroke="var(--line)" stroke-width="1.5"/>${bars}`);
}

/** Area + line for a continuous series. */
export function area(series, opts = {}) {
  const { width = W.full, height = 420, color = "var(--c1)", labelEvery = 6, valueFormat = (n) => n } = opts;
  const max = Math.max(...series.map((point) => point.value), 1);
  const pad = 40;
  const plot = height - pad - 40;
  const step = (width - 8) / Math.max(series.length - 1, 1);
  const point = (index, value) => `${4 + index * step},${pad + plot - (value / max) * plot}`;
  const line = series.map((row, index) => point(index, row.value)).join(" ");
  const shape = `4,${pad + plot} ${line} ${4 + (series.length - 1) * step},${pad + plot}`;
  const dots = series
    .map((row, index) =>
      row.value === max || index % labelEvery === 0
        ? `<circle cx="${4 + index * step}" cy="${pad + plot - (row.value / max) * plot}" r="${row.value === max ? 7 : 3.5}" fill="${row.value === max ? "var(--c2)" : color}"/>
           ${row.value === max ? `<text class="value" x="${4 + index * step}" y="${pad + plot - (row.value / max) * plot - 18}" text-anchor="middle">${esc(valueFormat(row.value))}</text>` : ""}`
        : "",
    )
    .join("");
  const labels = series
    .map((row, index) =>
      index % labelEvery === 0 || index === series.length - 1
        ? `<text class="axis" x="${4 + index * step}" y="${height - 10}" text-anchor="middle">${esc(String(row.day ?? row.label).slice(8).replace(/^0/, ""))}</text>`
        : "",
    )
    .join("");
  return svg(
    width,
    height,
    `<polygon points="${shape}" fill="${color}" opacity="0.14"/>
     <polyline points="${line}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linejoin="round"/>
     <line x1="0" x2="${width}" y1="${pad + plot}" y2="${pad + plot}" stroke="var(--line)" stroke-width="1.5"/>
     ${dots}${labels}`,
  );
}

/** 24-hour polar bars: the shape of a day. */
export function radial(values, opts = {}) {
  const { width = W.full, size = 520, color = "var(--c3)", highlight = null, format = (n) => n } = opts;
  const cx = width / 2;
  const cy = size / 2;
  const inner = size * 0.2;
  const longest = size * 0.42;
  const max = Math.max(...values.map((row) => row.value), 1);
  const half = Math.PI / values.length - 0.02;
  const at = (radius, angle) => `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  const bars = values
    .map((row, index) => {
      const angle = (index / values.length) * Math.PI * 2 - Math.PI / 2;
      const length = inner + (row.value / max) * (longest - inner);
      const isPeak = highlight !== null && Number(row.label) === highlight;
      const fill = paint(row.color, isPeak ? "var(--c2)" : color);
      return `<polygon points="${at(inner, angle - half)} ${at(inner, angle + half)} ${at(length, angle + half)} ${at(length, angle - half)}" fill="${fill}" opacity="${row.value === 0 ? 0.12 : 0.95}"/>
        ${index % 3 === 0 ? `<text class="axis" x="${cx + Math.cos(angle) * (longest + 26)}" y="${cy + Math.sin(angle) * (longest + 26) + 6}" text-anchor="middle">${esc(String(row.label).padStart(2, "0"))}</text>` : ""}
        ${isPeak ? `<text class="value" style="font-size:34px" x="${cx + Math.cos(angle) * (longest + 56)}" y="${cy + Math.sin(angle) * (longest + 56)}" text-anchor="middle">${esc(format(row.value))}</text>` : ""}`;
    })
    .join("");
  const ring = `<circle cx="${cx}" cy="${cy}" r="${inner}" fill="none" stroke="var(--line-soft)"/>`;
  const centre = `<text class="value" style="font-size:${size * 0.1}px" x="${cx}" y="${cy - 6}" text-anchor="middle">${esc(format(values.reduce((total, row) => total + row.value, 0)))}</text>
    <text class="axis" x="${cx}" y="${cy + 26}" text-anchor="middle">entries, all hours</text>`;
  return svg(width, size, ring + bars + centre);
}

/** Donut with a centre figure. */
export function donut(slices, opts = {}) {
  const { width = W.full, size = 420, center = "", caption = "", thickness = 0.3 } = opts;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const cx = width / 2;
  const cy = size / 2;
  const outer = size / 2 - 6;
  const inner = outer * (1 - thickness);
  let angle = -Math.PI / 2;
  const arcs = slices
    .map((slice, index) => {
      const sweep = (slice.value / total) * Math.PI * 2;
      const a1 = angle;
      const a2 = angle + sweep;
      angle = a2;
      if (slice.value === 0) return "";
      const large = sweep > Math.PI ? 1 : 0;
      const fill = paint(slice.color, tone(index));
      const mid = (a1 + a2) / 2;
      const labelR = outer + 22;
      return `<path d="M${cx + Math.cos(a1) * outer},${cy + Math.sin(a1) * outer}
        A${outer},${outer} 0 ${large} 1 ${cx + Math.cos(a2) * outer},${cy + Math.sin(a2) * outer}
        L${cx + Math.cos(a2) * inner},${cy + Math.sin(a2) * inner}
        A${inner},${inner} 0 ${large} 0 ${cx + Math.cos(a1) * inner},${cy + Math.sin(a1) * inner} Z" fill="${fill}"/>
        <text class="label" x="${cx + Math.cos(mid) * labelR}" y="${cy + Math.sin(mid) * labelR}" text-anchor="${Math.cos(mid) > 0.1 ? "start" : Math.cos(mid) < -0.1 ? "end" : "middle"}">${esc(slice.label)} ${Math.round((slice.value / total) * 100)}%</text>
        <text class="tnote" x="${cx + Math.cos(mid) * labelR}" y="${cy + Math.sin(mid) * labelR + 22}" text-anchor="${Math.cos(mid) > 0.1 ? "start" : Math.cos(mid) < -0.1 ? "end" : "middle"}">${esc(slice.value)}</text>`;
    })
    .join("");
  return svg(
    width,
    size,
    `${arcs}<text class="value" style="font-size:${size * 0.2}px" x="${cx}" y="${cy + size * 0.04}" text-anchor="middle">${esc(center)}</text>
     <text class="axis" x="${cx}" y="${cy + size * 0.15}" text-anchor="middle">${esc(caption)}</text>`,
  );
}

/** Stacked horizontal bars — one row per group, segments from `keys`. */
export function stacked(rows, keys, opts = {}) {
  const { width = W.full, barHeight = 26, gap = 16, labelWidth = 150 } = opts;
  const max = Math.max(...rows.map((row) => keys.reduce((sum, key) => sum + (row.values[key] ?? 0), 0)), 1);
  const track = width - labelWidth - 74;
  const body = rows
    .map((row, index) => {
      const y = index * (barHeight + gap);
      let x = labelWidth + 8;
      const segments = keys
        .map((key, keyIndex) => {
          const value = row.values[key] ?? 0;
          const segmentWidth = (value / max) * track;
          const out =
            value > 0
              ? `<rect x="${x}" y="${y}" width="${segmentWidth}" height="${barHeight}" fill="${paint(key.color, tone(keyIndex))}"/>`
              : "";
          x += segmentWidth;
          return out;
        })
        .join("");
      const total = keys.reduce((sum, key) => sum + (row.values[key] ?? 0), 0);
      return `<text class="label" x="0" y="${y + barHeight * 0.72}">${esc(row.label)}</text>${segments}
        <text class="tnote" x="${width}" y="${y + barHeight * 0.72}" text-anchor="end">${esc(total)}</text>`;
    })
    .join("");
  const legend = keys
    .map((key, keyIndex) => {
      const x = keyIndex * 190;
      return `<rect x="${x}" y="0" width="16" height="16" fill="${key.color ? `var(--${key.color})` : tone(keyIndex)}"/>
        <text class="axis" x="${x + 24}" y="13">${esc(key.label)}</text>`;
    })
    .join("");
  const height = rows.length * (barHeight + gap) + 34;
  return svg(width, height, `<g transform="translate(0 4)">${legend}</g><g transform="translate(0 30)">${body}</g>`);
}

/** Rates as bars against 100 — attendance, verification, completeness. */
export function rates(items, opts = {}) {
  const { width = W.full, barHeight = 22, gap = 16, labelWidth = 260, color = "var(--c6)" } = opts;
  const track = width - labelWidth - 120;
  const body = items
    .map((item, index) => {
      const y = index * (barHeight + gap);
      const pct = Math.max(Math.min(item.rate, 100), 0);
      return `<text class="label" x="0" y="${y + barHeight * 0.8}">${esc(item.label)}</text>
        <rect x="${labelWidth}" y="${y}" width="${track}" height="${barHeight}" rx="3" fill="var(--line-soft)"/>
        <rect x="${labelWidth}" y="${y}" width="${(pct / 100) * track}" height="${barHeight}" rx="3" fill="${paint(item.color, color)}"/>
        ${item.note ? `<text class="tnote" x="${width - 104}" y="${y + barHeight * 0.8}" text-anchor="end">${esc(item.note)}</text>` : ""}
        <text class="value" x="${width}" y="${y + barHeight * 0.8}" text-anchor="end">${pct}%</text>`;
    })
    .join("");
  return svg(width, items.length * (barHeight + gap) + 4, body);
}

/** The step chain: submitted → matched → verified → present. */
export function steps(items, opts = {}) {
  const { width = W.full, rowHeight = 96, color = "var(--c1)" } = opts;
  const max = Math.max(...items.map((item) => item.value), 1);
  const body = items
    .map((item, index) => {
      const y = index * rowHeight;
      const barWidth = (item.value / max) * (width - 360);
      const shown = item.display ?? n(item.value);
      return `<g transform="translate(0 ${y})">
        <text class="label" style="font-weight:600;font-size:22px" x="0" y="30">${esc(item.label)}</text>
        <text class="tnote" x="0" y="58">${esc(item.note ?? "")}</text>
        <rect x="330" y="6" width="${barWidth}" height="54" rx="6" fill="${paint(item.color, color)}" opacity="${1 - index * 0.06}"/>
        <text class="value" style="font-size:30px" x="${330 + barWidth + 16}" y="44">${esc(shown)}</text>
        <text class="axis" x="${330 + barWidth + 16}" y="66">${item.share}% of filed</text>
      </g>`;
    })
    .join("");
  return svg(width, items.length * rowHeight, body);
}

/** The KPI cards themselves, unwrapped, so a sheet's own grid can place them. */
export function kpiCards(cells) {
  /** A figure is set to fit its own length, so ৳419,250 never bleeds into the next card. */
  const size = (text) => (String(text).length >= 10 ? 38 : String(text).length >= 8 ? 46 : String(text).length >= 6 ? 56 : 66);
  return cells
    .map(
      (cell) => `<div class="kpi ${cell.className ?? ""}">
        ${cell.eyebrow ? `<div class="kicker">${esc(cell.eyebrow)}</div>` : ""}
        <div class="v" style="font-size:${size(cell.value)}px">${esc(cell.value)}</div>
        <div class="l">${esc(cell.label)}</div>
        ${cell.note ? `<div class="n">${esc(cell.note)}</div>` : ""}
      </div>`,
    )
    .join("");
}

/** A full-width band of KPI cards — for when a panel, not a row, holds them. */
export function kpiBand(cells, columns = Math.min(cells.length, 4)) {
  return `<div class="row" style="grid-template-columns:repeat(${columns},1fr)">${kpiCards(cells)}</div>`;
}

/** Two-line comparison: one full-width bar split into named parts. */
export function split(parts, opts = {}) {
  const { width = W.full, height = 104, colors = ["c1", "c2", "c3", "c4", "c5"] } = opts;
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  let x = 0;
  const body = parts
    .map((part, index) => {
      const segmentWidth = (part.value / total) * width;
      const fill = paint(part.color ?? colors[index % colors.length]);
      const labelInside = segmentWidth > 150;
      const out = `<rect x="${x}" y="0" width="${segmentWidth}" height="${height}" fill="${fill}"/>
        ${
          labelInside
            ? `<text class="value" x="${x + 14}" y="${height * 0.44}" fill="#fff8ec">${esc(part.label)}</text>
               <text class="tnote" x="${x + 14}" y="${height * 0.44 + 28}" fill="#fff8ec">${part.value} · ${Math.round((part.value / total) * 100)}%</text>`
            : ""
        }`;
      x += segmentWidth;
      return out;
    })
    .join("");
  return svg(width, height, body);
}

/** Legend chips for a split bar, as HTML under the svg. */
export function legend(parts, opts = {}) {
  const { colors = ["c1", "c2", "c3", "c4", "c5"] } = opts;
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return `<div class="leak">${parts
    .map(
      (part, index) =>
        `<span class="chip" style="border-color:var(--${part.color ?? colors[index % colors.length]}4d)">
          <b style="color:var(--${part.color ?? colors[index % colors.length]})">■</b> ${esc(part.label)} — ${part.value} (${Math.round((part.value / total) * 100)}%)</span>`,
    )
    .join("")}</div>`;
}

/** Rank ladder for the anonymised leaderboards (referrers, admins, schools). */
export function ladder(items, opts = {}) {
  const { width = W.full, perRow = 46, color = "var(--c4)", valueFormat = (n) => n } = opts;
  const max = Math.max(...items.map((item) => item.value), 1);
  const body = items
    .map((item, index) => {
      const y = index * perRow;
      const barWidth = (item.value / max) * (width - 190);
      return `<text class="axis" x="0" y="${y + 26}">${String(index + 1).padStart(2, "0")}</text>
        <rect x="46" y="${y + 4}" width="${barWidth}" height="${perRow - 16}" rx="4" fill="${paint(item.color, color)}"/>
        <text class="value" x="${46 + barWidth + 14}" y="${y + 27}">${esc(valueFormat(item.value))}</text>
        ${item.note ? `<text class="tnote" x="${width}" y="${y + 27}" text-anchor="end">${esc(item.note)}</text>` : ""}`;
    })
    .join("");
  return svg(width, items.length * perRow + 6, body);
}

/** Heat grid for a two-way table. `matrix[rowIndex][colIndex]` holds the numbers. */
export function heat(rowLabels, columnLabels, matrix, opts = {}) {
  const { width = W.full, cellHeight = 52, labelWidth = 150, color = "--c1", format = (n) => n } = opts;
  const cellWidth = (width - labelWidth - 8) / columnLabels.length;
  const max = Math.max(...matrix.flat().filter((value) => Number.isFinite(value)), 1);
  const cells = matrix
    .map((row, rowIndex) =>
      columnLabels
        .map((_, columnIndex) => {
          const value = row[columnIndex] ?? 0;
          const opacity = value === 0 ? 0.05 : 0.14 + (value / max) * 0.86;
          const x = labelWidth + columnIndex * cellWidth;
          const y = 30 + rowIndex * cellHeight;
          const ink = value / max > 0.55 ? "#fff8ec" : "#142326";
          return `<rect x="${x}" y="${y}" width="${cellWidth - 4}" height="${cellHeight - 6}" rx="4" fill="var(${color})" opacity="${opacity}"/>
            ${cellWidth > 56 ? `<text style="font-family:var(--mono);font-size:16px" fill="${ink}" x="${x + (cellWidth - 4) / 2}" y="${y + cellHeight / 2}" text-anchor="middle">${esc(format(value))}</text>` : ""}`;
        })
        .join(""),
    )
    .join("");
  const heads = columnLabels
    .map(
      (column, index) =>
        `<text class="axis" style="font-size:15px" x="${labelWidth + index * cellWidth + (cellWidth - 4) / 2}" y="20" text-anchor="middle">${esc(column)}</text>`,
    )
    .join("");
  const sides = rowLabels
    .map(
      (row, index) =>
        `<text class="label" style="font-size:19px" x="0" y="${36 + index * cellHeight + cellHeight / 2 - 4}">${esc(row)}</text>`,
    )
    .join("");
  return svg(width, 34 + rowLabels.length * cellHeight, heads + sides + cells);
}

/** Plain prose block for the "what this means" note under a chart. */
export function readout(lines) {
  return `<div class="grid-note">${lines.map((line) => `<div>${esc(line)}</div>`).join("")}</div>`;
}
