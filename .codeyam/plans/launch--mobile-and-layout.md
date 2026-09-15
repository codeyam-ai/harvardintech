---
title: "launch -- Mobile And Layout"
mode: ui
createdAt: "2026-09-14T17:28:03Z"
prefix: "launch"
source: manual
---

# Launch: Mobile And Layout

## Summary

**What "phone menu" means, in plain terms.** On any screen 1040px wide or narrower (every phone, most tablets), the site's header has no menu button. Instead, `src/components/nav/PrimaryNav.astro` turns off its hover dropdowns and lays **every dropdown panel out open, one below another** (Programs, Chapters, Communities, Content Hub, Membership). So on a phone, the first screen and more is only links. The hero, the events and everything else are pushed far below. The committed `harvard-in-tech-landing-page--mobile.png` (390px wide) shows red city bar, logo, Subscribe, then menu panels to the bottom of the frame. Above that, the crimson city bar (`src/components/nav/UtilityBar.astro`) wraps to three lines. Phone visitors today see a wall of navigation, not the site.

This plan makes the site mobile adaptive in five pieces:
1. A real phone menu. A hamburger button opens and closes the menu. It is accessible, works without JavaScript and closes when you navigate.
2. The city bar stays one line on phones.
3. The homepage "No upcoming events" state says it once, with no stray card.
4. `/events` shows each event once. The Luma embed covers upcoming events, the site's own list covers past events, and the embed box is sized so it isn't mostly empty.
5. Every public page gets phone-size (390x844) scenarios, plus a responsive checklist for the main components.

Note on the audit: it counted three mobile screenshots. Seven `*--mobile.png` files are committed: landing, momentum-fund x2, supporter-network x2, volunteer project page and cutover runbook. None cover events, chapters, communities, sponsor, blog, CMS-written pages or the board. `/give` and 404 have no scenario at all.

## Owner decisions (2026-09-14)

- **Phone menu:** Plan it. "Give me more context on what is meant by 'phone menu' but yes we want this site to be mobile adaptive."
- **Check every page on a phone:** Plan it.
- **"No upcoming events" appears twice, and the misaligned card:** Plan it.
- **The mostly-empty events calendar box:** Plan it.
- **The city bar wrapping:** Plan it.
- **The Luma calendar:** Keep. "Fix so events aren't duped between embedding Luma and other stuff on the apge."
- **Broader goal:** "we want this site to be mobile adaptive"
- **Events page, after Nicole's walkthrough (2026-09-14).** Nicole asked to remove the Upcoming list under the calendar, which this plan already does (C). The owner decided that a "View all past events" link after the past events goes to Luma (step 8).

## Open questions / needs input

1. **Answered (2026-09-14).** The Eventbrite "View Upcoming Events" button goes (`launch--contact-and-calls-to-action`: Luma only). In its place, after the past events, a "View all past events" link goes to Luma (step 8).
2. **For the owner / content editors.** Once `/events` shows only *past* events from the `events` collection, is someone still adding each event to the CMS after it happens? The homepage "Upcoming events" band also reads this collection. If editors stop adding upcoming events there, the homepage goes to its empty state even while Luma has events. Decide: keep entering upcoming events in the CMS (for the homepage), or a later plan switches the homepage to link to Luma.
3. **For the owner.** On phones the city bar would read "A global community · 6 chapters". OK, or would you rather show only "A global community"?
4. **For the implementer (verify, no owner input needed).** Can the Luma embed tell the page its content height (postMessage)? If yes, size the iframe to it. If not, use the fixed responsive height in step 6.

## Recommendations

**Events de-duplication (the main call).** Options:
- **A. Embed only.** Remove the site's list from `/events`. Simplest, but the event archive disappears, and Luma's embed shows only upcoming events.
- **B. Site list only.** Drop the embed. Keeps the look consistent, but the list goes stale unless editors copy every Luma event into the CMS. It also contradicts the owner's "Keep".
- **C. Embed for upcoming + site list for past events only.** ← **Pick.**

Why C: Luma is where events are actually created, so its embed is the live, always-correct upcoming view (and it keeps RSVP/Waitlist in one place). Luma's embed has no past-event archive (see the comment in `src/components/LumaCalendar.astro`). The site's past-events list fills that gap without overlapping. The two halves never show the same event. If `LUMA_EMBED_URL` is ever emptied, the page falls back to the site's upcoming list, so the page never goes blank.

