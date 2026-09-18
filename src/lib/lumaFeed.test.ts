import { describe, it, expect } from 'vitest';
import {
  LUMA_CALENDAR_ID,
  lumaFeedUrl,
  lumaEventDate,
  lumaEventToEntry,
  lumaEntriesFromFeed,
  lumaSlugFromLink,
  slugifyTitle,
  eventMarkdown,
} from './lumaFeed.js';
import { LUMA_EMBED_URL } from './luma';

// The fixtures below are entries captured VERBATIM from
// `https://api.lu.ma/calendar/get-items?calendar_api_id=cal-KK3JJjJ39Jwt9kI`
// on 2026-09-18, trimmed only of fields nothing here reads. Inventing a sample
// would have tested the mapping against a shape of our own imagining — and the
// two facts that matter most below (that `url` is a bare slug, not a URL, and
// that `start_at` is UTC while the calendar is not) are exactly the ones a
// made-up fixture would have got wrong in the same direction as the code.

/** A physical New York event, the evening of 28 September local time. */
const MIXER = {
  api_id: 'evt-n5cd2yB3tyefKkh',
  event: {
    name: 'Harvard in Tech Fall Welcome Mixer',
    start_at: '2026-09-28T22:00:00.000Z',
    end_at: '2026-09-29T01:00:00.000Z',
    timezone: 'America/New_York',
    url: 'dwn2dmuj',
    cover_url: 'https://images.lumacdn.com/uploads/uz/f83ca1d3.png',
    location_type: 'offline',
    visibility: 'public',
    geo_address_info: { city: 'New York', city_state: 'New York, NY', region_short: 'NY' },
  },
  status: 'approved',
};

/**
 * The San Francisco panel — the reason timezone handling is not optional.
 * `start_at` is 2026-04-30T01:00:00Z, which is the EVENING OF THE 29th in
 * California. Reading the date off the UTC string files it a day late, and the
 * hand-written entry in the collection does exactly that.
 */
const SF_PANEL = {
  event: {
    name: 'Harvard Alumni in Tech Leaders in Engineering Panel',
    start_at: '2026-04-30T01:00:00.000Z',
    timezone: 'America/Los_Angeles',
    url: 'fk6yuo82',
    location_type: 'offline',
    visibility: 'public',
    geo_address_info: { city: 'San Francisco', city_state: 'San Francisco, California' },
  },
  status: 'approved',
};

