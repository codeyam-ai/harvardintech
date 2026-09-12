// Splits an event date into the three strings the landing-page event rows set
// as a stacked column — month over a large day over the year — so the day
// number can carry the scan weight down a list of events.
//
// Formatted in UTC on purpose: a date-only frontmatter value (`date:
// 2026-10-23`) parses to UTC midnight, and formatting that instant in any
// timezone west of UTC renders the PREVIOUS day. Extracted from
// `UpcomingEvents.astro` so the rule is unit-testable.

export interface EventDateParts {
  month: string;
  day: string;
  year: string;
}

export function eventDateParts(value: string | Date): EventDateParts {
  const d = value instanceof Date ? value : new Date(value);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
  return {
    month: fmt({ month: 'long' }),
    day: fmt({ day: 'numeric' }),
    year: fmt({ year: 'numeric' }),
  };
}
