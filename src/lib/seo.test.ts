import { describe, it, expect } from 'vitest';
import { absoluteImageUrl, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_SIZE } from './seo';

// `og:image` and `twitter:image` are the two tags no crawler will resolve
// relatively — LinkedIn, Slack and X all drop a relative path silently, so the
// share card renders blank with nothing in the HTML looking wrong. Before this
// helper, `SEO.astro` emitted whatever it was handed, which was always a
// relative `/images/...`. That is the bug these pin.
//
// The subtle half is WHICH origin. This site is advertised as harvardintech.com
// (`CANONICAL_ORIGIN`) but SERVED from codeyam-ai.github.io/harvardintech/
// (`PAGES_SITE` + base) until the domain cutover. A canonical URL must name the
// advertised domain; a share image must name where the file can actually be
// FETCHED. Getting that backwards produces a 404 on every unfurl, so the base
// path being KEPT here — the opposite of what `canonicalFor` does with it — is
// the behaviour most worth guarding.
const PAGES_SITE = new URL('https://codeyam-ai.github.io');
const BASE = '/harvardintech/';

describe('absoluteImageUrl', () => {
  // The core case, and the one that distinguishes this from `canonicalFor`: the
  // base path is KEPT, because the crawler has to fetch the file from the
  // project subpath it is really served from.
  it('joins a root-relative path onto the serving origin THROUGH the base path', () => {
    expect(absoluteImageUrl('/images/og/default.jpg', PAGES_SITE, BASE)).toBe(
      'https://codeyam-ai.github.io/harvardintech/images/og/default.jpg',
    );
  });

  // The base and the path each may or may not carry a slash at the seam. A `//`
  // in the middle of a URL is a different path to most servers, so every
  // combination has to collapse to the same single-slash result.
  it('never produces a doubled slash, whatever the base and path do at the join', () => {
    for (const [base, path] of [
      ['/harvardintech/', '/images/a.jpg'],
      ['/harvardintech', '/images/a.jpg'],
      ['/harvardintech/', 'images/a.jpg'],
      ['/harvardintech', 'images/a.jpg'],
    ]) {
      const url = absoluteImageUrl(path, PAGES_SITE, base);
      expect(url).toBe('https://codeyam-ai.github.io/harvardintech/images/a.jpg');
      // `https://` is the only legal `//` in the result.
      expect(url!.slice('https://'.length)).not.toContain('//');
    }
  });

  // The post-cutover shape: DEPLOY_BASE_PATH dropped and base back to '/'. This
  // is the config the site moves to at launch, so it must already work.
  it('works at the bare domain too, where the base is just "/"', () => {
    expect(
      absoluteImageUrl('/images/og/default.jpg', new URL('https://harvardintech.com'), '/'),
    ).toBe('https://harvardintech.com/images/og/default.jpg');
  });

  // A CMS entry may point at an externally-hosted image. Re-basing one would
  // corrupt it into a path under our own origin, which would 404.
  it('passes an already-absolute URL through untouched', () => {
    const external = 'https://images.example.com/card.png';
    expect(absoluteImageUrl(external, PAGES_SITE, BASE)).toBe(external);
    expect(absoluteImageUrl('http://legacy.example.com/a.jpg', PAGES_SITE, BASE)).toBe(
      'http://legacy.example.com/a.jpg',
    );
  });

  // An empty `content=""` reads to some scrapers as an image that failed to
  // load, which is worse than no tag at all — so the caller omits the tag.
  it('returns null for blank input rather than an empty tag', () => {
    expect(absoluteImageUrl('', PAGES_SITE, BASE)).toBeNull();
    expect(absoluteImageUrl('   ', PAGES_SITE, BASE)).toBeNull();
    expect(absoluteImageUrl(null, PAGES_SITE, BASE)).toBeNull();
    expect(absoluteImageUrl(undefined, PAGES_SITE, BASE)).toBeNull();
  });

  // A bare `astro dev` with no `site` configured. There is no honest absolute
  // URL to emit, and a guessed one would point at a host we do not control.
  it('returns null when the site is unknown, instead of inventing an origin', () => {
    expect(absoluteImageUrl('/images/og/default.jpg', undefined, BASE)).toBeNull();
  });
});

describe('the default share card', () => {
  // A relative default would resolve differently from /chapters/nyc than from
  // /, so the one page most likely to be shared would get the wrong card.
  it('is a root-absolute path, so it resolves the same from every route depth', () => {
    expect(DEFAULT_OG_IMAGE.startsWith('/')).toBe(true);
  });

  // The declared size is what `og:image:width/height` publishes; if it drifts
  // from the real file, platforms letterbox or crop the card unpredictably.
  it('is declared at the 1200x630 the platforms expect for a large card', () => {
    expect(DEFAULT_OG_IMAGE_SIZE).toEqual({ width: 1200, height: 630 });
  });
});
