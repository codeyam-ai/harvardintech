---
title: "Word the empty events message for communities, not places"
mode: ui
createdAt: "2026-10-13T21:21:22Z"
source: proposed-plan
---

## Summary

Community pages reuse ChapterEvents, whose empty state is built from the page's subject as a place: `No events scheduled in ${name} yet.` For a city that reads well ("in London"); for a community it reads oddly ("in Investors", "in AI"). The heading was already overridden for communities (`Upcoming ${name} Events`), but the empty line was not. Seen on the new Investors page capture (community-route-investors-join-steps).

## Key Decisions

- Keep ChapterEvents shared; add an optional override for the empty-state title, the same way `heading` is overridden.
- Community wording: "No Investors events scheduled yet."
- Also reconcile the AI On Day One scenario description, which says the events section renders nothing when empty; the current pages render a heading plus an empty-state box.

## Implementation

1. `src/components/ChapterEvents.astro` (empty state near line 57): accept an optional `emptyTitle` prop, defaulting to the current place wording.
2. `src/components/CommunityPage.astro` (line 99): pass `emptyTitle={`No ${name} events scheduled yet.`}`.
3. Recapture the community route scenarios and update the AI On Day One description to match what renders.