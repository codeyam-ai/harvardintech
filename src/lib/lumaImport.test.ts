import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Integration tests for the Luma importer, driven through its `main` entry
// point against a temp directory and a stubbed `fetch`.
//
// They live here rather than beside the script because vitest's `include` is
// `src/**` — a spec parked in `scripts/` is a spec no runner would ever load.
// `main` takes its output directory and its `fetch` as options precisely so
// this is possible, and returns its counts instead of calling `process.exit`,
// which would otherwise take the test runner down with it.
//
// What these cover that `lumaFeed.test.ts` cannot: the pure rules are unit
// tested there. This is about what actually lands on disk — that a second run
// is a no-op, that an edited entry survives, and above all that an event
// already in the collection under a DIFFERENT filename is still recognised.
import { main as importLuma } from '../../scripts/import-luma.mjs';

const MIXER = {
  event: {
    name: 'Harvard in Tech Fall Welcome Mixer',
    start_at: '2026-09-28T22:00:00.000Z',
    timezone: 'America/New_York',
    url: 'dwn2dmuj',
    location_type: 'offline',
    visibility: 'public',
    geo_address_info: { city: 'New York', city_state: 'New York, NY' },
  },
  status: 'approved',
};

/** Filed under 2026-04-30 by hand; Luma's own local date for it is the 29th. */
const SF_PANEL = {
  event: {
    name: 'Harvard Alumni in Tech Leaders in Engineering Panel',
    start_at: '2026-04-30T01:00:00.000Z',
    timezone: 'America/Los_Angeles',
    url: 'fk6yuo82',
    location_type: 'offline',
    visibility: 'public',
    geo_address_info: { city: 'San Francisco', city_state: 'San Francisco, California' },
  },
  status: 'approved',
};

/** A `fetch` that answers the upcoming request with `entries` and the past one with nothing. */
function stubFetch(upcoming: unknown[], past: unknown[] = []) {
  return async (url: string) => ({
    ok: true,
    json: async () => ({ entries: String(url).includes('period=past') ? past : upcoming }),
  });
}

let outDir: string;

beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'luma-import-'));
});

