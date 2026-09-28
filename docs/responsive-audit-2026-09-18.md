# Responsive audit — every public page, four widths

**Audit performed 2026-09-28**, against the plan dated 2026-09-18
(`launch--responsive-audit-of-every-public-page`). The filename keeps the plan's
date so the queued plans that cite it keep resolving; the findings below are from
the 2026-09-28 run.

Before this audit, of 308 saved scenarios **307 were Desktop and 7 were Mobile.
Tablet and Laptop had never been used once**, despite both being configured in
`.codeyam/editor.json` since the project began. Nobody had ever seen this site at
768 or 1280.

This is an audit. It changes no layout CSS. Every finding names the plan that
should own the fix.

---

## 1. What was checked

Four widths, the ones already configured — Mobile 390×844, Tablet 768×1024,
Laptop 1280×800, Desktop 1440×900.

Eleven public routes, captured at all four widths through fourteen scenarios —
the homepage takes four of them, because a single viewport frame is nowhere near
that page:

| Surface | Route | Evidence scenario |
|---|---|---|
| Home (top) | `/` | `harvard-in-tech-landing-page` |
| Home (board band) | `/` | `harvard-in-tech-board-on-four-sizes` |
| Home (chapters band) | `/` | `harvard-in-tech-chapters-on-four-sizes` |
| Home (contact band) | `/` | `harvard-in-tech-contact-on-four-sizes` |
| Events | `/events` | `events-route-upcoming-and-past` |
| Chapter | `/chapters/[slug]` | `chapter-route-new-york-city` |
| Community | `/communities/[slug]` | `community-route-founders-with-leads-and-events` |
| Blog post | `/blog/[slug]` | `blog-post-a-retained-medium-stub` |
| CMS page | `/[slug]` | `site-page-a-page-written-in-the-cms` |
| Volunteer | `/volunteer` | `volunteer-page-open-projects` |
| Volunteer project | `/volunteer/projects/[slug]` | `volunteer-project-detail-photo-and-own-sign-up-link` |
| Sponsor | `/sponsor` | `sponsor-route-example-partner-wall` |
| Webinars | `/webinars` | `webinars-route-the-surviving-recordings` |
| Donate | `/donate` | `momentum-fund-public-visitor` |

The three homepage band scenarios are new. The homepage is the one surface where
a single frame is nowhere near the whole page, and a URL fragment does not scroll
a capture — `/#board` still photographs the hero. Each band scenario therefore
hovers a distinct selector inside its target band (`#board`, `#chapters`,
`.contact-row`) to bring it into frame.

**`/404` could not be captured at all.** See finding F3 and §6; it is a tooling
gap, not a decision about the page.

### What this audit could not see, and why

**F1 masks every other page's content at Mobile and Tablet.** Because the whole
nav renders expanded at those widths, a viewport-sized frame of any route shows
the menu, not the page — on `/events`, `/chapters/nyc` and every other surface
the page's own first band begins below the fold or barely at the bottom edge.

So the Mobile and Tablet frames in this audit are *evidence for F1* and little
else. They are not evidence that those pages are otherwise fine at those widths,
because their content was never on screen. **Once F1 is fixed, Mobile and Tablet
want a second pass** — the scenarios now carry all four sizes, so that pass is a
recapture rather than new authoring.

Laptop and Desktop frames are unaffected and are the basis for every
width-specific finding below that names them.

Out of scope by owner decision: `/admin` (ships from `@codeyam/cms` in
`node_modules`, so fixes are upstream), the cutover runbook, `donor-network.html`
and the review gate. `/give` is gone — the giving plan retired the route.

---

## 2. Findings

**The short version.** Above 1040px this site is in good shape: every surface was
reviewed at Laptop (1280) — home, events, chapter, community, blog post, CMS
page, volunteer, volunteer project, sponsor, webinars and donate — and none
showed horizontal scroll, overlap, cut-off content or a half-finished reflow.
S4's squeeze is real arithmetic but does not manifest as breakage.

At or below 1040px, one defect dominates everything: **the navigation renders
with every dropdown expanded** (F1). It is in `BaseLayout`, so it is on every
page, and at phone width it consumes the whole first screen. The remaining
findings are a shell problem on two routes (F2, F3), the dead band that F1's
breakpoint creates (F4), and four content or spacing items.

Severity decides routing:

