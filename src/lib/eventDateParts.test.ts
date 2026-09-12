import { describe, it, expect } from 'vitest';
import { eventDateParts } from './eventDateParts';

describe('eventDateParts', () => {
  // A date-only frontmatter string splits into full month name, day and year.
  it('splits a date-only string into month, day and year', () => {
    expect(eventDateParts('2026-10-23')).toEqual({ month: 'October', day: '23', year: '2026' });
  });

  // The day is not zero-padded, because the column sets it large on its own.
  it('renders a single-digit day without a leading zero', () => {
    expect(eventDateParts('2026-11-06').day).toBe('6');
  });

  // A Date object (what the content loader coerces frontmatter into) gives the
  // same answer as the string it came from.
  it('accepts a Date as well as a string', () => {
    expect(eventDateParts(new Date('2026-03-12T00:00:00Z'))).toEqual({
      month: 'March',
      day: '12',
      year: '2026',
    });
  });

  // UTC midnight must stay on its own calendar day, not slip to the previous
  // one as local-time formatting would in any timezone west of UTC.
  it('keeps a UTC-midnight date on its own calendar day', () => {
    expect(eventDateParts('2027-01-01')).toEqual({ month: 'January', day: '1', year: '2027' });
  });
});
