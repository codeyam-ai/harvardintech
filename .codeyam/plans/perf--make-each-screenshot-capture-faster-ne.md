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

## Measured findings (2026-11-27, ne) — plan on hold

Step 1 was run. The result: the time is mostly **inside the CodeYam editor**, so this plan is on hold waiting on an editor fix.

| Piece of one capture | Seconds | How measured |
|---|---|---|
| Whole capture (`board-of-directors`) | 17–18.7 | `recapture-stale --force --target board-of-directors` (wall 18.7 s, capture_seconds 17) |
| Browser: navigate + settle + screenshot + context | ~3.1 | that run's `capture_seconds_breakdown` (0.5 + 2.1 + 0.3 + 0.1) |
| This project's seed adapter, end to end | ~3.1–3.4 | `npx tsx .codeyam/seed-adapter.ts <empty seed>`, timed twice |
| ↳ of which `tsx` start-up alone | 1.35 | `npx tsx -e 0` |
| ↳ copying `public/images` (24 MB tree) | 0.02 | `fs.cpSync` timed |
| **Unaccounted, editor orchestration** | **~11** | 17 − 3.1 − 3.1 |

The 10-scenario sample (`recapture-stale --calibrate-context-reuse`) agrees: 18.1 s per capture, with browser phases at about 3.6 s per scenario.
A warm browser context saved only about 1 s (17.0 s) and was not pixel-safe (1 of 37 frames differed).

**What this project could still do:** remove the `tsx` start-up (about 1.3 s per capture, about 7%), for example by bundling the adapter once.
That isn't worth the maintenance on its own.

**For Jared / the CodeYam team, editor-side (general to every project):**
1. About 11 s per capture is spent outside the browser and outside the seed adapter. This includes "Warming dev server" and orchestration.
   It is 60–65% of every capture on this project.
2. `recapture-stale --calibrate-context-reuse` rewrote 10 committed `.png.hash` sidecars: `isolationHostHash` changed and
   `cssRuleMatches` was dropped, while the pixels were unchanged. A host-hash flip like that is the likely cause of
   `recapture-causes`' top entry: "isolation host changed (src/pages/isolated-components)", 159/198 identical frames, about 198 min wasted
   in one run. The touched sidecars were restored with `git checkout`.
3. Comment-only and whitespace-only edits to isolation routes correctly restale nothing (dry-run verified). So the waste is not
   this project's file layout. — ne