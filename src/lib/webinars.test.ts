import { describe, it, expect } from 'vitest';
import { webinarPosts, webinarYear, WEBINAR_SERIES, type WebinarEntryLike } from './webinars';

/** A blog entry in the shape `getCollection('blog')` hands over. */
const post = (
  id: string,
  date: string,
  series?: string,
  extra: Partial<WebinarEntryLike['data']> = {},
): WebinarEntryLike => ({
  id,
  data: { title: id, date, series, ...extra },
});

describe('webinarPosts', () => {
  // The webinars live in the blog collection alongside ordinary posts, so this
  // filter is the only thing deciding what /webinars shows. Without it the page
  // would list every blog post the site has.
  it('keeps only the posts tagged as webinars', () => {
    const posts = [
      post('a-webinar', '2020-04-09', WEBINAR_SERIES),
      post('an-ordinary-post', '2026-05-16'),
      post('another-webinar', '2020-05-03', WEBINAR_SERIES),
    ];

    expect(webinarPosts(posts).map((p) => p.id)).toEqual(['another-webinar', 'a-webinar']);
  });

  // The listing is chronological so the series reads as a run, and collection
  // order is not date order — the files arrive alphabetically by filename.
  it('sorts newest first', () => {
    const posts = [
      post('april', '2020-04-07', WEBINAR_SERIES),
      post('may-late', '2020-05-25', WEBINAR_SERIES),
      post('may-early', '2020-05-01', WEBINAR_SERIES),
    ];

    expect(webinarPosts(posts).map((p) => p.id)).toEqual(['may-late', 'may-early', 'april']);
  });

  // `series` is a CMS select with a single option, so anything else in there is
  // a hand-edit. Casing and stray whitespace are forgiven because they are
  // typing, not intent — a post vanishing over a capital W would be baffling.
  it('ignores case and surrounding whitespace on the tag', () => {
    const posts = [post('shouty', '2020-04-09', ' Webinars ')];

    expect(webinarPosts(posts).map((p) => p.id)).toEqual(['shouty']);
  });

  // A DIFFERENT series must not leak onto the page. The field is deliberately a
  // free string so more series can be added later, and each gets its own
  // listing — a substring or truthiness check here would break that.
  it('excludes a post in some other series', () => {
    const posts = [post('podcast-1', '2026-01-01', 'podcasts')];

    expect(webinarPosts(posts)).toEqual([]);
  });

  // The page's empty state is real and reachable: every recording is one CMS
  // toggle from being unpublished, and five already are.
  it('returns nothing when no post carries the tag', () => {
    expect(webinarPosts([post('a', '2026-01-01'), post('b', '2026-02-01')])).toEqual([]);
  });

  // The route passes the array it got from `getCollection`; sorting in place
  // would reorder the caller's own list for every later consumer.
  it('does not mutate its input', () => {
    const posts = [
      post('older', '2020-04-07', WEBINAR_SERIES),
      post('newer', '2020-05-25', WEBINAR_SERIES),
    ];
    webinarPosts(posts);

    expect(posts.map((p) => p.id)).toEqual(['older', 'newer']);
  });
});

describe('webinarYear', () => {
  // The year is all the card shows of the date, so it has to be right from the
  // date-only strings the frontmatter actually carries.
  it('reads the year from a date-only string', () => {
    expect(webinarYear('2020-05-25')).toBe(2020);
  });

  // Same rule as `groupByYear` in events.ts, and the same reason: a date-only
  // value is UTC midnight, so a local read in any US timezone reports the
  // previous year for anything dated 1 January — wrong on the reader's machine
  // and right on the author's, which is the worst way for a bug to behave.
  it('files a January 1st recording under its own year in a timezone behind UTC', () => {
    const original = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      expect(new Date('2021-01-01').getFullYear()).toBe(2020);

      expect(webinarYear('2021-01-01')).toBe(2021);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  // Astro's `z.coerce.date()` hands the route a Date, while seeds and tests
  // pass strings; both paths reach this function.
  it('accepts a Date as well as a string', () => {
    expect(webinarYear(new Date('2020-04-09T00:00:00Z'))).toBe(2020);
  });
});
