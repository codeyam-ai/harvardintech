import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The licence ledger, `src/data/imageCredits.json`: one row per committed image
// recording where it came from and whether we may use it.
//
// It exists because of one specific image. `volunteers.webp` is doctored stock
// art of unknown provenance that was sitting on a volunteer project entry, and
// nothing in the repo said so — it looked exactly like our own event
// photography. The shield is the other case: a registered trademark whose use
// by a Shared Interest Group has not actually been granted yet.
//
// The load-bearing assertion is the last one: no CONTENT file may reference an
// image whose source is `unknown`. That is what turns the ledger from a comment
// into a guard — an unlicensed image can sit in the repo as a fixture, but it
// cannot reach a published page without failing here.
//
// Deliberately NOT asserted: that every row has been researched. Most rows say
// "migrated from the Strikingly site", which is honest rather than complete —
// the photographer of a 2019 event photo is genuinely not recoverable. Demanding
// a named photographer per row would make the file impossible to keep true.
const ROOT = process.cwd();
const LEDGER_PATH = join(ROOT, 'src/data/imageCredits.json');
const IMAGES_DIR = join(ROOT, 'public/images');
const MEDIA_PATH = join(ROOT, 'src/data/media.json');

interface CreditRow {
  file: string;
  source: string;
  credit?: string;
  licence?: string;
  note?: string;
}

const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf-8')) as {
  credits: CreditRow[];
};
const media = JSON.parse(readFileSync(MEDIA_PATH, 'utf-8')) as {
  assets: { filename: string }[];
};

const VALID_SOURCES = new Set(['own-event', 'stock-licensed', 'haa-permission', 'unknown']);

/** Content and data files a visitor's page is actually built from. */
const CONTENT_ROOTS = ['src/content', 'src/data'];

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (statSync(full).isFile()) out.push(full);
  }
  return out;
}

describe('the image licence ledger', () => {
  // A ledger that has drifted out of sync with the library is worse than none,
  // because it reads as authoritative. Every committed asset must appear.
  it('has a row for every image in the media library', () => {
    const rows = new Set(ledger.credits.map((c) => c.file));
    for (const asset of media.assets) {
      expect(rows.has(asset.filename), `${asset.filename} has no licence row`).toBe(true);
    }
  });

  // The other direction: a row naming a file that was deleted is stale, and
  // stale rows are how an `unknown` quietly stops covering anything.
  it('names only files that actually exist on disk', () => {
    for (const row of ledger.credits) {
      expect(existsSync(join(IMAGES_DIR, row.file)), `${row.file} is in the ledger but not on disk`).toBe(
        true,
      );
    }
  });

  // `source` is the field the guard below reads. An unrecognised value would
  // slip past that check silently, which is the one thing it must not do.
  it('records a recognised source for every row', () => {
    for (const row of ledger.credits) {
      expect(VALID_SOURCES.has(row.source), `${row.file} has source "${row.source}"`).toBe(true);
    }
  });

  // The whole point of the file. An image we may not have the right to use must
  // not be reachable from a page — it may exist as a scenario fixture, but the
  // moment a content or data file names it, that is a publication.
  it('lets no content or data file reference an image whose source is unknown', () => {
    const unknown = ledger.credits.filter((c) => c.source === 'unknown').map((c) => c.file);
    const contentFiles = CONTENT_ROOTS.flatMap((r) => walkFiles(join(ROOT, r)));

    for (const file of contentFiles) {
      // The ledger and the media library both list every image by design.
      if (file === LEDGER_PATH || file === MEDIA_PATH) continue;
      const text = readFileSync(file, 'utf-8');
      for (const image of unknown) {
        expect(
          text.includes(`/images/${image}`),
          `${file.replace(`${ROOT}/`, '')} references /images/${image}, whose licence is unknown`,
        ).toBe(false);
      }
    }
  });

  // The shield is the one trademark question on the site. Recording it as
  // granted before the HAA has answered would be the failure this row exists to
  // prevent, so its pending state is pinned until that answer arrives.
  it('still records the Harvard shield as pending permission', () => {
    const shield = ledger.credits.find((c) => c.file === 'harvard-shield.png');
    expect(shield, 'the shield has no ledger row').toBeDefined();
    expect(shield!.source).toBe('haa-permission');
  });
});
