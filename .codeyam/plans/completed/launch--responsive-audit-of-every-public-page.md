---
title: "launch -- Responsive Audit Of Every Public Page"
mode: ui
createdAt: "2026-09-18T14:45:26Z"
prefix: "launch"
order: 3
source: manual
---

## Summary

Nobody has ever looked at this site at anything but 1440px. Of 300 scenarios, 293
are Desktop-only, 7 carry Mobile, and **zero** carry Tablet (768) or Laptop
(1280) — both of which are configured in `.codeyam/editor.json` and have never
been used. This plan is the analysis pass: capture every public page at all four
configured sizes, read the frames against a fixed checklist, and write a findings
report that says, per page and per size, what breaks and what to change.

It is an **audit**, not a rebuild. It produces three things:

1. **Permanent multi-size coverage** — one representative scenario per public
   surface carrying Mobile / Tablet / Laptop / Desktop, so the next change is
   reviewed at four widths instead of one, plus a drift guard test that fails
   when a public route loses that coverage.
2. **A findings report** — `docs/responsive-audit-2026-09-18.md`, one row per
   finding with the page, the widths it fails at, the evidence frame, a severity,
   and a recommended change.
3. **A routing table** — each finding assigned to the plan that should own the
   fix (`launch--mobile-and-layout`, `launch--design-system`, `launch--images`)
   or named as a proposed new plan. This plan changes no layout CSS itself.

The owner asked for mobile "especially, but also iPad, or laptops with odd
dimensions". The odd-laptop case is real and already visible in the source: the
nav collapses to its phone layout at ≤1040px, but `.wrap` keeps its 48px desktop
gutters until ≤900px. Everything between 901 and 1040 — iPad landscape, a 1024
Chromebook, a half-screen window on a laptop — gets the phone nav with desktop
gutters, and no one has ever seen it.

## Owner decisions (2026-09-18)

- **Full adaptive pass over all pages.** Plan it.
  > "I want to do a full pass on all HIT site pages to make sure that they're
  > adaptive and look good on different screen sizes (mobile especially but also
  > iPad, or laptops with odd dimensions)."
- **Relationship to `launch--mobile-and-layout`.** Audit first, as its own plan.
  This plan runs *before* it, and its findings revise that plan rather than
  duplicating it. Queued at position 3 — after the Luma events plan and the
  giving plan settle `/events` and delete `/give`, and before Mobile, Images and
  Design System. Both `launch--mobile-and-layout` and `launch--design-system`
  declare `dependsOn` this plan, so neither can Run until this one is archived.
- **Viewports.** The four already configured — Mobile 390x844, Tablet 768x1024,
  Laptop 1280x800, Desktop 1440x900. The awkward 901–1040px band is spot-checked
  in the report but gets no permanent scenarios.
- **Page scope.** The public site only. `/admin` is out (it ships from
  `@codeyam/cms` in `node_modules`, so fixes are upstream), as are the cutover
  runbook, `donor-network.html` and the review gate.

## What this plan does NOT own

`launch--mobile-and-layout` already owns four named mobile fixes, decided
2026-09-14 and refined 2026-09-16. This plan does not re-decide or re-implement
any of them:

| Already owned there | Status |
|---|---|
| The phone menu (hamburger disclosure) | Decided: a standard hamburger button |
| The city bar wrapping to three lines | Decided: phones read just "A global community" |
| The homepage "No upcoming events" duplicate | Decided |
| `/events` de-duplication and the empty Luma box | Decided |

Where the audit confirms one of those, the report cites it as **already owned**
and moves on. Where the audit finds that a decided fix is *insufficient* at 768
or 1280 — a case nobody evaluated, since those widths were never captured — that
is a real finding and goes in the report as a revision to that plan.

## Seed findings (from source, to confirm in the frames)

These came out of reading the CSS during planning. They are starting points with
line citations, not the audit result — each is confirmed or dismissed against a
captured frame.

- **S1 — every landing band burns 156px of vertical space on a phone.**
  `.s-section { padding: 78px var(--space-lg) }` in `src/styles/tokens.css` is
  the only definition of that rule in the repo; no media query reduces it. On an
  844px-tall phone that is ~18% of the viewport per band, before any content.