**Phone menu.** A: a slide-in overlay drawer. B: an in-flow disclosure panel under the header row. ← **Pick B.** It needs no scroll-lock or focus trap, has the fewest failure modes, and matches the owner's ask for a disclosure.

**"No upcoming events" twice.** A: keep the lede under the heading and delete the right-hand "No upcoming events" card. B: keep the card and drop the lede. ← **Pick A.** The lede explains *and* points at the buttons directly beneath it. Deleting the card also removes the misaligned element.

**City bar.** A: horizontal scroll or marquee. B: ellipsis truncation. C: a compact line on phones ("A global community · N chapters"). ← **Pick C.** It is readable, derived from data and never wraps.

## Implementation

1. **Phone-menu helper (new), `src/lib/navDisclosure.ts`.** Export `initNavDisclosure(root: HTMLElement, mql: MediaQueryList)`, a pure DOM function so it can be tested in jsdom, following the pattern of `src/lib/momentumNetworkDom.ts`. Its job is to upgrade the no-JS `<details>` into a button disclosure:
   - Insert `<button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-menu" aria-label="Menu">` (a hamburger icon plus the visible text "Menu"). Hide the `<summary>`, force `details.open = true`, and drive visibility from a `data-open` attribute on the header. The inner `<details>` is then inert, and the button is the single control.
   - **Toggle:** clicking the button flips `aria-expanded` and `data-open`. Focus stays on the button when opening (disclosure pattern, no trap).
   - **Escape** while focus is inside the menu closes it and returns focus to the button.
   - **Close on navigation:** any `click` on an `a[href]` inside `#site-menu` closes the menu. This matters for same-page links like `/#events` and `/#board`, which don't reload. On `pageshow` with `event.persisted` (back/forward cache), reset to closed.
   - **Breakpoint:** when `mql` (`(max-width: 1040px)`) stops matching, clear the state and remove `hidden`, so the desktop hover mega-menu is untouched.
2. **`src/components/nav/PrimaryNav.astro`.** Wrap the existing `<nav class="links">` in `<details class="nav-drawer" open>` with `<summary class="nav-summary">Menu</summary>`, and give the nav `id="site-menu"`. `open` in the markup means desktop and no-JS always render the menu. At ≤1040px, no-JS users get a working native summary toggle (starting open, as today, but collapsible). Add `<script>` importing `initNavDisclosure`. Astro bundles and defers it, and it closes the menu on phones at startup. To avoid the menu flashing open on phones, put a tiny `is:inline` script right after the header that sets `data-js` on `<html>`, plus a CSS rule `html[data-js] .nav-drawer:not([data-open]) .links { display:none }` under the 1040px query.
   Mobile styles inside the drawer: replace the card chrome on `.mega-in` (no border, shadow or crimson top rule) with compact headed lists. Group labels (`.nav-top`) become static headings, and leaf links are ≥44px tall. Leave the desktop `:hover` / `:focus-within` rules as they are.
