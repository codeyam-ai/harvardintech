import { describe, it, expect } from 'vitest';
import { externalLinkAttrs, isExternalHref } from './externalLink';

const PREVIEW = 'https://codeyam-ai.github.io';
const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' };

describe('externalLinkAttrs', () => {
  // An http(s) link to another host leaves the site, so it opens in a new tab.
  it.each([
    ['https://forms.gle/GqgaCDDWhWAgpJC68'],
    ['https://lu.ma/harvardintech'],
    ['http://medium.com/harvard-in-tech'],
  ])('opens %s in a new tab', (href) => {
    expect(externalLinkAttrs(href, PREVIEW)).toEqual(NEW_TAB);
  });

  // The site's own origin — the preview host this build is served from — stays
  // in the same tab.
  it('keeps a link to the page’s own origin in the same tab', () => {
    expect(externalLinkAttrs(`${PREVIEW}/harvardintech/volunteer`, PREVIEW)).toEqual({});
  });

  // The live domain and its www./apex twin are always the site's own.
  it.each([['https://harvardintech.com/events'], ['https://www.harvardintech.com/']])(
    'treats the live domain %s as internal',
    (href) => {
      expect(externalLinkAttrs(href, PREVIEW)).toEqual({});
    },
  );

  // A www./apex twin of the page's own origin counts as internal too.
  it('treats the www twin of the page origin as internal', () => {
    expect(externalLinkAttrs('https://www.example.org/x', 'https://example.org')).toEqual({});
    expect(externalLinkAttrs('https://example.org/x', 'https://www.example.org')).toEqual({});
  });

  // Paths, anchors, mail and phone links never leave the site.
  it.each([['/volunteer'], ['volunteer'], ['#contact'], ['mailto:hello@example.com'], ['tel:+15555550100']])(
    'adds nothing for %s',
    (href) => {
      expect(externalLinkAttrs(href, PREVIEW)).toEqual({});
    },
  );

  // No href, no attributes — the helper is safe to spread on an optional link.
  it('adds nothing when there is no href', () => {
    expect(externalLinkAttrs(undefined, PREVIEW)).toEqual({});
    expect(externalLinkAttrs('', PREVIEW)).toEqual({});
  });
});

describe('isExternalHref', () => {
  // Without a page origin, only the live domain is the site's own.
  it('judges against the live domain when no origin is given', () => {
    expect(isExternalHref('https://harvardintech.com/')).toBe(false);
    expect(isExternalHref('https://forms.gle/x')).toBe(true);
  });
});
