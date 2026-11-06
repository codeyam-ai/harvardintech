---
title: "Close the CMS checkbox traps that can block deploys or ignore edits"
mode: ui
createdAt: "2026-11-06T01:31:11Z"
source: manual
---

## Problem

The CMS (`@codeyam/cms` 0.15.0) writes a ticked checkbox as `true` and an
unticked one as nothing at all (`node_modules/@codeyam/cms/src/lib/entryEditor.ts:308`
— "a false flag is omitted"). Every save therefore erases any `false` a page
held. Yesterday's fix (d48091a) made `showGallery` opt-in, so a dropped `false`
no longer breaks the gallery — but two traps remain:

1. **Deploy blockers an editor can trip.** `src/lib/contentImages.test.ts` runs
   in the deploy (`npm test`, `.github/workflows/deploy.yml:141`) and fails the
   build when a chapter has curated photos but no `showGallery: true`, or sets
   `showGallery: true` with no photos. Adding photos in the CMS without ticking
   "Show event gallery" (or the reverse) stops every deploy again. The CMS hint
   still says "Blank shows the gallery", which is now the opposite of the truth.
2. **Retiring is silently ignored.** Board members (`src/lib/team.ts:48`) and
   volunteer roles (`src/lib/projects.ts:23`) are shown unless `active` is
   explicitly `false`. Unticking "Active" / "Open for applications" in the CMS
   saves nothing, so the person or role stays on the site.

## Change

- **Gallery follows the photos.** A chapter shows "Photos from <city>" exactly
  when it has its own curated photos; no checkbox. Remove `showGallery` from the
  CMS fields, schema and content files; drop the shared-New-York-wall fallback
  on chapter and community pages (it is what the deploy check existed to
  forbid). Communities have no photo field, so they show no gallery (all are
  off today). The two `showGallery` deploy checks go away — nothing left to trip.
- **Retire with a tick, not an untick.** Replace `active` with a checkbox whose
  ticked state is the exception: board members get "Retired — hide from the
  board", volunteer roles get "Closed — no longer taking applications". Blank
  (what the CMS writes when unticked) means shown. Existing `active: true`
  lines are removed from content.

## Scenarios

- Chapter with its own photos → gallery shown (existing chapter-gallery-*).
- Chapter with no photos → no gallery (existing chapter pages for Seattle/Boston).
- Board with one retired member → hidden.
- Volunteer page with one closed role → not listed, and never suggested.

## Not in scope

The CMS's own checkbox behaviour lives in the `@codeyam/cms` package; it is
recorded as a CodeYam improvement rather than patched here.