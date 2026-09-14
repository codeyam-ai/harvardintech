import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonicalFor, canonicalOrigin } from './canonicalUrl';

// What every canonical link, og:url, structured-data URL and llms.txt link is
// built from. The preview is served from a GitHub Pages subpath but must never
// advertise itself — a share card or canonical naming a gated, noindex page
// points everyone at a page they cannot read.
describe('canonicalFor', () => {
  // The preview today: served under /harvardintech/, advertised on the domain.
  it('removes the subpath base so the URL names the real domain', () => {
    expect(canonicalFor('/harvardintech/events/', '/harvardintech/', 'https://harvardintech.com')).toBe(
      'https://harvardintech.com/events/',
    );
  });

  // The home page is the base itself, with or without its trailing slash.
  it('maps the base itself to the domain root', () => {
    expect(canonicalFor('/harvardintech/', '/harvardintech/', 'https://harvardintech.com')).toBe(
      'https://harvardintech.com/',
    );
    expect(canonicalFor('/harvardintech', '/harvardintech/', 'https://harvardintech.com')).toBe(
      'https://harvardintech.com/',
    );
  });

  // After launch the base is '/', and nothing should change about the path.
  it('leaves the path alone under a root base', () => {
    expect(canonicalFor('/blog/welcome/', '/', 'https://harvardintech.com')).toBe(
      'https://harvardintech.com/blog/welcome/',
    );
  });

  // A page whose first segment merely starts like the base is not under it.
  it('does not strip a lookalike prefix', () => {
    expect(canonicalFor('/harvardintech-news/', '/harvardintech/', 'https://harvardintech.com')).toBe(
      'https://harvardintech.com/harvardintech-news/',
    );
  });

  // Joins must never produce `//`, whichever side carries the slash.
  it('never doubles slashes', () => {
    expect(canonicalFor('//events//', '/', 'https://harvardintech.com/')).toBe(
      'https://harvardintech.com/events/',
    );
    expect(canonicalFor('events', '/', 'https://harvardintech.com')).toBe(
      'https://harvardintech.com/events',
    );
  });

  // Whatever the input path, the result is on the origin it was given.
  it('always returns a URL on the given origin', () => {
    for (const p of ['/', '/a/b', '/harvardintech/x', 'relative']) {
      expect(new URL(canonicalFor(p, '/harvardintech/', 'https://harvardintech.com')).origin).toBe(
        'https://harvardintech.com',
      );
    }
  });
});

describe('canonicalOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // The deploy sets it to the live domain while the build is hosted elsewhere.
  it('prefers CANONICAL_ORIGIN when set', () => {
    vi.stubEnv('CANONICAL_ORIGIN', 'https://harvardintech.com');
    expect(canonicalOrigin(new URL('https://codeyam-ai.github.io/harvardintech/'), 'http://localhost:4321')).toBe(
      'https://harvardintech.com',
    );
  });

  // At launch the variable is dropped and the build's own site takes over —
  // as an origin, never with the base path attached.
  it('falls back to the site origin when unset', () => {
    vi.stubEnv('CANONICAL_ORIGIN', '');
    expect(canonicalOrigin(new URL('https://harvardintech.com/'), 'http://localhost:4321')).toBe(
      'https://harvardintech.com',
    );
    expect(canonicalOrigin(new URL('https://codeyam-ai.github.io/harvardintech/'), 'x')).toBe(
      'https://codeyam-ai.github.io',
    );
  });

  // No site configured at all: use the request's own origin rather than throw.
  it('falls back to the request origin when there is no site', () => {
    vi.stubEnv('CANONICAL_ORIGIN', '');
    expect(canonicalOrigin(undefined, 'http://localhost:4321')).toBe('http://localhost:4321');
  });
});
