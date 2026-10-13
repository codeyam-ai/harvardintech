---
title: "Remove or repurpose the unused chapter Volunteer link field"
mode: ui
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

Forming (online-group) chapter pages no longer show a volunteer button (`src/components/FormingChapterCta.astro` now leads with Join WhatsApp and See online events). The chapter `volunteerUrl` field is still threaded from `src/pages/chapters/[slug].astro` through `src/components/ChapterPage.astro` into `FormingChapterCta`, which ignores it, and the content admin shows a "Volunteer link" field whose hint now says it is not shown.

## Key Decisions

- **Decided by the user on 2026-10-13: remove the field end-to-end.** Do not repurpose it.

## Implementation

1. Drop `volunteerUrl` from `src/content/config.ts`, `src/data/collections.json`, the `ChapterPage` and `FormingChapterCta` props, and `joinCtas` callers in `src/lib/localPresence.ts`; update `localPresence.test.ts`.