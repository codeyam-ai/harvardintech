import * as fs from 'fs';
import * as path from 'path';

/**
 * Guards against a seeded scenario capture that renders an EMPTY content
 * collection while being reported as a clean recapture.
 *
 * Shared by the two sides of a seed: the dev server's refresh endpoint
 * (`astro.config.mjs`) reports what each collection actually loaded, and the
 * seed adapter (`.codeyam/seed-adapter.ts`) compares that with the files on
 * disk and the entries git tracks, failing the seed when a collection came out
 * empty that should not have.
 */

const MARKDOWN = /\.mdx?$/;

/** Collection directory names directly under `contentRoot`; none when it is missing. */
export function listCollectionNames(contentRoot: string): string[] {
  if (!fs.existsSync(contentRoot)) return [];
  return fs
    .readdirSync(contentRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/** `.md`/`.mdx` file count per collection directory directly under `contentRoot`. */
export function countCollectionFiles(contentRoot: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const name of listCollectionNames(contentRoot)) {
    counts[name] = fs
      .readdirSync(path.join(contentRoot, name))
      .filter((file) => MARKDOWN.test(file)).length;
  }
  return counts;
}

/**
 * `.md`/`.mdx` entries per collection in a NUL-separated `git ls-files -z`
 * listing of `contentDir`. Only files directly inside a collection directory
 * count — a stray file at the content root, or a nested one, is not an entry.
 */
export function countTrackedCollectionEntries(
  listing: string,
  contentDir: string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const prefix = `${contentDir.replace(/\/+$/, '')}/`;
  for (const file of listing.split('\0')) {
    if (!file.startsWith(prefix) || !MARKDOWN.test(file)) continue;
    const parts = file.slice(prefix.length).split('/');
    if (parts.length !== 2) continue;
    counts[parts[0]] = (counts[parts[0]] ?? 0) + 1;
  }
  return counts;
}

/**
 * Entry count per collection as reported by `getCollection`. A collection
 * whose lookup throws (not registered, or its loader failed) is left out: its
 * count is unknown, which must not read as zero.
 */
export async function countLoadedEntries(
  names: string[],
  getCollection: (name: string) => Promise<unknown[]> | unknown[],
): Promise<Record<string, number>> {
  const loaded: Record<string, number> = {};
  for (const name of names) {
    try {
      loaded[name] = (await getCollection(name)).length;
    } catch {
      // Count unknown — leave it out.
    }
  }
  return loaded;
}

/**
 * The `loaded` counts from a refresh-endpoint reply, or null when the reply
 * carries none — an older endpoint answers a plain `ok`, which means
 * "refreshed" but says nothing about what loaded.
 */
export function parseLoadedCounts(body: string): Record<string, number> | null {
  try {
    const parsed = JSON.parse(body);
    const loaded = parsed?.loaded;
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) return loaded;
  } catch {
    // Not JSON.
  }
  return null;
}

/**
 * Collections that came out empty when they should not have, as one message
 * each. Two ways a capture used to be reported as clean while rendering an
 * empty roster:
 *
 *  - the files are in the sandbox, but the running dev server loaded none of
 *    them (a collection that booted empty never got a file watcher);
 *  - the sandbox has no files for a collection the seed did not touch, while
 *    git tracks entries for it — the working tree is missing them (the old
 *    `git stash` capture workaround did exactly this).
 *
 * A collection the seed set to `[]` on purpose is never flagged. Exact counts
 * are not compared: a collection's loader can legitimately filter entries out
 * (drafts), so only "some on disk, none loaded" is a contradiction.
 */
export function findEmptiedCollections(input: {
  onDisk: Record<string, number>;
  loaded: Record<string, number> | null;
  tracked: Record<string, number>;
  seeded: Set<string>;
}): string[] {
  const { onDisk, loaded, tracked, seeded } = input;
  const problems: string[] = [];
  for (const [collection, files] of Object.entries(onDisk)) {
    if (seeded.has(collection) && files === 0) continue;
    if (files > 0 && loaded && loaded[collection] === 0) {
      problems.push(
        `${collection}: ${files} file(s) in the sandbox, but the dev server loaded 0 entries`,
      );
    } else if (files === 0 && (tracked[collection] ?? 0) > 0) {
      problems.push(
        `${collection}: empty, but git tracks ${tracked[collection]} entr(ies) — the ` +
          `working tree is missing them (restore them, or seed the collection as [] on purpose)`,
      );
    }
  }
  return problems;
}
