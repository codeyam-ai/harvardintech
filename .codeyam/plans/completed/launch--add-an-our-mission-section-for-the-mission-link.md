---
title: "launch -- Add an Our mission section for the Mission link"
mode: ui
createdAt: "2026-10-09T19:42:08Z"
prefix: "launch"
source: manual
---

## Summary

The menu's **About › Mission** link goes to `/#about`. That anchor sits on the homepage hero carousel (`src/components/landing/HeroCarousel.astro`), which shows rotating slides and no mission statement. The original site's hero carried the mission paragraph; the Atlas redesign (commit 0498eab) replaced it with the carousel and kept the `id="about"`, so "Mission" now lands on marketing slides. Nicole raised the same gap in `docs/launch-decisions-2026-09-16.md` ("Where has the homepage mission statement got to?").

The fix: **keep the carousel exactly as it is, still at `#about`**, and add a new **Our mission** band directly below it at `#mission`. The menu's Mission item points to `/#mission`. The old `/about` and `/about-us` redirects keep landing on the carousel at `/#about`. The copy comes from slide 3 ("What is Harvard in Tech?") of the June 8, 2026 volunteer all-hands deck the user supplied.

## Key Decisions

- **Two anchors, two destinations.** `#about` stays on the hero carousel (the top of the homepage, which is also where the About redirects go). `#mission` is new and belongs to the mission band. The user asked for this split explicitly.
- **A new `mission` homepage band, not a carousel slide.** A slide rotates away, and a link target has to stay put. As a band it can be reordered, drafted, or held as "coming soon" from /admin, and hiding it removes the Mission menu item through the existing `hiddenSectionAnchors` coupling.
- **Copy is the deck's own words, lightly arranged:**
  - Kicker: `Our mission`
  - Heading (the Vision, with the emphasized tail `emphasizedHeading` already supports): `Building the world's #1 alumni community to *inspire and steward the future of tech.*`
  - Lede: `Harvard Alumni in Tech is an official Harvard Alumni Association–recognized Shared Interest Group (SIG), connecting Harvard alumni working in and passionate about technology.`
  - Purpose: `We foster a vibrant community where Harvard alumni in tech connect, collaborate, and support each other across technology interest areas and geographies.`
  - Goals, as a short list: `A network of alumni who give back and help each other` · `High-quality events, resources, and interactions` · `Thought leaders and stewards of the broader tech community`
- **"Official HAA-recognized SIG" is confirmed wording.** The user confirmed the org is an official Harvard Alumni Association–recognized Shared Interest Group, so the lede states it plainly.
- **No outbound link to the HAA SIG directory.** The user prefers driving traffic to the site rather than away from it. The directory URL (https://alumni.harvard.edu/community/clubs-sigs/sigs-directory?field_club_sig_category_value=technology-innovation) is recorded here in case that changes.
- **Copy lives in the content entry, editable in /admin.** The kicker, title and intro go in existing fields; the purpose and goals go in the entry's markdown body. The component holds the same wording as defaults so an empty entry still renders it, the convention every band follows.
- **Placement: second, between the hero and the stats band**, so "who we are" comes right after the carousel and before the numbers.

## Implementation

### 1. Register the `mission` kind and its anchor

**File**: `src/lib/homeSections.ts`

Add `'mission'` to `HOME_SECTION_KINDS`, `mission: 'Our mission'` to `HOME_SECTION_LABELS`, and `mission: '/#mission'` to `HOME_SECTION_ANCHORS`. Leave `hero: '/#about'` untouched.

### 2. Mission band component

**New file**: `src/components/landing/MissionStatement.astro`

A section with `id="mission"`. Props: `heading`, `kicker`, `intro` (via `sectionCopy`), plus the rendered body. Use the `emphasizedHeading` pattern from `MomentumMission.astro` for the crimson tail, laid out as a narrow, readable statement band in the homepage's existing style (not the gold Momentum Fund styling). Defaults hold the copy above.

### 3. Wire it into the homepage stack

**File**: `src/components/landing/HomeSections.astro`

Add a `section.kind === 'mission'` branch. The entry's markdown body has to reach the component, but `loadHomeSections` in `src/lib/homeSectionsContent.ts` does not render bodies today. Follow however `MomentumFundPage.astro` gets its sections' bodies.

### 4. Point the menu at it

**File**: `src/data/nav.json`

Change About › Mission from `/#about` to `/#mission`. Board stays `/#board`. `src/lib/redirects.ts` keeps `/about` and `/about-us` → `/#about`; reword the comment above them ("The mission hero, which is where the nav's own Mission link goes") to say they land on the homepage hero.

### 5. Content entry and CMS

**New file**: `src/content/homeSections/mission.md` with `kind: mission`, `order: 2`, the kicker, title and intro in frontmatter, and the purpose and goals in the body. Renumber `stats` and every later band +1 to keep the existing order.

**File**: `src/data/collections.json`

Add `mission` to the homeSections `kind` options and hint text. If the homeSections collection has no body/markdown field, add one so the purpose and goals are editable in /admin.

### 6. Tests

**File**: `src/lib/homeSections.test.ts` (around line 131)

Add cases: `sectionAnchorId('mission')` is `'mission'`, `sectionAnchorId('hero')` stays `'about'`, and hiding the mission band reports `/#mission` in `hiddenSectionAnchors`. Check `src/lib/nav.test.ts` for any assertion on the real `nav.json` Mission URL; fixtures that merely use `/#about` as sample data can stay.

## Reused existing code

- `HOME_SECTION_ANCHORS`, `sectionAnchorId`, `hiddenSectionAnchors`, `sectionCopy`, `HOME_SECTION_LABELS` from `src/lib/homeSections.ts`
- `emphasizedHeading` from `src/lib/campaignCopy.ts` (the crimson tail used in `src/components/donate/MomentumMission.astro`)
- `SectionHead` from `src/components/ui/SectionHead.astro`
- `loadHomeSections` from `src/lib/homeSectionsContent.ts`
- Content-driven band stack in `src/components/landing/HomeSections.astro`

## Reproduction Test

The menu's Mission link lands on the hero carousel because no band owns a mission anchor.

**Target**: `src/lib/homeSections.test.ts`. Run with `codeyam-editor editor refresh-tests --test <name>`.

```ts
// "Mission" needs its own band and anchor; the carousel keeps #about.
it("gives the mission band its own #mission anchor while the hero keeps #about", () => {
  expect(sectionAnchorId('mission')).toBe('mission');
  expect(sectionAnchorId('hero')).toBe('about');
});
```

Status: PROPOSED — confirm red at execution. Expected failure: `sectionAnchorId('mission')` returns `undefined` (no such kind yet), so the first assertion fails.

## Scenarios to Demonstrate

- Mission band as authored (deck copy) on the full homepage, sitting right under the hero
- Isolated `MissionStatement` with an empty entry, so the default copy renders
- Mission band set to "coming soon": the placeholder still carries `id="mission"`
- Mission band hidden: the About › Mission menu item disappears

Capture notes: URL fragments do not scroll captures (`/#mission` still shoots the hero), so frame the band with a `hover` interaction on it. Other scenarios share the `/` route, so always `--target` the recapture.