// Brand and section glyphs, as inline SVG path data.
//
// The four brand marks (LinkedIn, X, Facebook, Medium) are the official logos as
// published by Simple Icons (simple-icons@13.21.0, CC0), each with its official
// brand colour. They replaced hand-drawn approximations and, on the chapter
// Connect row, the original site's 100px teal raster badges (a retired Twitter
// bird among them), which blurred on any high-density screen. The envelope and
// page glyphs are generic, not brands, so they have no brand colour.
//
// A path drawn in `currentColor` inherits whatever the surrounding text is, so
// the SAME icon renders crimson on the Content hub cards and white on the
// crimson Contact band, and scales to any size without a second asset. Where a
// badge should show the brand itself (the chapter Connect row), set `color` from
// the icon's `color`.
//
// Keys match the `icon` field on a social link (`settings.json`) plus the
// Content hub channel labels, lowercased — `iconKeyFor` does that resolution so
// a CMS-added channel still gets a sensible glyph instead of nothing.

export interface BrandIcon {
  viewBox: string;
  /** One or more path `d` strings, filled with `currentColor`. */
  paths: string[];
  /** The brand's official colour, for surfaces that show the logo in colour.
   *  Absent on generic glyphs (envelope, page). */
  color?: string;
}

const ENVELOPE =
  'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.6 2L12 12.1 19.4 7H4.6zM4 17h16V9.2l-7.4 5.1a1 1 0 0 1-1.2 0L4 9.2V17z';

export const BRAND_ICONS: Record<string, BrandIcon> = {
  linkedin: {
    viewBox: '0 0 24 24',
    color: '#0A66C2',
    paths: [
      'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    ],
  },
  // The X mark, not the old bird. `twitter` is kept as an alias so existing
  // `icon: twitter` values in settings.json and every scenario seed resolve here
  // without a content migration.
  x: {
    viewBox: '0 0 24 24',
    color: '#000000',
    paths: [
      'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
    ],
  },
  facebook: {
    viewBox: '0 0 24 24',
    color: '#0866FF',
    paths: [
      'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
    ],
  },
  email: { viewBox: '0 0 24 24', paths: [ENVELOPE] },
  newsletter: { viewBox: '0 0 24 24', paths: [ENVELOPE] },
  medium: {
    viewBox: '0 0 24 24',
    color: '#000000',
    paths: [
      'M4.21 0A4.201 4.201 0 0 0 0 4.21v15.58A4.201 4.201 0 0 0 4.21 24h15.58A4.201 4.201 0 0 0 24 19.79v-1.093c-.137.013-.278.02-.422.02-2.577 0-4.027-2.146-4.09-4.832a7.592 7.592 0 0 1 .022-.708c.093-1.186.475-2.241 1.105-3.022a3.885 3.885 0 0 1 1.395-1.1c.468-.237 1.127-.367 1.664-.367h.023c.101 0 .202.004.303.01V4.211A4.201 4.201 0 0 0 19.79 0Zm.198 5.583h4.165l3.588 8.435 3.59-8.435h3.864v.146l-.019.004c-.705.16-1.063.397-1.063 1.254h-.003l.003 10.274c.06.676.424.885 1.063 1.03l.02.004v.145h-4.923v-.145l.019-.005c.639-.144.994-.353 1.054-1.03V7.267l-4.745 11.15h-.261L6.15 7.569v9.445c0 .857.358 1.094 1.063 1.253l.02.004v.147H4.405v-.147l.019-.004c.705-.16 1.065-.397 1.065-1.253V6.987c0-.857-.358-1.094-1.064-1.254l-.018-.004zm19.25 3.668c-1.086.023-1.733 1.323-1.813 3.124H24V9.298a1.378 1.378 0 0 0-.342-.047Zm-1.862 3.632c-.1 1.756.86 3.239 2.204 3.634v-3.634z',
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
