import { describe, it, expect } from 'vitest';
import { BRAND_ICONS, brandIcon, iconKeyFor } from './brandIcons';

describe('iconKeyFor', () => {
  // A key that names a glyph directly resolves to itself, case-insensitively.
  it('resolves an exact glyph name regardless of casing', () => {
    expect(iconKeyFor('linkedin')).toBe('linkedin');
    expect(iconKeyFor('Facebook')).toBe('facebook');
  });

  // settings.json and every seed still say `twitter`; it must reach the X mark.
  it('maps the legacy twitter key to the X glyph', () => {
    expect(iconKeyFor('twitter')).toBe('x');
    expect(iconKeyFor('Twitter')).toBe('x');
  });

  // A label naming its glyph inside a phrase still resolves, and the more
  // specific word wins: "LinkedIn newsletter" is the envelope, not LinkedIn.
  it('finds the most specific glyph inside a longer label', () => {
    expect(iconKeyFor('LinkedIn newsletter')).toBe('newsletter');
    expect(iconKeyFor('Our blog')).toBe('blog');
  });

  // An alias found inside a phrase resolves through the alias, not to nothing.
  it('resolves an alias found inside a phrase', () => {
    expect(iconKeyFor('twitter feed')).toBe('x');
  });

  // Unknown or missing values return null so the caller renders no icon.
  it('returns null for an unknown or missing value', () => {
    expect(iconKeyFor('Mastodon')).toBeNull();
    expect(iconKeyFor('')).toBeNull();
    expect(iconKeyFor(null)).toBeNull();
    expect(iconKeyFor(undefined)).toBeNull();
  });
});

describe('brandIcon', () => {
  // The resolved key returns that glyph's drawing.
  it('returns the glyph for a resolvable value', () => {
    expect(brandIcon('twitter')).toBe(BRAND_ICONS.x);
    expect(brandIcon('LinkedIn newsletter')).toBe(BRAND_ICONS.newsletter);
  });

  // No match means no icon, never a wrong one.
  it('returns null when nothing resolves', () => {
    expect(brandIcon('Mastodon')).toBeNull();
  });

  // Every glyph is drawn on the same 24-unit grid with at least one path, which
  // is what lets the cards size them all with one CSS rule.
  it('draws every glyph on a 24-unit grid with at least one path', () => {
    for (const icon of Object.values(BRAND_ICONS)) {
      expect(icon.viewBox).toBe('0 0 24 24');
      expect(icon.paths.length).toBeGreaterThan(0);
    }
  });
});

describe('brand colours', () => {
  // The chapter Connect row draws each logo in its own brand colour, so every
  // brand mark carries one. These are the official values.
  it.each([
    ['linkedin', '#0A66C2'],
    ['x', '#000000'],
    ['facebook', '#0866FF'],
    ['medium', '#000000'],
  ])('gives %s its official brand colour', (key, color) => {
    expect(BRAND_ICONS[key].color).toBe(color);
  });

  // The generic glyphs are not brands, so they inherit the surrounding ink
  // instead of forcing a colour of their own.
  it.each([['email'], ['newsletter'], ['blog']])('leaves the generic %s glyph uncoloured', (key) => {
    expect(BRAND_ICONS[key].color).toBeUndefined();
  });

  // A colour must be a hex value the `color` CSS property accepts verbatim.
  it('states every colour as a hex value', () => {
    for (const icon of Object.values(BRAND_ICONS)) {
      if (icon.color) expect(icon.color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
