import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, utimes, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Imported straight from the build script — `allowJs` (via astro/tsconfigs/base)
// resolves the .mjs, so this needs no suppression.
import { walk, newerThan } from '../../scripts/responsive-images.mjs';

// The two helpers inside the responsive-image build step that carry real logic.
//
// They were untestable until the script grew an entry-point guard: it used to
// call `main()` at module top level, so importing it to reach these ran a full
// image build as a side effect. The guard is what these tests rest on, and the
// first assertion below is effectively a test of the guard itself — if it
// regresses, this file stops being a unit test and becomes a build.
//
// Deliberately NOT tested here: `main`. It orchestrates sharp, the filesystem
// and the manifest together, so a test of it would be the build step run twice;
// what it composes is covered by these two plus responsiveImage.test.ts.
let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'responsive-images-'));
  await mkdir(join(root, 'bg'), { recursive: true });
  await mkdir(join(root, '_r', 'bg'), { recursive: true });
  await mkdir(join(root, 'empty'), { recursive: true });
  await writeFile(join(root, 'hero.jpg'), 'x');
  await writeFile(join(root, 'bg', 'a.png'), 'x');
  await writeFile(join(root, 'bg', 'b.webp'), 'x');
  await writeFile(join(root, 'bg', 'notes.txt'), 'x');
  await writeFile(join(root, 'icon.svg'), 'x');
  // A variant that already exists under the generated tree.
  await writeFile(join(root, '_r', 'bg', 'a.png-640.webp'), 'x');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('walk', () => {
  // The core of the discovery pass: it must find rasters at every depth, or
  // images simply never get variants and the srcset silently falls back.
  it('finds every raster at every depth', async () => {
    const found: string[] = await walk(root);
    expect(found.sort()).toEqual(
      ['bg/a.png', 'bg/b.webp', 'hero.jpg'].map((p) => join(root, ...p.split('/'))).sort(),
    );
  });

  // The generated tree must be skipped or the build feeds its own output back
  // in, producing variants of variants that grow on every run.
  it('never descends into the generated _r tree', async () => {
    const found: string[] = await walk(root);
    expect(found.some((f) => f.includes(`${join('_r')}`))).toBe(false);
  });

  // Non-raster files have no width to resize and sharp cannot read them; an SVG
  // is resolution-independent already, and a .txt would just throw.
  it('ignores non-raster files, including SVGs', async () => {
    const found: string[] = await walk(root);
    expect(found.some((f) => f.endsWith('.svg') || f.endsWith('.txt'))).toBe(false);
  });

  // An empty directory in the tree must not break the recursion.
  it('handles an empty directory without failing', async () => {
    await expect(walk(join(root, 'empty'))).resolves.toEqual([]);
  });
});

describe('newerThan', () => {
  // This is the whole incremental story: a variant newer than its source is
  // reused. Get it backwards and every build re-encodes every image.
  it('is true when the target is newer than the source', async () => {
    const source = join(root, 'hero.jpg');
    const target = join(root, '_r', 'bg', 'a.png-640.webp');
    const old = new Date(Date.now() - 60_000);
    await utimes(source, old, old);
    const now = new Date();
    await utimes(target, now, now);
    await expect(newerThan(target, source)).resolves.toBe(true);
  });

  // The edit case: a photo replaced in the media library must invalidate the
  // variants built from the old one.
  it('is false when the source has been touched since the target was built', async () => {
    const source = join(root, 'hero.jpg');
    const target = join(root, '_r', 'bg', 'a.png-640.webp');
    const old = new Date(Date.now() - 60_000);
    await utimes(target, old, old);
    const now = new Date();
    await utimes(source, now, now);
    await expect(newerThan(target, source)).resolves.toBe(false);
  });

  // A missing target is the first-run case and must report "not fresh" rather
  // than throwing, or the very first build of a clean clone dies on stat().
  it('is false, not an error, when the target does not exist yet', async () => {
    await expect(newerThan(join(root, '_r', 'nope.webp'), join(root, 'hero.jpg'))).resolves.toBe(
      false,
    );
  });
});
