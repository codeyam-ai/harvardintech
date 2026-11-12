import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fullRowLimit,
  galleryColumns,
  galleryTierLimits,
  galleryRevealImmediately,
  galleryStaggerDelay,
  tileHiddenTiers,
  toGalleryPhotos,
} from './gallery';

describe('tileHiddenTiers', () => {
  const limits = { desktop: 15, tablet: 16, phone: 15 };

  // Inside every width's cap: shown everywhere.
  it('shows a tile inside every cap', () => {
    expect(tileHiddenTiers(14, limits)).toEqual({ desktop: false, tablet: false, phone: false });
  });

  // The 16th photo (index 15) fills the tablet's fourth row but is past the
  // desktop and phone caps.
  it('hides a tile only at the widths whose cap it is past', () => {
    expect(tileHiddenTiers(15, limits)).toEqual({ desktop: true, tablet: false, phone: true });
  });

  // A width with no cap never hides, however far down the tile is.
  it('never hides at an uncapped width', () => {
    expect(
      tileHiddenTiers(30, { desktop: undefined, tablet: 12, phone: 12 }),
    ).toEqual({ desktop: false, tablet: true, phone: true });
  });
});

describe('galleryRevealImmediately', () => {
  // Capable browser, no reduced-motion preference: animate the tiles in.
  it('animates when IntersectionObserver exists and motion is allowed', () => {
    expect(
      galleryRevealImmediately({ reducedMotion: false, hasIntersectionObserver: true }),
    ).toBe(false);
  });

  // Reduced-motion preference wins even on a capable browser.
  it('reveals immediately when the user prefers reduced motion', () => {
    expect(
      galleryRevealImmediately({ reducedMotion: true, hasIntersectionObserver: true }),
    ).toBe(true);
  });

  // No IntersectionObserver (old browser / SSR) → reveal immediately so the
  // gallery never gets stuck invisible.
  it('reveals immediately when IntersectionObserver is unavailable', () => {
    expect(
      galleryRevealImmediately({ reducedMotion: false, hasIntersectionObserver: false }),
    ).toBe(true);
  });

  // Both unfavorable → still reveal immediately.
  it('reveals immediately when both reduced motion and no observer', () => {
    expect(
      galleryRevealImmediately({ reducedMotion: true, hasIntersectionObserver: false }),
    ).toBe(true);
  });
});

describe('galleryStaggerDelay', () => {
  // The first column has no delay.
  it('returns zero for the first column', () => {
    expect(galleryStaggerDelay(0)).toBe(0);
    expect(galleryStaggerDelay(5)).toBe(0);
  });

  // Each column within a row adds 60ms.
  it('staggers later columns by 60ms each', () => {
    expect(galleryStaggerDelay(1)).toBe(60);
    expect(galleryStaggerDelay(4)).toBe(240);
  });

  // The delay wraps per row, so tiles in the same column share a delay.
  it('wraps the delay per row of five columns', () => {
    expect(galleryStaggerDelay(6)).toBe(60);
    expect(galleryStaggerDelay(9)).toBe(240);
  });

  // A custom column count changes the wrap point.
  it('respects a custom column count', () => {
    expect(galleryStaggerDelay(3, 3)).toBe(0);
    expect(galleryStaggerDelay(4, 3)).toBe(60);
  });
});

