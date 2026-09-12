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
