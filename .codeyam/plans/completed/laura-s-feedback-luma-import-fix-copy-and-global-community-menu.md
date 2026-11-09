---
title: "Laura's feedback: Luma import fix, copy, and Global community menu"
mode: ui
createdAt: "2026-11-06T22:30:45Z"
step: 11
source: prototype
---

## Context

Laura's site feedback (2026-11-06): one bug and seven copy or navigation suggestions. This prototype fixes the bug, makes the copy changes and restructures the menu. Past-event photos on /events is **not** prototyped and should become its own plan.

## What was prototyped (working tree)

### 1. Bug: the NYC page says "no events scheduled"
- **Root cause:** Luma answers Node's default User-Agent with HTTP 429. Every nightly `import-luma.mjs` run from at least 2026-10-23 to 2026-11-06 failed this way. The script treats that as "unreachable" and exits 0, so the deploy stayed green and imported nothing.
- **Fix:** `scripts/import-luma.mjs` now sends a named `User-Agent` header (`REQUEST_HEADERS`). A non-200 response is also logged as a `::warning::` annotation, so the failure shows on the run summary.
- **Test:** `src/lib/lumaImport.test.ts` has a new test, "names itself with a User-Agent on every feed request". It passes.
- **Real import run locally:** it added `src/content/events/2026-10-09-alumni-founders-co-working-day-october.md` and `2026-11-13-alumni-founders-co-working-day-november.md` (London), which the broken import had missed.
- **Still open:** the NYC happy hour is **not on the Harvard in Tech Luma calendar** (`cal-KK3JJjJ39Jwt9kI`). The live feed's only upcoming event is the London one. The happy hour must be added to that calendar, or co-listed on it, before it can appear. Fixing the import alone won't make it show up.

### 2. Copy edits
- `src/content/homeSections/mission.md`: removed the repeated "for technology" from the mission intro, as Laura suggested.
- `src/components/GlobalCommunityCta.astro`: the intro now reads "Stay connected wherever you are. All three are open to every alum, with or without a chapter nearby." The WhatsApp card blurb now says what members will find there (AI, building companies, investing).
- `src/components/landing/WhatsappCommunity.astro`: the lede now adds what's inside (active AI conversations, groups for founders and investors, introductions).

### 3. One label for the newsletter
The Mailchimp link appeared with six different labels. It is now "Subscribe" in the header button and "Subscribe to the newsletter" everywhere else. Files changed: `heroSlides/where-harvard-alumni-build-the-future.md`, `HeroCarousel.astro`, `OurChapters.astro` (label and body), `ChapterSignUp.astro`, `GlobalCommunityCta.astro`, `FormingChapterCta.astro`, `UpcomingEvents.astro`, `ChapterEvents.astro` (label and body). "Subscribe on Luma" was left as it is because it does something different (it follows the event calendar).

### 4. Menu restructure
- `src/data/nav.json`: the "Communities" menu is now **"Global community"**. It has two columns: a "WhatsApp community" column ("Join the community" → `/#community`) and a "Newsletter" link. Newsletter was removed from "Content hub".
- `src/lib/nav.ts`: removed `GLOBAL_COMMUNITY_ITEM` from the Chapters dropdown, which now lists only cities plus the lead call to action. `COMMUNITIES_LABEL` is now `'Global community'`. Added `WHATSAPP_GROUP_LABEL`. `withCommunityItems` now nests the derived communities (AI, Founders, Investors) inside the WhatsApp column when that column exists, and falls back to appending them as before.
- The CMS nav serializer (`normalizeNavItem`) recurses and keeps nesting, so the two-level menu survives a save from /admin.

## Remaining work for Build

1. **`src/lib/nav.test.ts`: 9 tests fail** because they pin the old menu. Update them for the new design:
   - remove the expectation that "Global community" is listed after the cities
   - the group is now named "Global community"
   - communities nest under the WhatsApp column
   - "nests no deeper than two levels" must now allow the Global community columns. Check whether the rule was meant to cap depth at three, and update it accordingly
   - the Newsletter URL assertion now applies to Global community, not Content hub
   - add a test for the WhatsApp-column nesting and its fallback
