import { describe, it, expect } from 'vitest';
import {
  VARIANT_WIDTHS,
  variantWidths,
  variantPath,
  srcsetFor,
  intrinsicSize,
  type ResponsiveManifest,
} from './responsiveImage';

// Two halves have to agree about the variant contract: the build script
// (`scripts/responsive-images.mjs`) WRITES the files, and `srcsetFor` READS them
// back into a srcset. Nothing at runtime checks the agreement — if it breaks,
// every candidate in every srcset 404s while the page still looks perfect,
// because the plain `src` keeps loading. They now import one shared module
// (`responsiveImageVariants.mjs`), and these tests pin its behaviour.
//
// Deliberately NOT asserted: that any particular image has variants on disk.
// The variants and the manifest are gitignored build output, absent on a fresh
// clone and in dev, and that absence is a SUPPORTED state — it degrades to a
// plain <img>. A test that required them would fail on every clean checkout.
const manifest: ResponsiveManifest = {
  'images/hero/hero.jpg': { width: 2000, height: 1325, variants: [640, 1280, 1920] },
  'images/events/sf-event-room.webp': { width: 2048, height: 853, variants: [640, 1280, 1920] },
  'images/chapters/small.jpg': { width: 550, height: 367, variants: [] },
};

describe('variantWidths', () => {
  // The 550px `chapters/nyc.jpg` case: upscaling it to 1920 produces a bigger
  // file that looks no better, and hands the browser a worse option to pick.
  it('renders nothing for an image narrower than the smallest variant', () => {
    expect(variantWidths(550)).toEqual([]);
    expect(variantWidths(640)).toEqual([]);
  });

  // The ordinary case: a large photo gets the full ladder, and a mid-sized one
  // gets only the rungs below it.
  it('renders every width strictly narrower than the original', () => {
    expect(variantWidths(2000)).toEqual([640, 1280, 1920]);
    expect(variantWidths(1300)).toEqual([640, 1280]);
    expect(variantWidths(1281)).toEqual([640, 1280]);
  });

  // The boundary. A variant at exactly the original width is a re-encode that
  // saves nothing and doubles the storage for that image.
  it('excludes a width equal to the original, which would be a pointless re-encode', () => {
    expect(variantWidths(1920)).toEqual([640, 1280]);
  });

  // Guards against a caller inventing widths the build step will never write —
  // the exact drift that makes a srcset point at files that do not exist.
  it('only ever returns widths from the declared set', () => {
    for (const w of variantWidths(4000)) expect(VARIANT_WIDTHS).toContain(w);
  });
});

describe('variantPath', () => {
  // `photo.jpg` and `photo.webp` in one directory would otherwise both want
  // `photo-640.webp`, and the second build would silently overwrite the first.
  it('keeps the original extension in the name so two sources cannot collide', () => {
    expect(variantPath('images/a/photo.jpg', 640)).toBe('images/_r/a/photo.jpg-640.webp');
    expect(variantPath('images/a/photo.webp', 640)).toBe('images/_r/a/photo.webp-640.webp');
  });

  // The writer passes public-relative keys and the reader passes the root-
  // absolute `src` straight off the page; both must land on the same filename.
  it('accepts a root-absolute path as well as a public-relative one', () => {
    expect(variantPath('/images/hero/hero.jpg', 1280)).toBe(
      variantPath('images/hero/hero.jpg', 1280),
    );
  });
});

describe('srcsetFor', () => {
  // The whole output, spelled out: each candidate carries its `w` descriptor and
  // is prefixed with the deploy's base path, or the browser fetches from the
  // wrong root on the project-subpath deploy.
  it('emits every variant with its w descriptor, behind the base path', () => {
    expect(srcsetFor('/images/hero/hero.jpg', manifest, '/harvardintech/')).toBe(
      '/harvardintech/images/_r/hero/hero.jpg-640.webp 640w, ' +
        '/harvardintech/images/_r/hero/hero.jpg-1280.webp 1280w, ' +
        '/harvardintech/images/_r/hero/hero.jpg-1920.webp 1920w',
    );
  });

  // The post-cutover base. A naive join here yields `//images/...`, which some
  // servers read as a protocol-relative URL to a host named `images`.
  it('works at the bare domain, without doubling the leading slash', () => {
    const srcset = srcsetFor('/images/events/sf-event-room.webp', manifest, '/');
    expect(srcset).toContain('/images/_r/events/sf-event-room.webp-640.webp 640w');
    expect(srcset).not.toContain('//');
  });

  // Any file added since the last build. Emitting a guessed srcset for it would
  // point every candidate at a file that was never written.
  it('returns null for an image the manifest does not know', () => {
    expect(srcsetFor('/images/nope/missing.jpg', manifest, '/')).toBeNull();
  });

  // The normal state in development, where the build step has not run. This is
  // the fallback that keeps the responsive pipeline an optimisation, not a
  // dependency.
  it('returns null when the manifest is empty, so dev falls back to a plain img', () => {
    expect(srcsetFor('/images/hero/hero.jpg', {}, '/')).toBeNull();
  });

  // A small source has an entry but no variants. A srcset naming zero
  // candidates is malformed, so there must be none at all.
  it('returns null for an image with no variants narrow enough to be worth it', () => {
    expect(srcsetFor('/images/chapters/small.jpg', manifest, '/')).toBeNull();
  });

  // Rasterising a vector to fixed widths makes it worse, and the build step
  // skips SVGs — so a srcset for one would name files that do not exist.
  it('returns null for an SVG, which is already resolution-independent', () => {
    expect(srcsetFor('/favicon.svg', manifest, '/')).toBeNull();
    expect(srcsetFor('/images/a/LOGO.SVG', manifest, '/')).toBeNull();
  });

  // A component may be handed an empty `src` by a CMS field nobody filled in;
  // that must render a plain tag, not throw during the build.
  it('returns null for a blank src rather than throwing', () => {
    expect(srcsetFor('', manifest, '/')).toBeNull();
  });
});

describe('intrinsicSize', () => {
  // width/height on the tag is most of the cumulative layout shift on a
  // photo-heavy page. `media.json` cannot supply it — it records only
  // sizeBytes — so the build step's measurement is the only source.
  it('returns the measured size so the tag can reserve layout space', () => {
    expect(intrinsicSize('/images/hero/hero.jpg', manifest)).toEqual({ width: 2000, height: 1325 });
  });

  // The reason the manifest records every source, not just ones with variants:
  // a small photo still needs its dimensions on the tag.
  it('is present even for an image with no variants', () => {
    expect(intrinsicSize('/images/chapters/small.jpg', manifest)).toEqual({
      width: 550,
      height: 367,
    });
  });

  // Unknown or no manifest means the attributes are omitted rather than
  // guessed — a wrong width/height reserves the wrong box and shifts the page.
  it('returns null for an unknown image, so the attributes are simply omitted', () => {
    expect(intrinsicSize('/images/nope/missing.jpg', manifest)).toBeNull();
    expect(intrinsicSize('/images/hero/hero.jpg', {})).toBeNull();
  });
});
