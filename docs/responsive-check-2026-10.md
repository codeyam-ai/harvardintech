# Responsive check — October 2026 (launch sign-off)

The second pass the September audit (`docs/responsive-audit-2026-09-18.md`)
left owed. That audit could not judge any page at phone or tablet width because
the expanded menu (F1) covered the first screen; F1 is fixed, so this pass looks
at what was underneath.

Three layers, because no single tool sees everything:

1. **An automated width sweep** — every built page at ten widths, scrolled top
   to bottom, judged for things a machine can measure.
2. **A visual pass** of the phone and tablet frames, for things a script
   cannot judge.
3. **A real-device checklist** for things neither can reproduce (iOS Safari's
   address bar, the notch, rotating, pinch-zoom).

Every item below is either **fixed** in this run or **owner decides**.

## 1. The sweep

`npm run check:responsive` (after `npm run build` with `DEPLOY_BASE_PATH`
unset). It serves `dist/` through `astro preview`, loads each of the **37
public pages** at **320, 360, 390, 414, 768, 834, 1024, 1280, 1440 and 1920px**,
and writes `.codeyam/tmp/responsive-sweep/results.json`. Add `-- --only /path`
to re-check one page.

Redirect stubs, `/admin`, `/previews`, the cutover runbook and the isolated
component routes are skipped. `/404` IS swept — the one page the screenshot
harness still cannot photograph (audit §6).

What it judges (`src/lib/responsiveSweep.ts`):

| Finding | Severity | Rule |
|---|---|---|
| Sideways scroll | **fail** | page wider than the window (1px tolerance) |
| Element off screen | **fail** | a visible element past either edge, unless it is inside a scroller, clipped, a closed off-canvas panel or visually hidden |
| Image wider than screen | **fail** | the same, for images and video |
| Small tap target | advisory | a link or button under 44×44px at ≤834px |
| Small text | advisory | computed font size under 12px |
| Third-party frame | advisory | a Luma / Givebutter / video embed — its contents are not ours and are **not** measured |

Tap targets and small text are advisory on purpose: an inline link inside a
sentence is legitimately small, and the site's monospace eyebrows are a type
decision, not a bug.

### Counts

| | Fail rows | Advisory rows |
|---|---|---|
| Before (first run) | 4 (2 distinct problems) | 548 |
| After this run | **0** | 458 |

## 2. Findings

### Fixed in this run

| # | Page | Widths | What was wrong | Fix |
|---|---|---|---|---|
| R1 | `/` (stats band) | 768, 834 | Five figures with 48px gutters could not fit; the page scrolled sideways (1012px wide in a 768px window). | Gutters come in at the shared 1040px breakpoint (`Stats.astro`). All five stay on one row. |
| R2 | `/privacy` (cookie table) | 320, 360 | The markdown table had no styles; it ran 48px off a small phone and scrolled the whole page. | CMS tables scroll inside their own box, with tighter cells — the whole table now fits at 390 (`SitePageBody.astro`). |
| R3 | every page (red city bar) | 768–1040 | The full city line wrapped to two lines on an iPad. Found in the tablet frames. | The short "A global community" line, already used on phones, now applies up to 1040px (`UtilityBar.astro`). |
| R4 | every page (logo, footer links) | ≤834 | Tap areas 26px and 18px tall. | Tap area grown to 44px with padding and an equal negative margin — nothing moves visually (`BaseLayout.astro`). |
| R5 | `/` (hero carousel dots) | ≤834 | 30×4px buttons. | 44×44px tap area; the bar still draws at 30×4. Gap 10→14px so tap areas abut (`HeroCarousel.astro`). |
| R6 | many pages ("Read more" / "Back" links) | ≤834 | 16px-tall links. | Same invisible tap-area growth on the shared `.link-more` class (`tokens.css`). |

### For the owner to decide

> **Update 2026-10-16:** the owner approved O1–O5 and the follow-up pass made
> them: compact Luma card when nothing is upcoming (O1), 44px Subscribe button
> and social badges (O2, O3), 44px tap areas on the giving and volunteer links
> (O4), and a 12px text floor guarded by `src/lib/typeFloor.test.ts` (O5; the
> nav caret glyph is the one exemption). O6 stays as recommended. The sweep is
> still 0 fail rows; advisories went from 458 to 72, almost all inline links.

| # | Page | Widths | What the check found | Recommendation |
|---|---|---|---|---|
| O1 | `/events` | all, worst on phones | **The Luma calendar is a big, mostly-empty grey box** when nothing is upcoming (decision sheet `m-calendar-box`). It is Luma's own empty panel inside their frame; we cannot restyle it, and its right edge sits ~36px inside our column for the same reason. | When the nightly-imported events have nothing upcoming, show a compact "Subscribe on Luma" card in place of the frame. A behaviour change, so yours to call. |
| O2 | header, every page | 768, 834 | The **Subscribe** button is 39px tall. | Raise to 44px. It changes the header's look slightly, so not done unasked. |
| O3 | footer, every page | ≤834 | **Social icons** are 42×42px. | Raise the shared badge size to 44px. Two pixels; cosmetic. |
| O4 | `/`, `/donate` | ≤834 | "Giving coming soon" links (26px tall), volunteer project title and "go" links (18–20px). | Same invisible tap-area growth as R4, if wanted. |
| O5 | every page | all | **347 small-text rows**: the monospace eyebrows (11px), the city bar (10.5px), the menu caret (9px), the footer line (11px), dates (10–11px). | A deliberate type style. Keep, or set a 12px floor in the design tokens. |
| O6 | inline links in text | ≤834 | Links inside sentences are under 44px tall. | Keep — normal for body copy. |
| O7 | five webinar posts, `/events` | all | Third-party frames (video, Luma) were not measured inside. | Covered by the real-device checklist below. |

## 3. Decision sheet rows

| Row | Status |
|---|---|
| `m-phone-menu` — fix the phone menu | **Done.** Closed at rest on phone and tablet; opens to a clean list (checked at 390 and 768). |
| `m-city-bar` — red bar wraps to three lines | **Done** (phones, 2026-09-28) and **extended to tablet** in this run (R3). |
| `m-no-events-twice` — "No upcoming events" twice | **Done.** It now appears once, inside the Luma calendar. |
| `m-calendar-box` — big, mostly empty grey box | **Still open — owner decides** (O1). |

## 4. Real-device checklist

To run on real hardware before launch (neither tool can reproduce these):
iOS Safari on an iPhone (address bar collapse, notch / safe-area insets, the
sticky header while scrolling with a thumb), Android Chrome, an iPad in both
orientations, and pinch-zoom. The viewport meta in `BaseLayout.astro` is
`width=device-width, initial-scale=1` with no `user-scalable=no`, so zoom stays
allowed.