describe('lumaEventToEntry', () => {
  // The straight-through case, and the baseline the rest are deviations from:
  // every field the events collection stores, taken off one real feed entry.
  it('maps a physical event to title, date, location, link and cover image', () => {
    const entry = lumaEventToEntry(MIXER)!;

    expect(entry.title).toBe('Harvard in Tech Fall Welcome Mixer');
    expect(entry.date).toBe('2026-09-28T18:00:00-04:00');
    expect(entry.location).toBe('New York, NY');
    expect(entry.coverImage).toBe('https://images.lumacdn.com/uploads/uz/f83ca1d3.png');
  });

  // `url` is a bare slug (`dwn2dmuj`), NOT a URL. Writing it through unchanged
  // would put `link: "dwn2dmuj"` in the frontmatter — a link that renders as a
  // relative path and 404s, while every check short of clicking it passes.
  it('builds a full registration URL from the bare slug the feed sends', () => {
    expect(MIXER.event.url).not.toContain('://');
    expect(lumaEventToEntry(MIXER)!.link).toBe('https://luma.com/dwn2dmuj');
  });

  // The failure this whole timezone path exists to prevent: a 6 PM Pacific
  // event is already "tomorrow" in UTC, so the naive reading files it a day
  // late and it sorts, and expires, against the wrong date.
  it('dates an event by its own timezone, not by UTC', () => {
    const entry = lumaEventToEntry(SF_PANEL)!;

    expect(entry.date).toBe('2026-04-29T18:00:00-07:00');
    expect(entry.slug.startsWith('2026-04-29')).toBe(true);
  });

  // An imported entry and a hand-written one have to be indistinguishable
  // downstream, and the filename is where that is decided.
  it('builds a slug matching the collection filename convention', () => {
    expect(lumaEventToEntry(MIXER)!.slug).toBe('2026-09-28-harvard-in-tech-fall-welcome-mixer');
  });

  // The field is rendered verbatim, so "Online" would be a claim the feed never
  // made. No location is the honest answer.
  it('yields no location for an online event instead of inventing one', () => {
    const online = {
      ...MIXER,
      event: { ...MIXER.event, location_type: 'online', geo_address_info: {} },
    };

    expect(lumaEventToEntry(online)!.location).toBeUndefined();
  });

  // A private or unlisted event is on the calendar for people who already hold
  // the link; publishing it to the site would hand it to everyone else.
  it('drops a non-public event', () => {
    const unlisted = { ...MIXER, event: { ...MIXER.event, visibility: 'private' } };

    expect(lumaEventToEntry(unlisted)).toBeNull();
  });

  // Luma marks a submitted-but-unreviewed event as not approved. Importing one
  // would publish an event the organisers have not agreed to run.
  it('drops an entry the calendar has not approved', () => {
    expect(lumaEventToEntry({ ...MIXER, status: 'pending' })).toBeNull();
  });

  // Every optional field is genuinely optional in the feed, and a save-the-date
  // with nothing but a name and a time is a shape Luma really sends. Reading a
  // field off an absent object would throw and take the whole import down with
  // it, losing every other event in the same run.
  it('survives a missing geo_address_info, cover_url or end_at', () => {
    const sparse = {
      ...MIXER,
      event: {
        name: MIXER.event.name,
        start_at: MIXER.event.start_at,
        timezone: MIXER.event.timezone,
        url: MIXER.event.url,
        location_type: 'offline',
        visibility: 'public',
      },
    };
    const entry = lumaEventToEntry(sparse)!;

    expect(entry.location).toBeUndefined();
    expect(entry.coverImage).toBeUndefined();
    expect(entry.date).toBe('2026-09-28T18:00:00-04:00');
  });

  // A wrong chapter puts an event on a page it does not belong to, which is
  // worse than no chapter — so an unmapped city yields nothing, the behaviour
  // the hand-written Denver entry already has.
  it('tags a city with a chapter, and leaves a city without one alone', () => {
    expect(lumaEventToEntry(MIXER)!.chapter).toBe('nyc');
    expect(lumaEventToEntry(SF_PANEL)!.chapter).toBe('sf-bay-area');

    const denver = {
      ...MIXER,
      event: {
        ...MIXER.event,
        geo_address_info: { city: 'Denver', city_state: 'Denver, Colorado' },
      },
    };
    expect(lumaEventToEntry(denver)!.chapter).toBeUndefined();
  });
});

describe('lumaEventDate', () => {
  // An unparseable timestamp must not become an `Invalid Date` that formats as
  // "NaN-NaN-NaN" and writes a file nobody can find. The entry is skipped.
  it('returns null for an unparseable timestamp rather than an Invalid Date', () => {
    expect(lumaEventDate('not a date', 'America/New_York')).toBeNull();
  });

  // The offset sign is computed, not assumed, and every event in this calendar
  // until now has been west of UTC — so London is the case a sign error hides
  // in. This is a real co-working day captured from the same feed.
  it('renders a positive offset for a zone east of UTC', () => {
    expect(lumaEventDate('2026-09-11T09:00:00.000Z', 'Europe/London')!.date).toBe(
      '2026-09-11T10:00:00+01:00',
    );
  });
});

describe('lumaSlugFromLink', () => {
  // This is the identity the importer dedupes on, so a false negative imports a
  // duplicate and a false positive silently skips a real event. Both Luma hosts
  // appear in the wild, and a trailing slash is common in a pasted link.
  it('reads the slug out of either Luma host', () => {
    expect(lumaSlugFromLink('https://luma.com/gbdbyx3j')).toBe('gbdbyx3j');
    expect(lumaSlugFromLink('https://lu.ma/dwn2dmuj')).toBe('dwn2dmuj');
    expect(lumaSlugFromLink('https://luma.com/gbdbyx3j/')).toBe('gbdbyx3j');
  });

  // The other half of that: a redirect link, the calendar EMBED url (same host,
  // not an event), and a missing link must all read as "no Luma identity" so
  // the entry falls through to the filename comparison instead of matching the
  // wrong event.
  it('returns null for a link that is not a Luma event', () => {
    expect(lumaSlugFromLink('https://hi.switchy.io/_t_t')).toBeNull();
    expect(lumaSlugFromLink('https://luma.com/embed/calendar/cal-KK3/events')).toBeNull();
    expect(lumaSlugFromLink('')).toBeNull();
    expect(lumaSlugFromLink(undefined)).toBeNull();
  });
});

