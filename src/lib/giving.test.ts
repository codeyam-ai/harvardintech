import { describe, it, expect } from 'vitest';
import { resolveGiveHref, resolveGiveCtaHref, isGivingOpen } from './giving';

const EMAIL = 'ben@harvardintech.com';

describe('resolveGiveHref', () => {
  // When a real platform URL is configured, the button points straight at it.
  it('uses the donation platform URL when one is configured', () => {
    expect(
      resolveGiveHref({ donateUrl: 'https://givebutter.com/harvard-in-tech', email: EMAIL }),
    ).toBe('https://givebutter.com/harvard-in-tech');
  });

  // With no platform yet, the button opens a campaign-named giving-inquiry email.
  it('falls back to a giving-inquiry mailto when no URL is set', () => {
    const href = resolveGiveHref({ email: EMAIL, campaignName: 'The Momentum Fund' });
    expect(href).toContain(`mailto:${EMAIL}`);
    expect(href).toContain('Supporting%20The%20Momentum%20Fund');
  });

  // A cleared CMS field arrives as "" and must fall back, not produce href="".
  it('treats an empty donateUrl as unset', () => {
    // The CMS writes "" for a cleared text field, not undefined — so an empty
    // string must not become href="" (which reloads the current page instead
    // of opening the mail client).
    expect(resolveGiveHref({ donateUrl: '', email: EMAIL })).toContain('mailto:');
  });

  // A field holding only spaces is effectively blank and must fall back too.
  it('treats a whitespace-only donateUrl as unset', () => {
    expect(resolveGiveHref({ donateUrl: '   ', email: EMAIL })).toContain('mailto:');
  });

  // A pasted URL with surrounding whitespace is trimmed, not treated as broken.
  it('trims surrounding whitespace from a pasted URL', () => {
    // Editors paste URLs with a trailing space more often than not.
    expect(
      resolveGiveHref({ donateUrl: '  https://donorbox.org/hit  ', email: EMAIL }),
    ).toBe('https://donorbox.org/hit');
  });

  // Without a campaign name the subject uses the org-wide generic wording.
  it('uses a generic subject when no campaign is named', () => {
    const href = resolveGiveHref({ email: EMAIL });
    expect(href).toContain('Supporting%20Harvard%20Alumni%20in%20Tech');
  });

  // Subject spaces are percent-encoded so the mail client parses the query.
  it('encodes the subject so the mail client receives it intact', () => {
    const href = resolveGiveHref({ email: EMAIL, campaignName: 'Momentum Fund 2026' });
    expect(href).not.toContain(' ');
    expect(href).toContain('Momentum%20Fund%202026');
  });
});

// Whether the site can accept a gift at all. One blank CMS field is what closes
// every giving surface, so this predicate is the switch the whole feature turns
// on.
describe('isGivingOpen', () => {
  // A configured platform is the only thing that opens giving.
  it('is open when a platform URL is configured', () => {
    expect(isGivingOpen('https://givebutter.com/hit')).toBe(true);
  });

  // Production ships with the field blank, and that must read as closed rather
  // than as "no opinion".
  it('is closed when no platform URL is set', () => {
    expect(isGivingOpen(undefined)).toBe(false);
  });

  // The CMS writes "" for a cleared text field, and an editor who types spaces
  // into it has not configured a platform either.
  it('treats a blank or whitespace-only URL as closed', () => {
    expect(isGivingOpen('')).toBe(false);
    expect(isGivingOpen('   ')).toBe(false);
  });

  // Editors paste URLs with a trailing space more often than not, and that must
  // not read as closed.
  it('trims before deciding', () => {
    expect(isGivingOpen('  https://givebutter.com/hit  ')).toBe(true);
  });
});

// The CAMPAIGN-page CTA. It no longer has a fallback destination: while the
// campaign is closed there is nowhere honest to send a reader, so the caller
// renders the coming-soon message instead of a link.
describe('resolveGiveCtaHref', () => {
  // A configured platform is the destination outright — no intermediate page.
  it('uses the donation platform URL when one is configured', () => {
    expect(resolveGiveCtaHref({ donateUrl: 'https://givebutter.com/hit' })).toBe(
      'https://givebutter.com/hit',
    );
  });

  // The change this feature exists for: with no platform there is NO href. It
  // used to be /give, a page holding a checkout that could not take a payment.
  it('returns undefined when no platform is configured', () => {
    expect(resolveGiveCtaHref({})).toBeUndefined();
  });

  // Blank and whitespace-only are treated as absent, matching `resolveGiveHref`
  // — an editor who clears the CMS field leaves an empty string, not undefined.
  it('treats a blank or whitespace-only platform URL as absent', () => {
    expect(resolveGiveCtaHref({ donateUrl: '' })).toBeUndefined();
    expect(resolveGiveCtaHref({ donateUrl: '   ' })).toBeUndefined();
  });

  // Nothing may route a reader to /give any more. Asserted by value rather than
  // by "differs from resolveGiveHref", because undefined differs from every
  // string and that weaker claim would pass even if /give came back.
  it('never points at the retired giving page', () => {
    expect(resolveGiveCtaHref({})).not.toBe('/give');
    expect(resolveGiveCtaHref({ donateUrl: '' })).not.toBe('/give');
  });

  // Once a platform is configured, the campaign CTA and the giving-page button
  // resolve to the same place.
  it('agrees with resolveGiveHref once a platform is configured', () => {
    const donateUrl = 'https://givebutter.com/hit';
    expect(resolveGiveCtaHref({ donateUrl })).toBe(resolveGiveHref({ donateUrl, email: EMAIL }));
  });
});
