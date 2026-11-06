---
title: "Event screenshots and pages drift because upcoming-vs-past uses today's real date"
mode: backend
createdAt: "2026-11-06T21:50:17Z"
source: proposed-plan
---

## Root cause
splitEvents and its sibling default `now` to `new Date()`, and EventsPage falls back to the real clock when no `now` is passed, so any scenario that does not pin the clock renders a different upcoming/past split each day.

## Evidence
fnd-d558032361d4, fnd-709798b72fe0, fnd-4c1c3ad75b6d. Producing code on HEAD: `src/lib/events.ts:117`, `src/lib/events.ts:139`, `src/components/EventsPage.astro:43`.

## Smallest fix
Thread one injectable 'now' from the page/scenario layer into every events call and have every events scenario pin it, including the all-hands one whose interaction broke when frozen.

## Cost of leaving it
Event screenshots keep showing up as stale or changed with no code change, which buries real visual regressions and costs a recapture every session.