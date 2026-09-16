import { describe, it, expect, afterEach, vi } from 'vitest';
import { withBase } from './url';

// `withBase` reads `import.meta.env.BASE_URL`, which Astro derives from the
// `base` config. `vi.stubEnv` overrides it for `import.meta.env` so each case
// pins a known base; restore it after every test.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('withBase', () => {
  // At the domain root the base is '/', so an internal path gains only its
  // trailing slash.
  it('adds only the trailing slash to an internal path when the base is root', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/events')).toBe('/events/');
  });

  // The bare root path stays '/' at the domain root.
  it('keeps the root path as a single slash when the base is root', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/')).toBe('/');
  });

  // Under a project subpath the base is prefixed onto the internal path.
  it('prefixes the subpath base onto an internal path', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    expect(withBase('/events')).toBe('/harvardintech/events/');
  });

  // The root path becomes the base itself under a subpath, with no doubled slash.
  it('maps the root path to the base under a subpath', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    expect(withBase('/')).toBe('/harvardintech/');
  });

  // A hash fragment on an absolute path is preserved after the base prefix.
  it('preserves a hash fragment on an absolute path under a subpath', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    expect(withBase('/#events')).toBe('/harvardintech/#events');
  });

  // Absolute external URLs are not internal paths and pass through untouched.
  it('passes external http URLs through untouched', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    expect(withBase('https://eventbrite.com/e/123')).toBe('https://eventbrite.com/e/123');
  });

  // mailto and other non-slash schemes are left alone.
  it('passes mailto links through untouched', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    expect(withBase('mailto:hello@example.com')).toBe('mailto:hello@example.com');
  });

  // A bare in-page anchor is not an absolute path, so it is left alone.
  it('passes a bare hash anchor through untouched', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    expect(withBase('#section')).toBe('#section');
  });
});

// The trailing slash exists so the site links to ONE canonical form of each URL
// rather than splitting its own traffic between `/events` and `/events/`. Each
// case below is a path shape where appending that slash would produce a URL that
// is wrong rather than merely different, which is why the rule has exclusions at
// all. See `withTrailingSlash` in ./url.ts.
describe('withBase trailing slashes', () => {
  // The whole point: an internal page path gets exactly one trailing slash.
  it('appends a trailing slash to a nested internal page path', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/chapters/nyc')).toBe('/chapters/nyc/');
  });

  // Applying the rule twice must not accumulate slashes — a path already in
  // canonical form is already done.
  it('does not double the slash on a path that already ends in one', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/events/')).toBe('/events/');
  });

  // The slash belongs BEFORE the '#', and putting it after breaks the anchor.
  // Rewriting it correctly is a URL parse this helper deliberately does not do,
  // so a fragment path is left exactly as the caller wrote it.
  it('leaves a path carrying a fragment alone', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/#chapters')).toBe('/#chapters');
    expect(withBase('/events#past')).toBe('/events#past');
  });

  // Same reasoning as a fragment: the slash would land after the query string.
  it('leaves a path carrying a query alone', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/search?q=events')).toBe('/search?q=events');
  });

  // The case that would break real pages: an asset is a FILE, and
  // '/images/harvard-shield.png/' is a 404. Every logo, hero photo and chapter
  // image on the site goes through this helper.
  it('leaves a path whose last segment has a file extension alone', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/images/harvard-shield.png')).toBe('/images/harvard-shield.png');
    expect(withBase('/review/index.html')).toBe('/review/index.html');
  });

  // A dot EARLIER in the path does not make the last segment a file, so the
  // extension check must look only at the final segment.
  it('still slashes a page path when an earlier segment contains a dot', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/v1.2/notes')).toBe('/v1.2/notes/');
  });

  // '//host' starts with a slash but is a protocol-relative URL to another
  // origin, not an internal path — appending to it would rewrite someone
  // else's address.
  it('leaves a protocol-relative URL alone', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('//cdn.example.com/x')).toBe('//cdn.example.com/x');
  });
});
