// Monochrome brand/section glyphs, as inline SVG path data.
//
// These exist alongside `socialIcon.ts` rather than replacing it, and the
// difference is what they are FOR. The `socialIcon` assets are the original
// site's full-colour raster badges (a blue bird, a blue `f`), which are right on
// a white card and impossible on a coloured band: a JPEG with a white
// background cannot be recoloured, and a CSS filter that whitens a PNG inverts
// the artwork rather than the ink.
//
// A path drawn in `currentColor` inherits whatever the surrounding text is, so
// the SAME icon renders crimson on the Content hub cards and white on the
// crimson Contact band, and scales to any size without a second asset.
//
// Keys match the `icon` field on a social link (`settings.json`) plus the
// Content hub channel labels, lowercased — `iconKeyFor` does that resolution so
// a CMS-added channel still gets a sensible glyph instead of nothing.

export interface BrandIcon {
  viewBox: string;
  /** One or more path `d` strings, filled with `currentColor`. */
  paths: string[];
}

const ENVELOPE =
  'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.6 2L12 12.1 19.4 7H4.6zM4 17h16V9.2l-7.4 5.1a1 1 0 0 1-1.2 0L4 9.2V17z';

export const BRAND_ICONS: Record<string, BrandIcon> = {
  linkedin: {
    viewBox: '0 0 24 24',
    paths: [
      'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21h-4V9z',
    ],
  },
  // The X mark, not the old bird. `twitter` is kept as an alias so existing
  // `icon: twitter` values in settings.json and every scenario seed resolve here
  // without a content migration.
  x: {
    viewBox: '0 0 24 24',
    paths: [
      'M18.9 2H22l-7.1 8.1L23.2 22h-6.55l-5.13-6.7L5.66 22H2.55l7.6-8.68L1.6 2h6.72l4.63 6.12L18.9 2zm-1.09 18.13h1.72L7.27 3.78H5.42l12.39 16.35z',
    ],
  },
  facebook: {
    viewBox: '0 0 24 24',
    paths: [
      'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3-.04-1.3-.13-2.47-.13-2.45 0-4.13 1.5-4.13 4.24V9.9H7.4V13h2.7v8h3.4z',
    ],
  },
  email: { viewBox: '0 0 24 24', paths: [ENVELOPE] },
  newsletter: { viewBox: '0 0 24 24', paths: [ENVELOPE] },
  medium: {
    viewBox: '0 0 24 24',
    paths: [
      'M4.5 7.5c.02-.25-.08-.5-.26-.66L2.4 4.9V4.6h5.6l4.3 9.5 3.8-9.5h5.35v.3l-1.5 1.42c-.13.1-.2.27-.17.44v10.6c-.03.17.04.34.17.44l1.45 1.4v.3h-7.3v-.3l1.5-1.44c.15-.15.15-.2.15-.44V7.1l-4.18 10.6h-.56L6.06 7.1v7.1c-.04.3.06.62.28.85l1.95 2.37v.3H2.8v-.3l1.95-2.37c.21-.23.3-.55.25-.85V7.5z',
    ],
  },
  blog: {
    viewBox: '0 0 24 24',
    paths: [
      'M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1.6V9h4.4L13 4.6zM7 12h10v1.6H7V12zm0 4h10v1.6H7V16zm0-8h4v1.6H7V8z',
    ],
  },
};

/**
 * Resolve a glyph key from an explicit icon field or a human label, so a
 * CMS-added Content hub channel called "LinkedIn" finds the LinkedIn mark
 * without anyone editing code. Returns `null` when nothing matches, which is
 * the caller's cue to render the card with no icon rather than a placeholder.
 */
/** Old names that still appear in content, mapped to the glyph that replaced
 *  them. `twitter` is the live case: settings.json and every scenario seed
 *  carry `icon: twitter`, and the mark is now X. */
const ALIASES: Record<string, string> = { twitter: 'x' };

export function iconKeyFor(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (BRAND_ICONS[key]) return key;
  if (ALIASES[key]) return ALIASES[key];
  // A label like "LinkedIn newsletter" or "Our blog" names its glyph inside a
  // longer phrase; the most specific match wins so "newsletter" is not
  // swallowed by "linkedin".
  const ordered = ['newsletter', 'linkedin', 'medium', 'twitter', 'facebook', 'blog', 'email'];
  const found = ordered.find((k) => key.includes(k));
  if (!found) return null;
  return BRAND_ICONS[found] ? found : (ALIASES[found] ?? null);
}

export function brandIcon(value: string | null | undefined): BrandIcon | null {
  const key = iconKeyFor(value);
  return key ? BRAND_ICONS[key] : null;
}
