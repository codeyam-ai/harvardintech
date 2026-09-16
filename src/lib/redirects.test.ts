import { describe, it, expect } from 'vitest';
import { REDIRECT_TARGETS, redirectsForBase } from './redirects';

// These redirects are the only thing standing between an indexed Strikingly URL
// and a 404 once harvardintech.com points at this site. astro.config.mjs can
// only be exercised by a real `astro build`, so the map and the base rule live
// here where unit tests can reach them — the same reason `publishTrack` exists.

describe('REDIRECT_TARGETS', () => {
  // The old sitemap (orig/sitemap_xml.html) is the definition of "must not
  // break". Every path it published needs an entry or it 404s at launch.
  it('covers every path the old sitemap published', () => {
    for (const oldPath of [
      '/about-us',
      '/nyc',
      '/san-francisco',
      '/l-a',
      '/japan',
      '/volunteers',
      '/webinars',
    ]) {
      expect(REDIRECT_TARGETS).toHaveProperty(oldPath);
    }
  });

  // These look like index pages because a real page sits one level below them,
  // so visitors trim the URL back by hand and used to get nothing.
  it('covers the section paths that had no index of their own', () => {
    expect(REDIRECT_TARGETS['/chapters/']).toBe('/#chapters');
    expect(REDIRECT_TARGETS['/communities/']).toBe('/#community');
    expect(REDIRECT_TARGETS['/volunteer/projects/']).toBe('/volunteer/');
  });

  // A redirect landing on a URL that itself redirects costs a second hop and
  // dilutes the signal the redirect exists to pass on. Targets must already be
  // in the canonical form `withBase` emits.
  it('points every page target at the canonical trailing-slash form', () => {
    for (const target of Object.values(REDIRECT_TARGETS)) {
      if (target.includes('#')) continue; // a fragment target is a homepage anchor
      expect(target.endsWith('/')).toBe(true);
    }
  });

  // The blog is hidden for launch and has no index, so /blog/welcome has nowhere
  // to land — it is deliberately absent rather than pointing at a dead route.
  it('does not redirect the retired welcome post while the blog is hidden', () => {
    expect(REDIRECT_TARGETS).not.toHaveProperty('/blog/welcome');
  });

  // A source that is also a real route would shadow the page it redirects from.
  it('never redirects a path to itself', () => {
    for (const [from, to] of Object.entries(REDIRECT_TARGETS)) {
      expect(to).not.toBe(from);
    }
  });
});

describe('redirectsForBase', () => {
  // The custom-domain build (harvardintech.com) has base '/', so the map is
  // already correct and must pass through untouched.
  it('leaves every target alone when the site is served from the domain root', () => {
    expect(redirectsForBase('/')).toEqual(REDIRECT_TARGETS);
  });

  // The bug this function exists for. Astro applies the base to a redirect's
  // SOURCE but not to its target: on the project-subpath build it wrote
  // dist/nyc/index.html — reached at /harvardintech/nyc/ — refreshing to a bare
  // /chapters/nyc/, which is the domain root of codeyam-ai.github.io, where this
  // site does not live. Every old URL would have redirected to a 404.
  it('prefixes the base onto every target on a project-subpath build', () => {
    const map = redirectsForBase('/harvardintech');

    expect(map['/nyc']).toBe('/harvardintech/chapters/nyc/');
    expect(map['/volunteers']).toBe('/harvardintech/volunteer/');
    expect(map['/webinars']).toBe('/harvardintech/events/');
  });

  // A homepage-anchor target needs the base too, and the fragment must survive
  // on the far side of it.
  it('prefixes the base onto a fragment target without losing the anchor', () => {
    expect(redirectsForBase('/harvardintech')['/about']).toBe('/harvardintech/#about');
  });

  // Astro already resolves the source against the base. Prefixing it here too
  // would build dist at /harvardintech/harvardintech/nyc/.
  it('leaves the sources alone, since Astro already resolves those against the base', () => {
    expect(Object.keys(redirectsForBase('/harvardintech'))).toEqual(
      Object.keys(REDIRECT_TARGETS),
    );
  });

  // `base` arrives from astro.config as either '/harvardintech' or
  // '/harvardintech/' depending on how DEPLOY_BASE_PATH was written; a doubled
  // slash in a meta-refresh target is a different URL.
  it('accepts a base with or without its own trailing slash', () => {
    expect(redirectsForBase('/harvardintech/')).toEqual(redirectsForBase('/harvardintech'));
  });

  // The returned map must not alias the source of truth, or one build's
  // prefixing would leak into the next.
  it('returns a new map rather than mutating the shared one', () => {
    const map = redirectsForBase('/harvardintech');
    expect(map).not.toBe(REDIRECT_TARGETS);
    expect(REDIRECT_TARGETS['/nyc']).toBe('/chapters/nyc/');
  });
});
