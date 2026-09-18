import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Guards the IMPORTED CONTENT itself, not the code that imported it.
//
// The rules in `strikinglyArchive.ts` are unit-tested against fixtures; this
// file checks that running them over the real snapshot actually produced 33
// sound entries. That is a different question, and it is the one that catches a
// curated-table edit, a re-run against a changed snapshot, or a hand-fix in the
// CMS that reintroduced something the cleaning rules exist to remove.
//
// NOTE: tests that read `src/content` at run time are invisible to change-based
// test attribution — nothing in the dependency graph links a markdown file to
// this spec — so this one only runs as part of the whole suite.
const EVENTS_DIR = path.join(process.cwd(), 'src/content/events');
const CURATED = path.join(process.cwd(), 'archive/strikingly/curated-events.json');

interface Entry {
  file: string;
  frontmatter: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
  draft: boolean;
}

function readEntries(): Entry[] {
  return fs
    .readdirSync(EVENTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const text = fs.readFileSync(path.join(EVENTS_DIR, file), 'utf8');
      const frontmatter = text.split('---')[1] ?? '';
      const field = (key: string) =>
        frontmatter.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1];
      return {
        file,
        frontmatter,
        title: field('title') ?? '',
        date: field('date') ?? '',
        location: field('location'),
        description: field('description'),
        draft: /^draft:\s*true\s*$/m.test(frontmatter),
      };
    });
}

const entries = readEntries();
/** The imported history: everything dated before the 2020 archive cutoff. */
const archive = entries.filter((e) => e.date < '2020-01-01');

describe('the imported archive entries', () => {
  // The curated table and the content directory are two halves of one record.
  // A count mismatch means the importer skipped an entry or wrote a duplicate
  // under a second filename — both silent, because the site still builds.
  it('imported every curated event, and only those', () => {
    const curated = JSON.parse(fs.readFileSync(CURATED, 'utf8'));

    expect(curated.events).toHaveLength(33);
    expect(archive).toHaveLength(33);
  });

  // Exactly one event on the old site carried no date. It ships as a draft on
  // a placeholder date so the file validates, and the draft flag is the ONLY
  // thing keeping that invented date off the public site.
  it('publishes the 32 dated events and holds back the one with no known date', () => {
    const published = archive.filter((e) => !e.draft);
    const drafts = archive.filter((e) => e.draft);

    expect(published).toHaveLength(32);
    expect(drafts.map((e) => e.title)).toEqual(['Future of Healthcare Tech']);
  });

  // Rule T1: the date belongs in the `date` field, not at the head of the
  // title. A title still carrying its date is the signal the cleaning pass was
  // skipped for that entry.
  it('leaves no date at the head of any title', () => {
    const offenders = archive.filter((e) =>
      /^\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d)/i.test(e.title),
    );

    expect(offenders.map((e) => e.title)).toEqual([]);
  });

  // Rule T2: invisible characters look clean and sort wrong.
  it('carries no invisible characters in any title or write-up', () => {
    const offenders = archive.filter((e) => /[​‎﻿]/.test(e.frontmatter));

    expect(offenders.map((e) => e.file)).toEqual([]);
  });

  // The raw titles ran into their sponsor lists, so several ended on a comma
  // or semicolon once that list was moved off. One left behind reads as a
  // sentence cut in half.
  it('ends no title on a dangling separator', () => {
    const offenders = archive.filter((e) => /[,;:]\s*$/.test(e.title));

    expect(offenders.map((e) => e.title)).toEqual([]);
  });

  // Rule V1/V2: every archive event is from the New York era, and the three
  // with a stated venue keep it. An entry with no location at all would render
  // a card with a missing line.
  it('gives every archive entry a location', () => {
    const offenders = archive.filter((e) => !e.location);

    expect(offenders.map((e) => e.file)).toEqual([]);
  });

  // Rule V1/V3: a venue is used ONLY where the original stated one, and is
  // never inferred from a sponsor or host name. Exactly three events qualify,
  // so this list is also the guard against a fourth being invented.
  it('keeps the three venues the original site actually stated', () => {
    const stated = archive
      .filter((e) => e.location !== 'New York, NY')
      .map((e) => e.location)
      .sort();

    expect(stated).toEqual([
      'Grand Central Tech, New York, NY',
      'R3 offices, New York, NY',
      'Trigger Media, New York, NY',
    ]);
  });

  // The write-up is the whole point of importing the text ahead of the photos.
  it('carries the original write-up on every entry', () => {
    const offenders = archive.filter((e) => !e.description || e.description.length < 20);

    expect(offenders.map((e) => e.file)).toEqual([]);
  });

  // The filename convention is `YYYY-MM-DD-<slug>.md`, and four events share
  // the title "Summer Social" across different years — the date prefix is the
  // only thing keeping them from overwriting one another on a re-import.
  it('files every entry under a filename matching its own date', () => {
    const offenders = archive.filter((e) => !e.file.startsWith(e.date));

    expect(offenders.map((e) => e.file)).toEqual([]);
  });
});

// The entry was typed by hand as "An Elevated Evening of Ideas, Connection &
// Conversation" and is now the one the Luma import writes, under the name the
// calendar carries. They are the same evening: Luma's `start_at` for it is
// 2026-09-28T22:00:00Z, which is 6 PM in New York, the hour the hand-written
// entry already gave. Luma's name won because Luma is where people registered.
describe('the Sept 28 event', () => {
  const sept28 = entries.find((e) => e.title.startsWith('Harvard in Tech Fall Welcome Mixer'));

  // The link is the entire point of the entry while the event is upcoming, and
  // `EventCard` renders it only when the event has not passed — so a missing
  // link is invisible until the one week it matters. It is now the canonical
  // Luma URL rather than the switchy.io redirect, which is also what lets the
  // importer recognise this entry as already present and leave it alone.
  it('is present and carries its ticket link', () => {
    expect(sept28).toBeDefined();
    expect(sept28!.frontmatter).toContain('link: "https://luma.com/dwn2dmuj"');
  });

  // The hand-written entry carried a location and a write-up that Luma does not
  // supply — the calendar gives only "New York, NY" and no description. The
  // reconciliation kept both, so importing a name must not cost the page its
  // copy.
  it('keeps the write-up and the specific venue the calendar does not carry', () => {
    expect(sept28!.frontmatter).toContain('Private rooftop, Hudson Yards, New York, NY');
    expect(sept28!.frontmatter).toContain('Curated tabletop conversations');
  });

  // A bare `2026-09-28` is UTC midnight, which `splitEvents` reads as past from
  // 8 PM ET on the 27th — so a build on the day itself would drop the ticket
  // link while the doors were still open.
  it('carries a time and an offset, not a bare date', () => {
    expect(sept28!.date).toBe('2026-09-28T18:00:00-04:00');
  });
});
