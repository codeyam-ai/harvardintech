#!/usr/bin/env node
// Pre-render width variants for every raster in `public/images`, so pages can
// ship a srcset without moving the image library into `src/` (which would break
// the CMS's string-path contract — see src/lib/responsiveImage.ts).
//
// Runs before `astro build`. Output goes to `public/images/_r/` and a manifest
// to `src/data/responsiveImages.json`; both are gitignored derived state. It is
// safe to run repeatedly: a variant whose file is newer than its source is left
// alone, so a rebuild after editing one photo re-renders only that photo.
//
// Anything this script does not produce simply has no srcset, and the page
// falls back to the original `src`. That is why it never throws on a single bad
// file — one unreadable image must not fail the whole deploy.

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
// Shared with src/lib/responsiveImage.ts — the reader. Both sides MUST agree on
// the widths and the filename formula or every srcset 404s silently.
import { variantWidths, variantPath } from '../src/lib/responsiveImageVariants.mjs';

const IMAGES_DIR = path.join('public', 'images');
const MANIFEST = path.join('src', 'data', 'responsiveImages.json');
const RASTER = /\.(jpe?g|png|webp)$/i;

/** Name of the generated variant tree, skipped wherever it appears. */
const OUT_DIR_NAME = '_r';

/**
 * Every raster under `dir`, excluding the generated variant tree.
 *
 * The exclusion is by DIRECTORY NAME rather than by comparing against the
 * project's `public/images/_r` path: that comparison only held when the walk
 * started at the real images directory with the process at the repo root, so
 * any other root — a test fixture, a future second image tree — would have
 * walked straight into generated output and fed the build its own variants
 * back, producing variants of variants that grow on every run.
 */
export async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === OUT_DIR_NAME) continue;
      out.push(...(await walk(full)));
    } else if (RASTER.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export async function newerThan(target, source) {
  try {
    const [t, s] = await Promise.all([stat(target), stat(source)]);
    return t.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

export async function main() {
  let sources;
  try {
    sources = await walk(IMAGES_DIR);
  } catch {
    console.log('responsive-images: no public/images directory, nothing to do');
    return;
  }

  const manifest = {};
  let written = 0;
  let skipped = 0;

  for (const source of sources) {
    // Manifest keys are public-relative, matching what a page puts in `src`.
    const key = path.relative('public', source).split(path.sep).join('/');

    let width;
    let height;
    try {
      ({ width, height } = await sharp(source).metadata());
    } catch (err) {
      console.warn(`responsive-images: skipping unreadable ${key} (${err.message})`);
      continue;
    }
    if (!width || !height) continue;

    // Recorded even when there are no variants to write: the intrinsic size is
    // useful on its own (it reserves layout space), and a 550px photo that
    // needs no variants still needs width/height on the tag.
    const widths = variantWidths(width);

    const done = [];
    for (const w of widths) {
      const rel = variantPath(key, w);
      const target = path.join('public', rel);
      if (await newerThan(target, source)) {
        done.push(w);
        skipped += 1;
        continue;
      }
      try {
        await mkdir(path.dirname(target), { recursive: true });
        await sharp(source).resize(w).webp({ quality: 78 }).toFile(target);
        done.push(w);
        written += 1;
      } catch (err) {
        console.warn(`responsive-images: could not write ${rel} (${err.message})`);
      }
    }
    manifest[key] = { width, height, variants: done };
  }

  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  // Only rewrite when it actually changed, so a no-op build leaves the file's
  // mtime alone and Vite does not invalidate everything downstream of it.
  let previous = null;
  try {
    previous = await readFile(MANIFEST, 'utf8');
  } catch {
    /* first run */
  }
  if (previous !== serialized) {
    await mkdir(path.dirname(MANIFEST), { recursive: true });
    await writeFile(MANIFEST, serialized);
  }

  console.log(
    `responsive-images: ${Object.keys(manifest).length} source(s), ${written} variant(s) written, ${skipped} up to date`,
  );
}

// Run only when executed directly (`node scripts/responsive-images.mjs`), never
// on import. Without this guard, importing the module to test `walk` or
// `newerThan` would kick off a full image build as a side effect — which is why
// those helpers were untestable before.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
