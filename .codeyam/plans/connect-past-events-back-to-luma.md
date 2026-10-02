---
title: "Connect past events back to Luma"
mode: ui
createdAt: "2026-10-02T19:31:24Z"
source: manual
---

## Summary

The request was to use the Luma embed to show past events too, not just upcoming ones. **Luma's calendar embed can't do that.** On 2026-10-02 I rendered `luma.com/embed/calendar/cal-KK3JJjJ39Jwt9kI/events` in a headless browser with `period=past`, `tab=past` and `view=past`, and also tried the `/past` and `/events/past` paths. Every query variant showed only the one upcoming event (Oct 9, London co-working), and both paths returned 404. The embed has no Upcoming/Past toggle either.

Two Luma features do work for past events:
1. The public calendar page deep-links to its **Past** tab. `https://luma.com/harvardintech?period=past` lists the Sept 28 mixer, the co-working days and so on. The `lu.ma/...` short URL in settings 301-redirects there with the query intact.
2. The public feed (`api.lu.ma/calendar/get-items?...&period=past`) returns the same 11 past events. The nightly deploy already imports them into `src/content/events` (`scripts/import-luma.mjs --past`), each with its Luma `link` and chapter/community tags.

So past events already come from Luma's data. The design changes connect our past-event displays back to Luma, so a visitor can get from any past event to its Luma page and to Luma's full past list:
- every past card links to its Luma event page
- the "view all past events" link opens Luma's Past tab instead of its Upcoming tab, which is what happens today
- /events says plainly that the embed covers upcoming events and past events are further down
- chapter and community "Recent events" sections link to the full history

The homepage is **unchanged**: the user chose to keep its empty state as a subscribe message.

## Key Decisions

- **Embed only for upcoming; Luma-imported data for past.** A per-event Luma embed (`/embed/event/evt-…`) was considered and rejected. It would mean one iframe per past card, each showing a registration widget for an event that has ended, and the frames don't report their height.
- **No client-side fetch of the past feed.** Luma sends no CORS header, so a browser can't read it (see `src/lib/lumaFeed.js` header). The nightly import is the only route, and it already exists.
- **Past cards link out to their Luma page.** Today `EventCard` drops the link on past cards (`!isPast && event.link`), so a past event is a dead end. A Luma event page that has ended still shows the details, host and attendee count, which is the "prove it's real" job these cards do. Archive rows from 2013–2019 have no Luma link and stay unlinked.
- **Chapter/community "all past events" links go to /events, not Luma.** Luma's public page can't be filtered by chapter. /events also includes the 2013–2019 archive.
- **No duplication with the embed** (decision-sheet row `new-luma`: "Fix so events aren't duped"). Past cards are strictly `date < now` and the embed is strictly upcoming, so the two sets never overlap. This plan doesn't add an upcoming list anywhere.
- **The "Luma does not keep them" comment is wrong and gets corrected.** `EventsPage.astro` says past events exist only on our site. Luma does keep them; only the *embed* hides them. The `events.astro` header comment is also stale (it mentions an "Upcoming / Past listing" and an unset `calendarId`).

## Implementation

### 1. A Luma "past events" URL helper

**File**: `src/lib/luma.ts`

Add `lumaPastEventsUrl(calendarUrl: string): string`. It returns the calendar URL with `period=past` set, using `URL`/`searchParams` so an existing query string and a trailing slash are handled. It's a pure function, unit-tested alongside the other Luma tests (`src/lib/lumaFeed.test.ts` already imports from `./luma`; a new `src/lib/luma.test.ts` (new) is fine too). Cover the `lu.ma` short URL, the `luma.com` URL, and a URL that already has a query.

### 2. "View all past events on Luma" opens Luma's Past tab

**File**: `src/components/PastEventsMore.astro`

`href` becomes `lumaPastEventsUrl(calendarUrl)`. Keep `externalLinkAttrs`. Update the header comment: the link now lands on the Past tab, where previously it opened on Upcoming and the reader had to find the toggle.

### 3. Past event cards link to their Luma page

**File**: `src/components/EventCard.astro`

When `isPast && event.link`, render a quiet link. Use the same `link-more` class with the past variant's receding colour, labelled e.g. "View on Luma →" when the link host is luma.com/lu.ma, otherwise "Event page →". Upcoming cards keep "Learn more →". Update the header comment ("past … no link" is no longer true). Every surface that uses past cards gets this: /events "Past Events", chapter and community "Recent events".

### 4. /events states what the embed covers and points down to the past

**Files**: `src/components/LumaCalendar.astro`, `src/components/EventsPage.astro`, `src/pages/events.astro`

- `LumaCalendar`: the default `title` becomes "Upcoming events" (currently "Full events calendar"). The intro changes to something like "Live from our Luma calendar. Past events are further down this page." Add an optional `pastAnchor` prop that renders a small in-page link ("Past events ↓") below the subscribe strip, only when set.
- `EventsPage`: wrap the recent "Past Events" block in an element with `id="past-events"` so the anchor and the chapter links can target it. Replace the false "Luma does not keep them" paragraph with the accurate reason: the embed shows only upcoming events, so these cards, built from the nightly Luma import, are where past events appear.
- `events.astro`: pass `pastAnchor="#past-events"` only when there are recent past events (reuse `splitEvents` + `splitArchive` as EventsPage does, or have the route compute it once). Rewrite the stale header comment.

### 5. Chapter and community "Recent events" link to the full history

**File**: `src/components/ChapterEvents.astro`

In the `past` variant with events, render a footer link under the grid: "All past events →" to `/events#past-events`. Pages that show this section: `src/components/ChapterPage.astro` and `src/components/CommunityPage.astro`; neither needs changes. Keep the existing rule that an empty `past` variant renders nothing.

## Reused existing code

- `LUMA_CALENDAR_URL`, `LUMA_EMBED_URL` from `src/lib/luma.ts`
- `siteLinks` from `src/lib/site.ts`: `.luma` is the settings-editable calendar page
- `externalLinkAttrs` from `src/lib/externalLink.ts`
- `splitEvents`, `splitArchive`, `recentPastEvents` from `src/lib/events.ts` (glossary entry: `recentPastEvents`)
- `PastEventsMore` from `src/components/PastEventsMore.astro` (glossary entry: `PastEventsMore`)
- `LumaCalendar` from `src/components/LumaCalendar.astro` (glossary entry: `LumaCalendar`)
- `lumaFeedUrl` from `src/lib/lumaFeed.js` (glossary entry: `lumaFeedUrl`): the same `period=past` convention, for the feed rather than the page
- Nightly import `scripts/import-luma.mjs --past` in `.github/workflows/deploy.yml`: already the source of past-event data; no changes

## Scenarios to Demonstrate

Update existing scenarios where they exist, and add new ones only for states not yet covered:
- `pasteventsmore-the-link-out-to-luma`: the link's href ends in `?period=past`
- `eventcardgrid-past-events`: past cards show "View on Luma →"
- Past card with **no** link (a hand-written or archive-style entry): no link appears, layout unchanged
- `events-route-upcoming-and-past`: calendar headed "Upcoming events", a "Past events ↓" jump link, and past cards with Luma links
- `events-route-the-calendar-with-no-past-events-yet`: no jump link appears when there are no past events
- `chapterevents-recent-past-events` and `chapter-route-upcoming-above-recent`: the "All past events →" footer link
- `communitypage-founders-composed`: Founders' recent co-working days link to Luma, plus the footer link
- `upcoming-events-empty` (homepage): **unchanged**; confirms the homepage was deliberately left alone