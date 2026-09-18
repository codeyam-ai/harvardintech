// Absolute URLs for share images.
//
// `og:image` and `twitter:image` are the two tags a crawler will NOT resolve
// relatively: LinkedIn, Slack and X all require a fully-qualified URL, and a
// relative `/images/og/default.jpg` is simply dropped. `SEO.astro` used to emit
// whatever it was handed, so every share card on the site was silently blank.
//
// This deliberately does NOT reuse `canonicalFor` from canonicalUrl.ts, and the
// difference is the whole point. A canonical URL names where a page is
// ADVERTISED (harvardintech.com), so it strips the base path. A share image has
// to name where the file is actually FETCHABLE, which until the domain cutover
// is the project subpath on GitHub Pages — so this one KEEPS the base. Pointing
// og:image at the advertised domain would 404 on every unfurl until launch.

/**
 * Resolve a share-image path to an absolute URL.
 *
 * - blank input -> `null` (the caller omits the tag rather than emitting an
 *   empty one, which some scrapers treat as an image that failed to load)
 * - an `http(s)://` URL is already absolute and passes through untouched, so a
 *   CMS entry pointing at an external asset keeps working
 * - anything else is joined onto `site` THROUGH `base`, collapsing slash runs
 *   so no join ever produces `//`
 *
 * Returns `null` when `site` is unknown (a bare `astro dev` with no `site`
 * configured). An absolute URL cannot be invented there, and omitting the tag
 * is honest; production builds always set `site`.
 */
export function absoluteImageUrl(
  image: string | null | undefined,
  site: URL | undefined,
  base: string,
): string | null {
  const trimmed = image?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!site) return null;

  const path = `/${base}/${trimmed}`.replace(/\/{2,}/g, '/');
  return new URL(path, `${site.origin.replace(/\/+$/, '')}/`).href;
}

/**
 * The share card used by every page that does not name its own image. Replaced
 * by the designer's 1200x630 card when it lands; the interim file is a crop of
 * the get-involved background.
 */
export const DEFAULT_OG_IMAGE = '/images/og/default.jpg';

/** Intrinsic size of {@link DEFAULT_OG_IMAGE}, published as og:image:width/height. */
export const DEFAULT_OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
