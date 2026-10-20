---
title: "Show a compact subscribe card when the Luma calendar has nothing upcoming"
mode: ui
createdAt: "2026-10-20T13:53:05Z"
source: proposed-plan
---

## Summary

The events page embeds Luma's calendar in a fixed-height frame (`src/components/LumaCalendar.astro`, `height: clamp(340px, 46vh, 540px)`). When nothing is upcoming, Luma fills that frame with its own grey "No Upcoming Events" panel, so on a phone the page shows a big, mostly empty box — the decision sheet row `m-calendar-box`, still open after the October responsive check (`docs/responsive-check-2026-10.md`, item O1). We cannot restyle inside Luma's frame, and its panel also sits ~36px inside our column on the right.

## Key Decisions

- Decide on the build side, not in the browser: the nightly-imported events collection already knows whether anything is upcoming.
- When nothing is upcoming, render the existing branded `luma-card` ("Browse & subscribe on Luma") instead of the iframe; when something is, keep the embed.
- Owner call: confirm this is wanted before building — it changes what the events page shows on quiet weeks.

## Implementation

1. `src/pages/events.astro`: compute whether the events collection has any future-dated entry and pass it to `LumaCalendar`.
2. `src/components/LumaCalendar.astro`: add a prop (e.g. `hasUpcoming`) and render the card branch when it is false even if `embedUrl` is set.
3. Scenarios: events page with and without upcoming events at Mobile, so both branches are on record.
4. Re-run `npm run check:responsive -- --only /events`.