3. **`src/layouts/BaseLayout.astro`.** At ≤1040px the header row is brand · Subscribe · Menu button on one line, and the menu panel opens full width beneath it (`order: 3`, already set in PrimaryNav). At ≤520px, hide `.nav-cta` in the header and render a second Subscribe link as the last item inside `#site-menu`. A 390px row can't fit the wordmark, Subscribe and Menu. Also reduce `.site-nav`/`.foot-in` side padding to 16px at ≤520px.
4. **City bar helper (new), `src/lib/utilityBar.ts`.** Export `utilityLine(cities)` (today's full line, moved out of the component) and `utilityLineCompact(cities)` → `"A global community · 6 chapters"` (`"· 1 chapter"`; with no cities, the lede alone).
5. **`src/components/nav/UtilityBar.astro`.** Render both lines as two spans, `.util-full` and `.util-compact`. At ≤720px show only the compact one, with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` as a safety net. Swap them with CSS `display` only (no `aria-hidden`), so screen readers read whichever one is visible.
6. **`src/components/landing/UpcomingEvents.astro`, empty state.** Delete the `.ue-none` block (lines 71–74) and its CSS, and change `.ue-empty` from a two-column grid to a single row of the CTA buttons, placed directly under the lede (`margin-top: 28px`). Update the header comment, which currently describes the right-hand panel. The populated state is unchanged.
7. **`src/lib/events.ts`.** Add `eventsPageSections(events, now, { embedActive })` → `{ upcoming, past }`, where `upcoming` is `[]` when `embedActive` is true. It is built on the existing `splitEvents`.
8. **`src/components/EventsPage.astro`.** Add a prop `embedActive?: boolean` (default `false`, so the isolated `EventsPage` scenarios in `src/pages/isolated-components/[name].astro` keep their meaning) and use `eventsPageSections`. When `embedActive` is true:
   - drop the "Upcoming" section and the "View Upcoming Events" button;
   - the intro stays;
   - the Past Events section shows, or nothing shows if there are none;
   - after the past events, a "View all past events" link goes to `LUMA_CALENDAR_URL`, opening in a new tab through the contact plan's `externalLinkAttrs`.
     - Nicole believes Luma can link straight to past events. Use that address if the calendar has one; otherwise use the calendar itself.
     - When `launch--history-events-archive-and-webinars` has shipped, its Archive block sits below this link.

   Otherwise (no embed), the Upcoming section stays and the Eventbrite button is removed (open question 1).
9. **`src/pages/events.astro`.** Pass `embedActive={Boolean(LUMA_EMBED_URL)}`. Order: intro header (moved above the embed, so the page opens with its title rather than "Full events calendar"), Luma embed, then Past events.
10. **`src/components/LumaCalendar.astro`, empty box and alignment.** Replace the fixed `height={640}` with CSS `height: clamp(420px, 70vh, 640px)` on the iframe (`520px` at ≤640px). Move the inline border and radius into `.luma-frame` with `overflow: hidden`, so the scrollbar gutter no longer shows as a white strip inside the border (visible in `events-route-upcoming-and-past--desktop.png`). Set `display:block` to kill the inline-iframe baseline gap. Put the frame in the same `.s-inner` width as the list below it, so the two left edges line up. If open question 4 finds a height postMessage, set height from it instead.
11. **Responsive sweep.** Walk the checklist below against every component listed. Fix only what fails at 390px or 768px, and record anything bigger as a follow-up rather than growing this plan.

### Responsive audit checklist

Breakpoints in use today (from `@media` across `src/`): 1040 (header), 900 (`src/styles/tokens.css` `.sec-head`), 820, 720, 640, 560, 520, plus one-offs at 1080/1000/880/760/620/600. **Standardise new rules on 1040 / 820 / 640 / 520.** Don't rewrite existing one-offs unless they fail a check.

Verify at **390 (Mobile), 768 (Tablet), 1440 (Desktop)**:
- [ ] No horizontal scroll: `document.documentElement.scrollWidth <= innerWidth`. Watch `white-space: nowrap` (`.brand-word`, `.mega-in`), fixed `min-width`, and 48px side paddings.
- [ ] Tap targets ≥44px; body text ≥16px; mono kickers don't wrap mid-word.
- [ ] Nothing works only on hover: nav, `.ue-row:hover` lift and card hovers need a tap/focus equivalent or are decorative only.
- [ ] Grids collapse: `repeat(auto-fit, minmax(280px,1fr))` in `EventsSection.astro` fits 390 minus gutters; two-column grids stack at ≤820.
- [ ] Media: images `max-width:100%`; iframes (`LumaCalendar`, `Embed`, `EmbedForm`, `GivebutterWidgets`) are full width with sane heights.
- [ ] Focus is visible on every link/button, and there's no focus on hidden menu items when closed.
- [ ] `prefers-reduced-motion` respected (HeroCarousel, parallax).

Components to sweep: `BaseLayout` header/footer, `PrimaryNav`, `UtilityBar`, landing `Hero`/`HeroCarousel`/`Stats`/`UpcomingEvents`/`OurChapters`/`EventGallery`/`BoardOfDirectors`/`ContactUs`, `EventsPage`/`EventCard`/`LumaCalendar`, `ChapterPage`/`ChapterHero`/`ChapterEvents`, `VolunteerPage`, `SponsorPage`, `BlogPostArticle`, `pages/SitePageHeader`/`SitePageBody`, the `give/*` sections, and `src/pages/404.astro`.

## Tests

Register each new test file in `.codeyam/test-registry.json` before prove-red (registered names are `describe › it`).

- `src/lib/navDisclosure.test.ts` (new, jsdom). Asserts:
  - the button is inserted with `aria-expanded="false"` and `aria-controls="site-menu"`, and the summary is hidden;
  - a click flips `aria-expanded` and `data-open`;
  - Escape inside the menu closes it and focuses the button;
  - clicking an `a[href]` inside closes it (including `/#events`);
  - `pageshow` with `persisted` resets to closed;
  - the media query changing to desktop clears state;
  - without calling `init`, `<details open>` markup leaves links reachable (the no-JS contract).
- `src/lib/utilityBar.test.ts` (new). Asserts the full line matches today's text; compact gives `"A global community · 6 chapters"`, singular `"1 chapter"`, and the lede alone for `[]`.
- `src/lib/events.test.ts` (existing). New `describe('eventsPageSections')`:
  - with `embedActive`, `upcoming` is empty and `past` equals `splitEvents(...).past`;
  - without it, both match `splitEvents`;
  - **no event appears in both halves** for a mixed fixture.
- `.astro` markup (empty state, iframe sizing) isn't importable in vitest (`vitest.config.ts`). It is covered by the scenarios below.

## Scenarios to Demonstrate

Mobile = 390x844, Tablet = 768x1024 (`.codeyam/editor.json` `screenSizes`). "Add Mobile" means adding `"Mobile"` to the file's `dimensions`. Capture **one at a time** (concurrent captures have baked wrong pages into frames), and screen every changed PNG.

| Page | Scenario (`.codeyam/scenarios/…`) | Change |
|---|---|---|
| Home, menu closed | `harvard-in-tech-landing-page.json` | add Tablet (already Mobile) |
| Home, menu open | `harvard-in-tech-phone-menu-open.json` (new) | url `/`, Mobile + Tablet, `interactions: [{action:"click", selector:".nav-toggle"}]` |
| Home, no events | `harvard-in-tech-no-upcoming-events.json` | add Mobile |
| Home, board | `harvard-in-tech-board-of-directors.json` | add Mobile |
| Events | `events-route-upcoming-and-past.json` | add Mobile; now shows embed + past only, ending with the "View all past events" link to Luma |
| Events, nothing past | `events-route-embed-no-past-events.json` (new) | url `/events`, seed only future events, Desktop + Mobile |
| Chapters | `chapter-route-new-york-city.json`, `chapter-route-longest-chapter-name-wraps.json` | add Mobile |
| Communities | `community-route-founders-with-leads-and-events.json` | add Mobile |
| Volunteer | `volunteer-page-open-projects.json` | add Mobile |
| Sponsor | `sponsor-route-example-partner-wall.json` | add Mobile |
| Blog | `blog-post-welcome.json` | add Mobile, after `launch--content-and-pages` retargets it to a remaining post (the Welcome post becomes a draft) |
| CMS-written page | `site-page-a-page-written-in-the-cms.json`, `site-page-long-title-and-no-description.json` | add Mobile |
| Give | `give-route-public-visitor.json` (new) | url `/give`, `pageFilePath: src/pages/give.astro`, Desktop + Mobile |
| 404 | `not-found-page.json` (new) | url `/this-page-does-not-exist`, `pageFilePath: src/pages/404.astro`, Desktop + Mobile. Verify dev serves 404.astro for it |
| City bar | `utilitybar-derived-cities.json`, `utilitybar-no-chapters.json` | add Mobile |
| Empty events band | `upcoming-events-empty.json` | add Mobile |
| Luma block | `luma-calendar.json` | add Mobile |
| Menu component | `primarynav-derived-chapters.json` | add Mobile |

Donate/momentum-fund and the volunteer project page already have Mobile.

Key frames to check:
- the phone landing frame shows the hero within the first screen;
- the menu-open frame shows grouped links with a Subscribe link at the bottom;
- the no-events frame shows the message once;
- the events frame shows no event in both the embed and the list, and ends with the "View all past events" link.

## Out of scope

- The `/admin` CMS UI (the `@codeyam/cms` package) and the internal cutover runbook: not public, and the runbook already has a phone scenario.
- Switching the homepage "Upcoming events" band to read from Luma (open question 2 → a separate plan if wanted).
- The hard-coded chapter list in the `/events` intro copy (`src/components/EventsPage.astro`): a content fix, not layout.
- Rewriting existing one-off breakpoints that already pass the checklist.
- Nested accordions inside the phone menu. Revisit only if the open menu proves too long in the menu-open scenario.