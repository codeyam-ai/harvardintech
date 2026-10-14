---
title: "Frame the past-events section in the two events-page scenarios"
mode: ui
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

The scenarios `events-route-the-calendar-with-no-past-events-yet` and `events-route-upcoming-and-past` seed different event sets, but both capture only the top of `/events` (page banner plus the Luma calendar embed). The past-events listing where they differ sits below the visible area, so the two frames are byte-identical and `scenario-review` flags the pair as a seed-error candidate. Before this was noticed they only differed by whatever the live Luma widget happened to show.

## Key Decisions

- Add an `interactions` hover on the past-events heading to each scenario, so each capture frames the section that proves its state (URL fragments do not scroll captures).
- Do not mock or freeze the Luma embed here; framing past the embed avoids depending on its live content.

## Implementation

- `.codeyam/scenarios/events-route-the-calendar-with-no-past-events-yet.json` and `.codeyam/scenarios/events-route-upcoming-and-past.json`: add `"interactions": [{"action": "hover", "text": "<past events heading>"}]`, reading the heading from `src/components/EventsPage.astro`.
- Recapture both with `--force --target` and confirm the frames now differ.