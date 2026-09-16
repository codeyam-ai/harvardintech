import { describe, it, expect, afterEach, vi } from 'vitest';
import { withBase } from './url';

// `withBase` reads `import.meta.env.BASE_URL`, which Astro derives from the
// `base` config. `vi.stubEnv` overrides it for `import.meta.env` so each case
// pins a known base; restore it after every test.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('withBase', () => {
  // At the domain root the base is '/', so an internal path is returned unchanged.
  it('leaves an internal path unchanged when the base is root', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/events')).toBe('/events');
  });

  // The bare root path stays '/' at the domain root.
  it('keeps the root path as a single slash when the base is root', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/')).toBe('/');
  });

  // Under a project subpath the base is prefixed onto the internal path.
  it('prefixes the subpath base onto an internal path', () => {
    vi.stubEnv('BASE_URL', '/harvardintech/');
    expect(withBase('/events')).toBe('/harvardintech/events');
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
