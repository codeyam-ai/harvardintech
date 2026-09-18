/**
 * Pull the Harvard Alumni in Tech calendar from Luma into ordinary event entries.
 *
 * Luma is where events are really created — someone builds the event there so
 * people can register, and then, until now, typed it into the site a second
 * time. This reads the calendar and writes the entries, so the second typing
 * stops.
 *
 * Usage:
 *   node scripts/import-luma.mjs [--dry-run] [--past] [--force]
 *
 *   --dry-run  report what would change, write nothing
 *   --past     also import events that have already happened (a separate
 *              request; Luma's default response is upcoming only)
 *   --force    rewrite an entry that already exists
 *
 * IT DOES NOT OVERWRITE. An event already in the collection is left exactly as
 * it is, every run. That is the whole contract with whoever edits events in the
 * CMS: a location they corrected, a description they wrote, a community they
 * tagged — none of it is reverted by tomorrow's import. `--force` exists for
 * the operator who actually wants Luma's version back.
 *
 * IT DEDUPES ON THE LUMA LINK, not the filename. Every recent entry in the
 * collection already carries its `https://luma.com/<slug>` registration link,
 * and that slug is the only stable identity an event has: the Leaders in
 * Engineering panel is filed under 2026-04-30 by hand while Luma's own local
 * date for it is the 29th, so a filename comparison would import it a second
 * time and the site would list the panel twice.
 *
 * IT FAILS SOFT. If Luma cannot be reached the script says so and exits 0
 * having written nothing, leaving the committed events in place. A calendar
 * that is briefly unreachable should not empty the events page or break a
 * deploy — the same reasoning that kept the blog off a build-time Medium fetch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  lumaFeedUrl,
  lumaEntriesFromFeed,
  lumaSlugFromLink,
  eventMarkdown,
} from '../src/lib/lumaFeed.js';

const OUT_DIR = 'src/content/events';

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    past: argv.includes('--past'),
    force: argv.includes('--force'),
  };
}

/**
 * Every event already in the collection, indexed by the two things that can
 * identify one: the Luma slug inside its `link`, and its filename.
 */
export function readExisting(outDir) {
  const byLumaSlug = new Map();
  const byFilename = new Map();
  if (!fs.existsSync(outDir)) return { byLumaSlug, byFilename };

  for (const name of fs.readdirSync(outDir)) {
    if (!name.endsWith('.md')) continue;
    const file = path.join(outDir, name);
    byFilename.set(name, file);
    const text = fs.readFileSync(file, 'utf8');
    const link = /^link:\s*["']?([^"'\n]+)["']?\s*$/m.exec(text);
    const slug = link ? lumaSlugFromLink(link[1]) : null;
    if (slug) byLumaSlug.set(slug, file);
  }
  return { byLumaSlug, byFilename };
}

/** One `get-items` request. Returns null — never throws — when Luma is unreachable. */
async function fetchFeed(period, fetchImpl) {
  try {
    const response = await fetchImpl(lumaFeedUrl({ period }));
    if (!response.ok) {
      console.error(`luma ${period}: HTTP ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`luma ${period}: ${error.message}`);
    return null;
  }
}

/**
 * Paths and `fetch` are injectable so a test can run the whole import against a
 * temp directory and a captured response, with no network. Returns its counts
 * rather than exiting, so importing this module never takes the caller down.
 */
/**
 * @param {{
 *   argv?: string[],
 *   outDir?: string,
 *   fetchImpl?: (url: string) => Promise<{ ok: boolean, status?: number, json: () => Promise<any> }>,
 * }} [options]
 */
export async function main({
  argv = process.argv.slice(2),
  outDir = OUT_DIR,
  fetchImpl = globalThis.fetch,
} = {}) {
  const args = parseArgs(argv);
  const periods = args.past ? ['upcoming', 'past'] : ['upcoming'];

  const payloads = [];
  for (const period of periods) {
    const payload = await fetchFeed(period, fetchImpl);
    if (payload === null) {
      console.error('luma unreachable — leaving the committed events alone');
      return { ok: true, offline: true, written: [], skipped: [], dropped: 0 };
    }
    payloads.push(payload);
  }

  const seenLumaSlug = new Set();
  const entries = [];
  let dropped = 0;
  for (const payload of payloads) {
    const raw = Array.isArray(payload?.entries) ? payload.entries.length : 0;
    const mapped = lumaEntriesFromFeed(payload);
    dropped += raw - mapped.length;
    for (const entry of mapped) {
      // The two periods can overlap around "now"; the first one wins.
      if (entry.lumaSlug && seenLumaSlug.has(entry.lumaSlug)) continue;
      if (entry.lumaSlug) seenLumaSlug.add(entry.lumaSlug);
      entries.push(entry);
    }
  }

  const existing = readExisting(outDir);
  const written = [];
  const skipped = [];

  for (const entry of entries) {
    const filename = `${entry.slug}.md`;
    const already =
      (entry.lumaSlug && existing.byLumaSlug.get(entry.lumaSlug)) ||
      existing.byFilename.get(filename) ||
      null;

    if (already && !args.force) {
      skipped.push(path.basename(already));
      continue;
    }

    const file = already ?? path.join(outDir, filename);
    if (!args.dryRun) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(file, eventMarkdown(entry));
    }
    written.push(path.basename(file));
  }

  const verb = args.dryRun ? 'would write' : 'wrote';
  console.log(`${verb} ${written.length}, left ${skipped.length} alone, feed dropped ${dropped}`);
  for (const name of written) console.log(`  + ${name}`);
  if (skipped.length > 0) {
    console.log('\nAlready in the collection and untouched:');
    for (const name of skipped) console.log(`  = ${name}`);
  }
  return { ok: true, offline: false, written, skipped, dropped };
}

// Run only when invoked as a command, so the module can be imported and
// exercised by a test without writing into the real content collection.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await main();
  if (!result.ok) process.exit(1);
}
