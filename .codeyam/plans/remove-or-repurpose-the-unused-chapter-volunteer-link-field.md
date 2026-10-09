---
title: "Remove or repurpose the unused chapter Volunteer link field"
mode: ui
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

Forming (online-group) chapter pages no longer show a volunteer button (`src/components/FormingChapterCta.astro` now leads with Join WhatsApp and See online events). The chapter `volunteerUrl` field is still threaded from `src/pages/chapters/[slug].astro` through `src/components/ChapterPage.astro` into `FormingChapterCta`, which ignores it, and the content admin shows a "Volunteer link" field whose hint now says it is not shown.

## Key Decisions

- Either remove the field end-to-end, or repurpose it (for example as the target of a per-chapter "lead or co-lead this chapter" link) if the user wants that back.

## Implementation

1. Decide with the user: remove or repurpose.
2. If removing: drop `volunteerUrl` from `src/content/config.ts`, `src/data/collections.json`, the `ChapterPage` and `FormingChapterCta` props, and `joinCtas` callers in `src/lib/localPresence.ts`; update `localPresence.test.ts`.