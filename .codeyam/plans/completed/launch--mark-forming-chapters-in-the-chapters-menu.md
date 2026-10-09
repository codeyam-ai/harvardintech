---
title: "launch -- Mark forming chapters in the Chapters menu"
mode: ui
createdAt: "2026-10-08T18:55:39Z"
prefix: "launch"
source: manual
---

## Revision at the demo (2026-10-08) — supersedes the "Forming" pill below

The user reviewed the pill and redirected the work. The original plan below is kept for history; where they differ, this section wins.

- **DC and Seattle are online groups for now, not forming chapters asking for a lead.** The internal `status: forming` value stays (no content migration); every visitor-facing word changes: menu note "Online · WhatsApp group" with a small globe icon, homepage card eyebrow "Online · WhatsApp group" (a muted mono caption with the globe icon, flush with the city name — the user rejected a pill here too), kicker "04 cities · 2 online", banner eyebrow "Online group" (`bannerFor`), hero lede "with online groups in DC and Seattle", and `FormingChapterCta` now leads with "Join WhatsApp" + "See online events" (the "help lead it" volunteer ask is gone; a soft "bring in-person events → Contact us" line remains). The DC/Seattle markdown blurb, tagline and body were rewritten to match.
- **Menu style: quiet grey subtitles, left-aligned (mockup B), not pills.** `NavItem` carries `note`, `noteIcon` and `cta` instead of `badge`.
- **The lead/co-lead ask is one closing link, not per-city notes.** The dropdown always ends with "Lead or co-lead a chapter →" linking to /volunteer (`LEAD_CTA_ITEM`). A per-city "Looking for a co-lead" note and a `seekingLead` CMS checkbox were built and shown at the demo, then removed at the user's request ("remove looking for a co-lead from the dropdown"). Only the Online note remains per city.
- **Events lede lists active chapters only** — unchanged from the original plan.
- **Out of scope, queued separately:** refreshing /volunteer from the "Fall 2026 | HIT Volunteer Opportunities" sheet (roles and descriptions only — never volunteers' names or contact details).

Scenarios to demonstrate after the revision: the desktop dropdown (co-lead notes on Boston/NYC/SF, Online notes on DC/Seattle, closing CTA); the phone drawer; the Seattle chapter page; the homepage chapter cards; the events intro.

## Summary

The site already knows which chapters are running and which aren't. Each chapter has a `status` of `active` or `forming`. NYC, SF, Boston and London are active. Seattle and DC are forming, which means they have a WhatsApp group but no local lead yet. The homepage "Our chapters" cards already show a "Forming · help lead it" badge, and forming chapter pages already lead with the volunteer + apply-to-join-the-WhatsApp ask.

The **Chapters dropdown in the header** doesn't show any of this. It lists all six cities the same way, so Seattle and DC look like full chapters. The events intro has the same problem: it says "events … across our New York City, SF & Bay Area, Boston & Cambridge, London, Seattle / Pacific Northwest, and DC and DMV Area chapters", which claims in-person events in two cities that don't hold any.

This plan keeps the dropdown as one list (the user's choice). It adds a small **"Forming" tag** after each forming city and limits the events lede to active chapters. Promoting Seattle or DC later stays a one-field change: set the chapter's status to `active` in /admin, and the tag disappears and the city joins the events lede automatically.

## Key Decisions

- **One list with a tag, not two labelled columns.** The user chose the smallest visual change. The WhatsApp application link stays on the forming chapter page (`FormingChapterCta`), one click away, and isn't repeated in the menu.
- **The tag comes from `status`, never hand-written.** It's a new optional `badge` on the injected chapter `NavItem`, set by `chapterNavItems` from `chapterStatus()`. `nav.json` is never touched, so the CMS serializer (`normalizeNavItem`, which drops unknown keys) can't strip it. The chapters group is injected at render time and is never saved.
- **The tag text is "Forming".** That matches the word the homepage badge and the "4 cities · 2 forming" kicker already use. The longer "help lead it" wording stays on the cards, where there's room.
- **Order is unchanged.** `byPresence` already puts active cities first, then forming ones, then "Global community".
- **The events lede lists active chapters only.** Forming chapters hold no events, so naming them in "In-person events … across our X chapters" is a false claim. Filter with `presenceSummary(...).active` before building labels. Don't add a forming clause to the sentence. The global-community tail already covers everyone else.
- **Out of scope: the "four city chapters" copy.** Sponsor intro, stat strip and similar copy already say four (+ forming) after the "make the site's numbers agree" plan, so those numbers are right.

## Implementation

### 1. Optional badge on nav items

**File**: `src/lib/site.ts`

Add `badge?: string` to `NavItem`, with a doc comment saying it's display-only and only set on derived (injected) items, because the CMS round-trip drops unknown keys.

### 2. Tag forming chapters in the derived menu items

**File**: `src/lib/nav.ts`

In `chapterNavItems`, set `badge: 'Forming'` when `isForming(chapter)` is true (import from `./localPresence`). Leave the key out for active chapters, so existing deep-equality tests on active items still pass. Update the `ChapterLike.status` doc comment: status now affects display (the tag) as well as order.

Extend `src/lib/nav.test.ts`:
- a forming chapter gets `badge: 'Forming'`
- an active chapter (and one with no status) has no `badge`
- `withChapterGroup` keeps the badge on its children

### 3. Render the tag in the dropdown (desktop and mobile drawer)

**File**: `src/components/nav/PrimaryNav.astro`

In the single-column branch (around lines 90–96) and the leaf branch of the grouped-column layout (around lines 72–76), render `{child.badge && <span class="nav-badge">{child.badge}</span>}` after the label, inside the `<a>`, so the whole row stays one link. Style `.nav-badge` as a small pill. Reuse the look of `.badge` in `src/components/landing/OurChapters.astro` (muted crimson, small caps), but smaller. Check the mobile drawer rules (around line 374) so the pill doesn't wrap under "Seattle / Pacific Northwest" at 375px.

Accessibility: the visible text "Forming" is enough, because screen readers announce it inside the link ("Seattle / Pacific Northwest Forming"). No `aria-label` override is needed.

### 4. Events lede names only active chapters

**File**: `src/components/EventsIntro.astro` and `src/components/EventsIntroBand.astro`

Both compute `eventsLede(chapterNavItems(chapters).map((c) => c.label))`. Pass `presenceSummary(chapters).active` into `chapterNavItems` instead, so the label list contains only active cities. `eventsLede` itself stays the same: it formats whatever cities it's given. Add a test in `src/lib/eventsIntro.test.ts` or `src/lib/presenceConsistency.test.ts` that pins the rule: build the lede from the real chapters collection and assert that no forming chapter's `city` appears in it.

### 5. Scenarios

Update the existing `primarynav-derived-chapters` and `primarynav-sixth-chapter-published` scenarios, and add one forming-tag scenario (see below). Re-capture the events-intro scenarios (`eventsintro-the-page-s-own-title`, `eventsintroband-closing-flush-against-the-calendar`), because their lede text changes.

## Reused existing code

- `chapterNavItems`, `withChapterGroup`, `GLOBAL_COMMUNITY_ITEM` from `src/lib/nav.ts` (glossary: `chapterNavItems`, `withChapterGroup`)
- `isForming`, `chapterStatus`, `presenceSummary`, `byPresence` from `src/lib/localPresence.ts` (glossary: `presenceSummary`, `byPresence`)
- `eventsLede` from `src/lib/eventsIntro.ts` (glossary: `eventsLede`)
- `.badge` styling in `src/components/landing/OurChapters.astro`, the visual precedent for "Forming"
- `FormingChapterCta` in `src/components/FormingChapterCta.astro`, the existing apply-to-join-the-WhatsApp destination that forming menu items already link to
- Existing tests: `src/lib/nav.test.ts`, `src/lib/localPresence.test.ts`, `src/lib/eventsIntro.test.ts`, `src/lib/presenceConsistency.test.ts`

## Scenarios to Demonstrate

- **Chapters dropdown open, real roster.** Four active cities with no tag, then Seattle and DC each with a "Forming" pill, then Global community (desktop).
- **Mobile drawer, Chapters expanded.** The long "Seattle / Pacific Northwest" label plus pill fits at phone width without breaking awkwardly.
- **All chapters active.** No pills anywhere. Shows that promoting a city in /admin removes the tag.
- **Events intro.** The lede names only NYC, SF & Bay Area, Boston & Cambridge and London.