---
title: "Fix the four wrong review screenshots"
mode: backend
createdAt: "2026-10-29T15:35:56Z"
source: manual
---

## Summary

Four review screenshots show the wrong state. Fix each one so the screenshot matches what its scenario describes. The public site does not change: three fixes are in the scenario harness (dev-only code and scenario files), and one is in the dev-only content refresh.

## Diagnosis (verified 2026-10-29)

1. **CMS Media Library - Adopted Images shows "No images yet".** The dev server reads the CMS public root from `CODEYAM_PUBLIC_ROOT=.codeyam/tmp/content-sandbox/public`, and that folder is empty. `resetSandboxFromProduction` in `.codeyam/seed-adapter.ts` copies only content and data, never `public/images` (5.4 MB, 78 files).
2. **Harvard in Tech - Contact With No Email Set still shows the e-mail disc.** Diagnosed in `.codeyam/plans/pre-existing-not-caused-by-this-change-the-contact-with-no-email-set-homepage-scenario-never-applies-its-seed-so-its.md`. `src/lib/site.ts` reads the settings singleton once, at module load, and the refresh endpoint in `astro.config.mjs` does not invalidate it. Follow that plan, including its red-first reproduction.
3. **Momentum Fund - Finding Your Place In The Network: the highlighted supporter is hidden.** With 19 seeded donors, the gold node lands behind the hero's intro text. Pick a search term whose node sits in open space. If a real search can land a node under the copy, fix the component instead.
4. **Dates drift daily.** These scenarios pin no clock: `chapter-gallery-show-all-revealed`, `chapter-route-events-tagged-to-this-chapter`, `chapter-route-upcoming-above-recent`, the `events-route-*` scenarios and `harvard-in-tech-upcoming-events-excludes-past-ones`. Add a per-scenario frozen clock (not on `_default`).

## Implementation

- `.codeyam/seed-adapter.ts`: also copy `public/images` into `<sandbox>/public/images` in `resetSandboxFromProduction`. Extract the copy as a pure helper with a unit test, following `src/lib/emptiedCollections.ts`.
- `astro.config.mjs` refresh endpoint: invalidate the importers of the singleton reader after `refreshContent()`, as the linked plan describes. Test the helper that picks which modules to invalidate.
- Scenario JSON edits for items 3 and 4, then re-register.

## Verification

Recapture the affected scenarios, and check each frame by eye against its description:
- the media grid shows the site's images;
- the contact section shows three social discs and no e-mail disc, and the footer has no mail link;
- the gold node is clearly visible;
- a second capture of a pinned scenario is identical.

Also load an unseeded scenario after the no-email one, and confirm the e-mail address comes back.

## Scenarios to Demonstrate

- cms-media-library-adopted-images
- harvard-in-tech-contact-with-no-email-set
- momentum-fund-filtering-the-donor-wall
- the pinned-clock event scenarios above