2. Fix the remaining "Communities" fixtures: `src/pages/isolated-components/[name].astro:375` and `FocusAreas.astro:55` (decide whether that label should also become "Global community").
3. Check the dropdown with columns on desktop and in the mobile drawer (`PrimaryNav.astro` mega-col branch). Register scenarios for the new menu open on desktop and mobile.
4. Recapture the scenarios affected by the label and copy changes (hero, mission, chapters, chapter page empty events, global community band, WhatsApp band).
5. Decide whether the `/#global-community` homepage band still earns its place now that nothing in the menu links to it. It still closes every chapter page.
6. Then run `npm test` and `astro check`.

## Out of scope / follow-ups
- **Past-event photos on /events:** a separate prototype. Photos are available in chapter `photos:`, the homepage gallery and `archive/strikingly/events/`.
- **NYC happy hour:** content work. Someone has to put it on the HIT Luma calendar.

## Recap for Laura (draft response)
- **NYC "no events":** you found a real bug. The nightly sync from Luma had been silently blocked for about two weeks, so no new events reached any page. It's fixed and the missed London events now appear. The NYC happy hour still has to be added to the Harvard in Tech Luma calendar; once it is, it will show up on the NYC page on its own.
- **Mission sentence:** changed to your suggested wording.
- **Photos from past events:** agreed, and it's queued as its own design pass.
- **Subscribe vs. "Join the mailing list":** every newsletter button now uses one label, "Subscribe to the newsletter" ("Subscribe" in the header). "Subscribe on Luma" stays separate because it follows the event calendar.
- **Global community wording:** rewritten as "Stay connected wherever you are…"
- **WhatsApp "why join":** added what's inside: active AI conversations, groups for founders and investors, and alumni ready to make introductions.
- **Communities menu:** restructured as you suggested. A top-level "Global community" menu now groups the online ways to connect, with AI, Founders and Investors nested under the WhatsApp community. The orphan "Global community" link is gone from Chapters.
- **Newsletter under Content hub:** moved to the Global community menu.
## Deconstruct (step 11) — extraction plan

Copy-only edits (mission, GlobalCommunityCta, WhatsappCommunity, eight newsletter labels) change strings inside existing components and need no extraction. The import fix is a header constant in `fetchFeed`, already covered by a unit test.

1. **Function `nestUnderColumn(children, columnLabel, items)`.** Move the inline column-splice out of `withCommunityItems` (`src/lib/nav.ts` ~175–186) into `src/lib/nav.ts`. It returns `children` with `items` appended inside the first column labelled `columnLabel` that has children, or appended flat when there is no such column. `withCommunityItems` keeps the anchor lookup and calls it. Tests: column present, column absent (fallback), and a same-labelled leaf with no children (not treated as a column).
2. **Function `hasColumns(item)`.** Lift the predicate `item.children.some((c) => c.children?.length > 0)` from `PrimaryNav.astro:68` into `src/lib/nav.ts`. The new Global community menu is the first authored group that takes the columns branch, so the rule gets its own tests: a flat group returns false, and a group with one titled column plus a plain link returns true.
3. **No component extraction in `PrimaryNav.astro`.** This feature does not change its markup. Its mega-menu CSS is scoped (`.mega-col a`, `.has-note`, `.nav-cta`, plus the ≤1040px drawer rules), so splitting out a link or column component would also mean moving those styles. That risks the desktop and drawer rendering for no gain here. Desktop and mobile scenarios still cover the new menu open.
4. **Removals (pre-deletion sweep done).** `GLOBAL_COMMUNITY_ITEM` is referenced only in `src/lib/nav.test.ts` (lines 7, 52, 176–177, 201), and those references get rewritten. It has no glossary entry (it is a constant). Other `global-community` hits are the homepage band's id and CSS, which stay.
5. **Fixtures.** `src/pages/isolated-components/[name].astro:375` should use the new Global community shape (WhatsApp column plus Newsletter). Leave `FocusAreas.astro:55` as "Communities": it labels a homepage focus-area card that `areaIcon('Communities')` keys on, not the menu.
6. **Tests to rewrite in `src/lib/nav.test.ts`.** The 9 failing tests listed above. The depth test becomes "nests no deeper than three levels, and only titled columns take the third level".
