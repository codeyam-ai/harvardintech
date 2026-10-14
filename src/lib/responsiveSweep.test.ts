import { describe, expect, it } from 'vitest';
import {
  SWEEP_WIDTHS,
  judgePage,
  overflowExemption,
  summarise,
  type ElementMeasure,
  type Finding,
  type PageMeasurements,
} from './responsiveSweep';

// Hand-built measurement records — no browser, no pages. Each case is the
// smallest record that exercises one rule.

const el = (over: Partial<ElementMeasure> = {}): ElementMeasure => ({
  selector: 'div.box',
  tag: 'div',
  left: 0,
  right: 100,
  width: 100,
  height: 100,
  visible: true,
  ...over,
});

const page = (over: Partial<PageMeasurements> = {}): PageMeasurements => ({
  page: '/',
  width: 390,
  innerWidth: 390,
  scrollWidth: 390,
  elements: [],
  ...over,
});

const kinds = (fs: Finding[]) => fs.map((f) => f.kind);

describe('SWEEP_WIDTHS', () => {
  // The sweep must reach both ends — the smallest phone still sold and a wide
  // monitor — and its widths must ascend so reports read narrow-to-wide.
  it('runs from the smallest phone to a wide monitor, ascending', () => {
    expect(SWEEP_WIDTHS[0]).toBe(320);
    expect(SWEEP_WIDTHS[SWEEP_WIDTHS.length - 1]).toBe(1920);
    expect([...SWEEP_WIDTHS]).toEqual([...SWEEP_WIDTHS].sort((a, b) => a - b));
  });
});

describe('judgePage', () => {
  // The headline failure: a page wider than its window scrolls sideways. This
  // is the 1012px-in-768px homepage the October sweep found.
  it('fails a page wider than its window', () => {
    const found = judgePage(page({ width: 768, innerWidth: 768, scrollWidth: 1012 }));
    expect(found).toEqual([
      expect.objectContaining({ kind: 'horizontal-scroll', severity: 'fail', selector: 'document' }),
    ]);
  });

  // Fractional layout produces a stray pixel; that must not read as overflow,
  // or every page would fail at some width.
  it('tolerates one pixel of sub-pixel rounding', () => {
    expect(judgePage(page({ scrollWidth: 391 }))).toEqual([]);
    expect(kinds(judgePage(page({ scrollWidth: 392 })))).toEqual(['horizontal-scroll']);
  });

  // Content cut off at either edge is a failure even when the page itself is
  // clipped from scrolling.
  it('fails an element past either edge', () => {
    const right = judgePage(page({ elements: [el({ right: 400 })] }));
    const left = judgePage(page({ elements: [el({ left: -10 })] }));
    expect(right).toEqual([expect.objectContaining({ kind: 'offscreen-element', severity: 'fail' })]);
    expect(left).toEqual([expect.objectContaining({ kind: 'offscreen-element', severity: 'fail' })]);
  });

  // Images get their own kind so an oversized photo is findable separately
  // from a layout bug.
  it('reports an overflowing image as image-overflow, not offscreen-element', () => {
    const found = judgePage(page({ elements: [el({ tag: 'img', isMedia: true, right: 500, width: 500 })] }));
    expect(kinds(found)).toEqual(['image-overflow']);
  });

  // A hidden element cannot be seen or tapped, so nothing about it is a finding.
  it('ignores invisible elements entirely', () => {
    expect(judgePage(page({ elements: [el({ visible: false, right: 900, interactive: true, width: 4 })] }))).toEqual(
      [],
    );
  });

  // Each ignore-list flag exempts an element from the overflow checks, so
  // deliberate off-screen layout (a closed menu, a scroller) never fails.
  it.each([
    ['offCanvasClosed', 'closed off-canvas panel'],
    ['visuallyHidden', 'visually hidden'],
    ['insideScroller', 'inside a horizontal scroller'],
    ['clippedByAncestor', 'clipped by an overflow-hidden ancestor'],
    ['parentOverflows', 'ancestor already reported'],
  ] as const)('exempts an element flagged %s from the overflow checks', (flag, reason) => {
    const overflowing = el({ right: 900, [flag]: true });
    expect(overflowExemption(overflowing)).toBe(reason);
    expect(judgePage(page({ elements: [overflowing] }))).toEqual([]);
  });

  // Tap size only matters on touch screens, and is advisory: the owner decides
  // each one rather than the sweep failing on it.
  it('flags a small tap target at touch widths only, as advisory', () => {
    const link = el({ tag: 'a', interactive: true, width: 96, height: 39 });
    expect(judgePage(page({ width: 834, innerWidth: 834, elements: [link] }))).toEqual([
      expect.objectContaining({ kind: 'small-tap-target', severity: 'advisory', detail: '96px×39px' }),
    ]);
    expect(judgePage(page({ width: 1024, innerWidth: 1024, elements: [link] }))).toEqual([]);
  });

  // A tap area grown to 44px can measure 43.99px from fractional layout; it
  // must not be reported as still too small.
  it('does not call a 43.99px tap area from fractional layout "under 44"', () => {
    const link = el({ tag: 'a', interactive: true, width: 196, height: 43.99 });
    expect(judgePage(page({ elements: [link] }))).toEqual([]);
  });

  // Links inside sentences are legitimately small; labelling them lets the
  // report separate them from standalone buttons.
  it('marks an inline link in running text so it can be told apart', () => {
    const inline = el({ tag: 'a', interactive: true, inlineInText: true, width: 110, height: 20 });
    expect(judgePage(page({ elements: [inline] }))[0].detail).toBe('110px×20px (inline link in text)');
  });

  // Skip links are 1px by design and closed menu items cannot be tapped, so
  // neither is a small-target problem.
  it('skips tap-target checks for hidden skip links and closed panels', () => {
    const skip = el({ tag: 'a', interactive: true, visuallyHidden: true, width: 1, height: 1 });
    const panel = el({ tag: 'a', interactive: true, offCanvasClosed: true, width: 30, height: 20 });
    expect(judgePage(page({ elements: [skip, panel] }))).toEqual([]);
  });

  // The 12px floor is checked only where text actually renders, and 12px
  // itself passes.
  it('flags text under 12px as advisory, and only elements that carry text', () => {
    const found = judgePage(page({ elements: [el({ fontSize: 10.5 }), el({ fontSize: 12 }), el()] }));
    expect(found).toEqual([expect.objectContaining({ kind: 'small-text', severity: 'advisory', detail: '10.5px text' })]);
  });

  // A cross-origin embed cannot be measured inside; the report must say so
  // rather than count it as clean.
  it('never passes a third-party frame silently', () => {
    const frame = el({ tag: 'iframe', thirdPartyFrame: true, width: 360 });
    expect(judgePage(page({ elements: [frame] }))).toEqual([
      expect.objectContaining({ kind: 'third-party-frame', severity: 'advisory' }),
    ]);
  });
});

