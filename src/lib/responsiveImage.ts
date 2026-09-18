// srcset plumbing for images that live in `public/`.
//
// Astro's `<Image>` cannot help here: it only processes images imported from
// `src/`, and this site's whole image contract is string paths into
// `public/images` written by the CMS. Moving the library would break every CMS
// entry, so instead a build step (`scripts/responsive-images.mjs`) pre-renders
// width variants into `public/images/_r/` and writes a manifest; this module is
// the pure half that turns that manifest into a `srcset`.
//
// Everything degrades to today's markup. No manifest (a plain `astro dev`), an
// unknown file, or an SVG all return `null`, and `ResponsiveImg` then emits the
// same bare `<img>` the site has always shipped.

// The width list and the filename formula are defined once, in a plain .mjs the
// node build script can also import — see responsiveImageVariants.mjs for why.
// Re-exported here so app code has a single entry point.
export { VARIANT_WIDTHS, variantWidths, variantPath } from './responsiveImageVariants.mjs';

import { variantPath } from './responsiveImageVariants.mjs';

/**
 * What the build step recorded for one source image: its intrinsic size, and
 * the variant widths actually written for it.
 *
 * The intrinsic size rides along because it is the other half of the same
 * problem — `width`/`height` on the tag reserve the space before the bytes
 * land, and the build step has already paid for the `metadata()` call. The
 * media library cannot supply it; `media.json` records only `sizeBytes`.
 */
export interface ResponsiveEntry {
  width: number;
  height: number;
  variants: number[];
}

/** Source -> its entry. Keys are `public/`-relative, e.g. `images/hero/hero.jpg`. */
export type ResponsiveManifest = Record<string, ResponsiveEntry>;

/**
 * A `srcset` for `src`, or `null` when one cannot be built — no manifest entry,
 * no variants narrow enough to be useful, or a vector source (an SVG is already
 * resolution-independent and has nothing to gain).
 *
 * `base` is Astro's `BASE_URL`; each candidate is emitted through it so the
 * srcset works on the project-subpath deploy as well as the bare domain.
 */
export function srcsetFor(
  src: string,
  manifest: ResponsiveManifest,
  base: string,
): string | null {
  if (!src || /\.svg$/i.test(src)) return null;

  const key = src.replace(/^\/+/, '');
  const widths = manifest[key]?.variants;
  if (!widths?.length) return null;

  const prefix = `/${base}/`.replace(/\/{2,}/g, '/');
  return widths
    .map((w) => `${`${prefix}${variantPath(key, w)}`.replace(/\/{2,}/g, '/')} ${w}w`)
    .join(', ');
}

/** The intrinsic size recorded for `src`, or `null` when the manifest has no entry. */
export function intrinsicSize(
  src: string,
  manifest: ResponsiveManifest,
): { width: number; height: number } | null {
  const entry = manifest[src.replace(/^\/+/, '')];
  return entry ? { width: entry.width, height: entry.height } : null;
}
