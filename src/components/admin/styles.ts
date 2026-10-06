/**
 * The admin panel's shared class strings.
 *
 * One module instead of the same literals copied through fourteen components: the
 * panel is a flat working surface on a warm bone canvas, and "what a panel looks
 * like" should be answerable in one place rather than by reading every table.
 * Everything here resolves to a token in `globals.css` (`--admin-*`), so no
 * colour, radius or shadow is spelled out at a call site.
 *
 * Colour enters through `--admin-accent*`, never through a literal. A section
 * scopes its own hue on its root (`adminAccentStyle` in `src/lib/admin/accents.ts`)
 * and every string here follows it — so a panel, a table heading and the primary
 * button all wear the current section's colour without any of them being told
 * which section they are in.
 *
 * These are plain strings on purpose. Tailwind v4 scans every source file for
 * candidates, so the utilities written here are emitted exactly as if they sat in
 * the component that uses them — and a component can still add its own layout
 * classes beside them with `cn()`.
 */

/**
 * A card, a panel or a table: white, one hairline, a gradient accent edge, 10px
 * corners. The edge is painted as a background strip rather than a border so it
 * follows the rounded corner instead of butting into it.
 */
export const adminPanel =
  "overflow-hidden rounded-[10px] border border-admin-line bg-admin-surface admin-edge-top";

/** The heading strip inside a panel: the section's wash, ruled off from the body. */
export const adminPanelHead =
  "admin-wash-head flex flex-wrap items-start justify-between gap-3 border-b border-admin-line px-6 py-4";

/**
 * An icon in a filled accent square: the panel's strongest mark, for a figure.
 * The ink ramp rather than the plain accent, because the glyph sits on it in
 * white and the lighter hues cannot carry that at 16px.
 */
export const adminChipSolid =
  "admin-fill-ink flex shrink-0 items-center justify-center rounded-[8px] text-white";

/** An icon on the section's wash: the quieter mark, for a panel or a section. */
export const adminChipSoft =
  "flex shrink-0 items-center justify-center rounded-[8px] bg-admin-accent-soft text-admin-accent-ink";

/** The small uppercase overline that labels a field, section or table column. */
export const adminLabel =
  "font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-muted uppercase";

/** Text, date and select controls — one control everywhere. */
export const adminControl =
  "w-full rounded-[6px] border border-admin-line bg-admin-surface px-3 py-2 font-space-body text-sm text-admin-ink outline-none transition-colors placeholder:text-admin-muted focus:border-admin-accent";

/**
 * The primary action: the section's ink ramp, lit from above. Hover brightens
 * the whole fill instead of swapping a `background-color` a gradient sits on top
 * of, and the press nudges inward so the button feels pushed.
 */
export const adminButtonPrimary =
  "admin-fill-ink inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2 font-space-body text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-[filter,transform,box-shadow] duration-150 hover:brightness-110 hover:shadow-[0_2px_10px_rgba(0,0,0,0.10)] active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:pointer-events-none disabled:opacity-45 disabled:saturate-0";

/** A secondary action: hairline border, white fill. */
export const adminButton =
  "inline-flex items-center justify-center gap-2 rounded-[6px] border border-admin-line bg-admin-surface px-3 py-2 font-space-body text-sm font-medium text-admin-ink-soft transition-colors hover:border-admin-ink/35 hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink disabled:pointer-events-none disabled:opacity-45";

/** A quiet text action — the third rank of button, for "Clear all" and friends. */
export const adminTextButton =
  "font-space-body text-sm text-admin-muted underline underline-offset-[3px] transition-colors hover:text-admin-ink disabled:pointer-events-none disabled:text-admin-muted/60 disabled:no-underline";

/**
 * The horizontal scroller every data table lives in.
 *
 * `relative` is load-bearing, not decoration. A row can contain an `sr-only`
 * label, which is absolutely positioned — and an absolutely positioned box is
 * placed against its nearest *positioned* ancestor. `overflow-x-auto` alone does
 * not create that ancestor, so a label in the last column of a table wider than
 * the phone resolves its position outside the scroller: its scrollable overflow
 * escapes the clip and widens the whole page instead of scrolling the table,
 * which shows up as a horizontal bar over empty canvas.
 */
export const adminTableScroller = "relative overflow-x-auto";

/** A table's heading cell: the same wash the panel head wears, so a table reads
 *  as part of its panel rather than a second surface inside it. */
export const adminTh =
  "admin-wash-head px-4 py-2.5 text-left font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-accent-ink uppercase";

/** A table's data cell. */
export const adminTd = "px-4 py-3 font-space-body text-sm text-admin-ink-soft";

/** A data cell holding a code, an ID or a figure: monospace, tabular. */
export const adminTdFigures = `${adminTd} font-mono tabular-nums`;

/**
 * A body row that opens a detail panel.
 *
 * The whole row is the hit target, so it carries the focus ring: a keyboard
 * visitor has to be able to see which row they are about to fold. No border here
 * — the table body rules its own rows with `divide-y`, and a per-row border would
 * double that hairline.
 */
const adminRowBase =
  "cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-admin-accent";

/** A closed row. */
export const adminRow = `${adminRowBase} hover:bg-admin-sunken`;

/** A row that is currently open: the section's own wash, one step under its header. */
export const adminRowOpen = `${adminRowBase} bg-admin-accent-soft/60`;

/** The tag/pill base; the tone pair itself comes from the option tables. */
export const adminTag =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-medium tracking-[0.05em] uppercase";

/** The definition list inside an expanded row. */
export const adminDetailGrid =
  "grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6";

/** A term in that list. */
export const adminDetailLabel = "font-space-body text-sm text-admin-muted";

/** Its definition. */
export const adminDetailValue =
  "max-w-3xl font-space-body text-sm leading-relaxed break-words text-admin-ink-soft";
