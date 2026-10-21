---
title: "NS -- Lead profiles with headshot, bio and contact links"
mode: ui
createdAt: "2026-10-21T23:52:07Z"
prefix: "NS"
source: manual
---

## Summary

Chapter and community leads can only have a `name` and a `role` today (`src/content/config.ts`, the `leads` field on both `chapters` and `communities`), and `ChapterLeads.astro` shows them as a bare name list. Nicole asked for real lead profiles twice. On 4 Aug she asked for Lead, Co-Lead and Committee members with name, school and grad year, title, company, LinkedIn and email. On 21 Oct she asked for headshot, name, LinkedIn, email and bio, and attached a layout mockup (below). With nowhere to put them, when she added Nemo Shi as London's lead his bio went into the chapter's own "about" text and his LinkedIn became a London chapter link (commit `75d884d`). This plan adds the fields, builds the profile layout, and moves Nemo's details to where they belong.

![Nicole's proposed lead layout](assets/ns--lead-profiles-with-headshot-bio-and-contact-links/lead-layout.webp)

## Key Decisions

- **One richer lead shape, shared by chapters and communities.** Both collections already share the field. Define the lead object once and use it in both. Every new field is optional, so existing `{name, role}` entries still validate and render.
- **Fields:** `name` (required), `role` (Lead / Co-Lead / Committee member, entered as text), `photo`, `title`, `company`, `school`, `gradYear`, `linkedin`, `email`, `bio`. That covers both of Nicole's lists. The CMS edits a list of objects with image sub-fields through the picker (`EntryEditor` `listImage`), so the headshot needs no CMS change.
- **Layout follows her mockup:** round headshot on a crimson disc, initials when there's no photo (as on the board tiles), serif name, "Title, Company", then a mono crimson "School · Degree 'YY" line. Then the bio, then LinkedIn and email icon links. Leads and co-leads come first as full profiles. Committee members follow in a compact grid. The "01 / 07" counter in the mockup is decoration from the sample and is left out.
- **Email shows as a `mailto:` link only when one is filled in.** Leads opt in by adding it.

## Implementation

### 1. Schema

**File**: `src/content/config.ts`

Extract a `leadSchema` and use it for `leads` in both `chapters` and `communities`. Update the comment above `chapters` that calls leads "named organizers".

### 2. Profile component

**File**: `src/components/ChapterLeads.astro`

Render the profile layout and the committee grid from the new fields. Keep the `heading` prop that `CommunityPage.astro` uses. Resolve headshot alt text through `altFor`, following `BoardMemberTile.astro`, and use `initials` from `src/lib/team.ts` for the fallback. Use the `Lead` type in `ChapterPage.astro`, `CommunityPage.astro` and `PageNarrowBody.astro`, from the schema rather than three hand-written copies.

### 3. Move London's content to the right fields

**File**: `src/content/chapters/london.md`

Move Nemo Shi's bio and LinkedIn into his `leads` entry with role "Chapter Lead", and remove the LinkedIn row from `links`. Put back the chapter's body text, "Evening socials and founder roundtables connecting Harvard alumni across the UK and Europe." (from before `75d884d`). Leave `photos` alone; the deploy-unblock plan sets them.

### 4. Isolated component scenarios

**File**: `src/pages/isolated-components/ChapterLeads.astro`

Add variants for a full profile, a profile with no photo, and a lead with committee members.

## Reused existing code

- `BoardMemberTile.astro` (avatar/initials pattern) in `src/components/landing/BoardMemberTile.astro`
- `initials` from `src/lib/team.ts`
- `altFor` from `src/lib/media.ts`
- `externalLinkAttrs` from `src/lib/externalLink.ts` for the LinkedIn link

## Scenarios to Demonstrate

- London chapter page: Nemo's full profile (photo, title, school, bio, LinkedIn); page text restored
- A chapter with a Lead, a Co-Lead and three committee members
- A lead with only a name (old-style entry still renders)
- A lead with no headshot (initials disc)
- A community page with one lead ("Community lead" heading)