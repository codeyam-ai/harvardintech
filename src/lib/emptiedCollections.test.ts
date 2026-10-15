import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  countCollectionFiles,
  countLoadedEntries,
  countTrackedCollectionEntries,
  findEmptiedCollections,
  listCollectionNames,
  parseLoadedCounts,
} from './emptiedCollections';

describe('findEmptiedCollections', () => {
  const none = new Set<string>();

  // The stash-workaround failure: chapters vanished from the working tree, so the
  // sandbox copy was empty while git still tracks six entries — must be flagged.
  it('flags a collection missing from the working tree that git tracks', () => {
    const problems = findEmptiedCollections({
      onDisk: { chapters: 0, events: 44 },
      loaded: null,
      tracked: { chapters: 6, events: 44 },
      seeded: none,
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^chapters: empty, but git tracks 6/);
  });

  // The watcher failure: files are on disk but the running server loaded none of
  // them, so the page would render an empty roster.
  it('flags a collection with files on disk that the dev server loaded none of', () => {
    const problems = findEmptiedCollections({
      onDisk: { chapters: 6 },
      loaded: { chapters: 0 },
      tracked: { chapters: 6 },
      seeded: none,
    });
    expect(problems).toEqual([
      'chapters: 6 file(s) in the sandbox, but the dev server loaded 0 entries',
    ]);
  });

  // A scenario may deliberately seed a collection as empty — that is the state
  // under test, not a failure.
  it('never flags a collection the seed set to empty on purpose', () => {
    expect(
      findEmptiedCollections({
        onDisk: { chapters: 0 },
        loaded: { chapters: 0 },
        tracked: { chapters: 6 },
        seeded: new Set(['chapters']),
      }),
    ).toEqual([]);
  });

  // A loader that filters drafts loads fewer entries than there are files; only
  // "some on disk, none loaded" is a contradiction.
  it('accepts a loaded count below the file count', () => {
    expect(
      findEmptiedCollections({
        onDisk: { blog: 21 },
        loaded: { blog: 3 },
        tracked: { blog: 21 },
        seeded: none,
      }),
    ).toEqual([]);
  });

  // A collection that ships empty (donors) is empty on disk and in git — nothing
  // is missing, so nothing to flag.
  it('accepts a collection that is empty everywhere', () => {
    expect(
      findEmptiedCollections({ onDisk: { donors: 0 }, loaded: { donors: 0 }, tracked: {}, seeded: none }),
    ).toEqual([]);
  });

  // With no dev server report the load check is skipped rather than guessed.
  it('skips the load check when no counts were reported', () => {
    expect(
      findEmptiedCollections({ onDisk: { chapters: 6 }, loaded: null, tracked: { chapters: 6 }, seeded: none }),
    ).toEqual([]);
  });

  // A collection absent from the report has an unknown count, which must not be
  // read as zero.
  it('does not treat a collection missing from the report as empty', () => {
    expect(
      findEmptiedCollections({ onDisk: { chapters: 6 }, loaded: {}, tracked: {}, seeded: none }),
    ).toEqual([]);
  });
});

describe('countTrackedCollectionEntries', () => {
  // Parses a real `git ls-files -z` shape into per-collection markdown counts.
  it('counts markdown entries per collection', () => {
    const listing = [
      'src/content/chapters/boston.md',
      'src/content/chapters/london.md',
      'src/content/blog/hello.mdx',
      '',
    ].join('\0');
    expect(countTrackedCollectionEntries(listing, 'src/content')).toEqual({ chapters: 2, blog: 1 });
  });

  // `.gitkeep`, the content config and nested files are not collection entries.
  it('ignores non-markdown, root-level and nested files', () => {
    const listing = [
      'src/content/donors/.gitkeep',
      'src/content/config.ts',
      'src/content/readme.md',
      'src/content/blog/drafts/old.md',
    ].join('\0');
    expect(countTrackedCollectionEntries(listing, 'src/content')).toEqual({});
  });

  // A trailing slash on the content dir must not change the result.
  it('accepts a content dir with a trailing slash', () => {
    expect(countTrackedCollectionEntries('src/content/team/a.md', 'src/content/')).toEqual({ team: 1 });
  });

  // An empty listing, as when git is unavailable, yields no counts.
  it('returns no counts for an empty listing', () => {
    expect(countTrackedCollectionEntries('', 'src/content')).toEqual({});
  });
});

describe('countCollectionFiles', () => {
  let root: string | undefined;
  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  // Counts only markdown in each collection directory, reporting an empty one as 0.
  it('counts markdown files per collection directory', () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'emptied-'));
    fs.mkdirSync(path.join(root, 'chapters'));
    fs.writeFileSync(path.join(root, 'chapters', 'a.md'), '');
    fs.writeFileSync(path.join(root, 'chapters', 'b.mdx'), '');
    fs.writeFileSync(path.join(root, 'chapters', 'image.png'), '');
    fs.mkdirSync(path.join(root, 'donors'));
    fs.writeFileSync(path.join(root, 'config.ts'), '');
    expect(countCollectionFiles(root)).toEqual({ chapters: 2, donors: 0 });
  });

  // A missing content root yields no counts instead of throwing mid-seed.
  it('returns no counts for a missing root', () => {
    expect(countCollectionFiles(path.join(os.tmpdir(), 'no-such-emptied-root'))).toEqual({});
  });
});

describe('listCollectionNames', () => {
  let root: string | undefined;
  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  // Only directories are collections; the content config file beside them is not.
  it('lists collection directories and skips files', () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'emptied-'));
    fs.mkdirSync(path.join(root, 'chapters'));
    fs.mkdirSync(path.join(root, 'events'));
    fs.writeFileSync(path.join(root, 'config.ts'), '');
    expect(listCollectionNames(root).sort()).toEqual(['chapters', 'events']);
  });

  // A missing content root lists nothing rather than throwing inside the endpoint.
  it('lists nothing for a missing root', () => {
    expect(listCollectionNames(path.join(os.tmpdir(), 'no-such-emptied-root'))).toEqual([]);
  });
});

describe('countLoadedEntries', () => {
  // Reports each collection's loaded entry count.
  it('counts entries per collection', async () => {
    const data: Record<string, unknown[]> = { chapters: [1, 2], donors: [] };
    expect(await countLoadedEntries(['chapters', 'donors'], async (n) => data[n])).toEqual({
      chapters: 2,
      donors: 0,
    });
  });

  // A lookup that throws is left out, so it can never masquerade as an empty load.
  it('leaves out a collection whose lookup throws', async () => {
    const loaded = await countLoadedEntries(['chapters', 'broken'], (n) => {
      if (n === 'broken') throw new Error('not a collection');
      return [1];
    });
    expect(loaded).toEqual({ chapters: 1 });
  });
});

describe('parseLoadedCounts', () => {
  // The current endpoint's JSON reply yields its counts.
  it('reads the loaded counts from a JSON reply', () => {
    expect(parseLoadedCounts('{"ok":true,"loaded":{"chapters":6}}')).toEqual({ chapters: 6 });
  });

  // An older endpoint answers plain `ok`: refreshed, but no counts to check.
  it('returns null for a plain text reply', () => {
    expect(parseLoadedCounts('ok')).toBeNull();
  });

  // JSON without a usable `loaded` object is treated as no report.
  it('returns null when the reply has no loaded object', () => {
    expect(parseLoadedCounts('{"ok":true}')).toBeNull();
    expect(parseLoadedCounts('{"ok":true,"loaded":[1]}')).toBeNull();
  });
});
