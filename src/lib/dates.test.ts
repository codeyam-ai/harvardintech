import { describe, it, expect } from 'vitest';
import { dateParts, formatLongDate } from './dates';

describe('formatLongDate', () => {
  // The site's one long-form date, as every event card and blog post shows it.
  it('formats a date as month day, year', () => {
    expect(formatLongDate('2026-02-10')).toBe('February 10, 2026');
  });

  // THE RULE THIS MODULE EXISTS FOR. A date-only frontmatter value parses to UTC
  // midnight, so formatting it in any timezone west of UTC renders the PREVIOUS
  // day. This is the bug that let the same event read "October 22" on a card and
  // "October 23" in the stacked date column beside it.
  it('does not slip a day when formatted west of UTC', () => {
    const tz = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      expect(formatLongDate('2026-10-23')).toBe('October 23, 2026');
    } finally {
      process.env.TZ = tz;
    }
  });

  // Accepts a Date as readily as a string, because the blog frontmatter is
  // parsed into a Date by the content schema while events arrive as strings.
  it('accepts a Date as well as a string', () => {
    expect(formatLongDate(new Date('2026-07-24T00:00:00Z'))).toBe('July 24, 2026');
  });

  // A single-digit day carries no leading zero — "July 4", not "July 04".
  it('writes a single-digit day without padding', () => {
    expect(formatLongDate('2026-07-04')).toBe('July 4, 2026');
  });

  // The locale is pinned, so the output does not change with the machine that
  // builds the site. A runtime default would reorder this in most of the world.
  it('stays en-US regardless of the host locale', () => {
    expect(formatLongDate('2026-12-01')).toBe('December 1, 2026');
  });
});

describe('dateParts', () => {
  // The three pieces the stacked date column on an event row renders.
  it('splits a date into month, day and year', () => {
    expect(dateParts('2026-02-10')).toEqual({ month: 'February', day: '10', year: '2026' });
  });

  // Same UTC rule as above, and the reason both live in one module: when these
  // two disagreed about a timezone, one event printed two different days.
  it('agrees with the long form about which day it is', () => {
    const tz = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      const parts = dateParts('2026-10-23');
      expect(parts.day).toBe('23');
      expect(formatLongDate('2026-10-23')).toContain(parts.day);
    } finally {
      process.env.TZ = tz;
    }
  });

  // The day is the scan anchor down a list of events, so it is unpadded.
  it('leaves a single-digit day unpadded', () => {
    expect(dateParts('2026-07-04').day).toBe('4');
  });
});