- **Broken** — content unreachable, overlapping, cut off, or the page scrolls
  sideways. Goes to `launch--mobile-and-layout`, or a new plan.
- **Cramped** — legible but bad. Goes to `launch--design-system`, which owns the
  shared spacing and breakpoint layer.
- **Noted** — cosmetic or subjective. Recorded, not scheduled.

| # | Page | Sizes | What is wrong | Severity | Recommended change | Owner |
|---|---|---|---|---|---|---|
| **F1** | every page | Mobile, Tablet | **The whole navigation menu renders expanded.** All five dropdown panels (Programs, Chapters, Communities, Content Hub, Membership) are open and stacked down the page at rest. On a 390px phone the first full screen ends while still inside the Content Hub panel — a visitor sees *no page content at all* on the first screen. At 768 the page's own heading starts roughly 1,800px down. | **Broken** | The nav needs a real collapsed state below 1040px, not just `flex-wrap`. This is the case the planned hamburger must handle — and it must handle 768 too, not only phones. | `launch--mobile-and-layout` |
| **F2** | `/blog/[slug]` | all | **Blog posts render outside the site shell.** The route bypasses `BaseLayout` and emits its own `<html>` (`src/pages/blog/[slug].astro:39-40`), so a post has no header, no nav and no footer at any width. Someone arriving from search or the Medium link has no way into the rest of the site. **ALREADY OWNED** — `launch--design-system` phase 1 step 2 specifies this fix. Confirmed, not new. | **Broken** (navigation dead-end) | None needed; the existing step is correct as written. | `launch--design-system` (already planned) |
| **F3** | `/404` | all | Renders outside the site shell for the same reason as F2, **and** its only link is styled `var(--color-primary, #0066cc)` (`src/pages/404.astro:18`) — a token that does not exist, so the link renders generic blue rather than crimson. **ALREADY OWNED** — `launch--design-system` phase 1 step 1 specifies moving it into `BaseLayout` and says outright to "drop the undefined `--color-primary`". Confirmed, not new. | **Broken** (brand) | None needed; the existing step already names both halves. | `launch--design-system` (already planned) |
| **F4** | every page | 901–1040px | The header collapses at ≤1040px while `.wrap` keeps 48px desktop gutters until ≤900px, so for a 140px range the header sits on a 24px inset above 48px body gutters. iPad landscape (1024) is inside it. | **Broken** | Move the two rules to one breakpoint. See §4. | `launch--mobile-and-layout` |
| **F5** | home (chapters band) | all | The **London** chapter card has no photograph — it renders as the bare gradient placeholder, while Boston, NYC and SF have images. DC and Seattle are "forming" so their blanks are expected; London is a launched chapter. | **Noted** (content, not layout) | Source a London photo, or accept the gradient deliberately. | `launch--images` |
| **F6** | home (board band) | Mobile, Tablet | Five directors in a grid leave a conspicuous empty cell — 3 columns at 768 (3+2), 2 columns at 390 (2+2+1). Role lines wrap mid-phrase leaving a dangling separator ("EXECUTIVE DIRECTOR ·" / "HARVARD C'12"). | **Noted** | Centre the final row, or break role lines on the `·`. | `launch--design-system` |
| **F7** | every landing band | Mobile | `.s-section`'s flat 78px vertical padding costs 156px — 18.5% of an 844px phone viewport — per band, before any content. Visible throughout the contact band frame. | **Cramped** | A reduced phone value for `.s-section`. | `launch--design-system` |
| **F9** | `/donate` scenarios | Desktop | **Two scenarios photograph the same thing.** `momentum-fund-the-goal-meter-held-as-coming-soon` and `momentum-fund-two-pillar-bands-with-their-own-cards` have completely different seeds (7 sections / 0 testimonials versus 2 sections / 6 pillars) but their committed frames are **byte-identical** — same md5. Both capture `/donate`'s hero, because the band each one exists to show sits below the fold. Neither is demonstrating what its name claims. Not a layout defect; a coverage one. | **Noted** (coverage) | Each needs an `interactions` hover into its own band. Note the trap: the goal-meter band renders `display:none` in widget mode, so it cannot be hovered in that seed — the scenario needs a seed whose meter is in its static, visible mode first. I attempted this fix and reverted it for exactly that reason rather than leave two scenarios failing. | the giving plan that owns these scenarios |
| **F8** | `/volunteer` | all | Project cover images are inconsistent. Two of the four published projects have no photo and render the blank placeholder block. A third, "Newsletter editor", uses **a screenshot of the board-of-directors page**, cropped by the card so the portraits are sliced and the names are cut mid-word ("…Wei", "Nadi…", "Harv…"). It reads as a mistake rather than a choice. | **Noted** (content) | Source project photos, or let the placeholder stand deliberately — but replace the board screenshot, which is neither. | `launch--images` |

