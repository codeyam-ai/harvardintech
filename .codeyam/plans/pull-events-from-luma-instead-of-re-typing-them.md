---
title: "Pull Events From Luma Instead Of Re-Typing Them"
mode: ui
createdAt: "2026-09-16T20:51:24Z"
order: 1
source: manual
---

## Summary

Stop re-typing events. Harvard Alumni in Tech's Luma calendar is already the place
events are really created — this plan makes the site read it instead of asking an
editor to enter each one a second time.

Verified against the live calendar on 2026-09-16:

- `https://api.lu.ma/calendar/get-items?calendar_api_id=cal-KK3JJjJ39Jwt9kI`
  returns HTTP 200 with structured JSON, **no API key**.
- `https://api.lu.ma/ics/get?entity=calendar&id=cal-KK3JJjJ39Jwt9kI` returns a
  valid `VCALENDAR` (`X-WR-CALNAME: Harvard Alumni in Tech`), also unauthenticated.
- The JSON carries every field the `events` collection already stores:
  `name`, `start_at`, `end_at`, `timezone`, `url`, `cover_url`,
  `social_image_url`, `geo_address_info` (city / state), `location_type`,
  `visibility`, `event_type`.
- The calendar id is already in the repo: `LUMA_EMBED_URL` in `src/lib/luma.ts`
  names `cal-KK3JJjJ39Jwt9kI`.

**Luma sends no `access-control-allow-origin` header.** A browser therefore
cannot read that endpoint directly, so a client-side fetch is not an option
without running a proxy — the only shape of this that would ever cost money. The
fetch happens at BUILD time.

**This is free and stays free.** `codeyam-ai/harvardintech` is a public
repository, so GitHub Actions minutes are unlimited. A nightly rebuild costs
nothing.

## Owner decisions (2026-09-16)

- **Pull from Luma at build time, with a nightly rebuild.** Chosen over hand
  entry and over a browser fetch (which Luma does not permit).
- **Do the one-time import as part of this plan**, so nothing is re-typed before
  launch.
- **Reconcile the 28 September event.** Luma calls it *"Harvard in Tech Fall
  Welcome Mixer"* (2026-09-28, New York, NY).
  `launch--history-events-archive-and-webinars.md` step 4 adds a 28 September
  event by hand under the name *"An Elevated Evening of Ideas, Connection &
  Conversation"*. These are either the same event under two names or two separate
  events, and that must be settled before both are imported — otherwise the site
  shows the evening twice. **Luma's name wins unless the owner says otherwise**,
  because Luma is where people actually registered.

## Open questions

1. **Owner.** Are the Fall Welcome Mixer and the "Elevated Evening" the same
   event? If they are, the archive plan's step 4 is dropped in favour of the
   import.
2. **Owner.** Should a Luma event that has been unpublished or deleted disappear
   from the site on the next build, or stay as a past event once it has run? The
   default here is: keep anything already past, drop anything still upcoming that
   Luma no longer lists.
3. **Implementer.** `get-items` returned only the upcoming event on 2026-09-16.
   Confirm how it paginates and whether past events are reachable through the
   same endpoint (a `period` / `pagination_cursor` parameter) before relying on
   it for the archive as well as for upcoming events.

## Implementation

1. **`src/lib/lumaFeed.ts` (new).** Pure, framework-free mapping from a Luma
   entry to the shape `events` entries already use — the `drafts.ts` / `events.ts`
   pattern, unit-testable with no network and no Astro imports:
   - `lumaEventToEntry(item)` → `{ slug, title, date, location, link, coverImage }`.
     `slug` derives from the date plus a slugified name, matching today's
     `YYYY-MM-DD-title.md` filenames so an imported event and a hand-written one
     are indistinguishable downstream.
   - `location` comes from `geo_address_info.city_state`; a `location_type` of
     anything non-physical yields no location rather than an invented one.
   - A cancelled or non-public `visibility` is dropped.
2. **`scripts/import-luma.mjs` (new).** Fetches the calendar, maps each entry and
   writes `src/content/events/*.md` for any event not already present. It
   **overwrites nothing** — an entry an editor has since edited by hand wins — and
   prints what it wrote. Runs on demand, never as part of a page build.
3. **Nightly rebuild.** A `schedule:` trigger on the existing deploy workflow, plus
   `workflow_dispatch` so it can be run by hand. Note in `DEPLOY_SETUP.md` that
   GitHub disables scheduled workflows in a repository with no activity for 60
   days, so a quiet post-launch period stops the job until someone pushes or
   re-runs it.
4. **One-time import.** Run the script, review what it produced, and reconcile the
   28 September event per the decision above.
5. **Fail soft.** If Luma is unreachable the build keeps the events already
   committed rather than failing or emptying the page — the same reasoning that
   kept the blog off a build-time Medium fetch in
   `launch--content-and-pages.md`.

## Tests

- `src/lib/lumaFeed.test.ts` (new), against a captured sample of the real
  response rather than an invented one:
  - maps a physical event to title, date, location, link and cover image
  - yields no location for an online event instead of inventing one
  - drops a non-public event
  - builds a slug matching the existing `YYYY-MM-DD-title` filename convention
  - survives a missing `geo_address_info`, `cover_url` or `end_at`

## Scenarios to Demonstrate

- `harvard-in-tech-upcoming-events-excludes-past-ones` — unchanged behaviour,
  now fed by imported entries.
- `events-route-upcoming-and-past` — the events page with an imported event in
  the upcoming list.
- `harvard-in-tech-no-upcoming-events` — still reachable when Luma lists nothing.

## Out of scope

- Registration or RSVP on the site. Luma keeps that.
- The historical archive import, which `launch--history-events-archive-and-webinars.md`
  owns — though open question 3 may let that plan reuse `lumaFeed.ts`.
- Replacing the embedded Luma calendar on `/events`; the embed stays.