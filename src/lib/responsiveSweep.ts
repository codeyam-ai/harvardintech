// The judging rules of the pre-launch responsive sweep.
//
// `scripts/responsive-sweep.mjs` drives Chromium over every built page at every
// width in `SWEEP_WIDTHS` and hands this module plain measurement records. What
// counts as a problem — sideways scroll, an element off the screen, a tap target
// too small to hit — is decided here rather than in the driver, so the rules can
// be unit-tested without a browser or a server.
//
// The ignore list is decided from flags the driver records about each element's
// context (inside a scroller, hidden off-canvas, visually hidden, a third-party
// frame). The DOM questions stay in the browser; the verdicts stay here.

/** The ten widths the sweep checks, smallest phone to a wide monitor. */
export const SWEEP_WIDTHS = [320, 360, 390, 414, 768, 834, 1024, 1280, 1440, 1920] as const;

/** Rounding tolerance: sub-pixel layout must not read as overflow. */
export const OVERFLOW_TOLERANCE_PX = 1;

/** WCAG 2.5.5's target size, checked only at touch widths. */
export const MIN_TAP_TARGET_PX = 44;
export const TOUCH_MAX_WIDTH = 834;

/** Below this computed size, text is reported as too small to read. */
export const MIN_FONT_SIZE_PX = 12;

/** One element as the driver measured it. Coordinates are viewport CSS pixels. */
export interface ElementMeasure {
  /** A short CSS path a human can search for in devtools. */
  selector: string;
  tag: string;
  left: number;
  right: number;
  width: number;
  height: number;
  /** Rendered, not `display:none`/`visibility:hidden`, with a non-zero box. */
  visible: boolean;
  /** A link, button, form control or `role="button"`. */
  interactive?: boolean;
  /** An interactive element that sits inline inside running text. */
  inlineInText?: boolean;
  /** Computed font-size, set only for elements with their own text. */
  fontSize?: number;
  /** An `img`, `picture`, `video` or `svg`. */
  isMedia?: boolean;
  /** A cross-origin `iframe` (Luma, Givebutter): its contents are not ours to measure. */
  thirdPartyFrame?: boolean;
  /** Inside an `overflow-x: auto|scroll` box — a deliberate scroller. */
  insideScroller?: boolean;
  /** Inside an `overflow-x: hidden|clip` box, which hides the overflow. */
  clippedByAncestor?: boolean;
  /** Inside a closed off-canvas panel (`inert`, `aria-hidden`, `hidden`). */
  offCanvasClosed?: boolean;
  /** A skip link or `.visually-hidden` element, 1px boxes by design. */
  visuallyHidden?: boolean;
  /** Its nearest measured ancestor already overflows, so it is not the cause. */
  parentOverflows?: boolean;
}

/** Everything the driver measured on one page at one width. */
export interface PageMeasurements {
  page: string;
  width: number;
  innerWidth: number;
  scrollWidth: number;
  elements: ElementMeasure[];
}

export type FindingKind =
  | 'horizontal-scroll'
  | 'offscreen-element'
  | 'image-overflow'
  | 'small-tap-target'
  | 'small-text'
  | 'third-party-frame';

export type Severity = 'fail' | 'advisory';

export interface Finding {
  page: string;
  width: number;
  kind: FindingKind;
  severity: Severity;
  /** The element, or `document` for page-level findings. */
  selector: string;
  detail: string;
}

const SEVERITY: Record<FindingKind, Severity> = {
  'horizontal-scroll': 'fail',
  'offscreen-element': 'fail',
  'image-overflow': 'fail',
  'small-tap-target': 'advisory',
  'small-text': 'advisory',
  // Not a failure of ours, but never a silent pass either: the report must say
  // these frames were not checked.
  'third-party-frame': 'advisory',
};

/** Why an element is exempt from the overflow checks, or null when it is not. */
export function overflowExemption(el: ElementMeasure): string | null {
  if (el.offCanvasClosed) return 'closed off-canvas panel';
  if (el.visuallyHidden) return 'visually hidden';
  if (el.insideScroller) return 'inside a horizontal scroller';
  if (el.clippedByAncestor) return 'clipped by an overflow-hidden ancestor';
  if (el.parentOverflows) return 'ancestor already reported';
  return null;
}

