---
title: "Event screenshots and pages drift because upcoming-vs-past uses today's real date"
mode: backend
createdAt: "2026-11-06T21:50:17Z"
source: proposed-plan
---

## Root cause
splitEvents and its sibling default `now` to `new Date()`, and EventsPage falls back to the real clock when no `now` is passed, so any scenario that does not pin the clock renders a different upcoming/past split each day.

## Evidence
fnd-d558032361d4, fnd-709798b72fe0, fnd-4c1c3ad75b6d. Producing code on HEAD: `src/lib/events.ts:117`, `src/lib/events.ts:139`, `src/components/EventsPage.astro:43`.

## Smallest fix
Thread one injectable 'now' from the page/scenario layer into every events call and have every events scenario pin it, including the all-hands one whose interaction broke when frozen.

## Cost of leaving it
Event screenshots keep showing up as stale or changed with no code change, which buries real visual regressions and costs a recapture every session.
## Implementation

Why the scenario `clock` alone is not enough: it freezes `Date` in the capture
browser, but the upcoming/past split runs server-side in the Astro dev server
(`events.astro`, `index.astro`, `chapters/[slug].astro`,
`communities/[slug].astro`), which still reads the real clock.

1. **One injectable "now" for the site** — new `src/lib/siteClock.ts` with
   `siteNow()`: reads an optional `siteClock.json` singleton (`{ "now": "<ISO>" }`)
   from `dataRoot()` and falls back to `new Date()`. Read on every call (no
   module-level cache), so a scenario switch is picked up on the next render, not
   only at dev-server launch. Production `src/data` never contains the file, so the
   shipped site keeps using the real build time.
2. **Thread it everywhere** — drop the `new Date()` defaults from `splitEvents`
   and `calendarEmbedUrl` (make `now` required so the compiler finds every caller),
   pass `siteNow()` from the four routes, and have `EventsPage.astro` require/pass
   `now` instead of falling back to the real clock.
3. **Pin every events scenario** — add `seed.siteClock.now` to `_default` (today,
   2026-11-10, matching a `_default` clock) so every app scenario inherits a fixed
   server date; scenarios that already carry their own `clock.now` (e.g. the
   October all-hands one at 2026-11-06) get a matching `seed.siteClock.now` so the
   server and browser agree. Its hover interaction is re-verified after pinning.
   Isolated-component scenarios already pass a fixed `now`.

Tests: `siteClock` unit tests (pinned file wins; missing/garbled file falls back to
the real clock); `splitEvents`/`calendarEmbedUrl` tests updated to always pass `now`.
