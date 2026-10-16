import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { TYPE_FLOOR_PX, fontSizesBelowFloor } from './typeFloor';

describe('fontSizesBelowFloor', () => {
  // A plain px size under 12 is reported with its line number.
  it('flags a px font size under the floor', () => {
    expect(fontSizesBelowFloor('a {\n  font-size: 11px;\n}')).toEqual([
      { line: 2, value: '11px' },
    ]);
  });

  // Exactly 12px is the floor itself, not a violation.
  it('accepts a size equal to the floor', () => {
    expect(fontSizesBelowFloor('a { font-size: 12px; }')).toEqual([]);
  });

  // Fractional px sizes such as the old 10.5px city bar are caught.
  it('flags a fractional px size under the floor', () => {
    expect(fontSizesBelowFloor('x { font-size: 10.5px; }')).toEqual([
      { line: 1, value: '10.5px' },
    ]);
  });

  // rem sizes are judged at the 16px root: 0.7rem is 11.2px.
  it('flags a rem size that computes under the floor', () => {
    expect(fontSizesBelowFloor('x { font-size: 0.7rem; }')).toEqual([
      { line: 1, value: '0.7rem' },
    ]);
  });

  // 0.75rem is exactly 12px at the 16px root.
  it('accepts a rem size that computes to the floor', () => {
    expect(fontSizesBelowFloor('x { font-size: 0.75rem; }')).toEqual([]);
  });

  // clamp(), em, % and var() depend on context; this check only judges
  // literal px and rem, so it never raises a false alarm on them.
  it('ignores sizes it cannot resolve statically', () => {
    const css = 'a{font-size:clamp(28px,3vw,44px)} b{font-size:0.8em} c{font-size:var(--t-sm)}';
    expect(fontSizesBelowFloor(css)).toEqual([]);
  });

  // The menu caret is an arrow glyph, not text, and is allowed under the floor.
  it('skips declarations inside an allowed selector block', () => {
    const css = '.caret {\n  font-size: 9px;\n}\n.label {\n  font-size: 10px;\n}';
    expect(fontSizesBelowFloor(css, { allowSelectors: ['.caret'] })).toEqual([
      { line: 5, value: '10px' },
    ]);
  });

  // An empty stylesheet has nothing to report.
  it('returns nothing for empty input', () => {
    expect(fontSizesBelowFloor('')).toEqual([]);
  });
});

// The site-wide guard: every component and stylesheet keeps text at 12px or
// above on every screen (owner, 2026-10-16). The cutover runbook is an internal
// operator page and the nav caret is a glyph, so both are exempt by name.
describe('site text size floor', () => {
  const ROOT = path.resolve(__dirname, '..');
  const EXEMPT_FILES = new Set(['styles/cutover-runbook.css']);
  const EXEMPT_DIRS = ['components/cutover', 'pages/isolated-components', 'pages/cutover-runbook'];
  const ALLOW: Record<string, string[]> = { 'components/nav/PrimaryNav.astro': ['.caret'] };

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  }

  // Lists every literal font size under 12px outside the exemptions; the list
  // must be empty.
  it('has no literal font size under 12px in src', () => {
    const offenders = walk(ROOT)
      .filter((f) => /\.(astro|css)$/.test(f))
      .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
      .filter((rel) => !EXEMPT_FILES.has(rel) && !EXEMPT_DIRS.some((d) => rel.startsWith(`${d}/`)))
      .flatMap((rel) =>
        fontSizesBelowFloor(readFileSync(path.join(ROOT, rel), 'utf8'), {
          allowSelectors: ALLOW[rel] ?? [],
        }).map((hit) => `${rel}:${hit.line} ${hit.value}`),
      );
    expect(offenders).toEqual([]);
    expect(TYPE_FLOOR_PX).toBe(12);
  });
});
