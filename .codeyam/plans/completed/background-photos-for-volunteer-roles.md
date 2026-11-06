---
title: "Background photos for volunteer roles"
mode: ui
createdAt: "2026-10-30T20:25:34Z"
source: manual
---

## Summary

Open volunteer roles on `/volunteer` currently show a faint crimson gradient box where a thumbnail would go, because no project in `src/content/projects/` has an `image`. Give every role a background photo instead. A city role (e.g. "City Volunteer — London") borrows its chapter's photo — the same `heroImage` the homepage "Our chapters" cards show — and every other role (Writer, Fundraising, Editorial…) gets one shared site photo, `/images/bg/hero-bg.jpg` (the homepage hero's first slide). The photo appears on the card in the grid AND behind the title on the role's own page (`/volunteer/projects/<slug>`). A project that has its own uploaded `image` keeps working exactly as it does today.

## Key Decisions

- **Explicit `chapter` field on projects, not title-sniffing.** Projects have no link to a city today. Add an optional `chapter` field holding the chapter's slug (`london`, `nyc`, `sf-bay-area`, `boston-cambridge`), mirroring the `chapter` field events already use. Parsing "— London" out of a title was considered and rejected: `nyc-ai-events` says "NYC" and "New York", and any title rewrite would silently drop the photo.
- **CMS field is free text with a hint, like events' `chapter`** — not a `select`. A select would hard-code the city list and go stale the day a chapter is added. A misspelt slug simply falls back to the shared photo, never breaks the build.
- **Own image always wins.** Resolution order: project `image` → chapter `heroImage` → shared default. When the project has its own image the detail page stays as it is now (uncropped `VolunteerProjectPhoto` band + paper header — see the comment in `VolunteerProjectHeader.astro` for why that's deliberate). Only a *fallback* backdrop goes behind the banner title.
- **Fallback photos get the chapter cards' crimson wash.** On the card thumbnail, a borrowed photo (chapter or default) is overlaid with the same gradient `OurChapters.astro` uses (`.c::after`), so it reads as atmosphere for the city rather than a photo of the role. A project's own uploaded image is shown plain.
- **Resolved in the routes, not in components.** `volunteer.astro` and `[slug].astro` already load collections; they also load `chapters` and attach a `backdrop` string to each project. Components stay props-only, so isolated-component scenarios keep working by passing `backdrop` directly.
- **Known content wrinkle (out of scope, mention to user):** the Boston chapter's `heroImage` is also `/images/bg/hero-bg.jpg`, so Boston's city role will look like a non-city role; and `nyc.md` points at `get-involved-bg.jpg` even though `public/images/chapters/nyc.jpg` exists. Both are one-line CMS fixes on the chapter entries, not code.

## Implementation

### 1. Schema + CMS field

**File**: `src/content/config.ts`

Add `chapter: z.string().optional()` to the `projects` collection schema, with a short comment that it is the chapter slug and only drives the backdrop photo.

**File**: `src/data/collections.json`

Add a `chapter` field to the `projects` collection (`type: "text"`, `optional: true`), placed after `image`, with a hint modelled on the events one: *"For a city role, the chapter's web-address ending — "london", "nyc", "sf-bay-area", "boston-cambridge". The role then shows that chapter's photo when it has no image of its own. Leave blank for a non-city role; it shows the general site photo."* Check `src/data/collections.test.ts` for any per-collection field assertions that need updating.

### 2. Backdrop resolver (pure, unit-tested)

**File**: `src/lib/projects.ts`

- Add `chapter?: string` to `ProjectEntryLike.data` and `ProjectCardData`, and carry it through `projectCardData` (the comment above that function warns that a field missing from the projection silently never reaches a card).
- Add `DEFAULT_PROJECT_BACKDROP = '/images/bg/hero-bg.jpg'` (new).
- Add `projectBackdrop(project: { chapter?: string }, chapters: readonly { id: string; heroImage?: string }[]): string` (new) — the matched chapter's `heroImage` if the slug matches a chapter that has one, else the default. Pure, never throws, empty-string `chapter` treated as absent.
- Add `withProjectBackdrops(projects, chapters)` (new) — maps a list, adding `backdrop` to each. Used by both routes.

**File**: `src/lib/projects.test.ts`

Tests for: matched chapter → its heroImage; matched chapter with no heroImage → default; unknown/misspelt slug → default; no chapter → default; empty string → default; `projectCardData` carries `chapter`; `withProjectBackdrops` is non-mutating.

### 3. Routes load chapters and attach backdrops

**File**: `src/pages/volunteer.astro`

`await getCollection('chapters')`, map to `{ id, heroImage }`, and pass the projects through `withProjectBackdrops` before handing them to `VolunteerPage`.

**File**: `src/pages/volunteer/projects/[slug].astro`

Same: load chapters, compute this project's `backdrop` with `projectBackdrop`, and run `related` through `withProjectBackdrops` so suggestion cards get photos too. Pass `backdrop` to `VolunteerProjectPage`.

### 4. Card thumbnail uses the backdrop

**Files**: `src/components/volunteer/VolunteerProjects.astro`, `src/components/volunteer/VolunteerProjectCard.astro`, `src/components/volunteer/VolunteerProjectThumb.astro`, `src/components/volunteer/VolunteerRelatedProjects.astro`

Add `backdrop?: string` to `VolunteerProjectLike` and thread it down to the thumb. In the thumb: own `image` → unchanged; else `backdrop` → render the photo with the crimson wash overlay (reuse the gradient from `OurChapters.astro`), same 168px height, still `alt=""`/decorative; neither → the existing gradient placeholder (keeps isolated scenarios that pass no backdrop unchanged). The "hide placeholder below 720px" rule should only apply to the true placeholder, not a backdrop photo.

### 5. Detail page banner uses the backdrop

**Files**: `src/components/volunteer/VolunteerProjectPage.astro`, `src/components/volunteer/VolunteerProjectHeader.astro`

Add `backdrop?: string` to both. In the header: when the project has no own `image` and a `backdrop` is given, render `PageBanner` with `tone="photo"` and `image={backdrop}`; otherwise keep `tone` paper as today. Update the header's top comment to describe the new rule. Verify the meta row and back link stay legible on the photo tone's scrim (they may need the light-on-dark styles the photo tone uses for the lede).

### 6. Tag the city roles

**Files**: `src/content/projects/city-volunteer-london.md`, `src/content/projects/city-volunteer-new-york-city.md`, `src/content/projects/city-volunteer-sf-bay-area.md`, `src/content/projects/city-volunteer-boston-cambridge.md`, `src/content/projects/nyc-ai-events.md`

Add `chapter: london` / `nyc` / `sf-bay-area` / `boston-cambridge` / `nyc` respectively.

## Reused existing code

- `PageBanner` from `src/components/ui/PageBanner.astro` — its `tone="photo"` already handles image + scrim + paper fallback
- `OurChapters` from `src/components/landing/OurChapters.astro` — the crimson gradient wash to copy onto the thumbnail
- `projectCardData`, `openProjects`, `relatedProjects` from `src/lib/projects.ts`
- `withBase` from `src/lib/url.ts`, `altFor` from `src/lib/media.ts`
- The events collection's `chapter` field (schema in `src/content/config.ts`, CMS hint in `src/data/collections.json`) as the precedent for a slug-valued text field

## Scenarios to Demonstrate

- `/volunteer` with the real fall roles: London, NYC, SF city roles show their chapter photos with the crimson wash; Writer / Fundraising show the shared site photo; no grey gradient boxes remain (update `volunteer-page-open-projects` / `volunteer-page-fall-2026-roles` seed data with `chapter` values)
- A project with its own uploaded image AND a chapter — own image shown plain on the card, uncropped photo band on the detail page (existing `volunteer-project-detail-photo-and-own-sign-up-link`)
- Detail page for "City Volunteer — London" with no own image — London photo behind the banner title, meta row and back link legible
- Detail page for a non-city role — shared site photo behind the banner
- A project whose `chapter` is misspelt (`londn`) — falls back to the shared photo, no error
- Phone width (≤720px) — single-column grid shows backdrop photos, not hidden
- Empty state (`volunteer-page-no-open-projects`) — unchanged