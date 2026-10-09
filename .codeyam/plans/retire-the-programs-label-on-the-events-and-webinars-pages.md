---
title: "Retire the Programs label on the Events and Webinars pages"
mode: ui
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

The navigation simplification removed the Programs dropdown; Events is now a top-level link and Webinars sits under Content hub. The small eyebrow label above the page titles still reads "Programs" on the Events page and the Webinars page, naming a section a visitor can no longer find in the menu. The homepage Focus Areas grid also has a "Programs" tile.

## Key Decisions

- Match each eyebrow to where the page now lives in the menu: Events page gets no section eyebrow (or "Calendar"), Webinars gets "Content hub".
- The Focus Areas "Programs" tile describes a kind of activity rather than a menu section; leave it unless the owner wants the wording aligned.

## Implementation

- `src/components/EventsIntro.astro` line 23 and `src/components/EventsIntroBand.astro` line 25: change the `Programs` label.
- `src/components/WebinarsPage.astro` line 27: change `label="Programs"`.
- Recapture the EventsIntro, EventsIntroBand, EventsPage and WebinarsPage scenarios plus the events and webinars route scenarios.