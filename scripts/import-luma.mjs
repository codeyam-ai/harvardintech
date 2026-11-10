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
 * IT FAILS SOFT WHEN LUMA IS UNREACHABLE, AND LOUD WHEN LUMA REFUSES. Either
 * way it writes nothing and leaves the committed events in place — a calendar
 * that is briefly down should not empty the events page.
 *   - Unreachable (the request threw: DNS, socket, timeout) exits 0. That is a
 *     blip on the runner's side and tomorrow's run catches up.
 *   - Refused (Luma answered with an HTTP error, e.g. 429 or 503) exits 1.
 *     Luma deciding not to serve us does not fix itself: from 2026-10-23 a 429
 *     on every request was treated as "offline", the run stayed green, and no
 *     new event reached the site for two weeks until an organizer checked by
 *     hand. The deploy workflow still publishes the site when this happens and
 *     then marks the run failed, so the refusal is seen without holding back
 *     anything else.
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

/**
 * Luma answers Node's default User-Agent with HTTP 429 on every request, so
 * the import must name itself. Without this header every nightly run from
 * 2026-10-23 on failed soft, and new events (the NYC happy hour, the London
 * co-working day) never reached the site.
 */
const REQUEST_HEADERS = {
  'User-Agent': 'harvardintech-site-import/1.0 (+https://github.com/codeyam-ai/harvardintech)',
};

/**
 * One `get-items` request. Never throws. Returns `{ payload }` on success,
 * `{ refused: status }` when Luma answered with an HTTP error, or
 * `{ unreachable: message }` when the request itself failed.
 */
async function fetchFeed(period, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(lumaFeedUrl({ period }), { headers: REQUEST_HEADERS });
  } catch (error) {
    console.error(`luma ${period}: ${error.message}`);
    return { unreachable: error.message };
  }
  if (!response.ok) {
    // A GitHub Actions annotation, so the refusal shows on the run summary.
    console.error(`::warning::luma ${period}: HTTP ${response.status}`);
    return { refused: response.status };
  }
  try {
    return { payload: await response.json() };
  } catch (error) {
    console.error(`luma ${period}: unreadable response: ${error.message}`);
    return { unreachable: error.message };
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
 * @returns {Promise<ImportResult>}
 */
export async function main({
  argv = process.argv.slice(2),
  outDir = OUT_DIR,
  fetchImpl = globalThis.fetch,
} = {}) {
  const args = parseArgs(argv);
  const periods = args.past ? ['upcoming', 'past'] : ['upcoming'];

  const fetched = await fetchPeriods(periods, fetchImpl);
  if (!fetched.payloads) return offlineResult(fetched.refused);

  const { entries, dropped } = collectEntries(fetched.payloads);
  const { written, skipped } = writeEntries(entries, readExisting(outDir), args, outDir);
  printSummary({ written, skipped, dropped, dryRun: args.dryRun });
  return { ok: true, offline: false, written, skipped, dropped };
}

/**
 * Every period's feed, fetched before anything is written so a refusal on the
 * second request cannot leave the first one's events half-imported. Returns
 * `{ payloads }`, or `{ refused: status }` / `{ unreachable: true }` for the
 * first period that failed.
 */
async function fetchPeriods(periods, fetchImpl) {
  const payloads = [];
  for (const period of periods) {
    const result = await fetchFeed(period, fetchImpl);
    if (result.refused !== undefined) {
      console.error(
        `luma refused the ${period} feed (HTTP ${result.refused}) — leaving the committed events alone and failing so it is noticed`,
      );
      return { refused: result.refused };
    }
    if (result.unreachable !== undefined) {
      console.error('luma unreachable — leaving the committed events alone');
      return { unreachable: true };
    }
    payloads.push(result.payload);
  }
  return { payloads };
}

/**
 * @typedef {{
 *   ok: boolean,
 *   offline: boolean,
 *   refused?: number,
 *   written: string[],
 *   skipped: string[],
 *   dropped: number,
 * }} ImportResult
 */

/**
 * The result of a run that wrote nothing because a feed was missing. A refusal
 * is `ok: false` so the command exits 1; an unreachable feed stays `ok: true`.
 * @param {number | undefined} refused
 * @returns {ImportResult}
 */
function offlineResult(refused) {
  const base = { offline: true, written: [], skipped: [], dropped: 0 };
  return refused === undefined ? { ok: true, ...base } : { ok: false, refused, ...base };
}

/**
 * The importable entries across every payload, deduped on the Luma slug (the
 * two periods can overlap around "now"; the first one wins), plus how many raw
 * feed items the mapping dropped.
 */
function collectEntries(payloads) {
  const seenLumaSlug = new Set();
  const entries = [];
  let dropped = 0;
  for (const payload of payloads) {
    const raw = Array.isArray(payload?.entries) ? payload.entries.length : 0;
    const mapped = lumaEntriesFromFeed(payload);
    dropped += raw - mapped.length;
    for (const entry of mapped) {
      if (entry.lumaSlug && seenLumaSlug.has(entry.lumaSlug)) continue;
      if (entry.lumaSlug) seenLumaSlug.add(entry.lumaSlug);
      entries.push(entry);
    }
  }
  return { entries, dropped };
}

/**
 * Write each entry that is not already in the collection (matched on Luma slug,
 * then filename). An existing entry is left alone unless `--force`; nothing
 * touches disk under `--dry-run`.
 */
function writeEntries(entries, existing, args, outDir) {
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
  return { written, skipped };
}

function printSummary({ written, skipped, dropped, dryRun }) {
  const verb = dryRun ? 'would write' : 'wrote';
  console.log(`${verb} ${written.length}, left ${skipped.length} alone, feed dropped ${dropped}`);
  for (const name of written) console.log(`  + ${name}`);
  if (skipped.length > 0) {
    console.log('\nAlready in the collection and untouched:');
    for (const name of skipped) console.log(`  = ${name}`);
  }
}

// Run only when invoked as a command, so the module can be imported and
// exercised by a test without writing into the real content collection.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await main();
  if (!result.ok) process.exit(1);
}
