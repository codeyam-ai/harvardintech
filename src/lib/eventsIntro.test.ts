import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { eventsLede, eventsLedeFor, formatCityList } from './eventsIntro';

describe('formatCityList', () => {
  // The ordinary roster, and the reason the Oxford comma is not optional here:
  // one of the real chapter names is "DC and DMV Area", so without the final
  // comma the last two run together as one place.
  it('joins three or more cities with an Oxford comma', () => {
    expect(formatCityList(['Boston', 'DC and DMV Area', 'London'])).toBe(
      'Boston, DC and DMV Area, and London',
    );
  });

  // Two reads as a plain pair, with no comma.
  it('joins two cities with and', () => {
    expect(formatCityList(['Boston', 'London'])).toBe('Boston and London');
  });

  // One stands alone.
  it('returns a single city unchanged', () => {
    expect(formatCityList(['Boston'])).toBe('Boston');
  });

  // Day one: nothing published yet.
  it('returns an empty string for no cities', () => {
    expect(formatCityList([])).toBe('');
  });

  // A blank entry is dropped rather than printed as a stray comma — chapter
  // labels come from content an editor types, so one can arrive empty.
  it('ignores blank and whitespace-only entries', () => {
    expect(formatCityList(['Boston', '  ', '', 'London'])).toBe('Boston and London');
  });
});

describe('eventsLede', () => {
  // The standfirst as the page renders it, built from the live roster rather
  // than the hand-typed list it replaced — which had already gone stale,
  // omitting SF and misspelling two other chapters.
  it('names the chapters it is given', () => {
    expect(eventsLede(['Boston', 'London'])).toBe(
      'In-person events, panels, and gatherings across our Boston and London chapters, plus a global community connected online.',
    );
  });

  // With nothing published the clause drops out entirely, so the sentence still
  // reads as English instead of "across our  chapters".
  it('drops the chapter clause when there are no chapters', () => {
    const lede = eventsLede([]);
    expect(lede).toBe(
      'In-person events, panels, and gatherings, plus a global community connected online.',
    );
    expect(lede).not.toContain('chapters');
  });

  // The global line is the constant half of the sentence: it is true whether or
  // not any city has a chapter, so it survives the empty case.
  it('always mentions the global community', () => {
    expect(eventsLede([])).toContain('global community connected online');
    expect(eventsLede(['Boston'])).toContain('global community connected online');
  });
});

describe('eventsLedeFor', () => {
  // "In-person events … across our X chapters" is a promise of a calendar. A
  // forming city holds no events — it is an online group for now — so naming it
  // here would promise one that is not there.
  it('names only the active chapters', () => {
    const lede = eventsLedeFor([
      { slug: 'nyc', city: 'New York City', status: 'active' },
      { slug: 'seattle', city: 'Seattle / Pacific Northwest', status: 'forming' },
      { slug: 'london', city: 'London' },
    ]);

    expect(lede).toContain('New York City');
    expect(lede).toContain('London');
    expect(lede).not.toContain('Seattle');
  });

  // The cities appear in the menu's order, so the sentence and the dropdown
  // above it never list the same chapters in a different sequence.
  it('lists the cities in menu order', () => {
    expect(
      eventsLedeFor([
        { slug: 'london', city: 'London', order: 3 },
        { slug: 'boston', city: 'Boston', order: 1 },
      ]),
    ).toBe(
      'In-person events, panels, and gatherings across our Boston and London chapters, plus a global community connected online.',
    );
  });

  // With every city forming there is no in-person calendar to name, so the
  // sentence falls back to the no-chapters form rather than "across our
  // chapters" with an empty list.
  it('drops the chapter clause when every city is forming', () => {
    expect(eventsLedeFor([{ slug: 'dc-dmv', city: 'DC and DMV Area', status: 'forming' }])).toBe(
      eventsLede([]),
    );
  });

  // No chapters at all reads the same as the all-forming case.
  it('handles an empty roster', () => {
    expect(eventsLedeFor([])).toBe(eventsLede([]));
  });

  // THE RULE AGAINST THE REAL ROSTER: build the lede from the committed chapter
  // files and assert no forming city's name made it into the sentence.
  it('names no forming city from the committed chapters', () => {
    const dir = path.join(process.cwd(), 'src/content/chapters');
    const chapters = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const text = fs.readFileSync(path.join(dir, f), 'utf8');
        const city = /^city:\s*(.+)$/m.exec(text)?.[1].trim() ?? '';
        const status = /^status:\s*(\S+)/m.exec(text)?.[1];
        return { slug: f.replace(/\.md$/, ''), city, status };
      });
    const forming = chapters.filter((c) => c.status === 'forming');

    expect(forming.length).toBeGreaterThan(0);
    const lede = eventsLedeFor(chapters);
    for (const c of forming) {
      expect({ city: c.city, named: lede.includes(c.city) }).toEqual({ city: c.city, named: false });
    }
  });
});