describe('slugifyTitle', () => {
  // Pinned against filenames actually in the collection: if these two drift,
  // an imported event lands beside its hand-written twin instead of matching
  // it. Parentheses and a comma are the punctuation the real titles carry.
  it('matches the filenames already in the collection', () => {
    expect(slugifyTitle('Alumni Founders Co-working Day (July)')).toBe(
      'alumni-founders-co-working-day-july',
    );
    expect(slugifyTitle('Harvard Alumni in Tech Alumni Day Meetup in Cambridge, MA')).toBe(
      'harvard-alumni-in-tech-alumni-day-meetup-in-cambridge-ma',
    );
  });

  // Dropping the ampersand instead of spelling it would collapse "Ideas,
  // Connection & Conversation" to a double hyphen, which is not the convention
  // the archive importer established.
  it('spells an ampersand out, as the hand-written entries do', () => {
    expect(slugifyTitle('Ideas, Connection & Conversation')).toBe(
      'ideas-connection-and-conversation',
    );
  });
});

describe('eventMarkdown', () => {
  // The collection schema is the contract. `coverImage` in particular is a
  // field the mapping CARRIES but the file must not contain — it belongs to
  // blog and webinars, nothing in the events UI renders it, and the schema
  // would silently strip it while it sat in the file looking meaningful.
  it('writes only the fields the events collection declares', () => {
    const out = eventMarkdown(lumaEventToEntry(MIXER)!);

    expect(out).toContain('title: "Harvard in Tech Fall Welcome Mixer"');
    expect(out).toContain('date: 2026-09-28T18:00:00-04:00');
    expect(out).toContain('location: "New York, NY"');
    expect(out).toContain('link: "https://luma.com/dwn2dmuj"');
    expect(out).toContain('chapter: nyc');
    expect(out).not.toContain('coverImage');
  });

  // An empty `location: ""` asserts a blank venue rather than an unknown one,
  // and renders as an empty line on the card.
  it('omits an absent optional field instead of writing it empty', () => {
    const online = {
      ...MIXER,
      event: { ...MIXER.event, location_type: 'online', geo_address_info: {} },
    };
    const out = eventMarkdown(lumaEventToEntry(online)!);

    expect(out).not.toContain('location:');
    expect(out).not.toContain('chapter:');
  });

  // Community tags are what put a co-working day on the Founders page, and they
  // are a YAML list rather than a scalar — a format the schema rejects if the
  // indentation is wrong.
  it('writes community tags as a list when given them', () => {
    const out = eventMarkdown(lumaEventToEntry(MIXER)!, { communities: ['founders'] });

    expect(out).toContain('communities:\n  - founders');
  });
});

describe('the feed request', () => {
  // Past events are a second REQUEST, not a later page of the first — the
  // default response simply omits them, with no cursor to say so. Treating it
  // as paginated is how the archive would silently come back empty.
  it('asks for the past as a separate request, not a page of the same one', () => {
    expect(lumaFeedUrl()).toContain(`calendar_api_id=${LUMA_CALENDAR_ID}`);
    expect(lumaFeedUrl()).not.toContain('period=');
    expect(lumaFeedUrl({ period: 'past' })).toContain('period=past');
  });

  // A calendar id that drifted between the embed and the importer would show
  // one calendar on the Events page and import another, with nothing failing to
  // say so. The id lives in two files; this is what keeps them honest.
  it('imports from the same calendar the Events page embeds', () => {
    expect(LUMA_EMBED_URL).toContain(LUMA_CALENDAR_ID);
  });
});

describe('lumaEntriesFromFeed', () => {
  // One unpublishable entry in the middle of a response must cost that entry
  // and nothing else — not the run, and not the events after it.
  it('maps every usable entry and silently drops the rest', () => {
    const payload = {
      entries: [MIXER, { ...MIXER, event: { ...MIXER.event, visibility: 'private' } }, SF_PANEL],
    };

    expect(lumaEntriesFromFeed(payload).map((e) => e.lumaSlug)).toEqual(['dwn2dmuj', 'fk6yuo82']);
  });

  // A calendar with nothing scheduled answers 200 with no `entries` key at all,
  // which must read as "no events" rather than throwing on a build.
  it('treats a response with no entries as empty rather than throwing', () => {
    expect(lumaEntriesFromFeed({})).toEqual([]);
    expect(lumaEntriesFromFeed(null)).toEqual([]);
  });
});
