---
title: "Scenario captures save wrong frames (error pages, leaked or missing seeds) and report them as successful"
mode: backend
createdAt: "2026-10-23T15:40:00Z"
source: manual
---

## Summary

A full `recapture-stale` sweep on 2026-10-23 (337 scenarios, after the capture scripts were synced to the installed editor build) reported every scenario fresh. A side-by-side review of the 47 frames that changed found **18 wrong**, and every one was recorded as a good capture. Until this is fixed, recaptured screenshots can't be trusted, so `session-finalize` (which requires every screenshot fresh) can only be passed by committing wrong images. The sweep's frames were discarded and nothing from it was committed.

## Evidence (2026-10-23)

Three failure shapes, all on seeded scenarios:

1. **Astro error page captured as the frame (8 scenarios).** The dev server threw `UnknownFilesystemError` from `MutableDataStore.writeToDisk` (`astro/dist/content/mutable-data-store.js:337`) while the seed was swapping content in. `.codeyam/logs/dev-server.log` shows the error 4 times between 15:15 and 15:17, each right after a burst of `[glob-loader] Reloaded data from …` lines. Affected: `cutover-runbook-nothing-started`, `cms-entry-editor-new-chapter-form`, `cms-media-library-adopted-images`, `cms-volunteer-page-editor`, `volunteer-page-rewritten-from-the-cms`, `site-page-long-title-and-no-description`, `hero-carousel`, and `momentum-fund-arriving-from-the-email` (desktop).
2. **Another scenario's seed leaked into the frame.** Examples: `harvard-in-tech-no-upcoming-events` shows two London events; `harvard-in-tech-chapters-on-four-sizes` shows "Chapters are coming soon"; `momentum-fund-public-visitor` and `momentum-fund-the-goal-meter-held-as-coming-soon` show every middle section hidden, with the nav missing Chapters (the `momentum-fund-every-section-hidden` state). `momentum-fund-the-donor-wall-moved-to-the-top` captured the plain hero with no Chapters in the nav, though the live preview of the same scenario renders the network hero correctly.
3. **Seed ignored; committed content shown.** `community-route-founders-with-leads-and-events` shows the committed Founders page; `webinars-route-nothing-published` shows the published recordings; `harvard-in-tech-upcoming-events-excludes-past-ones` shows "No upcoming events"; `harvard-in-tech-mission-band-hidden` still shows the mission band.

Other notes:
- Retried one at a time, scenarios that failed loudly in the sweep (404s, missing click targets) captured correctly. The wrong frames above are the silent kind: they pass every check the capture runs.
- Disk (39% used) and memory (13 GB available) were fine.
- The 26 loud failures in the first sweep pass (404 on seeded routes, "served app is reading COMMITTED content" blocks) are the same family, caught by the guard that exists.
- Related: [[pre-existing-not-caused-by-this-change-the-contact-with-no-email-set-homepage-scenario-never-applies-its-seed-so-its]] (JSON singletons never reloaded after a seed). That one is a separate cause, but its fix lands in the same place: `codeyamContentRefresh` in `astro.config.mjs`.

## Likely cause (unverified)

The seed adapter (`.codeyam/seed-adapter.ts`) re-initialises `.codeyam/tmp/content-sandbox/` (rm + copy) and rewrites it while Astro's glob-loader file watchers are still reacting to the previous scenario's writes. `refreshContent()` then races the watcher-triggered reloads:
- a `writeToDisk` that hits a path mid-replacement gives the error page;
- a reload that finishes after the refresh endpoint has already answered gives the previous scenario's data or committed data.

The endpoint answers 200 ("the next render will see the seed") without confirming the data store holds the seeded content.

## Implementation

1. **Reproduce deterministically.** Capture `momentum-fund-every-section-hidden` then `momentum-fund-public-visitor` back to back, and `harvard-in-tech-upcoming-events-excludes-past-ones` then `harvard-in-tech-no-upcoming-events`. Confirm the second frame of each pair shows the first one's state. Record the dev-server log around each capture.
2. **Make the refresh endpoint confirm the seed landed** (`astro.config.mjs`, `codeyamContentRefresh`):
   - wait for watcher activity to settle (no `glob-loader` reloads for ~250 ms) before calling `refreshContent()`;
   - serialize concurrent refresh calls;
   - after refreshing, verify against the seed: the adapter already reports `loaded` counts per collection, so compare them with the seed's row counts and return non-200 on a mismatch. The capture then fails loudly instead of saving a wrong frame.
3. **Fail the capture on the Astro error overlay.** Treat a rendered `UnknownFilesystemError` (or any Astro error page) as a capture failure. Check whether the capture guard already has a hook for app error markers, and if this belongs upstream in codeyam-editor, write it up for them.
4. **Recapture and verify by eye.** Recapture the 18 scenarios listed above, then compare each against its description (the review method: old vs new side by side, with the scenario description). Only then run `session-finalize`.

## Scenarios to Demonstrate

- The four back-to-back pairs from step 1, each frame showing its own seed
- `momentum-fund-the-donor-wall-moved-to-the-top` showing the network hero, matching the live preview
