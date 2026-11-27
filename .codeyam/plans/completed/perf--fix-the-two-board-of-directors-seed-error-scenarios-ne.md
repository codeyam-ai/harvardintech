---
title: "perf -- Fix the two Board of Directors seed-error scenarios (ne)"
mode: ui
createdAt: "2026-11-27T16:20:33Z"
prefix: "perf"
source: codeyam-audit-speed
---

## Summary

`scenario-review` flags two Board of Directors scenarios as seed-error candidates: `board-of-directors` and
`board-of-directors-retired-member-hidden`. A scenario whose seed data doesn't apply can show the wrong content and be retried during
captures. `scenario-explain board-of-directors` shows no seed (defaults only), no props, and that its isolation route
`/isolated-components/BoardOfDirectors` "imports no 'BoardOfDirectors'". Fix both so they render the state they claim.

Submitted by: ne

## Key Decisions

- Start from the isolation route. If the route does not render `BoardOfDirectors`, no seed can affect the capture.
- The "retired member hidden" scenario must actually seed a retired member, so the screenshot proves the member is hidden.

## Implementation

### 1. Diagnose

Run `codeyam-editor editor scenario-explain board-of-directors` and `scenario-explain board-of-directors-retired-member-hidden`.
Compare their seeds with what `src/components/landing/BoardOfDirectors.astro` reads (board data under `src/data/` or `src/content/`).

### 2. Fix the route and seeds

**File**: `src/components/landing/BoardOfDirectors.astro`

Point the isolation route at the component (or give the scenarios props or seeds that reach it). Seed a retired member for the
hidden-member scenario.

### 3. Recapture and confirm

Recapture both (`recapture-stale --target <slug>`). Re-run `scenario-review` and confirm `seedErrorCandidates` is 0.

## Reused existing code

- `src/components/landing/BoardOfDirectors.astro`

## Scenarios to Demonstrate

- Board of Directors with the current board
- Board of Directors with a retired member present in the data but hidden on the page

## General fix for the CodeYam editor (for Jared)

Specific to this project. No editor change needed. — ne

## Outcome (2026-11-27, ne): closed as superseded, no site change

The premise was wrong. Nothing about these two scenarios is broken:
- `scenario-review` flags a pair as `seed-error-candidate` when their frames are byte-identical. Here they are identical **by design**:
  the Retired fixture feeds six directors with one marked retired, and must render exactly the five that Default shows. The captured
  frame shows "05 DIRECTORS" with no former director, which is correct.
- The pair is already recorded in `.codeyam/audit-baseline.json` as an intended identical capture, with a justification.
- The retired filter is unit-tested in `src/lib/team.test.ts` ("removes a member with retired: true").

**For Jared / the CodeYam team (editor-side, general):** `scenario-review` does not read the audit baseline's intended-identical
pairs, so it keeps reporting baselined pairs as seed errors. It should skip pairs that the distinct-capture baseline already accepts. — ne