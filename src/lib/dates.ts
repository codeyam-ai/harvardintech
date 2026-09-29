// One date formatter for the whole site.
//
// There were three. `eventDateParts` formatted in UTC, `formatEventDate` did
// not, and `BlogPostArticle` called `toLocaleDateString()` with no locale and
// no options at all — which is why a blog post's date rendered as "2/10/2025"
// next to an event's "February 10, 2025" on the same site.
//
// TWO RULES, and both are load-bearing:
//
//   UTC. A date-only frontmatter value (`date: 2026-10-23`) parses to UTC
//   midnight. Formatted in any timezone west of UTC that instant renders as the
//   PREVIOUS day, so an event dated the 23rd shows as the 22nd for a build run
//   in US time. `formatEventDate` was missing this and silently disagreed with
//   `eventDateParts` about the same event.
//
//   en-US, pinned. With no locale argument the runtime's own locale decides,
//   so the output changed with the machine that built the site rather than with
//   anything an editor set.

export interface DateParts {
  month: string;
  day: string;
  year: string;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "February 10, 2025" — the site's one long-form date. */
export function formatLongDate(value: string | Date): string {
  return toDate(value).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * The same date split into its three pieces, for the stacked date column on
 * event rows — month over a large day over the year, so the day number carries
 * the scan weight down a list.
 */
export function dateParts(value: string | Date): DateParts {
  const d = toDate(value);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
  return {
    month: fmt({ month: 'long' }),
    day: fmt({ day: 'numeric' }),
    year: fmt({ year: 'numeric' }),
  };
}