- **S2 — the 901–1040px dead band.** `.wrap` drops from 48px to 24px gutters at
  ≤900px (`src/styles/tokens.css`), while the header and nav collapse at ≤1040px
  (`src/layouts/BaseLayout.astro`, `src/components/nav/PrimaryNav.astro`). The
  two disagree by 140px. iPad landscape (1024) sits inside the gap.
- **S3 — thirteen different breakpoints.** Across `src/`: 1080, 1040, 1000, 900,
  880, 820, 760, 720, 640, 620, 600, 560, 520. Bands reflow at different widths,
  so intermediate sizes show half-reflowed pages. `launch--mobile-and-layout`
  already proposes standardising on 1040 / 820 / 640 / 520; the audit should say
  which of the thirteen actually need to move.
- **S4 — Laptop has almost no slack.** `--content-width: 1220px` plus 48px
  gutters means a 1280 viewport has ~30px spare each side. Anything that
  overflows its column will show first at 1280, which is the width nobody has
  captured.
- **S5 — coverage holes.** `/404` has no scenario at any size. `/webinars`,
  `/sponsor`, `/communities/*`, `/blog/*`, the CMS-written `/[slug]` pages and
  every `/chapters/*` scenario are Desktop-only.
- **S6 — the header row at 390px.** `.brand-word` carries `white-space: nowrap`
  (`src/layouts/BaseLayout.astro`) and sits on one row with `.nav-cta` and,
  after `launch--mobile-and-layout`, a Menu button. Three fixed-width items on a
  390px row is the constraint that plan's step 3 is designed around — confirm
  whether its ≤520px rule is enough, or whether the breakpoint needs to be
  higher.
- **S7 — `/404` renders outside `BaseLayout`.** `src/pages/404.astro` is an
  inline `<main>` with `margin-top: 100px` and `max-width: var(--content-width)`,
  so it has no header, no footer and no responsive rules at all.
  `launch--design-system` phase 1 moves it into `BaseLayout`; the audit records
  what it looks like today so that move can be verified.
- **S8 — narrow auto-fit grids.** `minmax(150px, 1fr)` in
  `src/components/landing/ContactUs.astro` and `minmax(220px, 1fr)` in
  `src/components/sponsor/SponsorWall.astro` both still fit two columns inside a
  390px phone minus gutters. Confirm whether two columns there is intended or
  cramped.

## Recommendations

**The audit method.** Options considered:

- **A. Read the CSS and write recommendations.** Fast, but it is what produced
  the seed list above, and a seed list is not an audit — it cannot see overlap,
  overflow, or a band that is merely ugly.
- **B. Capture every one of the 300 scenarios at four sizes.** 1200 frames.
  Most are isolated components already pinned at a fixed width, so the extra
  frames say nothing. The review cost swamps the signal.
- **C. One representative route scenario per public surface, at four sizes,
  plus targeted below-fold frames for the homepage.** ← **Pick C.**

Why C: the audit's unit is *the page a visitor sees*, and a page's responsive
behaviour is a property of the route, not of a component in isolation. Twelve
surfaces × 4 sizes ≈ 55 frames including the below-fold homepage bands — enough
to review carefully in one pass, and the four-size coverage stays in the repo
afterwards rather than being a one-off.

**Where the report lives.** `docs/` already carries the launch record
(`docs/launch-decisions-2026-09-16.md`, `docs/nicole-review.md`), and those are
the documents the other plans' confirm steps read. The audit belongs there, not
in `.codeyam/`, so a human reviewing the launch can find it.

**Findings carry a severity, and severity decides routing.** Three levels:

- **Broken** — content is unreachable, overlapping, cut off, or the page scrolls
  sideways. Goes into `launch--mobile-and-layout` as a revision, or a new plan.
- **Cramped** — legible but bad: 78px padding on a phone, two columns where one
  belongs, a 12px tap target. Goes into `launch--design-system`, which already
  owns the shared spacing layer.
- **Noted** — cosmetic or subjective. Recorded, not scheduled.

**Do not fix anything in this plan.** The temptation, once a frame shows a
broken band, is to fix the two-line CSS there and then. Don't: the fix lands
without the owning plan's decisions applied, and the next plan to touch that
component conflicts with it. The report is the deliverable.

## Implementation

### 1. Declare the public-route inventory

