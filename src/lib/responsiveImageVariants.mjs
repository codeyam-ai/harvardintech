// The variant contract, shared by the two halves that must agree about it.
//
// `scripts/responsive-images.mjs` WRITES the variant files; `responsiveImage.ts`
// READS them back into a srcset. Both need the same width list and the same
// filename formula, and nothing at runtime checks that they match: if they
// drift, every srcset candidate points at a file the build never wrote. The
// page still looks perfect — the plain `src` keeps loading — and only a network
// panel shows every candidate 404ing. So the contract lives here, once.
//
// Plain `.mjs` on purpose: the build script is run by node directly, before
// astro, so it cannot import a `.ts` module. The TypeScript side can import
// this (`allowJs` is on, via astro/tsconfigs/base) and re-exports it, so
// `responsiveImage.ts` remains the single public entry point for app code.

/** Widths the build step renders, narrowest first. */
export const VARIANT_WIDTHS = [640, 1280, 1920];

/**
 * Which variants are worth rendering for an image of `originalWidth`.
 *
 * Strictly narrower than the original only: upscaling a 550px photo to 1920
 * produces a bigger file that looks no better — the trap the 550px
 * `chapters/nyc.jpg` fell into.
 *
 * @param {number} originalWidth
 * @returns {number[]}
 */
export function variantWidths(originalWidth) {
  return VARIANT_WIDTHS.filter((w) => w < originalWidth);
}

/**
 * Where the variant for `src` at `width` lives, public-relative.
 *
 * `images/hero/hero.jpg` + 640 -> `images/_r/hero/hero.jpg-640.webp`. The
 * original extension is kept in the middle rather than stripped, so
 * `photo.jpg` and `photo.webp` in one directory cannot collide.
 *
 * @param {string} src public-relative or root-absolute path
 * @param {number} width
 * @returns {string}
 */
export function variantPath(src, width) {
  const clean = src.replace(/^\/+/, '').replace(/^images\//, '');
  return `images/_r/${clean}-${width}.webp`;
}
