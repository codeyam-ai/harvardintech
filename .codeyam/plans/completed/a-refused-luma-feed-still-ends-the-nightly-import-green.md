---
title: "A refused Luma feed still ends the nightly import green"
mode: backend
createdAt: "2026-11-09T22:28:24Z"
source: proposed-plan
---

## Root cause
When Luma refuses the feed (HTTP 429 or 5xx), fetchFeed returns null, and main() treats that as 'offline': it leaves the committed events alone and returns ok: true. The workflow run therefore stays green. The only signal is a ::warning:: annotation, and no test observes it. The User-Agent fix removed the cause seen on 2026-10-23, but a new refusal would again go unnoticed for as long as the last one did.

## Evidence
fnd-322ed885ca31 (wrong-result) and fnd-09539cd9bffc (untested warning). On HEAD: scripts/import-luma.mjs:93 emits the ::warning:: annotation, and scripts/import-luma.mjs:128 returns { ok: true, offline: true } for a refused feed. src/lib/lumaImport.test.ts:180 asserts offline is true but nothing about the warning or the exit status.

## Smallest fix
Tell 'unreachable' (network error, where staying green is fine) apart from 'refused' (an HTTP error status). For a refused feed, return ok: false, or fail after N consecutive refused nights. Add a test that captures stderr and asserts the ::warning:: line.

## Cost of leaving it
The next time Luma changes what it accepts, events stop appearing on the site with a green build, and an organizer finds out by hand weeks later, as happened in October.
## Decision (2026-11-10)
A refused feed must not hold back the rest of the deploy (CMS edits still publish). The site builds and deploys with the events already committed, and THEN the run is marked failed. Fail on the first refused night (no N-night counter — that would need saved state). Undo: drop the final workflow step.

## Implementation
1. `scripts/import-luma.mjs` — `fetchFeed` returns a tagged result: `{ payload }`, `{ unreachable: message }` (fetch threw: DNS, socket, timeout) or `{ refused: status }` (any non-2xx). It keeps the `::warning::luma <period>: HTTP <status>` annotation.
2. `main()` — unreachable → unchanged `{ ok: true, offline: true }`. Refused → `{ ok: false, offline: true, refused: <status>, ... }` without writing anything. The CLI already exits 1 when `ok` is false.
3. `.github/workflows/deploy.yml` — the import step gets `id: luma` and `continue-on-error: true`, so the commit/build/deploy still run on the committed events. A final step in the `deploy` job (`if: needs.build.outputs.luma_outcome == 'failure'`) fails the run with a `::error::` naming the refusal. The build job exports `luma_outcome: ${{ steps.luma.outcome }}`.
4. Docs: the header comment in the script, the workflow comment and the "It fails soft" bullet in `DEPLOY_SETUP.md` say unreachable stays green, refused goes red after deploying.

Note: the existing test "treats a non-200 from Luma the same way as an unreachable one" asserts `ok: true` for a 503. This plan deliberately reverses it, so that test is rewritten, not kept.

## Reproduction Test
In `src/lib/lumaImport.test.ts`: stub `fetch` to answer `{ ok: false, status: 429 }`, run `importLuma({ argv: [], outDir, fetchImpl })` with a spy on `console.error`. Expect `result.ok === false`, `result.refused === 429`, the collection untouched, and stderr to contain `::warning::luma upcoming: HTTP 429`. Red on HEAD (HEAD returns `ok: true`). A companion test keeps a thrown network error at `ok: true, offline: true`.