afterEach(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

describe('importing from Luma', () => {
  // The base case: an event on the calendar and not in the repo becomes a file,
  // with the full registration URL rather than the bare slug the feed sends.
  it('writes an event that is not in the collection yet', async () => {
    const result = await importLuma({ argv: [], outDir, fetchImpl: stubFetch([MIXER]) });

    expect(result.written).toEqual(['2026-09-28-harvard-in-tech-fall-welcome-mixer.md']);
    const written = fs.readFileSync(
      path.join(outDir, '2026-09-28-harvard-in-tech-fall-welcome-mixer.md'),
      'utf8',
    );
    expect(written).toContain('link: "https://luma.com/dwn2dmuj"');
  });

  // This runs nightly, so "no new events" is the overwhelmingly common outcome
  // and it has to produce no commit, no churn, and no rewritten file.
  it('is a no-op on a second run', async () => {
    await importLuma({ argv: [], outDir, fetchImpl: stubFetch([MIXER]) });
    const second = await importLuma({ argv: [], outDir, fetchImpl: stubFetch([MIXER]) });

    expect(second.written).toEqual([]);
    expect(second.skipped).toEqual(['2026-09-28-harvard-in-tech-fall-welcome-mixer.md']);
  });

  // The contract with whoever edits events in the CMS. A location they
  // corrected or a description they wrote must survive every future run.
  it('leaves an entry that has been edited by hand exactly as it is', async () => {
    const file = path.join(outDir, '2026-09-28-harvard-in-tech-fall-welcome-mixer.md');
    await importLuma({ argv: [], outDir, fetchImpl: stubFetch([MIXER]) });
    const edited = fs
      .readFileSync(file, 'utf8')
      .replace('location: "New York, NY"', 'location: "Private rooftop, Hudson Yards, New York, NY"');
    fs.writeFileSync(file, edited);

    await importLuma({ argv: [], outDir, fetchImpl: stubFetch([MIXER]) });

    expect(fs.readFileSync(file, 'utf8')).toContain('Private rooftop, Hudson Yards');
  });

  // The regression that a filename comparison cannot catch. The panel is filed
  // under 2026-04-30 while Luma's local date for it is the 29th, so matching on
  // the filename would import a SECOND copy and the site would list it twice.
  it('recognises an event filed under a different date by its Luma link', async () => {
    fs.writeFileSync(
      path.join(outDir, '2026-04-30-harvard-alumni-in-tech-leaders-in-engineering-panel.md'),
      '---\ntitle: "Leaders in Engineering Panel"\ndate: 2026-04-30\nlink: "https://luma.com/fk6yuo82"\n---\n',
    );

    const result = await importLuma({ argv: [], outDir, fetchImpl: stubFetch([SF_PANEL]) });

    expect(result.written).toEqual([]);
    expect(fs.readdirSync(outDir)).toHaveLength(1);
  });

  // Past events cost a second request, so a plain run must not pay for it —
  // and must not silently miss the archive when it is asked for.
  it('reads past events only when asked for them', async () => {
    const upcomingOnly = await importLuma({
      argv: [],
      outDir,
      fetchImpl: stubFetch([MIXER], [SF_PANEL]),
    });
    expect(upcomingOnly.written).toHaveLength(1);

    const withPast = await importLuma({
      argv: ['--past'],
      outDir,
      fetchImpl: stubFetch([MIXER], [SF_PANEL]),
    });
    expect(withPast.written).toEqual([
      '2026-04-29-harvard-alumni-in-tech-leaders-in-engineering-panel.md',
    ]);
  });

  // The flag exists so an operator can see what a run WOULD do to the content
  // collection before letting it. Reporting the writes while performing them
  // would make it worse than useless.
  it('writes nothing under --dry-run', async () => {
    const result = await importLuma({
      argv: ['--dry-run'],
      outDir,
      fetchImpl: stubFetch([MIXER]),
    });

    expect(result.written).toHaveLength(1);
    expect(fs.readdirSync(outDir)).toEqual([]);
  });

  // A calendar that is briefly unreachable must not empty the events page or
  // break a deploy — the build ships what is already committed.
  it('leaves the collection alone and does not fail when Luma is unreachable', async () => {
    fs.writeFileSync(path.join(outDir, 'existing.md'), '---\ntitle: "Kept"\ndate: 2026-01-01\n---\n');
    const refusing = async () => {
      throw new Error('getaddrinfo ENOTFOUND api.lu.ma');
    };

    const result = await importLuma({ argv: [], outDir, fetchImpl: refusing });

    expect(result.ok).toBe(true);
    expect(result.offline).toBe(true);
    expect(fs.readdirSync(outDir)).toEqual(['existing.md']);
  });

  // A 503 answers without throwing, so the failure path that catches a network
  // error never sees it — and parsing that body would yield zero entries, which
  // reads as "the calendar is empty" rather than "the calendar is down".
  it('treats a non-200 from Luma the same way as an unreachable one', async () => {
    const serverError = async () => ({ ok: false, status: 503, json: async () => ({}) });

    const result = await importLuma({ argv: [], outDir, fetchImpl: serverError });

    expect(result.ok).toBe(true);
    expect(result.offline).toBe(true);
  });

  // The same rule the mapping enforces, checked where it actually matters: on
  // disk. A private event reaching the collection is published to the site.
  it('does not write a private event', async () => {
    const unlisted = { ...MIXER, event: { ...MIXER.event, visibility: 'private' } };

    const result = await importLuma({ argv: [], outDir, fetchImpl: stubFetch([unlisted]) });

    expect(result.written).toEqual([]);
    expect(result.dropped).toBe(1);
  });
});
