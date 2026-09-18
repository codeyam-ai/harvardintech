// Reads the manifest that `scripts/responsive-images.mjs` writes.
//
// Kept apart from `responsiveImage.ts` on purpose: that module is pure and can
// be imported anywhere, while this one touches the filesystem. Server-only —
// call it from `.astro` frontmatter, never a client island.
//
// The manifest is gitignored derived state, so its absence is the NORMAL case
// in development. Missing, unreadable or malformed all resolve to an empty
// manifest, which makes every `srcsetFor` return `null` and every consumer fall
// back to a plain `<img>`.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResponsiveManifest } from './responsiveImage';

const MANIFEST_PATH = path.join(process.cwd(), 'src', 'data', 'responsiveImages.json');

let cached: ResponsiveManifest | null = null;

/** The manifest, read once per process. Returns `{}` when it is not there. */
export async function readResponsiveManifest(): Promise<ResponsiveManifest> {
  if (cached) return cached;
  try {
    cached = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as ResponsiveManifest;
  } catch {
    cached = {};
  }
  return cached;
}