describe('summarise', () => {
  const f = (over: Partial<Finding>): Finding => ({
    page: '/',
    width: 390,
    kind: 'small-text',
    severity: 'advisory',
    selector: 'span.kick',
    detail: '11px text',
    ...over,
  });

  // One bad element seen at ten widths must read as one row, or the report
  // drowns in repeats.
  it('folds one element at many widths into one row, widths ascending', () => {
    const { rows } = summarise([f({ width: 768 }), f({ width: 320 }), f({ width: 390 }), f({ width: 320 })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].widths).toEqual([320, 390, 768]);
  });

  // The narrowest width is usually the worst case, so its measurement is the
  // one a row shows.
  it('keeps the detail from the narrowest width', () => {
    const { rows } = summarise([
      f({ kind: 'offscreen-element', severity: 'fail', width: 834, detail: 'right edge at 900px' }),
      f({ kind: 'offscreen-element', severity: 'fail', width: 768, detail: 'right edge at 815px' }),
    ]);
    expect(rows[0].detail).toBe('right edge at 815px');
  });

  // Failures lead so they are never buried under advisories, and the totals
  // match the rows.
  it('sorts failures first, then by page, and counts each severity', () => {
    const summary = summarise([
      f({ page: '/a' }),
      f({ page: '/b', kind: 'horizontal-scroll', severity: 'fail', selector: 'document' }),
      f({ page: '/a', selector: 'p.foot-copy' }),
    ]);
    expect(summary.rows.map((r) => `${r.severity} ${r.page}`)).toEqual(['fail /b', 'advisory /a', 'advisory /a']);
    expect(summary).toMatchObject({ fails: 1, advisories: 2, pages: 2 });
  });

  // A clean sweep reports zero everything rather than an error.
  it('returns an empty summary for a clean sweep', () => {
    expect(summarise([])).toEqual({ rows: [], fails: 0, advisories: 0, pages: 0 });
  });
});
