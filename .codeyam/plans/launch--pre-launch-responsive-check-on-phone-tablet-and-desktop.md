---
title: "launch -- Pre-launch responsive check on phone, tablet and desktop"
mode: ui
createdAt: "2026-10-09T20:02:06Z"
prefix: "launch"
source: manual
dependsOn: ["float-the-top-menu-while-scrolling", "launch--add-an-our-mission-section-for-the-mission-link", "rewrite-the-newsletter-call-to-action"]
---

## Summary

A pre-launch check that every public page looks right on phones, tablets and
desktops, with small breakages fixed along the way. This closes the decision
sheet row "Check every page on a phone" (`m-coverage`, marked **Plan it**), and
it does the second pass that the September audit
(`docs/responsive-audit-2026-09-18.md`) left owed. That audit could not judge
any page at Mobile or Tablet, because the expanded nav (finding F1) covered
the whole first screen. F1 has since been fixed (`2b2c971`, "the site works on a
phone"), along with F2, F3, F4 and F7. Nobody has looked at the phone and tablet
frames since.

The check has three layers, because no single tool sees everything:

1. **An automated width sweep** (new). It loads every built page at ten widths,
   from a 320px small phone up to a 1920px monitor, and flags the problems a
   machine can measure: sideways scrolling, elements running off the screen,
   images wider than the screen, text too small to read, and tap targets too
   small to hit. It scrolls the full page, so the sweep also covers everything
   below the fold, which viewport-sized scenario captures miss.
2. **A visual second pass** over the scenarios that already carry all four sizes,
   plus new frames for surfaces added since the audit. A person or agent reads
   each frame against a fixed checklist for things a script cannot judge, such
   as awkward wrapping, stranded grid cells, and an unbalanced layout.
3. **A short real-device checklist** for things neither tool can reproduce:
   iOS Safari's collapsing address bar, the notch and safe areas, the sticky
   header while scrolling with a thumb, rotating the phone, and pinch-zoom.

It ends with a findings report that marks every item **fixed in this run** or
**for the owner to decide**.

## Key Decisions

- **Check and fix in one go.** Mechanical breakages get fixed in the same run:
  sideways scroll, clipped or overlapping content, a grid that does not reflow,
  padding that eats a phone screen, or a tap target under 44px. Anything that is
  a matter of taste, or that needs new content or images, is written into the
  report for the owner instead. Chosen over an audit-only pass because every plan
  that owned the September findings has completed, so a report alone would have
  nowhere to route its findings. To undo this choice, delete step 6 and keep the
  report.
- **Runs after the three queued layout plans.** The plan depends on
  `float-the-top-menu-while-scrolling`, `launch--add-an-our-mission-section-for-the-mission-link`
  and `rewrite-the-newsletter-call-to-action`, so it checks the site as it will
  actually launch. The sticky header matters most here, because on a phone it
  takes a fixed slice of every screen. To run it sooner, drop the `dependsOn`
  entries.
- **Odd widths go in the sweep, not in new scenario sizes.** The four sizes in
  `.codeyam/editor.json` (Mobile 390, Tablet 768, Laptop 1280, Desktop 1440) stay
  as they are. Adding 320, 360, 1024 and 1920 as scenario dimensions would
  multiply captures that already time out: a four-size capture now takes longer
  than the editor's 60-second limit, which is why the contact, board and
  chapters scenarios were split into two sizes each. The sweep checks the odd
  widths cheaply and without screenshots. A width only gets a frame when the
  sweep finds a problem there that needs to be seen.
- **The sweep runs against the production build, every page.** It builds with
  base `/`, serves `dist/` through `astro preview`, and walks every
  `dist/**/index.html` plus `404.html`. It skips Astro redirect stubs (pages
  holding only a meta refresh, such as `dist/nyc/`), `/admin`, `/previews` and
  the cutover runbook. That is about 50 real pages with real production content,
  rather than the eleven representative routes in `PUBLIC_AUDIT_ROUTES`. It
  also covers `/404`, which the capture harness still cannot photograph
  (audit §6), because Playwright does not refuse a 404 response.
- **The judging logic is a unit-tested pure module, and the browser driver is a
  thin script.** Deciding what counts as overflow, what is too small and which
  findings to ignore is testable without a browser. Driving Chromium needs a
  server, so it stays outside `vitest run`. The sweep is a manual pre-launch
  step (`npm run check:responsive`) and is not wired into deploy:
  `deploy.yml` runs no tests at all, and changing that is a separate decision.
- **Tap-target and font-size findings are advisory.** Sideways scroll and
  off-screen elements fail the sweep. A link under 44px or text under 12px is
  reported but does not fail, because inline links in body copy are
  legitimately small. Step 6 decides each one.

## Implementation

### 1. The sweep's judging rules

**New file**: `src/lib/responsiveSweep.ts`

Pure functions over plain measurement records, so they can be tested without a
browser:

- `SWEEP_WIDTHS`: 320, 360, 390, 414, 768, 834, 1024, 1280, 1440, 1920. These are
  the smallest phone still sold, a common Android width, iPhone, iPhone Plus,
  iPad portrait, iPad Air, iPad landscape and Chromebook, plus Laptop, Desktop
  and a wide monitor.
- `judgePage(measurements, width)` returns findings of these kinds:
  `horizontal-scroll` (`scrollWidth > innerWidth + 1`), `offscreen-element`
  (right edge past the viewport, or a negative left edge on a visible element),
  `image-overflow`, `small-tap-target` (an interactive element under 44×44 at
  ≤834px), and `small-text` (computed font-size under 12px). Each finding has a
  severity of `fail` or `advisory`.
- An ignore list for elements that legitimately overflow: off-canvas menu
  panels while closed, `overflow-x: auto` scrollers such as a gallery strip,
  visually-hidden skip links, and third-party iframes (Luma, Givebutter). The
  sweep must report what is inside a third-party iframe as "not ours" and not
  pass it silently.
- `summarise(results)` groups findings by page and by width, so that one bad
  element at ten widths reads as a single row.

**New file**: `src/lib/responsiveSweep.test.ts`. Unit tests for each finding
kind, for the ignore list, for the 1px rounding tolerance, and for the
grouping. The fixtures are hand-built measurement objects. They do not render
any pages.

### 2. The browser driver

**New file**: `scripts/responsive-sweep.mjs`

- Enumerates pages from `dist/`, skipping redirect stubs and excluded paths
  (see Key Decisions).
- Starts `astro preview` on a free port. Uses the installed `playwright`
  Chromium, which `postinstall` already installs.
- For each page and width: navigate, wait for `document.fonts.ready` (the
  webfont race already causes capture churn), scroll to the bottom in steps so
  lazy images load, collect measurements with one `page.evaluate`, and pass them
  to `judgePage`.
- Writes `.codeyam/tmp/responsive-sweep/results.json` and prints a short table.
  Exits non-zero only on `fail` findings.
- Takes a `--only <path>` flag for re-checking one page while fixing it.

**File**: `package.json`. Add `"check:responsive": "node scripts/responsive-sweep.mjs"`.
The script expects a fresh `dist/`. If `dist/` was built with the deploy base
`/harvardintech/`, it should say so and stop, so it never reports every asset as
a 404.

### 3. Run the sweep and triage

Build with `DEPLOY_BASE_PATH` unset, run the sweep, and record the raw counts
in the report before fixing anything. After building, restart the dev server
before any scenario capture, because a build alongside `astro dev` poisons the
Vite cache.

### 4. Visual second pass at Mobile and Tablet

Recapture (`recapture-stale --target …`) the 14 scenarios listed in audit §1
that carry the four sizes. Read every Mobile and Tablet frame against this
checklist:

- The first screen shows the page's own content, not the menu.
- No text clips, overlaps or wraps mid-phrase into a dangling separator (F6).
- Grids reflow without a stranded single card, unless that is deliberate.
- Buttons and form fields span a sensible width and are not squeezed side by
  side.
- Images keep their aspect ratio and crop sensibly.
- The vertical rhythm does not spend more than about a fifth of the screen on
  padding (F7's measure).

Confirm or clear the four mobile rows on the decision sheet that are still
marked **Plan it**: the events calendar box (`m-calendar-box`), the red city bar
wrapping to three lines (`m-city-bar`), "No upcoming events" appearing twice
(`m-no-events-twice`) and the phone menu (`m-phone-menu`).

### 5. Frames for surfaces added since the audit

Add Mobile and Tablet scenarios, two sizes each to stay under the capture
timeout, for:

- The sticky header after scrolling, framed with a `hover` interaction on a
  below-fold selector, because a URL fragment does not scroll a capture.
- The Our mission section.
- The rewritten newsletter call to action.
- The phone menu open at 768. The existing `harvard-in-tech-phone-menu-open`
  covers Mobile and Tablet. Confirm that it still renders after the sticky-header
  change.

Each new scenario needs its own `interactions` selector so that it does not
collide with the other homepage band scenarios. Run `distinct-capture-check`
afterwards.

### 6. Fix what is mechanical

Fix every `fail` from step 3 and every clear breakage from steps 4–5 in the
component that owns it. Prefer the shared breakpoint and spacing tokens in
`src/styles/tokens.css` and `src/layouts/BaseLayout.astro` over one-off media
queries. The audit counted thirteen breakpoints, and the fix must not add a
fourteenth. Re-run `npm run check:responsive --only <path>` and recapture the
affected scenario after each fix. Anything that needs content, images or a
design call goes in the report, not into the code.

### 7. The report and the real-device checklist

**New file**: `docs/responsive-check-2026-10.md`. This file is the launch
sign-off. It covers:

- The sweep's before and after counts.
- One row per finding: page, widths, what was wrong, status (**fixed** with the
  commit, or **owner decides** with a recommendation).
- The state of the four `m-*` decision sheet rows.

Then run `/codeyam-manual-tests` with a freeform request for 3–5 real-device
checks: iOS Safari on an iPhone (address bar collapse, notch and safe-area
insets, sticky header while scrolling), Android Chrome, iPad in both
orientations, and pinch-zoom still working. The viewport meta in
`BaseLayout.astro` is `width=device-width, initial-scale=1` with no
`user-scalable=no`, and that should stay true. Link those tests from the report.

## Reused existing code

- `PUBLIC_AUDIT_ROUTES` and `AUDIT_SIZES` from `src/lib/publicRoutes.ts`, which
  hold the representative routes and the four required sizes for step 4.
- `missingSizes`, `routeCoverage` and `uncoveredRoutes` from
  `src/lib/responsiveCoverage.ts`, guarded by `src/lib/responsiveCoverage.test.ts`.
  New scenarios must keep the guard green. Nothing equivalent to a width sweep
  or overflow judge exists in `src/lib/` or `scripts/`, so step 1 is new work and
  duplicates nothing.
- `docs/responsive-audit-2026-09-18.md`, which supplies the scenario list (§1),
  the finding numbering (F1–F9) and the "second pass" note this plan executes.
- `playwright`, already a dependency and installed by `postinstall`.
- `.codeyam/editor.json`, which defines the four screen sizes and stays
  unchanged.
- `src/layouts/BaseLayout.astro`, which holds the nav breakpoint (`max-width:
  1040px`) and the viewport meta.
- `src/styles/tokens.css`, the shared spacing scale that step 6 should fix
  against.
- `scripts/responsive-images.mjs`, the existing pattern for a standalone node
  script in `scripts/`.

## Scenarios to Demonstrate

- The homepage hero at Mobile with the sticky header: the first screen shows the
  hero, not the menu.
- The homepage after scrolling at Mobile: the header is pinned and its height is
  reasonable.
- The phone menu open at Tablet (768).
- The Our mission section at Mobile and Tablet.
- The newsletter call to action at Mobile.
- `/events` at Mobile with no upcoming events: the empty state appears once and
  is aligned (`m-no-events-twice`).
- A chapter page at Mobile: the red city bar does not wrap to three lines
  (`m-city-bar`).
- The longest chapter name at Mobile (`chapter-route-longest-chapter-name-wraps`).
- The board grid at Tablet with five directors (F6).

## Capture notes

- Keep each scenario at two sizes or fewer. Four-size captures exceed the 60s
  capture request.
- Always `--target` a recapture. Wrong-page frames from the content-sandbox
  reseed race are a known hazard, so check each frame shows the intended page.
- Commit any dirty `src/content` or `src/data` file before capturing, or the
  seeded scenarios photograph production content.