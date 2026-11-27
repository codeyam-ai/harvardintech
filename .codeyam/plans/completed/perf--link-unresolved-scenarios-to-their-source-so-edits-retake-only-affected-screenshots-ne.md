---
title: "perf -- Link unresolved scenarios to their source so edits retake only affected screenshots (ne)"
mode: backend
createdAt: "2026-11-27T16:20:33Z"
prefix: "perf"
source: codeyam-audit-speed
---

## Summary

115 of 347 scenarios cannot be traced back to the source file they show. `scenario-for-changes` reports
`unresolved: 115` for every changed file, with reasons like "component 'AccomplishmentCard' is not in the glossary and no
source file was found". The files do exist: `src/components/donate/AccomplishmentCard.astro`,
`src/components/BlogPostBody.astro`. When the editor can't tell whether an edit reaches a scenario, it falls back to broad
capture sampling, which costs about 31.5 min per cycle (`reconcile:capture:sample`). Resolving them lets an edit
retake only the screenshots it actually changes. Estimate: 10–15 min saved per cycle (exact share unknown until measured).

Submitted by: ne

## Key Decisions

- Fix it at the source of truth. Add glossary entries for the missing `.astro` components so every resolver tier finds them,
  rather than pinning `pageFilePath` scenario by scenario.
- Most-affected components first, by scenario count: Momentum*, BoardOfDirectors/BoardMemberTile, DeployStatus/DeployChip, OrderArrows,
  GiftPillars, SponsorInquiry, SponsorWall, TestimonialCard, BlogPostBody.
- Verify with the editor's own query. Done means `scenario-for-changes --changed-files src/layouts/BaseLayout.astro --limit 0 --format json`
  reports `unresolved` at 0 (or near 0, with every remaining one explained).

## Implementation

### 1. List every unresolved component

Run `codeyam-editor editor scenario-for-changes --changed-files src/layouts/BaseLayout.astro --limit 0 --format json` and
collect the distinct component names in `unresolved[].why`.

### 2. Add glossary entries

For each one, find its `.astro` file under `src/components/**` and add a glossary entry with
`codeyam-editor editor glossary-add` (name, filePath, description).

### 3. Re-check

Re-run step 1's query and record the unresolved count before and after. Then edit one shared file (for example
`src/components/ui/PageBanner.astro`, which maps to 19 scenarios today) and confirm the recapture set is the mapped set.

## Reused existing code

- `src/components/donate/AccomplishmentCard.astro`
- `src/components/BlogPostBody.astro`
- `src/components/landing/BoardOfDirectors.astro`

## Scenarios to Demonstrate

- No visual change. This is scenario metadata only.

## General fix for the CodeYam editor (for Jared)

Verified to be partly general. `scenario-explain board-of-directors` shows the glossary tier MISSING and resolution only
succeeding through `implicit-component-file`, while `scenario-for-changes` cannot resolve other components whose `.astro`
file sits in a nested folder (`src/components/donate/`). Two editor-side gaps that would affect any Astro project:
(a) the analyzer that builds the glossary does not register `.astro` components, and (b) the component-file fallback does not search
nested `src/components/**/<Name>.astro`. Worth fixing in the editor so new Astro projects never accumulate unresolved
scenarios. — ne