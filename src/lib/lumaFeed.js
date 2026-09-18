/**
 * Pure rules for turning Luma's public calendar feed into `events` entries.
 *
 * Nothing here touches the network or the filesystem — `scripts/import-luma.mjs`
 * does both and calls into this module for every judgement. That split is what
 * makes the judgements testable against a captured response instead of against
 * whatever Luma happens to be serving when the suite runs.
 *
 * It is plain JavaScript rather than TypeScript for the same reason
 * `strikinglyArchive.js` and `donorImport.js` are: the importer is a `.mjs`
 * script run by bare `node`, and this project has no `tsx`, so a `.ts` module
 * would be unimportable from the one consumer that needs it. Vitest reads it
 * happily either way.
 *
 * THE FEED. `https://api.lu.ma/calendar/get-items?calendar_api_id=<id>` answers
 * 200 with JSON and no API key, and `&period=past` returns the history. Both
 * were verified against the live calendar on 2026-09-18; neither paginates for
 * a calendar this size (`has_more: false`, no cursor). Luma sends no
 * `access-control-allow-origin` header, so only a server or a build step can
 * read it — never a browser.
 */

/**
 * One event in the shape the `events` collection stores, plus `lumaSlug` — the
 * identity the importer dedupes on, which is not itself a frontmatter field.
 *
 * @typedef {Object} LumaEntry
 * @property {string|null} lumaSlug  Luma's own slug for the event, e.g. `dwn2dmuj`.
 * @property {string} slug           `YYYY-MM-DD-title`, the filename stem.
 * @property {string} title
 * @property {string} date           Local date-time with offset, e.g. `2026-09-28T18:00:00-04:00`.
 * @property {string} [location]
 * @property {string} [link]
 * @property {string} [chapter]
 * @property {string} [coverImage]   Carried, but deliberately not written — see `eventMarkdown`.
 */

/**
 * The Harvard Alumni in Tech calendar. Also embedded in `LUMA_EMBED_URL`
 * (`src/lib/luma.ts`); `lumaFeed.test.ts` asserts the two agree, because a
 * calendar id that drifts between the embed and the importer would show one
 * calendar and import another with nothing failing to say so.
 */
export const LUMA_CALENDAR_ID = 'cal-KK3JJjJ39Jwt9kI';

/** Where a registration link points. The repo already writes `luma.com` links
 *  by hand (`https://luma.com/gbdbyx3j`), and matching that exactly is what
 *  lets an imported entry and a hand-written one dedupe against each other. */
const LUMA_EVENT_BASE = 'https://luma.com/';

/**
 * City to chapter slug, for the chapters in `src/content/chapters/`.
 *
 * Keyed on Luma's `geo_address_info.city`, lowercased. Deliberately a lookup
 * and not a fuzzy match: an event in a city with no chapter gets NO chapter
 * rather than a guessed one, which is the behaviour the hand-written Denver
 * entry already has. A wrong chapter puts an event on a page it does not
 * belong to, which is worse than no chapter at all.
 */
const CHAPTER_BY_CITY = {
  'new york': 'nyc',
  brooklyn: 'nyc',
  london: 'london',
  cambridge: 'boston-cambridge',
  boston: 'boston-cambridge',
  somerville: 'boston-cambridge',
  'san francisco': 'sf-bay-area',
  oakland: 'sf-bay-area',
  'palo alto': 'sf-bay-area',
  'menlo park': 'sf-bay-area',
  seattle: 'seattle',
  washington: 'dc-dmv',
  arlington: 'dc-dmv',
};

/** Luma `visibility` values that mean "do not put this on the public site". */
const PUBLIC_VISIBILITY = 'public';

/**
 * The feed URL for one period. `past` is a separate request, not a page.
 *
 * @param {{ period?: 'upcoming' | 'past', calendarId?: string }} [options]
 * @returns {string}
 */
export function lumaFeedUrl({ period = 'upcoming', calendarId = LUMA_CALENDAR_ID } = {}) {
  const url = new URL('https://api.lu.ma/calendar/get-items');
  url.searchParams.set('calendar_api_id', calendarId);
  if (period === 'past') url.searchParams.set('period', 'past');
  return url.toString();
}

/**
 * The wall-clock parts of an instant in a named timezone.
 *
 * This exists because `start_at` is UTC and the calendar is not. The Fall
 * Welcome Mixer starts at `2026-09-28T22:00:00Z`, which is the evening of the
 * 28th in New York; the Leaders in Engineering panel starts at
 * `2026-04-30T01:00:00Z`, which is the evening of the 29th in San Francisco.
 * Taking the date off the UTC string would file the second one a day late —
 * and the hand-written entry for it in the repo does exactly that.
 */
function zonedParts(instant, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = {};
  for (const part of formatter.formatToParts(instant)) parts[part.type] = part.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // `hour12: false` yields "24" for midnight in some ICU versions.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** The UTC offset of `timeZone` at `instant`, in minutes. */
function offsetMinutes(instant, timeZone) {
  const p = zonedParts(instant, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asIfUtc - instant.getTime()) / 60000);
}

function pad(n, width = 2) {
  return String(Math.abs(n)).padStart(width, '0');
}

