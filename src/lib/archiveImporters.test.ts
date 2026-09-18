import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Integration tests for the three archival scripts, driven through their `main`
// entry points against a temp directory.
//
// They live here rather than beside the scripts because vitest's `include` is
// `src/**` — a spec parked in `scripts/` is a spec no runner would ever load.
// Each script takes its paths as injectable options precisely so this is
// possible, and each returns its counts instead of calling `process.exit`,
// which would otherwise take the test runner down with it.
//
// What they are for: the pure rules already have unit tests in
// `strikinglyArchive.test.ts`. These cover the part those cannot — that running
// the whole importer over a manifest actually lands the right files on disk,
// with the right draft flags, and that a second run is a no-op.
import { main as importArchiveEvents } from '../../scripts/import-archive-events.mjs';
import { main as importWebinars } from '../../scripts/import-webinars.mjs';
import { main as snapshot } from '../../scripts/snapshot-strikingly.mjs';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-import-'));
  // The scripts report progress on stdout; keep the test output readable.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const write = (rel: string, data: unknown) => {
  const file = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);
  return file;
};

describe('import-archive-events', () => {
  const manifest = {
    items: [
      {
        kind: 'event',
        index: 0,
        date: '2018-08-18',
        text: 'A panel.\n\nWith two paragraphs.',
      },
      { kind: 'event', index: 1, date: null, text: 'No date known.' },
      // The featured upcoming event is deliberately NOT history and must not
      // be imported as an archive entry.
      { kind: 'event', index: 'featured', date: null, text: 'Upcoming.' },
    ],
  };
  const curated = {
    defaultLocation: 'New York, NY',
    events: [
      { index: 0, date: '2018-08-18', title: 'Summer Social', location: 'R3 offices, New York, NY' },
      { index: 1, date: null, title: 'Future of Healthcare Tech', draft: true },
    ],
  };

  const run = (argv: string[] = []) =>
    importArchiveEvents({
      argv,
      manifestPath: write('manifest.json', manifest),
      curatedPath: write('curated.json', curated),
      outDir: path.join(tmp, 'events'),
    });

  // The end-to-end shape: a curated row plus its snapshot record becomes a file
  // named for its own date, carrying the stated venue and the write-up
  // flattened to one line.
  it('writes one entry per curated event, named for its date', () => {
    const result = run();

    expect(result).toMatchObject({ ok: true, written: 2 });
    const written = fs.readdirSync(path.join(tmp, 'events')).sort();
    expect(written).toEqual([
      '2018-08-18-summer-social.md',
      '2019-04-18-future-of-healthcare-tech.md',
    ]);

    const social = fs.readFileSync(path.join(tmp, 'events', written[0]), 'utf8');
    expect(social).toContain('location: "R3 offices, New York, NY"');
    expect(social).toContain('description: "A panel. With two paragraphs."');
    expect(social).not.toContain('draft:');
  });

  // The undated event must never reach the public site on its placeholder date.
  it('marks the undated event a draft and gives it the default location', () => {
    run();
    const undated = fs.readFileSync(
      path.join(tmp, 'events', '2019-04-18-future-of-healthcare-tech.md'),
      'utf8',
    );

    expect(undated).toContain('draft: true');
    expect(undated).toContain('location: "New York, NY"');
  });

  // The upcoming featured event is not part of the history and would otherwise
  // be imported as a 34th archive entry.
  it('ignores the featured record that is not archive history', () => {
    run();

    expect(fs.readdirSync(path.join(tmp, 'events'))).toHaveLength(2);
  });

  // Re-running the importer must be free. Anything else makes phase 2 - which
  // re-runs it to add photos and speakers - a rewrite of all 33 files.
  it('is a no-op on a second run', () => {
    run();

    expect(run()).toMatchObject({ written: 0, unchanged: 2 });
  });

  // An editor who corrects a title in the CMS must not have it silently
  // reverted by the next import.
  it('leaves an edited entry alone until --force is passed', () => {
    run();
    const file = path.join(tmp, 'events', '2018-08-18-summer-social.md');
    fs.writeFileSync(file, '---\ntitle: "Hand-corrected"\ndate: 2018-08-18\n---\n');

    expect(run().skipped).toEqual(['2018-08-18-summer-social.md']);
    expect(fs.readFileSync(file, 'utf8')).toContain('Hand-corrected');

    expect(run(['--force'])).toMatchObject({ written: 1 });
    expect(fs.readFileSync(file, 'utf8')).toContain('Summer Social');
  });

  // A curated row with no matching snapshot record is a torn input, not
  // something to import half of.
  it('reports a curated event with no snapshot record', () => {
    const result = importArchiveEvents({
      argv: [],
      manifestPath: write('empty-manifest.json', { items: [] }),
      curatedPath: write('curated2.json', curated),
      outDir: path.join(tmp, 'events2'),
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([0, 1]);
  });
});

describe('import-webinars', () => {
  const manifest = {
    items: [
      {
        kind: 'webinar',
        index: 5,
        publishedAt: '2020-04-09',
        providerAvailable: true,
        embedUrl: 'https://www.youtube-nocookie.com/embed/S4c48202-D8',
        file: 'webinars/W05.jpg',
        text: 'What it covered.',
      },
      // The provider has lost this one: no date, no cover, must not publish.
      {
        kind: 'webinar',
        index: 10,
        publishedAt: null,
        providerAvailable: false,
        embedUrl: 'https://player.vimeo.com/video/418466741',
        file: 'webinars/W10.jpg',
        text: 'Also covered something.',
      },
      // Index 6 is the one the table drops outright.
      { kind: 'webinar', index: 6, publishedAt: null, providerAvailable: null, file: null },
    ],
  };

  const run = (argv: string[] = []) => {
    write('archive/webinars/W05.jpg', 'fake-jpeg-bytes');
    write('archive/webinars/W10.jpg', 'fake-jpeg-bytes');
    return importWebinars({
      argv,
      manifestPath: write('manifest.json', manifest),
      outDir: path.join(tmp, 'blog'),
      imageDir: path.join(tmp, 'images', 'webinars'),
      mediaManifest: path.join(tmp, 'media.json'),
      archiveRoot: path.join(tmp, 'archive'),
      publicImages: path.join(tmp, 'images'),
    });
  };

  // A live recording publishes with its real date, its player and its cover.
  it('publishes a recording the provider still has', () => {
    const result = run();

    expect(result).toMatchObject({ ok: true, dropped: 1, published: 1 });
    const post = fs.readFileSync(
      path.join(tmp, 'blog', 'webinar-edutech-solutions-to-covid-19.md'),
      'utf8',
    );
    expect(post).toContain('date: 2020-04-09');
    expect(post).toContain('series: webinars');
    expect(post).toContain('coverImage: "/images/webinars/edutech-solutions-to-covid-19.jpg"');
    expect(post).not.toContain('draft: true');
  });

  // The load-bearing rule of the whole webinars import: a recording whose host
  // has lost it is written to the repo but never published, and carries NO
  // cover — what the provider returns for one is a colour-bars placeholder, not
  // a still from the video.
  it('keeps a lost recording as a draft with no cover', () => {
    run();
    const post = fs.readFileSync(
      path.join(tmp, 'blog', 'webinar-media-and-technology-in-growth-markets.md'),
      'utf8',
    );

    expect(post).toContain('draft: true');
    expect(post).not.toContain('coverImage:');
    expect(fs.existsSync(path.join(tmp, 'images', 'webinars', 'media-and-technology-in-growth-markets.jpg'))).toBe(false);
  });

  // W6 was never a recording we hosted, only a link to a page that no longer
  // resolves, so it is dropped rather than imported as a dead link.
  it('drops the entry the table marks as not ours', () => {
    run();

    expect(fs.readdirSync(path.join(tmp, 'blog'))).toHaveLength(2);
  });

  // The media library must not list a file the site does not have.
  it('records a media asset only for the cover it actually copied', () => {
    run();
    const media = JSON.parse(fs.readFileSync(path.join(tmp, 'media.json'), 'utf8'));
    const webinarAssets = media.assets.filter((a: { filename: string }) =>
      a.filename.startsWith('webinars/'),
    );

    expect(webinarAssets).toHaveLength(1);
    expect(webinarAssets[0].alt).toBe('Video still from EduTech Solutions to COVID-19');
  });

  // Same idempotence contract as the events importer: re-running must be free,
  // or the copy-covers-and-rewrite-media step churns the repo every time.
  it('is a no-op on a second run', () => {
    run();

    expect(run()).toMatchObject({ written: 0, unchanged: 2 });
  });
});

describe('snapshot-strikingly', () => {
  const store = {
    pageData: {
      pages: [
        {
          path: '/events',
          sections: [
            {
              components: {
                text1: { type: 'RichText', value: '<p>Past Events</p>' },
                repeatable1: {
                  list: [
                    {
                      components: {
                        text1: { type: 'RichText', value: '<p>Aug 18th, 2018: Summer Social</p>' },
                        text3: { type: 'RichText', value: '<p>200+ technologists came.</p>' },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    },
  };

  // `--from` reads saved HTML instead of the network and `--dry-run` writes
  // nothing, so the parse-and-plan half of the snapshot is exercised here with
  // no live site involved — which matters, because the real run can only happen
  // once, before the domain moves.
  it('parses saved pages and plans the capture without touching the network', async () => {
    const from = path.join(tmp, 'pages');
    fs.mkdirSync(from, { recursive: true });
    const html = `<html><script>$S.stores=${JSON.stringify(store)};</script></html>`;
    // Only /events carries a real store; the rest are absent on purpose, so the
    // run also proves a missing page is reported rather than throwing.
    fs.writeFileSync(path.join(from, 'events.html'), html);

    const result = await snapshot(['--dry-run', '--from', from, '--out', path.join(tmp, 'out')]);

    expect(result.ok).toBe(false);
    expect(result.manifest.items.some((i: { kind: string }) => i.kind === 'event')).toBe(true);
    expect(result.failures.some((f: string) => f.includes('home'))).toBe(true);
    // --dry-run must not write anything, including the manifest.
    expect(fs.existsSync(path.join(tmp, 'out'))).toBe(false);
  });
});
