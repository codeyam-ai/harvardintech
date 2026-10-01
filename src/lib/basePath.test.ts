// A guard over every internal URL the markup emits: it must carry the deploy's
// base path.
//
// The site is served from two different roots. On a custom domain the base is
// '/' and a bare `/webinars/` is correct. On the GitHub Pages project subpath —
// which is where the pre-launch preview lives — the base is '/harvardintech/',
// and a bare `/webinars/` points at the domain root of codeyam-ai.github.io,
// where this site does not live. `withBase` (src/lib/url.ts) is the one place
// that knows which, so every internal path has to pass through it.
//
// WHY THIS IS A TEST AND NOT A CODE REVIEW: the base is '/' in `astro dev`, so
// a forgotten `withBase` is INVISIBLE locally — the link works in the preview
// pane, it works in every scenario capture, and it 404s only once deployed.
// That is exactly how the webinars grid shipped with all ten of its cards and
// all five of its cover images pointing at the wrong origin, and why the page
// read as fine in review. Nothing but a source-level check catches this before
// the deploy does.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SCANNED = ['src/components', 'src/pages', 'src/layouts'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // `isolated-components` holds generated capture fixtures, not shipped
    // markup: they are rendered only by the dev server, where the base is '/'.
    if (statSync(path).isDirectory()) return name === 'isolated-components' ? [] : walk(path);
    return path.endsWith('.astro') ? [path] : [];
  });
}

const FILES = SCANNED.flatMap((d) => walk(join(ROOT, d))).map((abs) => ({
  path: relative(ROOT, abs).split(sep).join('/'),
  text: readFileSync(abs, 'utf8'),
}));

const URL_ATTRS = 'href|src|srcset|poster|action';

/**
 * A root-relative URL written as a literal in a markup attribute — either
 * quoted (`href="/webinars/"`) or as a template literal
 * (`href={`/blog/${slug}/`}`). Both forms are the finished URL, so both have to
 * be based. An expression attribute (`href={event.link}`) is NOT matched: the
 * value arrives from a prop, a settings field or an external URL, and whether
 * it needs basing depends on where it came from — see CONTENT_PATH_ATTRS.
 */
const LITERAL_URL = new RegExp(`\\b(?:${URL_ATTRS})=(?:"(/[^"]*)"|\\{\`(/[^\`]*)\`)`, 'g');

/**
 * Attributes whose value is a path stored in CONTENT — a `coverImage` in a blog
 * post's frontmatter, say — rather than a literal in the markup. A static scan
 * cannot tell these from an external URL arriving on the same prop, so each one
 * is named here and asserted to pass through `withBase` at the point it reaches
 * the attribute.
 *
 * This list is a FLOOR, not an inventory: it holds the content-authored paths
 * that are based AT THE ATTRIBUTE. Most image props on this site are based by
 * their caller instead and are correct without appearing here. Add a row when a
 * new content-authored path reaches an attribute directly, and the staleness
 * test below fails if a row stops applying.
 */
const CONTENT_PATH_ATTRS = [
  // The webinars grid reads `coverImage` straight off the post's frontmatter,
  // where it is written site-root-relative ("/images/webinars/<file>.jpg"), so
  // the card is the place it gets the base.
  { file: 'src/components/WebinarCard.astro', expression: 'coverImage' },
];

describe('internal URLs carry the deploy base path', () => {
  // The scan must actually see the markup, or every assertion below passes
  // vacuously against an empty file list.
  it('scans the site markup', () => {
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES.some((f) => f.path === 'src/layouts/BaseLayout.astro')).toBe(true);
    expect(FILES.some((f) => f.path === 'src/components/WebinarCard.astro')).toBe(true);
    // And it must see a file that genuinely holds based links, so a regex that
    // matches nothing at all cannot read as a pass.
    expect(FILES.some((f) => f.text.includes('withBase('))).toBe(true);
  });

  // A URL written out in full in the markup is the finished address, so it has
  // to be based where it is written. This is the case that shipped broken.
  it('writes no root-relative URL literal outside withBase', () => {
    const offenders = FILES.flatMap((f) =>
      [...f.text.matchAll(LITERAL_URL)].map((m) => `${f.path}: ${m[1] ?? m[2]}`),
    );
    expect(offenders).toEqual([]);
  });

  // A path stored in content reaches the attribute through a prop, where no
  // scan can tell it from an external URL — so each one is named and checked.
  it.each(CONTENT_PATH_ATTRS.map((r) => [r.file, r.expression]))(
    '%s bases %s at the attribute',
    (file, expression) => {
      const found = FILES.find((f) => f.path === file);
      expect(found, `${file} no longer exists — remove it from CONTENT_PATH_ATTRS`).toBeDefined();
      expect(
        new RegExp(`\\b(?:${URL_ATTRS})=\\{withBase\\(${expression}\\)\\}`).test(found!.text),
        `${file} puts ${expression} in a URL attribute without withBase — a content-authored path reaches the page unbased`,
      ).toBe(true);
    },
  );

  // A row that no longer names a content-authored path is indistinguishable
  // from one that does, so it has to fail rather than sit there.
  it('keeps every CONTENT_PATH_ATTRS row applicable', () => {
    const stale = CONTENT_PATH_ATTRS.filter((r) => {
      const found = FILES.find((f) => f.path === r.file);
      return !found || !found.text.includes(r.expression);
    });
    expect(stale.map((r) => `${r.file}:${r.expression}`)).toEqual([]);
  });
});