/**
 * `start_at` rendered as a local date-time with its offset —
 * `2026-09-28T18:00:00-04:00` — which is the form the hand-written entries
 * already use and which `z.coerce.date()` reads without ambiguity.
 *
 * Returns `{ date, day }`: the full stamp for the frontmatter, and the
 * `YYYY-MM-DD` the filename is built from.
 */
/**
 * @param {string} startAt
 * @param {string} [timeZone]
 * @returns {{ day: string, date: string } | null}
 */
export function lumaEventDate(startAt, timeZone) {
  const instant = new Date(startAt);
  if (Number.isNaN(instant.getTime())) return null;
  const zone = timeZone || 'UTC';
  const p = zonedParts(instant, zone);
  const offset = offsetMinutes(instant, zone);
  const sign = offset < 0 ? '-' : '+';
  const day = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  const clock = `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
  return { day, date: `${day}T${clock}${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}` };
}

/**
 * A URL slug from a title — the same rules `strikinglyArchive.js` applies, so
 * an imported filename and a hand-written one are built the same way.
 *
 * Duplicated rather than imported because that module is about the Strikingly
 * snapshot and nothing else here has anything to do with it; the shared thing
 * is the convention, not the code path. `lumaFeed.test.ts` pins the output
 * against the filenames already in the collection.
 */
/**
 * @param {unknown} title
 * @returns {string}
 */
export function slugifyTitle(title) {
  return String(title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * The Luma event slug inside a registration link, or null.
 *
 * This is the identity the importer dedupes on. Matching on the FILENAME alone
 * is not enough: the repo's Leaders in Engineering entry is filed a day later
 * than Luma's own local date, so a filename comparison would import it a second
 * time under the correct date and the site would show the panel twice.
 */
/**
 * @param {unknown} link
 * @returns {string|null}
 */
export function lumaSlugFromLink(link) {
  const match = /^https?:\/\/(?:luma\.com|lu\.ma)\/([A-Za-z0-9_-]+)\/?$/.exec(String(link ?? '').trim());
  return match ? match[1] : null;
}

/**
 * One feed entry as an `events` entry, or null when it does not belong on the
 * site at all.
 *
 * Dropped: anything whose `visibility` is not `public` (a private or unlisted
 * event is on the calendar for people who already have the link), and anything
 * the feed marks with a non-approved `status`.
 *
 * `location` is `city_state` and only for a physical event — an online one
 * yields no location rather than an invented one, because the field is rendered
 * verbatim and "Online" is a claim the feed does not actually make.
 *
 * `coverImage` is returned because Luma provides it, but the importer does NOT
 * write it: the `events` schema in `src/content/config.ts` has no such field
 * (it belongs to blog and webinars) and nothing in the events UI renders one.
 * It is here so the day that changes, the mapping already has it.
 */
/**
 * @param {any} item  One `entries[]` element of a `get-items` response.
 * @returns {LumaEntry|null}
 */
export function lumaEventToEntry(item) {
  const entry = item?.event ?? item;
  if (!entry || typeof entry !== 'object') return null;
  if (entry.visibility !== PUBLIC_VISIBILITY) return null;
  if (item?.status && item.status !== 'approved') return null;
  if (!entry.name || !entry.start_at) return null;

  const when = lumaEventDate(entry.start_at, entry.timezone);
  if (!when) return null;

  const geo = entry.geo_address_info ?? {};
  const physical = entry.location_type === 'offline';
  const city = String(geo.city ?? '').trim().toLowerCase();

  return {
    lumaSlug: entry.url || null,
    slug: `${when.day}-${slugifyTitle(entry.name)}`,
    title: String(entry.name),
    date: when.date,
    location: physical && geo.city_state ? String(geo.city_state) : undefined,
    link: entry.url ? `${LUMA_EVENT_BASE}${entry.url}` : undefined,
    chapter: physical ? CHAPTER_BY_CITY[city] : undefined,
    coverImage: entry.cover_url || undefined,
  };
}

/** Every mappable entry in a `get-items` response, newest first as Luma sends them. */
/**
 * @param {any} payload  A whole `get-items` response.
 * @returns {LumaEntry[]}
 */
export function lumaEntriesFromFeed(payload) {
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  return /** @type {LumaEntry[]} */ (entries.map(lumaEventToEntry).filter(Boolean));
}

/** YAML-quote a scalar for frontmatter — doubles as the escape for embedded quotes. */
/**
 * @param {unknown} value
 * @returns {string}
 */
export function yamlQuote(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The complete markdown file for one imported event.
 *
 * Only fields the `events` collection actually declares are written. Optional
 * ones are omitted rather than written empty, so an entry never asserts a
 * location or a chapter the feed did not give.
 */
/**
 * @param {LumaEntry} entry
 * @param {{ description?: string, communities?: string[] }} [options]
 * @returns {string}
 */
export function eventMarkdown(entry, { description = '', communities = [] } = {}) {
  const lines = ['---', `title: ${yamlQuote(entry.title)}`, `date: ${entry.date}`];
  if (entry.location) lines.push(`location: ${yamlQuote(entry.location)}`);
  if (description) lines.push(`description: ${yamlQuote(description)}`);
  if (entry.link) lines.push(`link: ${yamlQuote(entry.link)}`);
  if (entry.chapter) lines.push(`chapter: ${entry.chapter}`);
  if (communities.length > 0) {
    lines.push('communities:');
    for (const name of communities) lines.push(`  - ${name}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}
