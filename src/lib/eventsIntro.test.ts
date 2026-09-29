import { describe, it, expect } from 'vitest';
import { eventsLede, formatCityList } from './eventsIntro';

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
