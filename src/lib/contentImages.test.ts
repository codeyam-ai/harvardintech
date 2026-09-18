import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// The content-side guards for the launch image pass. These read markdown and
// JSON off disk rather than through astro:content, the same tradeoff
// `chapter.photos.test.ts` and `team.photos.test.ts` make for the same reason —
// loading the content layer under vitest is awkward and buys nothing here.
//
// Each of these pins a mistake that actually shipped:
//   - a path pointing at a file that does not exist renders a broken <img>,
//     because none of these slots has a per-image fallback
//   - `/give`'s collage showed six photos of which two were the same file
//   - chapter banners were 550px sources blown up across a full-bleed hero
//   - six pages showed the shared New York event wall under another city's name
//   - a testimonial carried a generic stage photo under a caption naming a
//     Colorado event it was not from
//
// Deliberately NOT asserted: that any page HAS a photo. A page with no
// `heroImage` falls back to the text `ChapterHeader`, which is a supported and
// currently-preferred state for the chapters with no real local photography.
// Requiring one would force exactly the wrong-city banners this removed.
const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, 'public');
const CHAPTERS_DIR = join(ROOT, 'src/content/chapters');
const COMMUNITIES_DIR = join(ROOT, 'src/content/communities');
const DATA_DIR = join(ROOT, 'src/data');
const CONTENT_DIR = join(ROOT, 'src/content');

/** Files whose job is to list every image, so they are not "references". */
const IMAGE_INDEXES = new Set(['media.json', 'imageCredits.json', 'responsiveImages.json']);

function walkFiles(dir: string, filter: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, filter));
    else if (statSync(full).isFile() && filter(full)) out.push(full);
  }
  return out;
}

/** Read one top-level frontmatter scalar, e.g. `heroImage:` or `showGallery:`. */
function frontmatterValue(file: string, key: string): string | null {
  const text = readFileSync(file, 'utf-8');
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function md5(path: string): string {
  return createHash('md5').update(readFileSync(path)).digest('hex');
}

const contentFiles = [
  ...walkFiles(CONTENT_DIR, (f) => f.endsWith('.md')),
  ...walkFiles(DATA_DIR, (f) => f.endsWith('.json') && !IMAGE_INDEXES.has(f.split('/').pop()!)),
];

const chapterFiles = walkFiles(CHAPTERS_DIR, (f) => f.endsWith('.md'));
const communityFiles = walkFiles(COMMUNITIES_DIR, (f) => f.endsWith('.md'));

describe('images referenced from content', () => {
  // Guards the loop below against passing vacuously if the content tree moves.
  it('finds content files to check', () => {
    expect(contentFiles.length).toBeGreaterThan(0);
  });

  // The broken-reference guard. None of these slots falls back to anything, so
  // a path that does not resolve reaches the browser as a dead image — and it
  // is invisible in a build, which succeeds regardless.
  it('all resolve to a file that exists under public/', () => {
    for (const file of contentFiles) {
      const text = readFileSync(file, 'utf-8');
      for (const ref of text.match(/\/images\/[A-Za-z0-9/_.-]+/g) ?? []) {
        expect(
          existsSync(join(PUBLIC_DIR, ref)),
          `${file.replace(`${ROOT}/`, '')} references ${ref}, which does not exist`,
        ).toBe(true);
      }
    }
  });
});

describe('the /give collage', () => {
  // It shows six photos as one composition, so a repeat is immediately visible
  // to a visitor. Two of the six used to be the same file: `event-05` was
  // byte-identical to `event-03`. Compared by content, not by name, because
  // that is exactly how the duplicate hid.
  it('shows six photos that are all genuinely different images', () => {
    const give = JSON.parse(readFileSync(join(DATA_DIR, 'givePage.json'), 'utf-8')) as {
      collage: string[];
    };
    const hashes = give.collage.map((p) => md5(join(PUBLIC_DIR, p)));
    expect(new Set(hashes).size, `collage has duplicate images: ${give.collage.join(', ')}`).toBe(
      give.collage.length,
    );
  });
});

describe('chapter and community banners', () => {
  // Guards the loops below against a directory rename silently emptying them.
  it('finds chapter and community entries to check', () => {
    expect(chapterFiles.length).toBeGreaterThan(0);
    expect(communityFiles.length).toBeGreaterThan(0);
  });

  // A banner is full-bleed: it fills the viewport width on a desktop monitor.
  // A 550px source stretched across 1440px is visibly soft, which is what
  // `chapters/nyc.jpg` was doing. 1600 is the floor below which the blur is
  // obvious rather than arguable.
  it('are at least 1600px wide wherever one is set', async () => {
    for (const file of [...chapterFiles, ...communityFiles]) {
      const hero = frontmatterValue(file, 'heroImage');
      if (!hero) continue;
      const { width } = await sharp(join(PUBLIC_DIR, hero)).metadata();
      expect(
        width ?? 0,
        `${file.replace(`${ROOT}/`, '')} banner ${hero} is only ${width}px wide`,
      ).toBeGreaterThanOrEqual(1600);
    }
  });

  // The shared 40-photo wall is New York event photography. It renders by
  // DEFAULT, so any chapter without its own curated `photos` list silently
  // showed New York's events under its own city name — London, Seattle, DC and
  // Boston all did. Opting out has to be explicit.
  it('never fall back to the shared New York wall without curating their own photos', () => {
    for (const file of [...chapterFiles, ...communityFiles]) {
      const text = readFileSync(file, 'utf-8');
      const hasCuratedPhotos = /^photos:/m.test(text);
      if (hasCuratedPhotos) continue;
      expect(
        frontmatterValue(file, 'showGallery'),
        `${file.replace(`${ROOT}/`, '')} has no photos of its own and does not set showGallery: false`,
      ).toBe('false');
    }
  });
});

describe("Mohammed Ally's testimonial", () => {
  // His card carried a generic stage photo from the shared New York gallery
  // under a caption naming a Colorado co-working afternoon it was not from. The
  // card renders the quote full-width without a photo, which is a supported
  // state and the honest one until a real Colorado photo exists. This pins the
  // absence so the placeholder cannot quietly return.
  it('has no event photo until a real Colorado one exists', () => {
    const file = join(ROOT, 'src/content/testimonials/mohammed-ally.md');
    expect(frontmatterValue(file, 'eventPhoto')).toBeNull();
    expect(frontmatterValue(file, 'eventCaption')).toBeNull();
  });
});