---

## 3. The seed findings, checked

The plan carried eight findings read out of the CSS during planning. Each is
confirmed, corrected or dismissed here against source and frames.

### S1 — every landing band burns 156px of a phone viewport. **CONFIRMED.**

`src/styles/tokens.css:118`

```css
.s-section {
  padding: 78px var(--space-lg);
}
```

That 78px is the only definition of the rule in the repo and no media query
reduces it. On an 844px phone, one band's vertical padding alone is 156px —
18.5% of the viewport before a single word of content. Severity: **Cramped**.
Owner: `launch--design-system` (shared spacing layer).

### S2 — the 901–1040px dead band. **CONFIRMED, and it is 140px wide.**

Two rules disagree about when this site stops being a desktop:

| Rule | Where | Collapses at |
|---|---|---|
| `.wrap { padding: 0 48px }` → `0 24px` | `src/styles/tokens.css:174`, `:270` | ≤ 900px |
| `.site-nav` wraps, padding → `16px 24px` | `src/layouts/BaseLayout.astro:253` | ≤ 1040px |

Everything from 901px to 1040px therefore gets **the collapsed phone nav with
full 48px desktop gutters**. iPad landscape (1024), a 1024 Chromebook and a
half-screen laptop window all land inside it. Severity: **Broken** (it is a
layout nobody designed). Owner: `launch--mobile-and-layout`.

### S3 — thirteen breakpoints. **CONFIRMED exactly, and the tail is the problem.**

Thirteen distinct `max-width` breakpoints across `src/`, exactly as predicted.
Counted by how many rules use each:

| Breakpoint | Rules | | Breakpoint | Rules |
|---|---|---|---|---|
| 820px | 11 | | 760px | 1 |
| 900px | 10 | | 1080px | 1 |
| 720px | 8 | | 1000px | 1 |
| 640px | 8 | | 880px | 1 |
| 520px | 5 | | 620px | 1 |
| 560px | 4 | | | |
| 1040px | 2 | | | |
| 600px | 2 | | | |

`launch--mobile-and-layout` proposes standardising on **1040 / 820 / 640 / 520**.
Measured against actual usage that proposal is mostly right and has one hole:

- **The five singletons are the real waste** — 1080, 1000, 880, 760 and 620 are
  each used by exactly one rule. Those are the ones to move; each is a one-line
  change.
- **900px is the hole.** It is the second most-used breakpoint (10 rules) and it
  is *not* in the proposed set — yet it carries `.wrap`'s gutter change, which is
  half of S2. Standardising without deciding what happens to 900 would either
  strand it or silently move the site's main gutter breakpoint.

Severity: **Cramped**. Owner: `launch--design-system`, with the 900px decision
feeding back into `launch--mobile-and-layout`'s S2 fix.

### S4 — Laptop has no slack. **CONFIRMED, and tighter than estimated.**

`--content-width: 1220px` (`tokens.css:77`) with `.wrap`'s 48px gutters
(`tokens.css:174`) needs **1316px** to render the content column at its declared
maximum. The Laptop viewport is 1280px.

So at 1280 the column never reaches 1220 at all — it gets 1280 − 96 = **1184px**,
36px under its maximum. The plan estimated "~30px spare each side"; there is none.
Anything that overflows its column shows up first at 1280, the width nobody had
ever captured. Severity: **Noted** (it is a squeeze, not a break). Owner:
`launch--design-system`.

### S5 — coverage holes. **CONFIRMED, and now closed except `/404`.**

Before this audit, per route:

| Route | Scenarios | Was missing |
|---|---|---|
| home | 7 | Tablet, Laptop |
| donate | 11 | Tablet, Laptop |
| events, chapter, community, blog-post, site-page, volunteer, volunteer-project, sponsor, webinars | 2–10 each | Mobile, Tablet, Laptop |
| not-found | **0** | every size |