**New file**: `src/lib/publicRoutes.ts`

Export `PUBLIC_AUDIT_ROUTES`, the list of public surfaces the audit covers, each
with a stable key, the route pattern, the `pageFilePath` that renders it, and the
representative concrete URL the scenario uses:

| Key | Route | Renders from | Audit URL |
|---|---|---|---|
| `home` | `/` | `src/pages/index.astro` | `/` |
| `events` | `/events` | `src/pages/events.astro` | `/events` |
| `chapter` | `/chapters/[slug]` | `src/pages/chapters/[slug].astro` | `/chapters/nyc` |
| `community` | `/communities/[slug]` | `src/pages/communities/[slug].astro` | `/communities/founders` |
| `blog-post` | `/blog/[slug]` | `src/pages/blog/[slug].astro` | `/blog/spotlight-charlie-cheever` |
| `site-page` | `/[slug]` | `src/pages/[slug].astro` | `/our-story/` |
| `volunteer` | `/volunteer` | `src/pages/volunteer.astro` | `/volunteer` |
| `volunteer-project` | `/volunteer/projects/[slug]` | `src/pages/volunteer/projects/[slug].astro` | `/volunteer/projects/chapter-launch-team-toronto` |
| `sponsor` | `/sponsor` | `src/pages/sponsor.astro` | `/sponsor` |
| `webinars` | `/webinars` | `src/pages/webinars.astro` | `/webinars` |
| `donate` | `/donate` | `src/pages/donate.astro` | `/donate` |
| `not-found` | `/404` | `src/pages/404.astro` | `/this-page-does-not-exist` |

Also export `AUDIT_SIZES = ['Mobile', 'Tablet', 'Laptop', 'Desktop']`.

Two exclusions are deliberate and must be commented in the file so nobody
"fixes" them later:

- **`/give` is excluded** — `docs/launch-decisions-2026-09-16.md` records the
  decision to delete the page, its components, its data file and its eight
  scenarios outright. Auditing a page scheduled for deletion is wasted work.
- **`/donate` is included but findings are recorded only.** The campaign look is
  explicitly PAUSED (`launch--design-system`, owner decision 2026-09-14) until
  Nicole's content merges. The audit captures it and writes the findings down; it
  proposes no changes there.

### 2. A coverage guard, so the audit does not rot

**New file**: `src/lib/responsiveCoverage.ts`

Pure rule functions over scenario JSON, so they are unit-testable without the
filesystem:

- `missingSizes(scenario, required)` → the required dimensions a scenario lacks.
- `routeCoverage(scenarios, routes, required)` → per route key, the scenarios
  matching its `pageFilePath` and which required sizes are covered across them.
- `uncoveredRoutes(coverage)` → route keys with no scenario at every required
  size.

Follow the split used by `src/lib/collectionRegistryDrift.ts`: the rules live in
the lib with a fixture-driven unit test, and the assertion against the real
committed files lives in its own test that reads them with `node:fs` — exactly
the pattern `src/data/collections.test.ts` uses for the CMS registry.

### 3. Give the representative scenarios all four sizes

**File**: `.codeyam/scenarios/` (existing scenario JSON)

Add the missing entries to each representative scenario's `dimensions`:

| Scenario | Today | After |
|---|---|---|
| `harvard-in-tech-landing-page` | Desktop, Mobile | + Tablet, Laptop |
| `events-route-upcoming-and-past` | Desktop | + Mobile, Tablet, Laptop |
| `chapter-route-new-york-city` | Desktop | + Mobile, Tablet, Laptop |
| `community-route-founders-with-leads-and-events` | Desktop | + Mobile, Tablet, Laptop |
| `blog-post-a-retained-medium-stub` | Desktop | + Mobile, Tablet, Laptop |
| `site-page-a-page-written-in-the-cms` | Desktop | + Mobile, Tablet, Laptop |
| `volunteer-page-open-projects` | Desktop | + Mobile, Tablet, Laptop |
| `volunteer-project-detail-photo-and-own-sign-up-link` | Desktop | + Mobile, Tablet, Laptop |
| `sponsor-route-example-partner-wall` | Desktop | + Mobile, Tablet, Laptop |
| `webinars-route-the-surviving-recordings` | Desktop | + Mobile, Tablet, Laptop |
| `momentum-fund-public-visitor` | Desktop, Mobile | + Tablet, Laptop |

