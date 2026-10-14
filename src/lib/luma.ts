// Harvard Alumni in Tech's Luma calendar — the single source of truth for the
// org's event calendar URL. Used by the Events page (the "full calendar" block)
// and by the empty-state CTA on the homepage's Upcoming Events section (to point
// visitors at the Luma calendar to subscribe).
//
// We have the public calendar page (https://lu.ma/harvardintech). To embed the
// calendar inline as an <iframe> instead of linking out, grab the embed snippet
// from Luma → calendar settings → Embed (it yields a
// `https://lu.ma/embed/calendar/cal-XXXX/events` URL) and set LUMA_EMBED_URL.

/** Public calendar page visitors land on to browse and subscribe. */
export const LUMA_CALENDAR_URL = 'https://lu.ma/harvardintech';

/** Optional inline-embed src. When set, the Events page renders the calendar as
 *  an <iframe> instead of the link-out card. Taken from Luma → calendar
 *  settings → Embed for calendar `cal-KK3JJjJ39Jwt9kI`.
 *
 *  `lt=light` pins Luma's light theme. Without it the embed defaults to
 *  `system`, which renders a dark calendar block on our light Events page.
 *
 *  The same calendar id is what `scripts/import-luma.mjs` reads events from,
 *  as `LUMA_CALENDAR_ID` in `src/lib/lumaFeed.js`. `lumaFeed.test.ts` asserts
 *  the two agree: an id that drifted between them would embed one calendar and
 *  import another, with nothing failing to say so. */
export const LUMA_EMBED_URL =
  'https://luma.com/embed/calendar/cal-KK3JJjJ39Jwt9kI/events?lt=light';

const LUMA_IMAGE_HOST = 'https://images.lumacdn.com/';

/** An event cover at `width` CSS pixels, for a square card image.
 *
 *  Luma's covers are full-size uploads (often 1000px+ PNGs), and its CDN
 *  resizes on request through the `cdn-cgi/image/<options>/` path prefix, so a
 *  card asks for a small square instead of the original. Any other URL — a
 *  cover an editor uploaded to the site — comes back unchanged. */
export function eventCoverSrc(url: string, width: number): string {
  if (!url.startsWith(LUMA_IMAGE_HOST) || url.includes('/cdn-cgi/')) return url;
  const options = `format=auto,fit=cover,quality=80,width=${width},height=${width}`;
  return `${LUMA_IMAGE_HOST}cdn-cgi/image/${options}/${url.slice(LUMA_IMAGE_HOST.length)}`;
}
