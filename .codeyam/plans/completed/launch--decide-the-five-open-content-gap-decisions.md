---
title: "launch -- Decide the five open content-gap decisions"
mode: ui
createdAt: "2026-10-19T17:43:37Z"
prefix: "launch"
source: manual
---

## Summary

Five of the site's 15 launch gaps aren't missing material. They are decisions about content that already exists and is switched off (drafted). These are (A) three old fundraising priorities on /donate, (B) the unfinished Presenting Partner level on /sponsor, and (C) three "Example" stand-in partners on /sponsor. This plan settles those three decisions when it runs, then carries out whatever the user chooses so the launch checker's gap count matches. Nothing changes until the plan is run and the user picks.

History: on 2026-10-16 the user first picked "delete" for all three, and that was carried out (15 gaps went to 10). They then asked for it to be reverted and parked as a plan. Treat those earlier picks as the starting suggestion, not a settled answer. Ask again at run time.

## Key Decisions

- **Ask first, one question per decision.** Offer the options below with what each does to the public page and the gap count. Do not pre-apply the 2026-10-16 "delete" picks.
  - **A, old priorities** (`establish-the-organizational-foundation`, `secure-essential-annual-software`, `fund-chapter-events-and-programming`, all `group: priorities`, `draft: true`):
    - Delete all three (closes 3 gaps; recoverable from git).
    - Keep them drafted (no change; still 3 gaps).
    - Publish them beside the $10,000 campaign (closes 3 gaps; contradicts the "one 2026 priority" rule, so that rule and its test must change).
  - **B, Presenting Partner level** (`src/content/sponsorLevels/presenting.md`, `draft: true`): delete it (closes 1 gap), keep it drafted (no change), or publish it (closes 1 gap; shows on /sponsor with its current wording).
  - **C, Example partners** (`src/content/sponsors/example-*.md`, all `draft: true`): delete them now (closes 1 gap; the partner wall shows "No partners listed yet"), or keep them until the first real partner is added (no change).
- **Mixed answers are fine.** Each decision is independent; implement only the chosen branches.
- **A rule that guards a decision changes with it.** Tests and inline notes currently say "drafted rather than deleted". Any branch that deletes or publishes must rewrite them to state the new rule, not just drop them.

## Implementation

### 1. Decision A: old priorities

**File**: `src/content/pillars/launch-the-2026-fundraising-campaign.md`

- *Delete*: `git rm` the three pillar files. Rewrite this file's body paragraph that says they were "drafted rather than deleted" so it no longer points at files that are gone.
- *Publish*: remove `draft: true` from the three files. Update the "publishes exactly one priorities pillar" test in `src/lib/givingContent.test.ts` to the new expected set, and its comment to say why.
- *Keep*: no change.

### 2. Decision B: Presenting Partner level

**File**: `src/lib/givingContent.test.ts`

The "keeps the Presenting Partner level drafted" test reads `src/content/sponsorLevels/presenting.md` directly, so deleting or publishing breaks it.
- *Delete*: `git rm` the file. Replace that test with one asserting the level file is absent, so a re-added level is a deliberate act. Update the describe-block comment.
- *Publish*: remove `draft: true`. Flip the test to assert the level is published, and update the comment.
- The `presenting` ids in `src/lib/sponsors.test.ts` and `src/lib/pageCopyMerge.test.ts` are inline fixtures, not reads of the content file, and need no change.

### 3. Decision C: Example partners

**File**: `src/lib/givingContent.test.ts`

The "keeps every example sponsor drafted" test requires at least one `example-*.md` file to exist.
- *Delete*: `git rm` the three files. Add `src/content/sponsors/.gitkeep` (new) with a one-line note, following `src/content/donors/.gitkeep`. Deleting the last file removes the folder, and an empty collection folder breaks the dev server's content loading. Replace the test with one asserting no `example-*` file exists.
- *Keep*: no change.
- The example scenario `sponsor-route-example-partner-wall` carries its own data copy and is unaffected. Confirm with `editor scenario-explain` rather than assuming.

### 4. Verify

- Run the **full** test suite (`refresh-tests --partition all`). These tests read `src/content` at runtime, and `--changed` does not detect them.
- Re-run the site's launch checker (`findContentGaps` in `src/lib/contentGaps.ts`, fed by `src/lib/contentGapsContent.ts`) against the real content. Confirm the gap count dropped by exactly the gaps the chosen branches close.
- If any branch deleted files, restart the dev server once, so the content store reloads before any capture.
- Update the shared request list (https://claude.ai/artifact/2mdLjP6eF8VkKvZWzyXMCh). Its "Also open: decisions, not material" box and gap-count pill must match the outcome.

## Reused existing code

- `findContentGaps` from `src/lib/contentGaps.ts`: the launch checker whose count this plan moves.
- `src/lib/contentGapsContent.ts`: reads every collection, drafts included, for the checker.
- `src/content/donors/.gitkeep`: precedent for keeping an intentionally empty collection folder.
- `src/lib/givingContent.test.ts`: the content-rule tests ("publishes exactly one priorities pillar", "keeps the Presenting Partner level drafted", "keeps every example sponsor drafted").

## Scenarios to Demonstrate

- /donate with the priorities as decided (only the $10,000 campaign, or all four)
- /sponsor partner wall in its empty "No partners listed yet" state (if C = delete)
- /sponsor levels list with or without Presenting Partner (per B)