Leave the other 289 scenarios Desktop-only. They are state variants and isolated
components; adding sizes there multiplies frames without adding a surface.

### 4. Cover the surfaces that have no scenario

**New file**: `.codeyam/scenarios/not-found-page.json`

`/this-page-does-not-exist`, `pageFilePath: src/pages/404.astro`, all four sizes.
Verify the dev server actually serves `404.astro` for an unknown path before
trusting the frame — if it serves Astro's own dev error page instead, record that
as a finding rather than capturing a misleading frame.

**New files**: below-fold homepage scenarios, all four sizes. The homepage is
the one surface where a single frame is nowhere near the page. A URL fragment
does **not** scroll a capture — `/#board` still shoots the hero — so each of
these needs a `hover` interaction on a selector inside the target band to bring
it into frame:

- `harvard-in-tech-board-on-four-sizes` — the board grid
- `harvard-in-tech-chapters-on-four-sizes` — the chapters band
- `harvard-in-tech-contact-on-four-sizes` — the contact grid (`minmax(150px,1fr)`, seed S8)

Two scenarios on the same route capture the same viewport unless they differ by
interaction, so each of these must carry its own distinct selector.

### 5. Capture and review

Capture **one scenario at a time**. Concurrent captures on this project have
baked wrong-page frames into the output, and a content-sandbox reseed race has
produced phantom 404s. After capturing, screen every changed PNG before trusting
it: an untouched page reporting "N% of pixels differ" is the webfont/`ch` race,
not a real change — capture it twice and restore unrelated frames from HEAD.

Review each frame against this checklist, recording a row per failure:

- **No horizontal scroll.** The page does not exceed the viewport width.
- **Nothing cut off or overlapping.** Especially headings with negative
  letter-spacing, the nav, and the hero.
- **Reflow is complete, not half-done.** At 768 and 1280, no band is still in its
  desktop grid while its neighbour has stacked (the S3 breakpoint spread).
- **Vertical rhythm is sane on a phone.** How much of the 844px viewport does one
  band's padding eat (S1)?
- **Tap targets ≥44px, body text ≥16px.**
- **Nothing is hover-only.** Card lifts, the nav, the gallery.
- **Media behaves.** Images `max-width: 100%`; the Luma iframe and any embed are
  full width with a sane height at every size.
- **The first screen is content, not chrome.** On a phone, is the hero visible
  without scrolling?

### 6. Write the report

**New file**: `docs/responsive-audit-2026-09-18.md`

Sections:

1. **What was checked** — the twelve surfaces, the four sizes, the date, and the
   scenario names holding the evidence frames.
2. **Findings**, one table row each: id, page, sizes affected, what is wrong,
   severity (Broken / Cramped / Noted), recommended change, owning plan.
3. **The seed findings S1–S8**, each marked confirmed, dismissed or revised
   against a frame.
4. **The 901–1040px spot check** — a manual look at 1024 width, written up in
   prose. This band gets no permanent scenario, so the report is the only record.
5. **Routing table** — findings grouped by the plan that should own them, and a
   short list of proposed new plans (title + one-line scope) for findings no
   existing plan covers. Proposing them is the deliverable; creating those plan
   files is a separate `/codeyam-plan` run, not part of this build.

Follow the voice of `docs/launch-decisions-2026-09-16.md`: plain statements of
what is true, each with the file or frame that proves it.

### 7. Feed the findings back into the queued plans

**File**: `.codeyam/plans/launch--mobile-and-layout.md`

Its "Responsive audit checklist" (step 11) is a to-do written without evidence.
Replace it with a pointer to the report and the specific confirmed findings it
now owns. Do the same for `launch--design-system.md` where a finding lands in
the shared spacing or breakpoint layer.

This is the only file this plan edits outside `docs/`, `src/lib/` and
`.codeyam/scenarios/`. It edits no component and no stylesheet.

## Reused existing code

- `collectionRegistryDrift.ts` rule/assertion split from
  `src/lib/collectionRegistryDrift.ts` (glossary entries: `declaredFieldNames`,
  `missingFields`, `unknownFields`) — the shape the new coverage lib copies:
  pure rules in the lib, fixtures in its sibling unit test
  (`src/lib/collectionRegistryDrift.test.ts`), real committed files asserted in
  a separate test.
