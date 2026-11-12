// Fade-in-on-scroll for the Event Gallery, matching harvardintech.com: each
// photo starts faded + shifted down and animates into place as it scrolls into
// view, staggered per grid column. Mirrors the parallax.ts split — the pure
// helpers below carry the reveal decision and the stagger math so they can be
// unit-tested without a DOM; `initGalleryReveal()` is the thin, idempotent
// wiring. No DOM access in the helpers — data in, data out.

/** One photo in a gallery: the image src, plus optional editorial caption. */
export interface GalleryPhoto {
  src: string;
  caption?: string;
}

/**
 * Normalize either call shape into one list.
 *
 * The landing page passes `string[]` and a chapter passes the CMS's
 * `{ image, caption? }` rows. Accepting both here rather than changing
 * `EventGallery`'s prop type is what lets one code path render the grid without
 * breaking the existing call sites or the captured `event-gallery` scenario.
 *
 * Rows with a blank or missing `image` are dropped: the CMS list control can
 * add a row before a photo is picked, and a half-filled row would otherwise
 * render a tile with no image — and, worse, open a lightbox onto nothing.
 */
export function toGalleryPhotos(
  input: readonly (string | { image?: string; caption?: string })[],
): GalleryPhoto[] {
  return input
    .map((row) =>
      typeof row === 'string'
        ? { src: row.trim() }
        : { src: (row?.image ?? '').trim(), caption: row?.caption?.trim() || undefined },
    )
    .filter((p) => p.src !== '');
}

/**
 * How many columns to render for `count` photos.
 *
 * A chapter with three photos should render three columns, not five with two
 * holes — the shared 40-photo wall is the only gallery big enough to fill the
 * grid, and it stays at `max`. Floored at 1 so an empty list cannot produce a
 * zero-column grid.
 */
export function galleryColumns(count: number, max = 5): number {
  return Math.max(1, Math.min(count, max));
}

/** The grid's three widths: >900px, 601–900px, ≤600px (EventGallery's CSS). */
export type GalleryTier = 'desktop' | 'tablet' | 'phone';

/** The most columns each tier's grid can have; a short gallery has fewer. */
export const GALLERY_TIER_MAX_COLUMNS: Record<GalleryTier, number> = {
  desktop: 5,
  tablet: 4,
  phone: 3,
};

/**
 * How many photos a collapsed gallery shows on a grid of `columns`, or
 * `undefined` when it would hide nothing (so no "Show all" button).
 *
 * The requested `limit` is rounded UP to whole rows, so a collapsed gallery
 * never stops mid-row: a 12-photo cap on the five-column grid showed two full
 * rows and a stray pair. Only a gallery with too few photos to fill its last
 * row ends mid-row, and then it shows all of them.
 */
export function fullRowLimit(
  limit: number | undefined,
  columns: number,
  total: number,
): number | undefined {
  if (limit === undefined || limit < 0 || columns < 1) return undefined;
  const aligned = Math.max(1, Math.ceil(limit / columns)) * columns;
  return aligned >= total ? undefined : aligned;
}

/**
 * The collapsed photo count at each grid width. `cap` collapses at every width;
 * `phoneCap` (when given) replaces it at tablet and phone widths only. Each is
 * rounded to that width's own column count, so a gallery ends on a full row at
 * 5, 4 and 3 columns alike.
 */
export function galleryTierLimits(opts: {
  total: number;
  columns: number;
  cap?: number;
  phoneCap?: number;
}): Record<GalleryTier, number | undefined> {
  const { total, columns, cap, phoneCap } = opts;
  const small = phoneCap ?? cap;
  const cols = (tier: GalleryTier) => Math.min(columns, GALLERY_TIER_MAX_COLUMNS[tier]);
  return {
    desktop: fullRowLimit(cap, cols('desktop'), total),
    tablet: fullRowLimit(small, cols('tablet'), total),
    phone: fullRowLimit(small, cols('phone'), total),
  };
}

/**
 * The grid widths at which tile `index` is past that width's cap, i.e. hidden
 * until "Show all". A width with no cap (undefined) never hides anything.
 */
export function tileHiddenTiers(
  index: number,
  limits: Record<GalleryTier, number | undefined>,
): Record<GalleryTier, boolean> {
  const past = (limit: number | undefined) => limit !== undefined && index >= limit;
  return {
    desktop: past(limits.desktop),
    tablet: past(limits.tablet),
    phone: past(limits.phone),
  };
}

// Whether to reveal every tile immediately instead of animating them in. We
// skip the IntersectionObserver animation when the user prefers reduced motion,
// or when the browser has no IntersectionObserver (old browsers / SSR) so the
// gallery never gets stuck invisible.
export function galleryRevealImmediately(opts: {
  reducedMotion: boolean;
  hasIntersectionObserver: boolean;
}): boolean {
  return opts.reducedMotion || !opts.hasIntersectionObserver;
}

// The per-tile transition delay (ms) that staggers the fade-in across the grid.
// Tiles in the same column share a delay so each column ripples in together;
// `columns` is the current grid column count (5 on desktop).
export function galleryStaggerDelay(index: number, columns = 5): number {
  return (index % columns) * 60;
}

// Idempotent DOM wiring. No-op under SSR / vitest (no window/document). Reveals
// every tile immediately when animation is disabled (reduced motion or no
// IntersectionObserver); otherwise observes each tile and adds `in-view` as it
// scrolls into the viewport, unobserving once revealed.
//
// Safe to call AGAIN after new tiles mount. "Show all N photos" appends tiles
// long after load, and they would otherwise stay permanently faded out because
// the original call had already queried and observed only the first `cap`.
// Tiles already revealed are skipped, so a re-run costs one extra query and
// never double-observes.
export function initGalleryReveal(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const items = document.querySelectorAll<HTMLElement>(
    '#gallery .gallery-item:not(.in-view)',
  );
  if (items.length === 0) return;

  const immediate = galleryRevealImmediately({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hasIntersectionObserver: 'IntersectionObserver' in window,
  });

  if (immediate) {
    items.forEach((el) => el.classList.add('in-view'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );
  items.forEach((el) => io.observe(el));
}
