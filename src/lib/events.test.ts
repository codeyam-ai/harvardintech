import { describe, it, expect } from 'vitest';
import {
  toEventDate,
  formatEventDate,
  splitEvents,
  unmatchedChapterTags,
  eventsTaggedTo,
  recentPastEvents,
} from './events';

describe('toEventDate', () => {
  // A Date instance passes through unchanged.
  it('returns a Date instance unchanged', () => {
    const d = new Date('2026-09-24T00:00:00Z');
    expect(toEventDate(d)).toBe(d);
  });

  // An ISO date string is parsed into a Date.
  it('parses an ISO date string into a Date', () => {
    const result = toEventDate('2026-09-24T00:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.valueOf()).toBe(new Date('2026-09-24T00:00:00Z').valueOf());
  });
});

describe('formatEventDate', () => {
  // A UTC-midnight ISO string formats to a long en-US date.
  it('formats an ISO date as Month D, YYYY', () => {
    expect(formatEventDate('2026-09-24T12:00:00Z')).toBe('September 24, 2026');
  });

  // A Date instance formats the same way as the equivalent string.
  it('formats a Date instance the same as its ISO string', () => {
    const d = new Date('2026-01-05T12:00:00Z');
    expect(formatEventDate(d)).toBe('January 5, 2026');
  });

  // Single-digit days are not zero-padded.
  it('does not zero-pad single-digit days', () => {
    expect(formatEventDate('2026-03-01T12:00:00Z')).toBe('March 1, 2026');
  });
});

describe('splitEvents', () => {
  const events = [
    { title: 'Summit', date: '2026-09-24T12:00:00Z' },
    { title: 'Mixer', date: '2026-07-15T12:00:00Z' },
    { title: 'Spring Dinner', date: '2026-03-12T12:00:00Z' },
    { title: 'Winter Panel', date: '2026-01-10T12:00:00Z' },
  ];

  // Events on or after `now` are upcoming, sorted soonest first.
  it('returns upcoming events sorted soonest first', () => {
    const { upcoming } = splitEvents(events, '2026-06-13T00:00:00Z');
    expect(upcoming.map((e) => e.title)).toEqual(['Mixer', 'Summit']);
  });

  // Events before `now` are past, sorted most recent first.
  it('returns past events sorted most recent first', () => {
    const { past } = splitEvents(events, '2026-06-13T00:00:00Z');
    expect(past.map((e) => e.title)).toEqual(['Spring Dinner', 'Winter Panel']);
  });

  // An empty input yields empty upcoming and past lists.
  it('handles an empty event list', () => {
    expect(splitEvents([], '2026-06-13T00:00:00Z')).toEqual({ upcoming: [], past: [] });
  });

  // An event exactly at `now` counts as upcoming, not past.
  it('treats an event exactly at now as upcoming', () => {
    const same = [{ title: 'Now', date: '2026-06-13T00:00:00Z' }];
    const { upcoming, past } = splitEvents(same, '2026-06-13T00:00:00Z');
    expect(upcoming.map((e) => e.title)).toEqual(['Now']);
    expect(past).toEqual([]);
  });

  // When every event is in the future, past is empty.
  it('returns no past events when all are upcoming', () => {
    const { upcoming, past } = splitEvents(events, '2026-01-01T00:00:00Z');
    expect(upcoming).toHaveLength(4);
    expect(past).toHaveLength(0);
  });

  // The mirror of the case above, and the state the real site is in whenever
  // the calendar has not been topped up: every entered event has passed, so
  // `upcoming` is empty even though the collection is full. The homepage relies
  // on exactly this — it renders the "no upcoming events, subscribe on Luma"
  // band off an empty `upcoming`, and before it called splitEvents at all it
  // showed all four of these under a heading that said "Upcoming events".
  it('returns no upcoming events when every event has passed', () => {
    const { upcoming, past } = splitEvents(events, '2026-12-31T00:00:00Z');
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(4);
    // Most recent first, so a "past events" list leads with the freshest.
    expect(past[0].title).toBe('Summit');
  });

  // The original input array is not mutated by sorting.
  it('does not mutate the input array order', () => {
    const input = [...events];
    splitEvents(input, '2026-06-13T00:00:00Z');
    expect(input.map((e) => e.title)).toEqual(['Summit', 'Mixer', 'Spring Dinner', 'Winter Panel']);
  });
});

describe('unmatchedChapterTags', () => {
  // An event tagged with a chapter's display name instead of its slug matches no
  // chapter and vanishes from every chapter page — previously with no signal at all.
  it('names a chapter tag that matches no chapter', () => {
    const events = [
      { title: 'NYC Panel', date: '2026-09-01', chapter: 'New York City' },
      { title: 'London Meetup', date: '2026-09-02', chapter: 'london' },
      { title: 'Open Call', date: '2026-09-03' },
    ];

    expect(unmatchedChapterTags(events, ['nyc', 'london'])).toEqual(['New York City']);
  });

  // The healthy state: every tag matches a chapter, so there is nothing to report.
  it('reports nothing when every tag matches a chapter', () => {
    const events = [
      { title: 'London Meetup', date: '2026-09-02', chapter: 'london' },
      { title: 'Boston Panel', date: '2026-09-03', chapter: 'boston-cambridge' },
    ];

    expect(unmatchedChapterTags(events, ['nyc', 'london', 'boston-cambridge'])).toEqual([]);
  });

  // A trailing space is invisible in the CMS text box but breaks the exact match.
  it('catches a tag that differs only by whitespace', () => {
    const events = [{ title: 'Mixer', date: '2026-09-04', chapter: 'london ' }];

    expect(unmatchedChapterTags(events, ['london'])).toEqual(['london ']);
  });

  // The same typo across several events is named once, in first-seen order.
  it('reports each distinct tag once, in first-seen order', () => {
    const events = [
      { title: 'Second', date: '2026-09-05', chapter: 'Seattle' },
      { title: 'Third', date: '2026-09-06', chapter: 'DC' },
      { title: 'Fourth', date: '2026-09-07', chapter: 'Seattle' },
    ];

    expect(unmatchedChapterTags(events, ['seattle', 'dc-dmv'])).toEqual(['Seattle', 'DC']);
  });

  // A blank tag reads as untagged, not as a mistake worth naming.
  it('treats a blank tag as untagged', () => {
    const events = [
      { title: 'Blank', date: '2026-09-08', chapter: '' },
      { title: 'Spaces', date: '2026-09-09', chapter: '   ' },
    ];

    expect(unmatchedChapterTags(events, ['london'])).toEqual([]);
  });

  // One degenerate edge: nothing to inspect can never report a mismatch.
  it('handles an empty event list', () => {
    expect(unmatchedChapterTags([], ['london'])).toEqual([]);
  });

  // The other degenerate edge, and the state this site launched in: with no
  // chapters published, every tag is unmatched.
  it('reports every tag when there are no chapters at all', () => {
    const events = [{ title: 'Orphan', date: '2026-09-10', chapter: 'london' }];

    expect(unmatchedChapterTags(events, [])).toEqual(['london']);
  });

  // The `communities` list is typed by hand too, so a typo there is invisible
  // in exactly the same way — and would be unreported if the guard only ever
  // looked at `chapter`.
  it('reports a typo in the communities list', () => {
    const events = [
      { title: 'Co-working', date: '2026-05-15', chapter: 'london', communities: ['fonders'] },
    ];

    expect(unmatchedChapterTags(events, ['london', 'founders'])).toEqual(['fonders']);
  });

  // A correctly spelled community tag is a match, not a warning — otherwise the
  // console would cry wolf on every properly tagged event.
  it('accepts a communities tag that matches a known id', () => {
    const events = [
      { title: 'Co-working', date: '2026-05-15', chapter: 'london', communities: ['founders'] },
    ];

    expect(unmatchedChapterTags(events, ['london', 'founders'])).toEqual([]);
  });

  // Both shapes are reported from one pass, in first-seen order, so an editor
  // fixing an event sees everything wrong with it at once.
  it('reports a bad chapter tag and a bad community tag together', () => {
    const events = [
      { title: 'Mixed', date: '2026-05-15', chapter: 'lndon', communities: ['fonders'] },
    ];

    expect(unmatchedChapterTags(events, ['london', 'founders'])).toEqual(['lndon', 'fonders']);
  });

  // Every event written before the field existed has no `communities` key.
  it('handles an event with no communities key', () => {
    const events = [{ title: 'Old', date: '2026-01-01', chapter: 'london' }];

    expect(unmatchedChapterTags(events, ['london'])).toEqual([]);
  });
});

describe('eventsTaggedTo', () => {
  const entry = (id: string, chapter?: string, extra: Record<string, unknown> = {}) => ({
    id,
    data: { title: `Event ${id}`, date: '2026-09-24', chapter, ...extra },
  });

  // The ordinary case: only the owner's events come back, and the collection id
  // becomes the `slug` the event cards link with.
  it('returns only the events tagged to the given owner', () => {
    const events = [entry('summit', 'nyc'), entry('mixer', 'london'), entry('panel', 'nyc')];

    expect(eventsTaggedTo(events, 'nyc').map((e) => e.slug)).toEqual(['summit', 'panel']);
  });

  // A community owns events through the SAME tag a chapter uses, which is the
  // whole reason there is no second field for an editor to get wrong.
  it('matches a community id through the same chapter tag', () => {
    const events = [entry('dinner', 'founders'), entry('mixer', 'nyc')];

    expect(eventsTaggedTo(events, 'founders').map((e) => e.slug)).toEqual(['dinner']);
  });

  // Every optional field is carried through, because the event card renders them
  // — dropping one here would blank a card with no error anywhere.
  it('carries the optional fields the event cards render', () => {
    const events = [
      entry('summit', 'nyc', {
        location: 'New York, NY',
        description: 'Our flagship gathering.',
        link: 'https://example.com/summit',
      }),
    ];

    expect(eventsTaggedTo(events, 'nyc')[0]).toEqual({
      slug: 'summit',
      title: 'Event summit',
      date: '2026-09-24',
      location: 'New York, NY',
      description: 'Our flagship gathering.',
      link: 'https://example.com/summit',
    });
  });

  // The match is exact: a city name typed where a slug belongs reaches no page.
  // This is the same near-miss `unmatchedChapterTags` exists to report.
  it('does not match a tag that only looks like the owner id', () => {
    const events = [entry('summit', 'New York City'), entry('panel', 'nyc ')];

    expect(eventsTaggedTo(events, 'nyc')).toEqual([]);
  });

  // An untagged event belongs to no chapter or community on purpose — it still
  // shows on /events, just not on anyone's page.
  it('excludes events with no tag at all', () => {
    const events = [entry('cambridge-panel'), entry('summit', 'nyc')];

    expect(eventsTaggedTo(events, 'nyc').map((e) => e.slug)).toEqual(['summit']);
  });

  // The day-one state for every new chapter and community: nothing tagged yet.
  it('returns nothing when no event is tagged to the owner', () => {
    expect(eventsTaggedTo([entry('summit', 'nyc')], 'ai')).toEqual([]);
    expect(eventsTaggedTo([], 'ai')).toEqual([]);
  });

  // THE CASE ONE TAG COULD NOT EXPRESS. A Founders co-working day in London
  // belongs to the place AND the group; with a single box the editor had to
  // pick which page it would vanish from.
  it('matches an owner named in the communities list', () => {
    const events = [entry('coworking', 'london', { communities: ['founders'] })];

    expect(eventsTaggedTo(events, 'founders').map((e) => e.slug)).toEqual(['coworking']);
  });

  // The other half of the same event: adding the community tag must not cost
  // the chapter its event.
  it('still matches the chapter tag on a dual-tagged event', () => {
    const events = [entry('coworking', 'london', { communities: ['founders'] })];

    expect(eventsTaggedTo(events, 'london').map((e) => e.slug)).toEqual(['coworking']);
  });

  // The filter is a boolean OR, not a concatenation — an event that matches
  // both ways is one event, not two cards for the same evening.
  it('returns a doubly-matching event only once', () => {
    const events = [entry('coworking', 'founders', { communities: ['founders'] })];

    expect(eventsTaggedTo(events, 'founders').map((e) => e.slug)).toEqual(['coworking']);
  });

  // An event may join several communities, and none of them is the `chapter`.
  it('matches any id in the communities list, with no chapter tag at all', () => {
    const events = [entry('roundtable', undefined, { communities: ['ai', 'founders'] })];

    expect(eventsTaggedTo(events, 'ai').map((e) => e.slug)).toEqual(['roundtable']);
    expect(eventsTaggedTo(events, 'founders').map((e) => e.slug)).toEqual(['roundtable']);
  });

  // Every event written before the field existed has no `communities` key. The
  // lookup must treat that as "no community tags", not crash on undefined.
  it('handles an event with no communities key', () => {
    expect(eventsTaggedTo([entry('summit', 'nyc')], 'founders')).toEqual([]);
  });
});

describe('recentPastEvents', () => {
  const past = (slug: string) => ({ slug, title: slug, date: '2026-01-01' });

  // A chapter with nothing coming up looked abandoned. Showing the last few is
  // the cheapest proof it is real — but only the last few: a full archive
  // buries the sign-up under years of history.
  it('returns at most three events by default', () => {
    const events = [past('a'), past('b'), past('c'), past('d'), past('e')];

    expect(recentPastEvents(events).map((e) => e.slug)).toEqual(['a', 'b', 'c']);
  });

  // `splitEvents` hands back `past` most-recent-first, so this must preserve
  // that order rather than re-sorting — the newest three are the point.
  it('preserves the order it was given', () => {
    const events = [past('newest'), past('middle'), past('oldest')];

    expect(recentPastEvents(events).map((e) => e.slug)).toEqual([
      'newest',
      'middle',
      'oldest',
    ]);
  });

  // A chapter with fewer than the cap shows all of them rather than padding.
  it('returns everything when there are fewer than the limit', () => {
    expect(recentPastEvents([past('a')]).map((e) => e.slug)).toEqual(['a']);
    expect(recentPastEvents([])).toEqual([]);
  });

  // The caller can widen or narrow the section without a second function.
  it('honours an explicit limit', () => {
    const events = [past('a'), past('b'), past('c')];

    expect(recentPastEvents(events, { limit: 2 }).map((e) => e.slug)).toEqual(['a', 'b']);
  });

  // A zero or negative limit switches the section off, so a caller that wants
  // no recent-events block needs no second branch around the component.
  it('returns nothing for a limit of zero or less', () => {
    const events = [past('a'), past('b')];

    expect(recentPastEvents(events, { limit: 0 })).toEqual([]);
    expect(recentPastEvents(events, { limit: -1 })).toEqual([]);
  });

  // The chapter page renders this list and the full past list on other pages;
  // slicing in place would truncate the caller's own array.
  it('does not mutate its input', () => {
    const events = [past('a'), past('b'), past('c'), past('d')];
    recentPastEvents(events);

    expect(events).toHaveLength(4);
  });
});