- The committed-file assertion pattern from `src/data/collections.test.ts` —
  `node:fs` + `node:path` reading real repo files inside vitest. This is the
  precedent for a test that reads `.codeyam/scenarios/*.json`; no existing test
  reads that directory yet.
- `internalNavUrls` from `src/lib/nav.ts` (glossary entry: `internalNavUrls`) —
  walks the nav tree for internal URLs. Cross-check the route inventory this
  plan creates in step 1 against it, so a surface reachable from the menu
  cannot be missing from the audit.
- `RESERVED_PAGE_SLUGS` from `src/lib/sitePages.ts` (glossary entry:
  `RESERVED_PAGE_SLUGS`) — the slugs `/[slug]` must not shadow. Use it to pick a
  representative CMS page URL that is a real page rather than a reserved route.
- `screenSizes` in `.codeyam/editor.json` — Mobile 390x844, Tablet 768x1024,
  Laptop 1280x800, Desktop 1440x900 are already defined. The audit uses them as
  they stand; it adds no new size and edits no config.

**Existing-implementation survey.** Nothing equivalent exists today. There is no
responsive lint, no viewport assertion, no breakpoint inventory, and no test
anywhere in `src/` that reads `.codeyam/scenarios/`. `staticChecks` in
`.codeyam/editor.json` is `tsc` and `astro check` only — neither has any view of
layout. `src/lib/parallax.ts` and `src/lib/gallery.ts` call `matchMedia`, but for
behaviour (reduced motion, gallery reveal), not for layout coverage. So the two
libs this plan adds in steps 1 and 2 duplicate nothing.

## Citation notes

Both advisories on this plan were checked during planning and are expected:

- **Files that do not exist yet are ones this plan creates** — the route
  inventory and coverage libs (steps 1–2), their tests, the report
  (step 6) and the new scenario JSON (step 4). Every path cited as an existing
  dependency was verified on disk.
- **The five `[slug]` routes are a false positive.** `src/pages/[slug].astro`,
  `src/pages/blog/[slug].astro`, `src/pages/chapters/[slug].astro`,
  `src/pages/communities/[slug].astro` and
  `src/pages/volunteer/projects/[slug].astro` were each confirmed present with a
  direct file test on 2026-09-18. The square brackets in Astro's dynamic-route
  filenames read as a character class to the checker's glob, so it reports them
  missing. Do not "correct" them.

## Tests

Register each new test file in `.codeyam/test-registry.json` before prove-red
(registered names are `describe › it`).

- `src/lib/responsiveCoverage.test.ts` (new). Fixture-driven unit coverage of
  the rules:
  - `missingSizes` returns the required dimensions a scenario lacks, and `[]`
    when it carries all of them;
  - `routeCoverage` unions dimensions across several scenarios sharing one
    `pageFilePath`, so two scenarios covering different sizes together satisfy
    the route;
  - a scenario whose `pageFilePath` matches no declared route is ignored rather
    than crashing;
  - `uncoveredRoutes` names the route key, not the file path, so the failure
    message says which page a human must go look at.
- `src/lib/publicRoutes.test.ts` (new). Asserts every entry's `pageFilePath`
  exists on disk, that `/give` is absent with the deletion decision cited in a
  comment, and that no two entries share a key.
- `.codeyam/scenarios` committed-file assertion, in
  `src/lib/responsiveCoverage.test.ts` alongside the unit tests (or its own file
  if it reads cleaner). Asserts `uncoveredRoutes` is empty for the real scenario
  directory. **This is the red-first test**: today every route except `home` and
  `donate` is missing three sizes, and `not-found` is missing a scenario
  entirely, so it fails before step 3 and passes after step 4.
- No test asserts anything about the *contents* of a frame. Whether a band looks
  cramped at 768 is a human judgment recorded in the report; a pixel assertion
  would only pin today's rendering, which is the thing under review.

## Scenarios to Demonstrate

Mobile = 390x844, Tablet = 768x1024, Laptop = 1280x800, Desktop = 1440x900
(`.codeyam/editor.json` `screenSizes`).

