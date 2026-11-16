import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for the live-site headshot bug: the seeded board members
// each had a `photo:` added in the working tree, but it was never committed, so
// the deployed build fell through to the initials fallback. These tests read
// the team content files straight off disk (not via astro:content, which is
// awkward to load under vitest) and assert every seeded member ships with a
// real, present headshot — so a missing-or-typo'd photo fails CI instead of
// silently degrading to initials on production.
const TEAM_DIR = join(process.cwd(), 'src/content/team');
const PUBLIC_DIR = join(process.cwd(), 'public');

// Pull the `photo:` value out of a flat frontmatter block. The team files are
// simple key/value frontmatter (no nesting), so a line-based read avoids adding
// a YAML dependency just for this guard.
function readPhoto(markdown: string): string | undefined {
  const match = markdown.match(/^photo:\s*(.+?)\s*$/m);
  return match ? match[1] : undefined;
}

// Members added before their headshot arrived: they show initials until the
// photo lands, by the owner's choice. Remove a name here when its photo is added.
const PHOTO_PENDING = new Set([
  'nicole-soltau.md', // owner, 2026-11-16: headshot to follow
]);

const teamFiles = readdirSync(TEAM_DIR)
  .filter((f) => f.endsWith('.md'))
  .filter((f) => !PHOTO_PENDING.has(f));

describe('seeded team headshots', () => {
  // sanity: the curated board exists, so an empty glob can't vacuously pass
  it('finds the seeded team content files', () => {
    expect(teamFiles.length).toBeGreaterThan(0);
  });

  describe.each(teamFiles)('%s', (file) => {
    const markdown = readFileSync(join(TEAM_DIR, file), 'utf8');
    const photo = readPhoto(markdown);

    // every seeded member must declare a non-empty photo — this is the exact
    // contract that was silently broken on the live site
    it('declares a non-empty photo', () => {
      expect(photo, `${file} is missing a \`photo:\` frontmatter field`).toBeTruthy();
    });

    // the referenced image must actually exist under public/, catching a typo'd
    // or deleted headshot before it 404s in production
    it('points at an image that exists under public/', () => {
      const rel = (photo ?? '').replace(/^\//, '');
      const abs = join(PUBLIC_DIR, rel);
      expect(existsSync(abs), `${file} references ${photo} but ${abs} does not exist`).toBe(true);
    });
  });
});
