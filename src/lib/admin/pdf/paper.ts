import type { PDFDocument, PDFPage } from "pdf-lib";

import {
  contentBox,
  REPORT_MARGINS,
  type ContentBox,
  type Margins,
  type PageSize,
} from "./geometry";
import { RULE, RULE_WIDTHS, rgbColor } from "./palette";
import { drawLine, widthOf, wrap, type TypeStyle } from "./text";
import type { Typefaces } from "./typefaces";

/**
 * The sheet a report is drawn on: a page list, a cursor, and the handful of
 * marks a document is made of.
 *
 * It is a class because it is state — which page is current, how much room is
 * left — and every method reads or moves that state. Content decides *what* the
 * document says; `Paper` decides *where* it lands and when the sheet turns.
 *
 * pdf-lib's origin is a page's bottom-left corner, so a cursor walking down the
 * page is a number getting smaller. All the methods here take top-down
 * distances, which is how the stylesheet thinks, and do that conversion in one
 * place.
 */

export interface PaperSpec {
  size: PageSize;
  /** Defaults to `REPORT_MARGINS` — the print sheet's own padding. */
  margins?: Margins;
}

export interface TextOptions {
  /** Left edge of the column the text sits in. */
  x?: number;
  /** Width available to it. */
  width?: number;
  /** How each line sits inside that width. */
  align?: "left" | "right" | "center";
  /** CSS line-height as a multiple. Defaults to the face's natural height. */
  lineHeight?: number;
}

export interface PaintOptions {
  /** Offset from the content box's left edge. */
  dx?: number;
  /** Down from the cursor. */
  dy?: number;
  width: number;
  height: number;
  color: string;
}

export interface RuleOptions {
  color?: string;
  thickness?: number;
  /** Space taken above the rule, and below it. */
  gapBefore?: number;
  gapAfter?: number;
  /** Where the rule runs, when it does not span the page. */
  dx?: number;
  width?: number;
}

export class Paper {
  readonly box: ContentBox;
  readonly pages: PDFPage[] = [];

  private cursor: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly typefaces: Typefaces,
    private readonly spec: PaperSpec,
  ) {
    const margins = spec.margins ?? REPORT_MARGINS;
    this.box = contentBox(spec.size, margins);
    this.cursor = this.box.top;
    this.pages.push(this.doc.addPage([spec.size.width, spec.size.height]));
  }

  get page(): PDFPage {
    return this.pages[this.pages.length - 1];
  }

  /** Baseline-to-baseline y of the cursor. */
  get y(): number {
    return this.cursor;
  }

  /** Room left on the current page, from the cursor down to the bottom margin. */
  get room(): number {
    return this.cursor - this.box.bottom;
  }

  fits(height: number): boolean {
    return this.room >= height;
  }

  newPage(): void {
    this.pages.push(this.doc.addPage([this.spec.size.width, this.spec.size.height]));
    this.cursor = this.box.top;
  }

  /** Turn the sheet if `height` will not fit, then keep going. */
  ensure(height: number): void {
    if (!this.fits(height)) this.newPage();
  }

  /** Move the cursor down, without drawing anything. */
  space(amount: number): void {
    this.cursor -= amount;
  }

  lines(content: string, style: TypeStyle, width: number): string[] {
    return wrap(this.typefaces, content, style, width);
  }

  /** Height a block of text will occupy, so callers can reserve it first. */
  heightOf(
    content: string,
    style: TypeStyle,
    width: number,
    lineHeight?: number,
  ): number {
    return this.lines(content, style, width).length * this.lineBox(style, lineHeight);
  }

  /**
   * Draw wrapped text at the cursor and leave the cursor under the last line.
   *
   * A line that no longer fits turns the page — that is what "the current one
   * doesn't print everything" means when a paragraph crosses a sheet, and it is
   * the one behaviour here that must never be delegated to the caller.
   */
  draw(lines: string[], style: TypeStyle, options: TextOptions = {}): void {
    const x = options.x ?? this.box.x;
    const width = options.width ?? this.box.width - (x - this.box.x);
    const lineBox = this.lineBox(style, options.lineHeight);
    // CSS centres the glyph box in the line box, so half the leading sits above
    // the ascenders and the baseline is `ascent` under that.
    const leading = Math.max(0, lineBox - this.naturalHeight(style)) / 2;

    for (const line of lines) {
      this.ensure(lineBox);
      const baseline = this.cursor - leading - this.ascent(style);
      this.cursor -= lineBox;
      drawLine(this.page, this.typefaces, line, style, {
        x: x + this.offset(line, style, width, options.align ?? "left"),
        baseline,
      });
    }
  }

  /** `lines()` and `draw()` in one call. */
  text(content: string, style: TypeStyle, options: TextOptions = {}): void {
    const width = options.width ?? this.box.width - ((options.x ?? this.box.x) - this.box.x);
    this.draw(this.lines(content, style, width), style, options);
  }

  /** A single line, right-aligned to `rightEdge`, without moving the cursor. */
  atRight(content: string, style: TypeStyle, rightEdge: number, at: number): void {
    drawLine(this.page, this.typefaces, content, style, {
      x: rightEdge - widthOf(this.typefaces, content, style),
      baseline: at,
    });
  }

  /** A filled rectangle with its top-left corner at the cursor. */
  paint(options: PaintOptions): void {
    const x = this.box.x + (options.dx ?? 0);
    const top = this.cursor - (options.dy ?? 0);
    this.page.drawRectangle({
      x,
      y: top - options.height,
      width: options.width,
      height: options.height,
      color: rgbColor(options.color),
    });
  }

  /**
   * A horizontal rule across the content box.
   *
   * Painted as a filled rectangle rather than a stroked line, because a stroke
   * is centred on its path: the browser's `border-bottom` hangs *below* the
   * box's content, and this keeps the same relationship with the cursor.
   */
  rule(options: RuleOptions = {}): void {
    const thickness = options.thickness ?? RULE_WIDTHS.hairline;
    this.cursor -= options.gapBefore ?? 0;
    this.page.drawRectangle({
      x: this.box.x + (options.dx ?? 0),
      y: this.cursor - thickness,
      width: options.width ?? this.box.width - (options.dx ?? 0),
      height: thickness,
      color: rgbColor(options.color ?? RULE),
    });
    this.cursor -= thickness + (options.gapAfter ?? 0);
  }

  /** Save the document. */
  async finish(): Promise<Uint8Array> {
    return this.doc.save();
  }

  /** Where a line sits inside its column, given its alignment. */
  private offset(
    line: string,
    style: TypeStyle,
    width: number,
    align: "left" | "right" | "center",
  ): number {
    if (align === "left") return 0;
    const free = width - widthOf(this.typefaces, line, style);
    if (align === "right") return free;
    return free / 2;
  }

  /** A line box at the face's natural height, or at a CSS multiple. */
  private lineBox(style: TypeStyle, multiple?: number): number {
    if (multiple !== undefined) return style.size * multiple;
    return this.naturalHeight(style);
  }

  private naturalHeight(style: TypeStyle): number {
    return Math.max(
      this.typefaces.latin.heightAtSize(style.size, { descender: true }),
      this.typefaces.bengali.heightAtSize(style.size, { descender: true }),
    );
  }

  /** Above-baseline extent of the taller of the two faces. */
  private ascent(style: TypeStyle): number {
    return Math.max(
      this.typefaces.latin.heightAtSize(style.size, { descender: false }),
      this.typefaces.bengali.heightAtSize(style.size, { descender: false }),
    );
  }
}
