import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Guards the numbers and the claims the site makes about its own chapters.
//
// The problem this exists for: how many chapters there are is a FACT stored in
// `src/content/chapters/`, but it is REPEATED as editable prose in at least
// four other places — the stat strip, the donate page's stats, the sponsor
// intro, the hero lede. Those stayed editable on purpose (editors own that
// copy, and computing them at render time would take it away), which means
// nothing structurally stops them drifting. They had already drifted before
// this test existed: the site said "6 global chapters" and "8,000+ members"
// while listing two cities that had not run an event.
//
// So this reads the content off disk and asserts the prose agrees with it. It
// does NOT compute the copy — an editor can still word it however they like, as
// long as the number in it is true.
//
// Reads frontmatter line-by-line rather than through astro:content, which is
// awkward to load under vitest — the same tradeoff `chapter.photos.test.ts`
// makes, and for the same reason.
const CONTENT = join(process.cwd(), 'src/content');
const SRC = join(process.cwd(), 'src');

/** The scalar value of a top-level `key:` line, unquoted. */
function frontmatterValue(file: string, key: string): string | undefined {
  const line = readFileSync(file, 'utf-8')
    .split('\n')
    .find((l) => l.startsWith(`${key}:`));
  if (!line) return undefined;
  return line
    .slice(key.length + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

/** Every chapter entry's status, defaulting to active exactly as the app does. */
function chapterStatuses(): string[] {
  const dir = join(CONTENT, 'chapters');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => frontmatterValue(join(dir, f), 'status') ?? 'active');
}

const ACTIVE_COUNT = chapterStatuses().filter((s) => s === 'active').length;
const FORMING_COUNT = chapterStatuses().filter((s) => s === 'forming').length;

describe('chapter counts agree with the content', () => {
  // The fixture the whole file rests on. Stated as its own assertion so that a
  // roster change fails HERE with an obvious message, rather than failing three
  // copy assertions below and looking like three separate problems.
  it('has four active chapters and two forming', () => {
    expect({ active: ACTIVE_COUNT, forming: FORMING_COUNT }).toEqual({ active: 4, forming: 2 });
  });

  // The homepage stat strip. This is the number a visitor sees first, and the
  // one that said "6" while two of those six had never held an event.
  it('the chapters stat equals the active-chapter count', () => {
    const value = frontmatterValue(join(CONTENT, 'stats/global-chapters.md'), 'value');

    expect(value).toBe(String(ACTIVE_COUNT));
  });

  // The donate page repeats the same figure in its own stats block, which is
  // read by people deciding whether to give money — so it is the worst place on
  // the site to overstate the size of the organisation.
  it('the donate page Chapters stat equals the same count', () => {
    const donate = readFileSync(join(CONTENT, 'pageCopy/donate.md'), 'utf-8');
    const chaptersStat = donate.match(/- value:\s*'?(\d+)'?\s*\n\s*label:\s*Chapters/);

    expect(chaptersStat?.[1]).toBe(String(ACTIVE_COUNT));
  });
});

describe('copy names no retired or forming city as active', () => {
  // The cities that were dropped. Japan and L.A. were listed as chapters long
  // after they stopped running anything, which is the specific overstatement
  // this launch set out to remove — so their names must not come back.
  const RETIRED = ['Japan', 'L.A.', 'Los Angeles'];
  // Cities that exist but are forming. Naming one as a place with in-person
  // events is the same overstatement in a subtler form.
  const FORMING_CITIES = ['DC', 'Seattle'];

  const copyFiles = {
    'hero lede': join(CONTENT, 'heroSlides/a-global-community-with-a-home-in-your-city.md'),
    'sponsor intro': join(CONTENT, 'sponsorPage/sponsor.md'),
    'chapter sponsor level': join(CONTENT, 'sponsorLevels/chapter.md'),
  };

  // The retired cities, across every surface that used to name them.
  it('never mentions Japan or L.A.', () => {
    for (const [name, file] of Object.entries(copyFiles)) {
      const text = readFileSync(file, 'utf-8');
      for (const city of RETIRED) {
        expect({ surface: name, mentions: text.includes(city) }).toEqual({
          surface: name,
          mentions: false,
        });
      }
    }
  });

  // "six chapters" was the phrase that outlived the fact, in two places at
  // once. Any spelling of a too-large count is the same bug.
  it('never claims six chapters', () => {
    for (const [name, file] of Object.entries(copyFiles)) {
      const text = readFileSync(file, 'utf-8').toLowerCase();
      expect({ surface: name, claims: /six chapters|6 chapters/.test(text) }).toEqual({
        surface: name,
        claims: false,
      });
    }
  });

  // The sponsor level sells "back one city's calendar for the year". Offering a
  // forming city there would be selling a calendar that does not exist.
  it('the chapter sponsor level offers no forming city', () => {
    const summary = frontmatterValue(join(CONTENT, 'sponsorLevels/chapter.md'), 'summary') ?? '';

    for (const city of FORMING_CITIES) {
      expect({ city, offered: summary.includes(city) }).toEqual({ city, offered: false });
    }
  });

  // The hero lede must separate the two groups rather than listing all six as
  // places you can turn up in person.
  it('the hero lede marks the forming chapters as forming', () => {
    const lede = frontmatterValue(
      join(CONTENT, 'heroSlides/a-global-community-with-a-home-in-your-city.md'),
      'lede',
    ) ?? '';

    expect(lede.toLowerCase()).toContain('forming');
  });
});

// DELIBERATELY NOT ASSERTED HERE: that no rendering source links a WhatsApp
// group directly. `src/lib/noPersonalEmail.test.ts` already owns that rule
// ("never links the WhatsApp group directly") and scans the same surfaces. A
// second copy here would be two tests for one rule, which is how the copies
// stop agreeing — the same reason `collections.test.ts` says it does not
// duplicate the helper cases that live beside their functions.
//
// The predicate those tests guard is `isWhatsAppGroupLink`, unit-tested in
// `localPresence.test.ts`. Between them: the predicate is correct, the schema
// refuses a group link at edit time, `joinCtas` refuses one at render, and
// noPersonalEmail proves none reached the source.

describe('retired content is gone rather than hidden', () => {
  // "2 new chapters launched: London and San Francisco" was a point-in-time
  // boast that had become simply untrue, and the owner asked for it removed —
  // not drafted, removed. A draft toggle would leave it to resurface.
  it('the new-chapters-launched accomplishment no longer exists', () => {
    expect(existsSync(join(CONTENT, 'accomplishments/new-chapters-launched.md'))).toBe(false);
  });
});
