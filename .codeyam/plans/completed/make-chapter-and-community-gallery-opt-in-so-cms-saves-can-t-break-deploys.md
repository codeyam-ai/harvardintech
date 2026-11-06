---
title: "Make chapter and community gallery opt-in so CMS saves can't break deploys"
mode: ui
createdAt: "2026-11-05T22:21:42Z"
step: 11
source: prototype
---

## Summary

Deploys from the CMS had been failing since Nicole's 2026-11-05 12:22 save of the AI community page. The CMS leaves out an unticked checkbox when it saves (`@codeyam/cms` `src/lib/entryEditor.ts:308`, `scalarToData`), so `showGallery: false` was removed from `src/content/communities/ai.md`. The gallery defaulted to ON, so the page switched to the shared New York photo wall, and `src/lib/contentImages.test.ts` (the deploy gate) correctly failed the build.

**This work is ALREADY COMMITTED AND PUSHED** as `d48091a` on `origin/main`, and deploy run 42114566857 passed (build and deploy both green). It went out as an emergency push with `CODEYAM_ALLOW_DEFERRED_PUSH=1`, which skipped the deferred-finalize gate and wrote no audit note. What this plan still owes is the finalize: validation and coverage of `d48091a`. No new implementation is needed.

## What was changed (in d48091a)

- `src/content/communities/ai.md`: `showGallery: false` restored.
- `src/components/ChapterPage.astro`, `src/components/CommunityPage.astro`: `showGallery` now defaults to `false`, so the gallery is opt-in. A comment explains that the CMS drops unticked checkboxes.
- `src/content/chapters/nyc.md`: now sets `showGallery: true` explicitly, since it has curated photos. London already set it.
- `src/content/config.ts`: the schema comment updated to describe opt-in behaviour.
- `src/lib/contentImages.test.ts`: the banner test reworked:
  - a page with `showGallery: true` must have its own `photos:`;
  - a new test requires every chapter with curated `photos:` to set `showGallery: true`.
- The five `chapter-gallery-*` scenarios now include `"showGallery": true` in their seeded chapter, next to `photos`.

## Verified

- `npx vitest run`: 117 files / 1873 tests pass.
- Gated production build with CI env (`PREVIEW_GATE=1`, `INCLUDE_DRAFTS=1`, base `/harvardintech`): exit 0, 412 pages.
- In `dist/`, `id="gallery"` appears only on `chapters/nyc` and `chapters/london`. It is absent on seattle, boston-cambridge, sf-bay-area, dc-dmv, and the ai, founders and investors communities.
- The CI deploy of `d48091a` succeeded.

## Remaining for Build to finalize

1. Run the session finalize over `d48091a` (it was pushed without one).
2. Recapture the five `chapter-gallery-*` scenarios and any chapter or community route scenarios, and confirm nothing visually regressed. Pages without `showGallery: true` should show no gallery.
3. Register the new test in the glossary and test evidence as needed.

## Out of scope / follow-up

- Upstream `@codeyam/cms` bug: `scalarToData` should write `false` when a boolean field defaults to true, or when the key was already in the file. Otherwise the same bug will affect any future default-on checkbox.
- Local `main` in `/workspace` is 6 tooling commits ahead of / 11 behind `origin/main` and needs a rebase.