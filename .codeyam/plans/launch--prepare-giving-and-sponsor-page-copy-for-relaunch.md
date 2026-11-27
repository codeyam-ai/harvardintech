---
title: "launch -- Prepare giving and sponsor page copy for relaunch"
mode: ui
createdAt: "2026-11-27T16:17:59Z"
prefix: "launch"
source: manual
---

## Summary

Get the hidden fundraising pages ready to come back. /donate (the Momentum Fund page) and /sponsor (Sponsorship) are still unlisted: you can open them by URL, but search engines are told to skip them and nothing on the site links to them. This plan covers two things. (1) A **copy sheet** lists every piece of visitor-facing text on both pages: its current wording, where it appears, the file and field it lives in, and any limits that can break the layout. The owner fills it in from their WIP copy doc. (2) The build then applies the sheet in one bulk pass and checks every affected screen at desktop and phone width, so the new copy cannot break the UI/UX. **Relisting the pages and bringing back navigation stays out of this plan.** That waits on Nicole/Ben deciding whether one page or both ship, and how the main page links to them. It is already planned in `launch--relaunch-donate-page-on-11-30` and `launch--relaunch-sponsor-page-on-11-30`.

## Key Decisions

- **Copy lands while the pages stay hidden.** Copy edits do nothing to visibility: `UNLISTED_PATHS`, `noindex`, `nav.json` and the homepage `draft` flags are untouched. So the copy can be reviewed on the preview by URL, and the go-live decision stays separate.
- **One-time copy sheet, not a reusable import script.** The clarifying question was interrupted, so this is the default chosen. Copy lives in about 40 small markdown files with a JSON fallback, so a script would cost more than a single careful pass. If several more copy rounds are expected, the sheet's column layout can become a script later.
- **Edit the content collection, and keep the JSON fallback in step.** The `src/content/...` entry wins at render time (`pageCopyMerge.ts`). `pageCopyDrift.test.ts` fails when a scalar key in `src/data/donatePage.json` / `sponsorPage.json` differs from its markdown twin. So every scalar edit is made in BOTH places, or the test goes red.
- **Structural fields are not copy.** The sheet marks these read-only: `donorTiers[].id`, sponsor-level filenames (the key a sponsor's `tier` matches), section `kind` / `layout` / `group` / `order`, `{name}` in `heroHeadlineNamed`, the `[SUPPORTER MESSAGE]` / `[DONATION LINK]` tokens in `shareMessage`, image paths, `donateUrl`, `inquiryFormUrl` and `widgetId`. Renaming any of them silently drops donors or sponsors, removes a section, or breaks personalisation.
- **The HAA disclaimer is copy, but required.** The sponsor `disclaimer` may be reworded, but it must still say that contributions are not gifts to Harvard University.
- **Copy the doc doesn't mention is kept as-is.** A blank row in the sheet means "leave unchanged", never "clear". Clearing a field falls back to the JSON value (`preferText`), so blanking it would not remove the text anyway.

## Implementation

### 1. Build the copy sheet (inventory of both pages)

**New file**: `docs/copy/fundraising-copy-sheet.md`

A table per page, one row per visible string, with these columns: *Where on the page* (e.g. "Hero headline, public visitor"), *Source* (`file` → `field`), *Current text*, *New text* (blank), and *Constraints* (placeholders, max lines at phone width, list-vs-scalar, structural/read-only). Fill it from:

- /donate frame: `src/content/pageCopy/donate.md` (hero, closing ask, stats, donor-wall empty state, donor tier names/descriptions, network/share copy), mirrored in `src/data/donatePage.json`. Also note the JSON-only keys the page still reads (`accomplishmentsTitle`, `pillarsTitle`, `testimonialsTitle`, `donorsTitle`, `donorsIntro`) and say where they render.
- /donate sections: each file in `src/content/momentumSections/` (`title`, `kicker`, `ctaLabel`, `linkLabel`, and the markdown body for `narrative` kinds). Order the sheet by each file's `order` so it reads like the page.
- /donate cards: `src/content/pillars/*.md` (`title`, `description`), `src/content/accomplishments/*.md` (`value`, `label`, `description`), and `src/content/testimonials/*.md`.
- /donate `<BaseLayout description=…>` meta description in `src/pages/donate.astro` (the search/share snippet).
- /sponsor: `src/content/sponsorPage/sponsor.md` (mirrored in `src/data/sponsorPage.json`), the `name` / `summary` / `benefits[].text` fields in `src/content/sponsorLevels/*.md`, and the meta description in `src/pages/sponsor.astro`.
- Homepage strings that point at these pages and come back with the relaunch (giving band, the SupportUs sponsor cards, the "Sponsor or host" button in GetInvolved). List them in their own section marked "returns with relaunch", so the new wording is ready but not applied.

Fill the *Constraints* column from the rendering components (`src/components/MomentumFundPage.astro`, `src/components/SponsorPage.astro`, `src/components/give/`, `src/components/sponsor/`). Record headline lengths that wrap badly on a phone, labels inside buttons, and stat values that sit in fixed-width tiles. Measure these in the preview rather than guessing.

### 2. Reconcile the owner's WIP doc into the sheet

The owner pastes or links the WIP copy doc. Map each passage to a sheet row. List three kinds of leftovers, and the owner must resolve each before anything is applied: (a) copy in the doc with no matching slot (new section? new card? → a structural change, out of scope for the bulk pass and listed as follow-up); (b) slots the doc rewrites as structural fields; (c) anything that changes the number of list items (stats, benefits, tiers, cards). Adding or removing list items is allowed but is called out, because it changes the layout.

### 3. Apply the copy in one pass

**File**: `src/content/pageCopy/donate.md`
**File**: `src/data/donatePage.json`
**File**: `src/content/sponsorPage/sponsor.md`
**File**: `src/data/sponsorPage.json`

Plus the per-entry files under `src/content/momentumSections/`, `src/content/pillars/`, `src/content/accomplishments/`, `src/content/sponsorLevels/` and `src/content/testimonials/`, and the two meta descriptions. Edit text values only. Keep YAML quoting valid: quote values containing `:` or `#`, and use `|-` for multi-paragraph `ctaBody`. Write every scalar to both the markdown and the JSON twin.

### 4. Guard against breakage

- Run the unit suite. Pay particular attention to `src/lib/pageCopyDrift.test.ts`, `src/lib/giving.test.ts`, `src/lib/momentumSections.test.ts`, `src/lib/supporterBadge.test.ts` and `src/lib/sponsors.test.ts`. A test that pins old wording should be updated to the new wording only when the wording itself is not the thing the test protects.
- Check the build log for the three /donate advisories (unknown section kind, goal meter without widget ID, empty card group). None should be new.
- Recapture the /donate and /sponsor scenarios (`momentum-fund-*`, `momentum-network-*`, `momentumclose-*`, `momentumaccomplishments-*`, `sponsorpage-*`, `sponsorlevels-*`, `sponsorwall-*`, `sponsorinquiry-*`, `sponsor-route-*`). Compare them before/after at desktop and phone width, looking for wrapping, overflow, button text spilling over, and tile heights going uneven. Fix by shortening copy (agreed with the owner), not by changing CSS, unless a component genuinely can't hold reasonable copy.
- Confirm the pages are still hidden after the change: `noindex` is still present, robots.txt still disallows both, and neither appears in the sitemap or the menu.

### 5. Hand off the open decisions

Add a short "Decisions needed from Nicole/Ben" section to the top of the copy sheet:
- Relaunch /donate, /sponsor, or both?
- Navigation from the main page: restore the "Get involved" dropdown (needs 2+ items: Volunteer plus whichever pages ship), the homepage giving band, and the sponsor cards/button, or something different?
- Is the Givebutter campaign URL ready (`donateUrl`)?

Their answers feed the two existing `launch--relaunch-*` plans, which do the actual relisting.

## Reused existing code

- `mergeDonateFrame` and `mergeSponsorCopy` from `src/lib/pageCopyMerge.ts`: the collection-over-JSON precedence that decides which copy renders
- `loadSponsorCopy` from `src/lib/sponsorPageContent.ts`, and `loadDonateFrame` / `loadDonateUrl` from `src/lib/donatePageContent.ts`
- `UNLISTED_PATHS` from `src/lib/unlistedPages.ts`: deliberately left unchanged
- `src/lib/pageCopyDrift.test.ts`: the existing guard that keeps the JSON and markdown copies identical
- Collection schemas in `src/content/config.ts` (`pageCopy`, `momentumSections`, `sponsorPage`, `sponsorLevels`): the field comments there are the source for the sheet's "structural / read-only" markings
- Existing plans `launch--relaunch-donate-page-on-11-30` and `launch--relaunch-sponsor-page-on-11-30`: these own relisting and navigation

## Scenarios to Demonstrate

- /donate, public visitor (no `?name=`), with the new copy at desktop and phone width
- /donate arriving from the email (`?name=Alex`): the named headline still personalises
- /donate with the donor wall empty: the new empty-state message
- /sponsor full page with no partners: new intro, the four levels' new summaries and benefits, the inquiry band
- /sponsor levels at phone width: the longest benefit line in the new copy
- A long-copy edge case: the longest new headline / button label from the doc, rendered at phone width