describe('initGalleryReveal', () => {
  // jsdom lacks matchMedia; stub it so `prefers-reduced-motion` answers `reduce`.
  function stubMatchMedia(reduce: boolean) {
    window.matchMedia = vi.fn((query: string) => {
      const matches = query.includes('prefers-reduced-motion') ? reduce : false;
      return { matches, media: query } as MediaQueryList;
    }) as unknown as typeof window.matchMedia;
  }

  // Mount a gallery with `count` tiles inside the #gallery section.
  function mountGallery(count: number) {
    const tiles = Array.from(
      { length: count },
      () => '<figure class="gallery-item"></figure>',
    ).join('');
    document.body.innerHTML = `<section id="gallery">${tiles}</section>`;
    return document.querySelectorAll<HTMLElement>('#gallery .gallery-item');
  }

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  // Reduced motion: every tile is revealed immediately (in-view), no observer.
  it('reveals every tile immediately under reduced motion', async () => {
    stubMatchMedia(true);
    const tiles = mountGallery(3);
    const { initGalleryReveal } = await import('./gallery');
    initGalleryReveal();
    tiles.forEach((el) => expect(el.classList.contains('in-view')).toBe(true));
  });

  // No IntersectionObserver: fall back to revealing every tile immediately.
  it('reveals every tile immediately when IntersectionObserver is missing', async () => {
    stubMatchMedia(false);
    const original = (window as { IntersectionObserver?: unknown }).IntersectionObserver;
    delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
    const tiles = mountGallery(2);
    const { initGalleryReveal } = await import('./gallery');
    initGalleryReveal();
    tiles.forEach((el) => expect(el.classList.contains('in-view')).toBe(true));
    (window as { IntersectionObserver?: unknown }).IntersectionObserver = original;
  });

  // Capable browser, motion allowed: tiles are observed, not revealed up front.
  it('observes tiles instead of revealing them when animation is enabled', async () => {
    stubMatchMedia(false);
    const observe = vi.fn();
    (window as { IntersectionObserver?: unknown }).IntersectionObserver = vi.fn(() => ({
      observe,
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as unknown as typeof IntersectionObserver;
    const tiles = mountGallery(4);
    const { initGalleryReveal } = await import('./gallery');
    initGalleryReveal();
    expect(observe).toHaveBeenCalledTimes(4);
    tiles.forEach((el) => expect(el.classList.contains('in-view')).toBe(false));
  });

  // No gallery tiles on the page → a clean no-op, not a throw.
  it('is a no-op when there are no gallery tiles', async () => {
    stubMatchMedia(false);
    document.body.innerHTML = '<section id="gallery"></section>';
    const { initGalleryReveal } = await import('./gallery');
    expect(() => initGalleryReveal()).not.toThrow();
  });
});

describe('toGalleryPhotos', () => {
  // The landing page's shape: plain srcs, no captions.
  it('normalizes a list of plain srcs', () => {
    expect(toGalleryPhotos(['/images/a.jpg', '/images/b.jpg'])).toEqual([
      { src: '/images/a.jpg' },
      { src: '/images/b.jpg' },
    ]);
  });

  // The CMS shape: an image plus the editorial caption the lightbox shows.
  it('normalizes CMS rows and keeps the caption', () => {
    expect(toGalleryPhotos([{ image: '/images/a.jpg', caption: 'Spring mixer' }])).toEqual([
      { src: '/images/a.jpg', caption: 'Spring mixer' },
    ]);
  });

  // Both shapes reach the same prop, so both must survive one pass.
  it('accepts a mixed list', () => {
    expect(toGalleryPhotos(['/images/a.jpg', { image: '/images/b.jpg' }])).toEqual([
      { src: '/images/a.jpg' },
      { src: '/images/b.jpg' },
    ]);
  });

  // The case this filter exists for: the CMS list control adds a row before a
  // photo is picked. Rendering it gives a tile with no image — and a lightbox
  // that opens onto nothing.
  it('drops rows with a missing or blank image', () => {
    expect(
      toGalleryPhotos([{ image: '' }, { image: '   ' }, {}, { image: '/images/a.jpg' }]),
    ).toEqual([{ src: '/images/a.jpg' }]);
  });

  // A whitespace-only caption is no caption; it would render an empty
  // figcaption that still takes space under the photo.
  it('treats a blank caption as absent', () => {
    expect(toGalleryPhotos([{ image: '/images/a.jpg', caption: '   ' }])).toEqual([
      { src: '/images/a.jpg', caption: undefined },
    ]);
  });

  // An empty gallery is a real state — a chapter mid-curation.
  it('returns nothing for an empty list', () => {
    expect(toGalleryPhotos([])).toEqual([]);
  });
});

describe('galleryColumns', () => {
  // A small chapter gallery should fill its row rather than leave holes.
  it('uses one column per photo below the maximum', () => {
    expect(galleryColumns(3)).toBe(3);
  });

  // The shared 40-photo wall stays on the full-width grid.
  it('clamps to the maximum for a large gallery', () => {
    expect(galleryColumns(40)).toBe(5);
  });

  // Exactly at the boundary.
  it('returns the maximum when the count equals it', () => {
    expect(galleryColumns(5)).toBe(5);
  });

  // A zero-column grid is not a thing — an empty list must not produce an
  // invalid grid-template.
  it('floors at one column', () => {
    expect(galleryColumns(0)).toBe(1);
    expect(galleryColumns(-3)).toBe(1);
  });

  // The ceiling is a parameter so a caller can ask for a narrower grid.
  it('honours a custom maximum', () => {
    expect(galleryColumns(10, 3)).toBe(3);
  });
});

describe('fullRowLimit', () => {
  // The NYC chapter: a 12-photo cap on the five-column grid showed two rows and
  // a stray pair. Rounded up, it shows three full rows.
  it('rounds a cap up to whole rows', () => {
    expect(fullRowLimit(12, 5, 70)).toBe(15);
  });

  // A cap that already fills its rows is kept as is.
  it('keeps a cap that is already whole rows', () => {
    expect(fullRowLimit(15, 5, 70)).toBe(15);
  });

  // The events page's phone cap of 6 on a four-column tablet grid: 4 + 2 became
  // two full rows of 4.
  it('rounds to the column count it is given', () => {
    expect(fullRowLimit(6, 4, 10)).toBe(8);
    expect(fullRowLimit(6, 3, 10)).toBe(6);
  });

  // Too few photos to fill the rounded rows: show them all (ending mid-row is
  // fine then) and offer no "Show all" button.
  it('returns undefined when the rounded limit would hide nothing', () => {
    expect(fullRowLimit(12, 5, 14)).toBeUndefined();
    expect(fullRowLimit(15, 5, 15)).toBeUndefined();
  });

  // No cap, or a negative one, means uncapped.
  it('returns undefined with no cap or a negative cap', () => {
    expect(fullRowLimit(undefined, 5, 70)).toBeUndefined();
    expect(fullRowLimit(-1, 5, 70)).toBeUndefined();
  });

  // A zero cap still shows one row rather than an empty grid with a button.
  it('shows at least one row', () => {
    expect(fullRowLimit(0, 5, 70)).toBe(5);
  });
});

describe('galleryTierLimits', () => {
  // NYC: cap 15 → 3 rows of 5 on desktop, 4 rows of 4 on tablet, 5 rows of 3
  // on a phone.
  it('aligns one cap to each width', () => {
    expect(galleryTierLimits({ total: 70, columns: 5, cap: 15 })).toEqual({
      desktop: 15,
      tablet: 16,
      phone: 15,
    });
  });

  // Homepage: full wall on desktop, 12 (whole rows at 4 and 3) on small screens.
  it('applies phoneCap only below desktop', () => {
    expect(galleryTierLimits({ total: 38, columns: 5, phoneCap: 12 })).toEqual({
      desktop: undefined,
      tablet: 12,
      phone: 12,
    });
  });

  // Events page: 10 photos fill two desktop rows; phone cap 6 → 8 on tablet.
  it('rounds the phone cap per small-screen width', () => {
    expect(galleryTierLimits({ total: 10, columns: 5, phoneCap: 6 })).toEqual({
      desktop: undefined,
      tablet: 8,
      phone: 6,
    });
  });

  // A three-photo gallery has nothing to hide at any width.
  it('hides nothing in a short gallery', () => {
    expect(galleryTierLimits({ total: 3, columns: 3, cap: 15 })).toEqual({
      desktop: undefined,
      tablet: undefined,
      phone: undefined,
    });
  });

  // A two-column gallery rounds to rows of 2 at every width, not 3/4/5.
  it('uses the gallery’s own column count when it is narrower', () => {
    expect(galleryTierLimits({ total: 9, columns: 2, cap: 3 })).toEqual({
      desktop: 4,
      tablet: 4,
      phone: 4,
    });
  });
});
