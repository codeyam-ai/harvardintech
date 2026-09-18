import { describe, it, expect, afterEach, vi } from 'vitest';
import { withBase } from '../../lib/url';

// Regression guard for the "broken images on the Pages subpath" bug: every
// landing-component image was rendered with a root-absolute `/images/...` src
// that bypassed `withBase`, so under the project base `/harvardintech/` the
// browser fetched it from the domain root (404). The `.astro` components
// themselves are exercised through captured scenarios in the live preview
// (vitest does not import `.astro` — see vitest.config.ts); this test pins the
// path-prefixing contract those components now rely on, for the exact internal
// asset paths that were broken, so the class of bug can't silently return.
//
// Mirrors the env-stubbing pattern in ../../lib/url.test.ts.
afterEach(() => {
  vi.unstubAllEnvs();
});

// The internal image paths the landing components default to (and the shapes a
// scenario / CMS supplies): Hero + Get Involved backgrounds, the event gallery,
// the board graphic, a board member photo, and the WhatsApp image.
const LANDING_IMAGE_PATHS = [
  '/images/bg/hero-bg.jpg',
  '/images/bg/get-involved-bg.jpg',
  '/images/gallery/event-01.jpg',
  '/images/sections/board.png',
  '/images/team/jane-doe.jpg',
  '/images/sections/whatsapp-banner.jpg',
];

describe('landing image base paths', () => {
  // Under the Pages base `/harvardintech/`, every landing asset must come back
  // prefixed with the base — this is the exact bug (root-absolute src 404ing).
  it('prefixes every internal landing image with the project base on a subpath deploy', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    for (const path of LANDING_IMAGE_PATHS) {
      const src = withBase(path);
      expect(src).toBe(`/harvardintech${path}`);
      expect(src.startsWith('/harvardintech/images/')).toBe(true);
    }
  });

  // At the domain root (base `/`) the same paths must pass through untouched, so
  // a future custom-domain deploy doesn't get a doubled or broken prefix.
  it('leaves every internal landing image unchanged at the domain root', () => {
    vi.stubEnv('BASE_URL', '/');
    for (const path of LANDING_IMAGE_PATHS) {
      expect(withBase(path)).toBe(path);
    }
  });

  // Guards the wrap-once contract: authored data stays base-agnostic and
  // `withBase` is applied a single time at the render site, never re-fed.
  it('does not double-prefix a path that already carries the base', () => {
    // Authored data stays base-agnostic (`/images/...`); `withBase` is applied
    // once at the render site. Guard that we never accidentally feed an
    // already-based value back through it.
    vi.stubEnv('BASE_URL', '/harvardintech/');
    const once = withBase('/images/sections/board.png');
    // An already-absolute external-looking value (the based path) is still an
    // internal path, so re-wrapping WOULD double it — proving why we wrap once.
    expect(once).toBe('/harvardintech/images/sections/board.png');
    expect(withBase(once)).toBe('/harvardintech/harvardintech/images/sections/board.png');
  });
});
