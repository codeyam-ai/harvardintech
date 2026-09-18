/**
 * Turn the Strikingly snapshot into ordinary event entries.
 *
 * Reads two files and writes markdown:
 *   archive/strikingly/manifest.json        dates, write-ups and photos, captured
 *   archive/strikingly/curated-events.json  the hand-reviewed titles
 *
 * The split matters. Everything a machine can read reliably — the date at the
 * head of a title, the write-up, which photo belongs to which event — comes
 * from the snapshot. The one thing it cannot read reliably is where a title
 * ends and its trailing list of sponsors begins ("Summer Social Handy, Her
 * Campus, Rebag, Huge" has no marker between the two), so that judgement is
 * recorded per event in the curated file and applied identically every run.
 * That is the whole reason this is a script and not 33 hand-written files: the
 * judgement is reviewable in one place, and phase 2 re-runs it to add photos
 * and speakers without re-typing anything.
 *
 * Usage:
 *   node scripts/import-archive-events.mjs [--dry-run] [--force]
 *
 *   --dry-run  report what would change, write nothing
 *   --force    overwrite entries that have been edited since they were written
 *
 * By default an existing file whose contents differ from what would be written
 * is LEFT ALONE and reported. An editor who fixes a title in the CMS should not
 * have that fix silently reverted by the next run of an importer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { slugify, flattenWriteup, eventFrontmatter } from '../src/lib/strikinglyArchive.js';

const MANIFEST = 'archive/strikingly/manifest.json';
const CURATED = 'archive/strikingly/curated-events.json';
const OUT_DIR = 'src/content/events';

/**
 * The date given to event #0, which the old site published with no date at all.
 *
 * It sat directly above the 17 April 2019 event in a newest-first list, so it
 * happened AFTER that date — which is as much as anyone can honestly say. The
 * entry therefore ships with `draft: true` and never reaches the public site;
 * this value exists only so the file has a name and validates. Replace it with
 * the real date and drop the draft flag once somebody confirms it.
 */
const UNDATED_PLACEHOLDER = '2019-04-18';

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
  };
}

/**
 * Paths default to the real ones and are injectable so a test can run the whole
 * import against a temp directory. Returns its counts rather than exiting, so
 * importing this module never takes the caller's process down.
 */
export function main({
  argv = process.argv.slice(2),
  manifestPath = MANIFEST,
  curatedPath = CURATED,
  outDir = OUT_DIR,
} = {}) {
  const args = parseArgs(argv);

  for (const file of [manifestPath, curatedPath]) {
    if (!fs.existsSync(file)) {
      console.error(`missing ${file} — run scripts/snapshot-strikingly.mjs first`);
      return { ok: false, written: 0, unchanged: 0, skipped: [], missing: [] };
    }
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
  const snapshotByIndex = new Map(
    manifest.items
      .filter((item) => item.kind === 'event' && item.index !== 'featured')
      .map((item) => [item.index, item]),
  );

  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  let unchanged = 0;
  const skipped = [];
  const missing = [];

  for (const record of curated.events) {
    const snapshot = snapshotByIndex.get(record.index);
    if (!snapshot) {
      missing.push(record.index);
      continue;
    }
    const date = record.date ?? snapshot.date ?? UNDATED_PLACEHOLDER;
    const draft = Boolean(record.draft) || !(record.date ?? snapshot.date);
    const entry = {
      title: record.title,
      date,
      location: record.location || curated.defaultLocation || undefined,
      description: flattenWriteup(snapshot.text),
      draft,
    };
    const file = path.join(outDir, `${date}-${slugify(record.title)}.md`);
    const next = eventFrontmatter(entry);

    if (fs.existsSync(file)) {
      const current = fs.readFileSync(file, 'utf8');
      if (current === next) {
        unchanged += 1;
        continue;
      }
      if (!args.force) {
        skipped.push(path.basename(file));
        continue;
      }
    }
    if (!args.dryRun) fs.writeFileSync(file, next);
    written += 1;
  }

  console.log(`${written} written, ${unchanged} unchanged, ${skipped.length} left alone`);
  if (skipped.length > 0) {
    console.log('\nEdited since they were imported — re-run with --force to overwrite:');
    for (const name of skipped) console.log(`  - ${name}`);
  }
  if (missing.length > 0) {
    console.error(`\nno snapshot record for curated index: ${missing.join(', ')}`);
  }
  return { ok: missing.length === 0, written, unchanged, skipped, missing };
}

// Run only when invoked as a command, so the module can be imported and
// exercised by a test without writing into the real content collection.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!main().ok) process.exit(1);
}