function finding(m: PageMeasurements, kind: FindingKind, selector: string, detail: string): Finding {
  return { page: m.page, width: m.width, kind, severity: SEVERITY[kind], selector, detail };
}

const px = (n: number) => `${Math.round(n)}px`;

/** Every finding on one page at one width. */
export function judgePage(m: PageMeasurements): Finding[] {
  const out: Finding[] = [];
  const limit = m.innerWidth + OVERFLOW_TOLERANCE_PX;

  if (m.scrollWidth > limit) {
    out.push(
      finding(m, 'horizontal-scroll', 'document', `page is ${px(m.scrollWidth)} wide in a ${px(m.innerWidth)} window`),
    );
  }

  for (const el of m.elements) {
    if (!el.visible) continue;

    if (el.thirdPartyFrame) {
      out.push(finding(m, 'third-party-frame', el.selector, 'third-party frame: contents not ours, not measured'));
    }

    const overRight = el.right > limit;
    const overLeft = el.left < -OVERFLOW_TOLERANCE_PX;
    if ((overRight || overLeft) && overflowExemption(el) === null) {
      const where = overRight ? `right edge at ${px(el.right)}` : `left edge at ${px(el.left)}`;
      if (el.isMedia) {
        out.push(finding(m, 'image-overflow', el.selector, `${px(el.width)} wide, ${where} of ${px(m.innerWidth)}`));
      } else {
        out.push(finding(m, 'offscreen-element', el.selector, `${where} of ${px(m.innerWidth)}`));
      }
    }

    if (
      el.interactive &&
      m.width <= TOUCH_MAX_WIDTH &&
      !el.visuallyHidden &&
      !el.offCanvasClosed &&
      // Rounded, so a 43.99px box from fractional layout is not "under 44".
      (Math.round(el.width) < MIN_TAP_TARGET_PX || Math.round(el.height) < MIN_TAP_TARGET_PX)
    ) {
      const inline = el.inlineInText ? ' (inline link in text)' : '';
      out.push(finding(m, 'small-tap-target', el.selector, `${px(el.width)}×${px(el.height)}${inline}`));
    }

    if (el.fontSize !== undefined && el.fontSize < MIN_FONT_SIZE_PX && !el.visuallyHidden) {
      out.push(finding(m, 'small-text', el.selector, `${el.fontSize}px text`));
    }
  }

  return out;
}

/** One finding seen at one or more widths. */
export interface SummaryRow {
  page: string;
  kind: FindingKind;
  severity: Severity;
  selector: string;
  /** Ascending. */
  widths: number[];
  /** The detail at the narrowest width, where it is usually worst. */
  detail: string;
}

export interface SweepSummary {
  rows: SummaryRow[];
  fails: number;
  advisories: number;
  pages: number;
}

/**
 * Groups findings so one bad element at ten widths reads as a single row.
 * Rows sort failures first, then by page, kind and selector, so two runs of an
 * unchanged site print identically and their diff is the change.
 */
export function summarise(findings: Finding[]): SweepSummary {
  const byKey = new Map<string, SummaryRow>();
  for (const f of findings) {
    const key = `${f.page}\u0000${f.kind}\u0000${f.selector}`;
    const row = byKey.get(key);
    if (!row) {
      byKey.set(key, { page: f.page, kind: f.kind, severity: f.severity, selector: f.selector, widths: [f.width], detail: f.detail });
    } else if (!row.widths.includes(f.width)) {
      row.widths.push(f.width);
      if (f.width < Math.min(...row.widths.slice(0, -1))) row.detail = f.detail;
    }
  }
  const rows = [...byKey.values()];
  for (const r of rows) r.widths.sort((a, b) => a - b);
  rows.sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === 'fail' ? -1 : 1) ||
      a.page.localeCompare(b.page) ||
      a.kind.localeCompare(b.kind) ||
      a.selector.localeCompare(b.selector),
  );
  return {
    rows,
    fails: rows.filter((r) => r.severity === 'fail').length,
    advisories: rows.filter((r) => r.severity === 'advisory').length,
    pages: new Set(rows.map((r) => r.page)).size,
  };
}
