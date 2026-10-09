// Guards the design system against drift back into hand-typed colour.
//
// The redesign's whole premise is that colour lives in `tokens.css` and every
// component reads it from there. That holds today, and the way it stops holding
// is not a decision anybody makes — it is one `#fff` typed into one new
// component, then another, until the token layer describes only some of the
// site. This test makes that first one visible in review.
//
// It is deliberately a FLOOR, not an aspiration: it pins the files that still
// carry raw colour today, so the set can shrink but never grow. A new file with
// a hex literal fails; clearing one of the listed files and forgetting to
// update the list also fails, which is what keeps the list honest.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A hex colour literal: `#fff`, `#ffffff`, `#ffffffff`. */
const HEX = /#[0-9a-fA-F]{3,8}\b/;

/**
 * Areas this guard does not police, each for a stated reason.
 *
 * `donate/`, `give/` and the runbook stylesheet are the paused campaign area —
 * the owner held its look back (2026-09-14), so sweeping its colour would be
 * restyling a surface nobody has signed off.
 *
 * `tokens.css` is where the hex values are SUPPOSED to live; it is the thing
 * every other file reads instead of typing its own.
 *
 * `isolated-components/` are capture fixtures, not shipped UI. They pin their
 * own values on purpose so a frame stays stable regardless of settings.
 *
 * `PreviewGate.astro` builds its overlay as inline styles in a script that runs
 * BEFORE first paint, to hide the page before real content can flash. A custom
 * property resolves to nothing if the stylesheet has not arrived, so tokenising
 * it would let the gate paint transparent over the content it exists to cover.
 */
const UNPOLICED = [
  'src/components/donate/',
  'src/components/give/',
  'src/pages/give',
  'src/styles/cutover-runbook.css',
  'src/styles/tokens.css',
  'src/pages/isolated-components/',
  'src/components/PreviewGate.astro',
];

/**
 * Files that still carry raw colour, with no token to move them to.
 *
 * These are greys and tints that predate the token scale — not crimson, ink or
 * paper, which all have tokens and are all swept. Each one needs a design
 * decision about what token it should become, not a mechanical replacement, so
 * they are recorded rather than quietly rewritten.
 */
const KNOWN_RAW_COLOUR = [
  // The footer's muted body grey, lighter than `--ink-3` on the dark band.
  'src/layouts/BaseLayout.astro',
  // Card borders and fills in four near-identical greys.
  'src/components/WebinarCard.astro',
  // The archive year rule, sharing one of those greys.
  'src/components/EventsArchiveYear.astro',
  // `var(--color-accent, #a41034)` — a defensive fallback, not a stray colour.
  'src/components/landing/GalleryTile.astro',
  'src/components/landing/GalleryExpand.astro',
  // The hero carousel is excluded from the token sweep for an unrelated reason:
  // editing it re-attributes a pre-existing scenario-coverage gap to whoever
  // touched it last, which blocks the build. Sweep it when that gap is closed.
  'src/components/landing/HeroCarousel.astro',
];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, found);
    } else if (path.endsWith('.astro') || path.endsWith('.css')) {
      found.push(path);
    }
  }
  return found;
}

function policedFilesWithRawColour(): string[] {
  return sourceFiles('src')
    .filter((path) => !UNPOLICED.some((skip) => path.includes(skip)))
    .filter((path) => {
      // A hex inside a comment is documentation, not a colour the browser sees
      // — ContentHub names one to explain the rgba beside it.
      const code = readFileSync(path, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      return HEX.test(code);
    })
    .map((path) => path.replaceAll('\\', '/'));
}

describe('design system colour', () => {
  // The guard itself. A component added after this pass must read its colour
  // from the token layer, like every component the redesign touched.
  it('introduces no new hand-typed colour outside the paused campaign area', () => {
    const unexpected = policedFilesWithRawColour().filter(
      (path) => !KNOWN_RAW_COLOUR.includes(path),
    );
    expect(unexpected).toEqual([]);
  });

  // Keeps the list above honest. Without this, a file cleaned up later would
  // sit on the list forever and quietly license a new hex literal in it.
  it('lists no file that has already been cleaned up', () => {
    const stillRaw = policedFilesWithRawColour();
    const staleEntries = KNOWN_RAW_COLOUR.filter((path) => !stillRaw.includes(path));
    expect(staleEntries).toEqual([]);
  });

  // The token layer is the one place colour is allowed to be literal, so the
  // guard is only meaningful while that file actually defines the palette.
  it('still finds the palette defined in the token layer', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');
    expect(tokens).toMatch(/--crimson:\s*#/);
    expect(tokens).toMatch(/--ink:\s*#/);
    expect(tokens).toMatch(/--white:\s*#/);
  });
});
