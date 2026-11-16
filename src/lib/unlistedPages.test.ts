// The unlisted-page rule shared by robots.txt and the sitemap filter.
import { describe, it, expect } from 'vitest';
import { isUnlistedPath, isUnlistedUrl } from './unlistedPages';

describe('isUnlistedPath', () => {
  // Both fundraising pages, with or without a trailing slash or a sub-path.
  it('matches /donate and /sponsor in every shape', () => {
    for (const p of ['/donate', '/donate/', '/donate/thanks/', '/sponsor', '/sponsor/', '/admin/', '/admin/blog/x/']) {
      expect(isUnlistedPath(p)).toBe(true);
    }
  });

  // A prefix that only LOOKS similar is a different page.
  it('leaves every other page listed', () => {
    for (const p of ['/', '/volunteer/', '/donations-faq/', '/sponsors-history/', '/events/']) {
      expect(isUnlistedPath(p)).toBe(false);
    }
  });
});

describe('isUnlistedUrl', () => {
  // The sitemap passes full URLs; on a subpath deploy the base is stripped first.
  it('reads full URLs on both the custom domain and a subpath deploy', () => {
    expect(isUnlistedUrl('https://harvardintech.com/donate/')).toBe(true);
    expect(isUnlistedUrl('https://codeyam-ai.github.io/harvardintech/sponsor/', '/harvardintech')).toBe(true);
    expect(isUnlistedUrl('https://harvardintech.com/events/')).toBe(false);
  });
});