| Surface | Scenario | Change |
|---|---|---|
| Home, top | `harvard-in-tech-landing-page` | + Tablet, Laptop |
| Home, board | `harvard-in-tech-board-on-four-sizes` (new) | `/`, all four, hover interaction into the board band |
| Home, chapters | `harvard-in-tech-chapters-on-four-sizes` (new) | `/`, all four, hover interaction into the chapters band |
| Home, contact | `harvard-in-tech-contact-on-four-sizes` (new) | `/`, all four, hover interaction into the contact grid |
| Events | `events-route-upcoming-and-past` | + Mobile, Tablet, Laptop |
| Chapter | `chapter-route-new-york-city` | + Mobile, Tablet, Laptop |
| Community | `community-route-founders-with-leads-and-events` | + Mobile, Tablet, Laptop |
| Blog post | `blog-post-a-retained-medium-stub` | + Mobile, Tablet, Laptop |
| CMS page | `site-page-a-page-written-in-the-cms` | + Mobile, Tablet, Laptop |
| Volunteer | `volunteer-page-open-projects` | + Mobile, Tablet, Laptop |
| Volunteer project | `volunteer-project-detail-photo-and-own-sign-up-link` | + Mobile, Tablet, Laptop |
| Sponsor | `sponsor-route-example-partner-wall` | + Mobile, Tablet, Laptop |
| Webinars | `webinars-route-the-surviving-recordings` | + Mobile, Tablet, Laptop |
| Donate (paused) | `momentum-fund-public-visitor` | + Tablet, Laptop |
| 404 | `not-found-page` (new) | `/this-page-does-not-exist`, `pageFilePath: src/pages/404.astro`, all four |

Frames that matter most, because nobody has ever seen them: **every Tablet and
Laptop frame in the table** — those two sizes have zero coverage in the repo
today — plus the phone frames for `/events`, `/sponsor`, `/webinars` and
`/404`.

## Capture notes

Hard-won on this project; ignoring them costs a full capture cycle:

- Capture **one scenario at a time**. Concurrent captures have written
  wrong-page frames, and the content-sandbox reseed race also produces phantom
  404s in `client-errors --scope impacted`.
- Always `--target` a recapture, and `--force` it when only content changed —
  content edits are invisible to screenshot staleness.
- Run the untouched-scenario control first if captures start failing. "Invalid
  hook call" means the capture environment is wrong, not the page.
- A `/#anchor` URL does not scroll the capture. Below-fold framing needs an
  interaction, which is why the three homepage scenarios above each carry one.
- An unrelated page reporting "N% of pixels differ" is the webfont/`ch` race.
  Capture twice, then restore the unrelated frames from HEAD.

## Open questions

1. **For the owner, after the report lands.** The report will propose follow-up
   plans for findings no queued plan owns. How many of those should be built
   before launch versus after? The audit deliberately does not decide this — it
   ranks by severity and leaves the cut to you.
2. **For the implementer (verify, no owner input needed).** Does the dev server
   serve `src/pages/404.astro` for an unknown path, or Astro's dev error page? If
   the latter, the `not-found-page` scenario is capturing the wrong thing and
   should be recorded as a finding instead.
3. **For the implementer.** Is 1024 (iPad landscape) common enough in the site's
   traffic to deserve a permanent fifth scenario size rather than a one-off spot
   check? The owner chose the four configured sizes; if the report finds the
   901–1040 band badly broken, that choice is worth revisiting with evidence.

## Out of scope

- **Fixing anything.** No component, no stylesheet, no breakpoint is changed by
  this plan. Findings route to the plans that own the surfaces.
- **`/give`** — being deleted outright per `docs/launch-decisions-2026-09-16.md`.
- **`/admin`** — the CMS ships from `@codeyam/cms` in `node_modules`; fixes are
  upstream, not in this repo.
- **The cutover runbook, `donor-network.html`, the review gate and the preview
  index** — internal surfaces, and the runbook already has a phone scenario.
- **Isolated-component scenarios.** They render at fixed widths by design; the
  audit's unit is the page.
- **Changing `/donate`'s look.** Captured and reported; paused for changes until
  Nicole's content merges.
- **Adding a fifth screen size to `.codeyam/editor.json`** — open question 3, and
  only with evidence from the report.