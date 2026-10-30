---
title: "Tighten in-person chapter bios so they don't promise specific events"
mode: ui
createdAt: "2026-10-30T21:39:32Z"
source: manual
---

## Summary

The chapter pages for the four in-person cities (Boston & Cambridge, New York City, SF & Bay Area, London) open with copy that promises specific event formats the chapters can't yet reliably deliver — "Founder dinners, campus meetups, and panels with Harvard faculty", "Regular founder dinners, panels…", "investor mixers", "founder roundtables". Rewrite each chapter's "about" body copy to be shorter and more general: who the chapter is for and that it brings alumni together in person, without naming particular event types or a cadence. DC and Seattle already read honestly as online groups and are left alone.

## Key Decisions

- **All four in-person cities, not just Boston and NYC** — the user chose a consistent standard so no city page promises a particular kind of event.
- **Body copy only; frontmatter mostly untouched** — the promises live in the markdown body. `blurb` and `tagline` are already general ("Home of Harvard, our Cambridge and Boston community.", "We are the … Chapter of Harvard Alumni in Tech.") and stay as is. NYC's blurb "Our founding chapter and largest community" is a claim about size, not events — keep it unless the user flags it at review.
- **Short: one or two sentences per chapter** — e.g. Boston: "A home base for Harvard alumni working in tech around Boston and Cambridge. We get together in person throughout the year — follow our events to hear about the next one." Final wording is the build step's call; it must not name event formats (dinners, panels, mixers, roundtables, socials) or a frequency ("regular", "monthly").
- **Boston's "hosted an Alumni Day this year and will host more soon" line** — drop the "will host more soon" promise; a past-tense mention of the Alumni Day is fine to keep or fold into the general sentence. Keep the HTML banner-slot comment intact (it is an editor note, not rendered copy).
- **Edits are content-only** — made in the markdown files (the same files the CodeYam CMS edits), so no schema, component or test changes are needed. No existing test pins chapter body text.

## Implementation

### 1. Boston & Cambridge

**File**: `src/content/chapters/boston-cambridge.md`

Replace the two body paragraphs with one or two short general sentences (see Key Decisions). Leave the banner-slot comment and frontmatter as is.

### 2. New York City

**File**: `src/content/chapters/nyc.md`

Replace "Regular founder dinners, panels, and community gatherings across the city." with a general line about bringing NYC alumni in tech together in person.

### 3. SF & Bay Area

**File**: `src/content/chapters/sf-bay-area.md`

Replace "Founder dinners, investor mixers, and small-group conversations…" with a general line that keeps the geography (San Francisco, the Peninsula, Silicon Valley) but drops the event list.

### 4. London

**File**: `src/content/chapters/london.md`

Replace "Evening socials and founder roundtables connecting Harvard alumni across the UK and Europe." with a general line that keeps the UK/Europe reach. Leave the lead bio and `leadsNote` alone.

### 5. Keep the isolated-component fixtures in step

**File**: `src/pages/isolated-components/[name].astro`

The scenario fixtures still carry the old wording — the NYC body paragraph near line 1100 and an older NYC blurb near line 119 ("…hosting monthly mixers, founder dinners, and the annual … Summit"). Update them to match the new copy so scenario screenshots don't show promises the live pages no longer make.

## Reused existing code

- Chapter content collection schema in `src/content/config.ts` (`chapters`, body = "about this chapter" copy) — unchanged.
- Chapter page `src/pages/chapters/[slug].astro` renders the body, `blurb` and `tagline` — unchanged.
- DC and Seattle copy (`src/content/chapters/dc-dmv.md`, `src/content/chapters/seattle.md`) is the tone reference: plain, honest, no promised formats.

## Scenarios to Demonstrate

- Boston & Cambridge chapter page with the shortened copy (banner slot unchanged)
- New York City chapter page with the shortened copy and its photo gallery
- SF & Bay Area chapter page with the shortened copy and interim lead
- London chapter page with the shortened copy alongside the lead profile and co-lead note