All eleven capturable routes now carry all four. `/404` remains at zero — see F1.

### S6 — the header row at 390px. **CONFIRMED at source.**

`.brand-word { white-space: nowrap }` — `src/layouts/BaseLayout.astro:200-206`.
The wordmark cannot wrap, and shares its row with the Subscribe CTA and (after
`launch--mobile-and-layout`) a Menu button. Frame verdict in §2.

### S7 — `/404` renders outside `BaseLayout`. **CONFIRMED, plus a second defect.**

`src/pages/404.astro` is 23 lines with its own `<html>` and `<body>`: no header,
no footer, no responsive rules, an inline `<main>` at
`max-width: var(--content-width)` with `margin-top: 100px`.

It also carries a bug nobody had noticed (`404.astro:18`):

```html
<a href={withBase('/')} style="… color: var(--color-primary, #0066cc);">
```

**There is no `--color-primary` token.** `tokens.css` defines `--color-accent`,
`--color-link`, `--color-title` and others, but never `--color-primary`, so this
falls through to the hard-coded fallback and the only link on the 404 page
renders in **generic blue instead of Harvard crimson**. Severity: **Broken**
(brand, not layout). Owner: `launch--design-system` phase 1, which already plans
to move this page into `BaseLayout` — the token fix belongs in the same change.

### S8 — narrow auto-fit grids. **PARTLY CONFIRMED — the plan named one too many.**

At Mobile (390px) with `.wrap`'s ≤900px gutters of 24px, usable width is
390 − 48 = **342px**. A `repeat(auto-fit, minmax(N, 1fr))` grid fits two columns
only when 2N + gap ≤ 342.

| Component | Minimum | Columns at 390px |
|---|---|---|
| `landing/ContactUs.astro:115` | 150px | **two** |
| `sponsor/SponsorWall.astro:91` | 220px | one |
| `GlobalCommunityCta.astro:88` | 240px | one |
| `CommunityCallouts.astro:54` | 240px | one |
| `WebinarsPage.astro:73` | 280px | one |
| `ChapterEvents.astro:44` | 280px | one |
| `donate/DonorTierBand.astro:48` | 280px | one |
| `EventsSection.astro:30` | 280px | one |

Only **ContactUs** produces two columns on a phone. The plan suspected SponsorWall
too; at 220px it collapses to one, so that half of S8 is **dismissed**.

**And the surviving half is dismissed on the frame.** The concern was that two
columns at 390px would be cramped. It is not: the contact band renders as a 2×2
grid of circular social icons whose tap targets are far larger than 44px, with
comfortable spacing — a natural phone layout rather than a squeezed desktop one.
No finding. (The same frame does show F7, the band's vertical padding, which is a
separate issue.)

---

## 4. The 901–1040px band

This band gets no permanent scenario — it is not one of the four configured
sizes, and the plan deliberately did not add a fifth. This section is therefore
the only record of it.

**There is no captured frame at 1024.** What follows is derived from the two
rules in S2 and is verifiable by reading them; it is not a description of a
screenshot, and it should be confirmed by eye in a browser at 1024 before anyone
acts on the exact wording.

Between 901px and 1040px the site is in a state no one designed:

- The nav has already collapsed. `@media (max-width: 1040px)` sets
  `.site-nav { flex-wrap: wrap; padding: 16px 24px }`
  (`src/layouts/BaseLayout.astro:253`), so the header is in its wrapped,
  small-screen arrangement with 24px of its own padding.
- The body has not. `.wrap` keeps `padding: 0 48px` until 900px
  (`src/styles/tokens.css:174`, `:270`), so every band below the header is still
  in desktop gutters.

The visible consequence is a **24px header inset sitting above 48px body
gutters** — the wordmark and the page content are on two different left edges,
off by 24px, for a 140px-wide range of viewport widths.

Who lands here: iPad landscape (1024), a 1024×768 Chromebook, and any laptop
window dragged to roughly half of a 1920 screen. The owner's request named "iPad,
or laptops with odd dimensions" specifically, so this is the band that request
was about.

**Recommendation.** Move the two rules to the same breakpoint. The cheapest
version is to change `.wrap`'s gutter query from 900 to 1040 so the body collapses
with the nav; that single edit removes the band entirely. It interacts with the
S3 standardisation, because 900 is the second most-used breakpoint in the repo —
so the decision belongs to `launch--mobile-and-layout` (which owns the nav) with
`launch--design-system` (which owns the breakpoint set) agreeing the number.

