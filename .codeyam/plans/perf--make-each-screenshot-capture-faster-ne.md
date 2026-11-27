---
title: "perf -- Make each screenshot capture faster (ne)"
mode: backend
createdAt: "2026-11-27T16:20:33Z"
prefix: "perf"
source: codeyam-audit-speed
---

## Summary

Screenshot capture costs about 61 minutes of every ~2 h 38 min build cycle on this project (speed review 2026-11-27,
`speed-history --kind plan`: reconcile:capture:sample 31.5 min + reconcile:capture:recapture 21.8 min +
ui-component-scenarios:capture:sample 7.6 min, means over 2 cycles). Each capture takes 21.6 s (recent) to
74.6 s (last sweep), according to `recapture-stale`'s rate_basis. Two full sweeps took 6170 s (~103 min) each. For a static Astro
site that is slow. This plan measures where each capture's seconds go and removes the app-side causes.
Target: halve the per-capture time, which saves about 30 min per cycle (estimate: 61 min × 0.5).

Submitted by: ne

## Key Decisions

- Measure before changing anything. The cause is not yet known, so step 1 is a timing breakdown of a handful of captures
  (dev-server response, seed apply, page settle, screenshot write), not a guess.
- App-side suspects first: Astro dev server cold rebuilds under `npm run dev`, the seed adapter
  (`.codeyam/seed-adapter.ts`, run via `npx tsx` per capture), and the dev-server revalidate POSTs that drop under seeded captures
  (seen in earlier sessions, where captures needed `restart-dev-server` and one-at-a-time retries).
- Editor-side causes found along the way (for example, the capture pipeline's own settle waits) are NOT fixed here. They are written up
  for the CodeYam team (see the last section).

## Implementation

### 1. Time a sample of captures

Recapture 5 representative scenarios one at a time (`recapture-stale --target <slug>`): one component scenario
(`board-of-directors`), and application scenarios on `/`, `/donate` and `/chapters/london`. Record where the time goes.
Use `scenario-explain <slug>` for each scenario's pipeline.

### 2. Remove the app-side costs found

Likely candidates, to confirm or drop based on step 1:
- Seed adapter start-up: `npx tsx` per capture pays TypeScript start-up every time. Consider a precompiled adapter.
- Dev server: confirm `astro.config.mjs` does not force full rebuilds (integrations or watchers over `public/` or `src/data/`).
- Large images in `public/` that the page must load before it settles.

**File**: `.codeyam/seed-adapter.ts`
**File**: `astro.config.mjs`

### 3. Re-measure

Re-run the same 5 captures and report the before and after per-capture seconds.

## Reused existing code

- `.codeyam/seed-adapter.ts` (scenario seed adapter)
- `astro.config.mjs`

## Scenarios to Demonstrate

- No visual change. Existing screenshots must stay pixel-identical after the speed-up.

## General fix for the CodeYam editor (for Jared)

Partly unverified. The 21.6 s vs 74.6 s swing between sweeps on the same tree suggests that part of the cost is in the editor's
capture pipeline, not the app. If step 1 shows the time is spent inside the editor's capture (settle waits, browser
start-up per scenario), send that breakdown to the CodeYam team as an editor-wide capture-speed fix. — ne