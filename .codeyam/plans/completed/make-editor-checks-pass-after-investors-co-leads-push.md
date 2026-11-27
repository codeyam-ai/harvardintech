---
title: "Make editor checks pass after Investors co-leads push"
mode: ui
createdAt: "2026-11-27T15:37:07Z"
step: 11
source: prototype
---

## Goal

Bring the branch to a state where every editor check passes after the most recent
pushed work ("Investors: co-leads Stefan and Kiran plus Boston skyline banner",
b5398603, plus the follow-up codeyam state commits 387fdfef / 374b6c24).

That commit shipped through an out-of-workflow commit and a push that skipped the
final check, so the editor's verification gate has not been run against HEAD.

## What was prototyped

Nothing was changed in the working tree during the prototype session — no source
edits, no new scenarios. The only untracked file is
`.codeyam/cycle-closed-dismissed.json` (editor state).

## Scope for Build

1. Run the full editor check suite against HEAD (tests, typecheck, lint, scenario
   captures/screenshots, dependency-graph freshness, audit gate).
2. Fix any failures that come from the Investors / communities changes:
   - communities schema fields `heroCredit`, `heroCreditUrl`, `heroImagePosition`
     and their CMS editing surface
   - Investors, Founders and AI community banner/hero scenarios
   - the 10 CMS publishing-bar scenarios pinned to their source files
3. Refresh any stale scenario screenshots or generated codeyam state the checks flag.
4. Don't change product behavior beyond what is needed to get the checks green.

## Edge cases to verify

- Communities with no hero credit render with no empty credit line.
- `heroImagePosition` falls back to a sensible default when unset.
- Shard-based dependency graph (`.codeyam/dependency-graph/`) is current and the old
  single-file graph is no longer referenced.