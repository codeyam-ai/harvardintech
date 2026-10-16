// The site's minimum text size: nothing renders under 12px, on any screen
// (owner, 2026-10-16). Monospace eyebrows, dates, the city bar and the footer
// had been 9-11px, which is hard to read on a phone.
//
// This judges only what can be resolved from the source text — literal `px`
// and `rem` (at the browser's 16px root). `clamp()`, `em`, `%` and `var()`
// depend on context and are left to the responsive sweep, which measures the
// rendered page.

export const TYPE_FLOOR_PX = 12;
const ROOT_PX = 16;

export interface FontSizeHit {
  /** 1-based line of the declaration. */
  line: number;
  /** The declared value, as written. */
  value: string;
}

/**
 * Every literal `font-size` in `cssText` that resolves under {@link TYPE_FLOOR_PX}.
 * Declarations inside a block whose selector is listed in `allowSelectors`
 * (e.g. an icon glyph such as the menu caret) are skipped.
 */
export function fontSizesBelowFloor(
  cssText: string,
  opts: { allowSelectors?: string[] } = {},
): FontSizeHit[] {
  const allow = opts.allowSelectors ?? [];
  const hits: FontSizeHit[] = [];
  const re = /font-size\s*:\s*([0-9]*\.?[0-9]+)(px|rem)\b/g;
  for (const match of cssText.matchAll(re)) {
    const index = match.index ?? 0;
    const px = Number(match[1]) * (match[2] === 'rem' ? ROOT_PX : 1);
    if (px >= TYPE_FLOOR_PX) continue;
    if (allow.length > 0 && allow.includes(enclosingSelector(cssText, index))) continue;
    hits.push({
      line: cssText.slice(0, index).split('\n').length,
      value: `${match[1]}${match[2]}`,
    });
  }
  return hits;
}

/** The selector of the innermost `{ … }` block containing `index`. */
function enclosingSelector(cssText: string, index: number): string {
  const open = cssText.lastIndexOf('{', index);
  if (open < 0) return '';
  const start = Math.max(
    cssText.lastIndexOf('}', open),
    cssText.lastIndexOf(';', open),
    cssText.lastIndexOf('{', open - 1),
  );
  return cssText.slice(start + 1, open).trim();
}
