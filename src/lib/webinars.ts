// Pure, framework-free helpers for the webinars listing. Kept out of any
// `.astro` route so the rule can be unit-tested under vitest, matching the
// `events.ts` / `drafts.ts` pattern. No DOM, no Astro imports.
//
// The 2020 recordings are ordinary blog posts carrying `series: "webinars"`
// rather than a collection of their own — eleven frozen items did not justify a
// second schema, a second per-entry route and a second CMS card. The cost of
// that choice is that "which posts are webinars" becomes a rule rather than a
// directory, and this is that rule, in one place.

/**
 * The minimum shape this needs: a blog entry whose `data` carries the series
 * tag and a date. Structural, so it accepts entries straight from
 * `getCollection('blog')` without naming the collection's full schema.
 */
export interface WebinarEntryLike {
  id: string;
  data: {
    title: string;
    date: string | Date;
    summary?: string;
    coverImage?: string;
    embedUrl?: string;
    series?: string;
  };
}

/** The series value that puts a post on the webinars page. */
export const WEBINAR_SERIES = 'webinars';

/**
 * The webinar posts among `posts`, newest first.
 *
 * The match is an exact, case-insensitive comparison on the trimmed `series`
 * value. Exact rather than fuzzy because `series` is a CMS select with one
 * option — anything else in there is a hand-edit, and quietly accepting
 * "Webinar" or "webinars " would make the page's contents depend on typing.
 *
 * Callers pass entries already draft-filtered by `publishedEntries`, the same
 * contract every other derivation in this codebase has. That matters more here
 * than elsewhere: five of the eleven recordings are drafts precisely because
 * their video host no longer has the video, so a listing that ignored the draft
 * flag would publish five posts whose players do not play.
 */
export function webinarPosts<T extends WebinarEntryLike>(posts: readonly T[]): T[] {
  return posts
    .filter((post) => post.data.series?.trim().toLowerCase() === WEBINAR_SERIES)
    .slice()
    .sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf());
}

/**
 * The year a webinar is filed under, read in UTC.
 *
 * `getUTCFullYear`, not `getFullYear`, for the same reason `groupByYear` in
 * `events.ts` uses it: a date-only frontmatter value parses as UTC midnight, so
 * a local-time read in any US timezone reports the previous year for anything
 * dated 1 January.
 */
export function webinarYear(date: string | Date): number {
  return (date instanceof Date ? date : new Date(date)).getUTCFullYear();
}
