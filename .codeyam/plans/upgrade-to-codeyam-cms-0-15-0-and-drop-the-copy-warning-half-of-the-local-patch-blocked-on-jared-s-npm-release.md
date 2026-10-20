---
title: "Upgrade to @codeyam/cms 0.15.0 and drop the copy-warning half of the local patch (blocked on Jared's npm release)"
mode: backend
createdAt: "2026-10-20T19:08:16Z"
source: manual
---

## Summary

**BLOCKED — not done until Jared publishes `@codeyam/cms` 0.15.0 to npm.** Check with `npm view @codeyam/cms versions`; if 0.15.0 is not listed, do not start this plan.

On 2026-10-20 the copy-warning feature (site-declared `copyWarnings` rules, the amber per-field note, the summary above Save) was ported from this site's local patch into the CMS repo: https://github.com/codeyam-ai/codeyam-cms/pull/7 (branch `feat/copy-warnings`; 2518/2518 tests, 14 new; tsc and build clean). Jared was emailed the same day to review, merge, bump to 0.15.0, tag `v0.15.0`, and `npm publish` — only he can publish. Until then the site keeps the full 891-line `patches/@codeyam+cms+0.14.0.patch`.

## Key Decisions

- Only the copy-warning half moved upstream (7 of the patch's 14 files: `CopyWarningNote.tsx`, `CopyWarningsSummary.tsx`, `EntryEditor.tsx`, `collectionRegistry.ts`, `copyWarnings.ts`, `server/entryPages.ts`, `pages/admin/[collection]/[entry].astro`). The entry-ordering half (`OrderArrows`, `EntryRow`, `EntryListSearch`, `EntryListSection`, `entryList.ts`, `entryActions.ts`, `pages/admin/[collection]/index.astro`) stays in the site's patch.
- The rule shape in `src/data/collections.json` (`copyWarnings: [{pattern, message}]`) is unchanged, so `src/lib/copyWarnings.test.ts` keeps reading the same rule.

## Implementation

1. Confirm 0.15.0 is on npm and that its `src/lib/copyWarnings.ts` matches what PR #7 merged.
2. Bump `@codeyam/cms` to `0.15.0` in `package.json`.
3. Regenerate the patch as `patches/@codeyam+cms+0.15.0.patch` carrying only the entry-ordering hunks; delete the 0.14.0 patch. Check that `npm install` applies it cleanly.
4. Keep `src/lib/copyWarnings.test.ts` green; re-capture the CMS entry-editor scenarios to confirm the warning note and summary still render.
5. Resolve the proposal `move-the-copy-warning-support-out-of-the-local-cms-patch-and-into-codeyam-cms`.