---

## 5. Routing table

Every finding, grouped by the plan that should own the fix. This plan changes no
layout itself; assigning the work is the deliverable.

### `launch--mobile-and-layout`

| Finding | Why it lands here |
|---|---|
| **F1** — the whole nav renders expanded at ≤1040px | That plan already owns the phone menu and had decided on a hamburger. Two things it did not know: the failure is **not phone-only** — 768 (iPad portrait) is just as broken — and the nav does not merely fail to collapse, it renders every panel **open**. Its hamburger work must cover 768 and must give the panels a closed resting state. |
| **F4** — the 901–1040px dead band | It owns the nav breakpoint, which is one of the two rules that disagree. Needs a number agreed with `launch--design-system` (see S3). |

**Revision to that plan's step 11.** Its "Responsive audit checklist" was written
without evidence and is superseded by this report. F1 raises the priority of its
hamburger work from a polish item to the site's most severe public defect: on a
phone, **no page shows any content on the first screen**.

### `launch--design-system`

| Finding | Why it lands here |
|---|---|
| **F2** — `/blog/[slug]` renders outside `BaseLayout` | **Already specified** in its phase 1 step 2. The audit confirms it from a frame; no change to that plan. |
| **F3** — `/404` outside the shell, and its link uses a token that does not exist | **Already specified** in its phase 1 step 1, which names the undefined `--color-primary` explicitly. The audit confirms it; no change to that plan. |
| **F6** — board grid strands a cell; role lines wrap mid-phrase | Shared grid and type concerns. |
| **F7** — `.s-section`'s flat 78px padding costs 156px of every phone viewport | It owns the shared spacing layer; this is one token with a phone value. |
| **S3** — thirteen breakpoints, five of them used once each | It owns the breakpoint set. The proposal of 1040/820/640/520 is sound for the tail, but **must decide what happens to 900px**, the second most-used breakpoint and the carrier of `.wrap`'s gutter change. |
| **S4** — the content column cannot reach its declared width at 1280 | A token relationship (`--content-width` vs `.wrap` padding), not a page bug. |

### `launch--images`

| Finding | Why it lands here |
|---|---|
| **F5** — the London chapter card has no photograph | Content/asset sourcing, not layout. |
| **F8** — volunteer project covers: two blank, one a cropped board screenshot | Same family. The board screenshot is the urgent half; a blank placeholder at least reads as deliberate. |

### Proposed new plans

**Only one** finding is owned by nobody. Every other one lands in a plan that
already exists — which is the healthy outcome, and is why F2 and F3 are marked
confirmed rather than new. Creating this plan file is a separate `/codeyam-plan`
run; proposing it is this plan's deliverable.

1. **`tooling--capture-a-404-response`** — teach the capture harness to accept a
   declared non-200 status so error pages can hold scenarios. Without it, `/404`
   can never have a committed frame at any width (see §6), and the same gap will
   hit any future error or gone page.

### Second pass, once F1 is fixed

Not a finding — a scheduling note. Because F1 hides every page's content at
Mobile and Tablet, those widths still need a real review. The eleven
representative scenarios now carry all four sizes, so that pass is
`recapture-stale` plus a read, not new authoring.

---

## 6. The 404 page could not be captured

Recorded here because it shaped the audit's scope.

`/404` is public, and it is one of the surfaces most in need of review — it
renders outside the site shell with no responsive rules of its own (F3). The
audit intended to capture it at all four widths and could not.

Every capture entry point — `register`, `preview`, `recapture-stale` — treats an
HTTP **404 response** as a failed navigation and refuses to write a frame:

```
Scenario check failed … navigation: Navigation returned HTTP 404 (status 404)
```

Astro serves this page with a 404 status at `/404`, at `/404/` and at any unknown
path, which is correct behaviour. There is therefore no 200-status URL that
reaches it, and no retry, seed or settle changes the outcome. Manufacturing a
200-status route to the component would mean editing application source, which
this plan explicitly does not do.

So `src/pages/404.astro` is excluded from `PUBLIC_AUDIT_ROUTES`, with the reason
recorded in the file and pinned by a test so it is not re-added by accident, and
the page is assessed from source instead (F3). The tooling gap is proposed as a
plan above.
