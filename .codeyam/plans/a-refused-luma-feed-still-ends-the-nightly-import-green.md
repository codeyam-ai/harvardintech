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