import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom does not cascade media queries, so these tests read the component's
// stylesheet directly — the same approach as the site text-size floor test.
const SOURCE = readFileSync(path.join(__dirname, 'PrimaryNav.astro'), 'utf8');
const STYLE = SOURCE.slice(SOURCE.indexOf('<style>') + '<style>'.length, SOURCE.indexOf('</style>')).replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

interface Rule {
  selectors: string[];
  body: string;
}

/** The text between the braces of the first `@media <query>` block (comments already stripped). */
function mediaBlock(clean: string, query: string): string {
  const start = clean.indexOf(`@media ${query}`);
  if (start < 0) return '';
  const open = clean.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < clean.length; i++) {
    if (clean[i] === '{') depth++;
    if (clean[i] === '}' && --depth === 0) return clean.slice(open + 1, i);
  }
  return '';
}

/** Flat rules (no nesting) in a block of CSS. */
function rules(css: string): Rule[] {
  const out: Rule[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of css.matchAll(re)) {
    out.push({ selectors: m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: m[2] });
  }
  return out;
}

function transformFor(rs: Rule[], selector: string): string | undefined {
  let value: string | undefined;
  for (const r of rs) {
    if (!r.selectors.includes(selector)) continue;
    const m = r.body.match(/(?:^|;|\s)transform\s*:\s*([^;]+)/);
    if (m) value = m[1].trim();
  }
  return value;
}

describe('PrimaryNav drawer panels', () => {
  const drawer = rules(mediaBlock(STYLE, '(max-width: 1040px)'));

  // Hovering a section in the drawer must not shift its full-width panel half a drawer to the left.
  it('cancels the desktop centring shift on hover inside the drawer', () => {
    expect(transformFor(drawer, '.nav-item:hover .mega')).toBe('none');
  });

  // Tapping a section heading focuses it, so the focus rule must be cancelled too.
  it('cancels the desktop centring shift on focus inside the drawer', () => {
    expect(transformFor(drawer, '.nav-item:focus-within .mega')).toBe('none');
  });

  // The desktop dropdown still centres its floating panel under the button.
  it('keeps the desktop dropdown centred under its button', () => {
    const outside = rules(STYLE.replace(mediaBlock(STYLE, '(max-width: 1040px)'), ''));
    expect(transformFor(outside, '.nav-item:hover .mega')).toBe('translateX(-50%) translateY(0)');
  });
});
