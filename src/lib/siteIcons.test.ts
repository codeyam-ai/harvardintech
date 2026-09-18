import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// The three images that represent the site OUTSIDE the site: the browser-tab
// favicon, the iOS home-screen icon, and the card that appears when someone
// pastes a link into LinkedIn or Slack.
//
// They share a failure mode that no page test can catch, because none of them
// renders on any page: each is referenced by a `<link>` or a `<meta>` and is
// fetched by something that is not our browser. A missing or wrong-sized file
// produces no error anywhere — the tab just shows a generic globe, or the
// unfurl silently falls back to a bare text link.
//
// Deliberately NOT asserted: what the icon looks like. The mark is the approved
// H lockup; if the artwork is ever revised these tests should not need
// touching. What is pinned is that a real, correctly-sized file exists — and,
// for the favicon, that it is no longer the scaffold's placeholder.
//
// The one exception is the geometry-drift guard at the bottom, and it is an
// exception on purpose: the H path exists in TWO files that cannot share an
// import, so the only thing standing between them and silent divergence is an
// assertion that they are the same string.
const PUBLIC_DIR = join(process.cwd(), 'public');
const FAVICON = join(PUBLIC_DIR, 'favicon.svg');
const FAVICON_32 = join(PUBLIC_DIR, 'favicon-32.png');
const APPLE_TOUCH_ICON = join(PUBLIC_DIR, 'apple-touch-icon.png');
const OG_DEFAULT = join(PUBLIC_DIR, 'images/og/default.jpg');
const BRAND_MARK = join(process.cwd(), 'src/components/BrandMark.astro');

/** The single `d` attribute of the H lockup in a file that draws it. */
function markPath(file: string): string {
  const match = /<path[^>]*\sd="([^"]+)"/.exec(readFileSync(file, 'utf-8'));
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

describe('favicon.svg', () => {
  // Referenced from HeadExtras via SiteIcons on every shell; if it is missing
  // the tab falls back to a generic icon with no error anywhere.
  it('exists', () => {
    expect(existsSync(FAVICON)).toBe(true);
  });

  // The scaffold shipped a blue square with a white circle. `#0066cc` is that
  // placeholder's fill, and it is not in the palette — its presence means the
  // site is still wearing the generic starter mark.
  it('is not the scaffold placeholder any more', () => {
    const svg = readFileSync(FAVICON, 'utf-8');
    expect(svg.toLowerCase()).not.toContain('#0066cc');
  });

  // The mark has to read as Harvard in Tech at 16px. Whatever the artwork, it
  // should be carrying the brand crimson rather than an arbitrary colour.
  it('uses the brand crimson from the design tokens', () => {
    const svg = readFileSync(FAVICON, 'utf-8').toLowerCase();
    expect(svg).toContain('#a41034');
  });

  // An SVG with a syntax error renders as nothing, and browsers report it
  // nowhere. Parsing it is the cheapest proof that it is really an image.
  it('is parseable as an image', async () => {
    const meta = await sharp(readFileSync(FAVICON), { density: 300 }).metadata();
    expect(meta.width).toBeGreaterThan(0);
  });
});

describe('the icon kit', () => {
  // A browser that does not use SVG favicons -- and Google's search-result
  // crawler -- ignores the declared SVG and issues an implicit GET /favicon.ico
  // against the ORIGIN root. On the project-subpath deploy that path is outside
  // the site's base entirely, so it 404s and the tab falls back to a generic
  // globe with no error anywhere. Declaring a raster icon explicitly, through
  // withBase, is what stops that request being made.
  it('declares a raster fallback alongside the SVG', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/SiteIcons.astro'), 'utf-8');
    expect(src).toContain('favicon-32.png');
    expect(existsSync(join(PUBLIC_DIR, 'favicon-32.png'))).toBe(true);
  });

  // Browsers pick a raster icon by its declared `sizes`, and a file whose real
  // dimensions disagree with the declaration is resampled — the one thing a
  // fallback exists to avoid, since it is chosen precisely when the crisp SVG
  // cannot be used.
  it('ships the raster fallback at exactly the 32x32 it declares', async () => {
    const { width, height } = await sharp(FAVICON_32).metadata();
    expect({ width, height }).toEqual({ width: 32, height: 32 });
  });

  // The implicit origin-root request that a raster-only browser makes, for the
  // custom-domain deploy and for crawlers that ask for nothing else.
  it('ships a root favicon.ico as well', () => {
    expect(existsSync(join(PUBLIC_DIR, 'favicon.ico'))).toBe(true);
  });

  // THE DRIFT GUARD. The H geometry lives in two files that cannot share an
  // import: the component the header renders, and the standalone favicon an
  // external fetch reads. Editing one and not the other produces a site whose
  // tab and whose header show different marks — a discrepancy nobody sees on
  // the page they are working on, because the two never appear side by side.
  it('draws the same mark in the favicon as in the header component', () => {
    const inFavicon = markPath(FAVICON);
    expect(inFavicon).not.toBe('');
    expect(inFavicon).toBe(markPath(BRAND_MARK));
  });
});

describe('apple-touch-icon.png', () => {
  // iOS ignores the SVG favicon entirely and looks for this file; without it a
  // home-screen shortcut gets a blurry screenshot of the page instead.
  it('exists', () => {
    expect(existsSync(APPLE_TOUCH_ICON)).toBe(true);
  });

  // 180x180 is what iOS asks for. A smaller file is upscaled and looks soft on
  // the home screen; a non-square one is letterboxed.
  it('is exactly 180x180', async () => {
    const { width, height } = await sharp(APPLE_TOUCH_ICON).metadata();
    expect({ width, height }).toEqual({ width: 180, height: 180 });
  });
});

describe('the default share card', () => {
  // Every page without its own image points og:image here. If the file is
  // missing, every unfurl of every page silently loses its card.
  it('exists', () => {
    expect(existsSync(OG_DEFAULT)).toBe(true);
  });

  // 1200x630 is the large-card size LinkedIn, Slack and X all expect, and it is
  // what SEO.astro publishes in og:image:width/height. If the file and the
  // declared numbers disagree, platforms crop or letterbox unpredictably.
  it('is exactly the 1200x630 that SEO.astro declares for it', async () => {
    const { width, height } = await sharp(OG_DEFAULT).metadata();
    expect({ width, height }).toEqual({ width: 1200, height: 630 });
  });
});
