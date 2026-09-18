---
title: "launch -- The H Brand Mark As Site Icon And Header Mark"
mode: ui
createdAt: "2026-09-18T20:38:23Z"
prefix: "launch"
source: manual
---

## Summary

The browser tab shows a generic globe instead of the site's mark, and the header
still carries the Veritas shield. Two separate causes. First, the declared icon
is an interim crimson "HIT" text monogram (`public/favicon.svg`), written while
permission to use the Veritas shield was still outstanding — the H mark has since
been **approved for use on its own** (`docs/launch-decisions-2026-09-16.md`,
"Brand mark"), so the interim no longer has a reason to exist. Second, and this is
what actually produces the globe: `SiteIcons.astro` declares *only* an SVG icon.
Any browser that does not use SVG favicons — and Google's search-result crawler —
falls back to an implicit `GET /favicon.ico` at the **origin root**, which on the
`codeyam-ai.github.io/harvardintech/` deploy is outside the site's base entirely
and 404s. This plan builds the approved H mark once, serves it as the browser icon
(with a raster fallback so no browser falls through to the globe), as the iOS
home-screen icon, and as the 26px nav mark in place of the shield.

## Key Decisions

- **The geometry is the one recorded in the decisions doc, and it is verified.**
  `M0 0h145v47H0z M0 94h46v175H0z M99 94h46v175H99z M46 167h53v47H46z` over a
  `0 0 145 269` viewBox. Rendered during planning: it produces the crimson H with
  the overline bar, and the white **T** in the negative space that the doc calls
  the point of the mark. One unit governs it — the stem width, 47 — so the bar,
  the gap beneath it and the crossbar are all that weight. Do not close the gap.

  ![The recorded geometry rendered crimson-on-white: the H, the overline bar, and
  the T in the negative space](assets/launch--the-h-brand-mark-as-site-icon-and-header-mark/h-mark-geometry.png)
- **Inline the mark in a component; do not add a file under `public/images/`.**
  `src/lib/imageCredits.test.ts` asserts a licence-ledger row for every asset in
  the media library, and its `VALID_SOURCES` are `own-event` / `stock-licensed` /
  `haa-permission` / `unknown` — none of which describes the organisation's own
  brand mark. An inline `BrandMark.astro` sidesteps that mismatch entirely,
  renders crisp at 26px, costs no HTTP request, and takes `currentColor` so one
  definition serves crimson-on-white in the header and white-on-crimson anywhere
  a dark ground appears later.
- **The favicon file carries an explicit `#a41034`, not `currentColor`.** An
  external favicon has no page to inherit colour from — `currentColor` there
  resolves to black. The existing test `favicon.svg › uses the brand crimson from
  the design tokens` also asserts the literal hex is present, and it should keep
  passing unchanged.
- **Geometry lives in two places, so a test pins them together.** The component
  and the standalone favicon cannot share an import, so the plan adds an assertion
  that the `d` attribute in `public/favicon.svg` matches the one in
  `BrandMark.astro`. That is cheaper than discovering the drift on a tab strip.
- **Declare a raster icon explicitly rather than relying on a root
  `favicon.ico`.** The implicit request goes to the origin root and cannot be
  base-corrected, so a `favicon.ico` alone would still miss on the project-subpath
  deploy. A `<link rel="icon" ... href={withBase('/favicon-32.png')}>` resolves
  under either base. A root `favicon.ico` is added too, cheaply, for the
  custom-domain deploy and for crawlers that only ever ask for that path.
- **The shield file and its ledger row stay; only its use in the header goes.**
  `imageCredits.test.ts › still records the Harvard shield as pending permission`
  pins that row, and the HAA question is genuinely still open. Deleting the asset
  would fail that test and erase a record that is still accurate. What is no
  longer accurate is the row's `note`, which says the shield is "used as the 26px
  nav mark" — that gets corrected.
- **Full lockup on crimson for the icon, not the bare H.** Confirmed by rendering
  at 16 / 32 / 128px: the bar plus the H stays readable at tab size and keeps the
  T. The bare H fills the square better but loses the mark's whole idea.

  ![The candidate icon rendered at 16, 32 and 128px, each upscaled for
  comparison](assets/launch--the-h-brand-mark-as-site-icon-and-header-mark/favicon-at-16-32-128.png)

  The 16px frame on the left is the one that decides the inset in change 3 — it
  reads, but sits tight, which is why the plan refuses to hardcode the scale.

## Implementation

### 1. The mark as a component

**New file**: `src/components/BrandMark.astro`

The approved H lockup as inline SVG: `viewBox="0 0 145 269"`, one `<path>` with
the four-rectangle `d` above, `fill="currentColor"`, `role="img"` and
`aria-label="Harvard Alumni in Tech"`. Accept an optional `class` so callers size
it. No colour of its own — the caller sets `color`.

Comment it with what the geometry means (the 47 unit; the gap that makes the T)
and with the standing caveat from the decisions doc: it is measured off a raster
in `HIT_BrandGuidelines.pdf`, not traced from vector artwork, so it should be
re-checked if the original ever turns up.

### 2. The header mark

**File**: `src/layouts/BaseLayout.astro`

Replace the `<img class="brand-shield" src={withBase('/images/harvard-shield.png')}>`
in the `.brand` link (around line 117) with `<BrandMark class="brand-mark" />`.
Keep the existing `height: 26px; width: auto; display: block` sizing, and set
`color: var(--crimson)` on it — the nav ground is `#fff` (`.site-nav`,
around line 169), so the mark reads crimson there.

Rename the `.brand-shield` rule to `.brand-mark` in the same file's style block
(around line 182); it is referenced nowhere else. Note that the lockup is taller
than it is wide where the shield was roughly square, so check the `gap: 10px`
between mark and wordmark still looks right and adjust if the optical spacing
reads tight.

### 3. The browser icon

**File**: `public/favicon.svg`

Replace the HIT monogram entirely. Keep the existing shape of the file — a
`0 0 100 100` viewBox, a crimson `#a41034` rounded square (`rx="18"`), and the
mark centred on it in white — but swap the `<text>` element for the H lockup
path, transformed to sit centred with comfortable padding.

**The inset is to be confirmed empirically, not taken from this plan.** A
`scale(0.286)` centred on the square was what the planning render used; it reads
but sits slightly tight. Render the candidate at 16, 32 and 128px and pick the
inset that keeps the T open at 16px before settling it.

Drop the interim comment about the HIT monogram and the pending shield decision;
replace it with the fact that this is the approved H mark, and a pointer to
`BrandMark.astro` as the other copy of the same geometry.

### 4. Raster fallbacks

**New file**: `public/favicon-32.png` — 32x32, generated from `favicon.svg`.

**New file**: `public/favicon.ico` — for the implicit origin-root request on the
custom-domain deploy.

**File**: `public/apple-touch-icon.png`

Regenerate at 180x180 from the same source so the iOS home-screen icon is the H
mark rather than the HIT monogram. `sharp` is already a devDependency and is
already used by `src/lib/siteIcons.test.ts`, so a small one-off generation script
run at build time (not committed to the app) is enough; the outputs are committed.

### 5. Declare them

**File**: `src/components/SiteIcons.astro`

Add the raster fallback ahead of the SVG, so a browser that understands
`image/svg+xml` still prefers the SVG and one that does not takes the PNG instead
of falling through to the globe:

```
<link rel="icon" href={withBase('/favicon-32.png')} sizes="32x32" />
<link rel="icon" type="image/svg+xml" href={withBase('/favicon.svg')} />
<link rel="apple-touch-icon" href={withBase('/apple-touch-icon.png')} />
```

Rewrite the file's header comment. It currently explains the mark as an interim
monogram chosen because the shield question was open; that is now settled for this
file's purposes. State instead that the mark is the approved H lockup, that the
geometry is shared with `BrandMark.astro`, and — the part worth keeping for the
next reader — why a raster fallback is declared at all.

### 6. Correct the licence ledger note

**File**: `src/data/imageCredits.json`

The `harvard-shield.png` row stays, with `source: "haa-permission"` unchanged.
Its `note` currently reads "Veritas shield, used as the 26px nav mark" — after
change 2 nothing renders it. Update the note to say the asset is retained but no
longer used on any page, and that the permission question remains open.

### 7. Tests

**File**: `src/lib/siteIcons.test.ts`

The three existing `favicon.svg` assertions (exists, not the scaffold
placeholder, contains `#a41034`, parses as an image) all still hold and should
not need touching — the deliberate design of change 3.

Add: the raster fallback exists and is declared (see Reproduction Test); the
32x32 PNG is exactly 32x32; and the geometry-drift guard that the `d` attribute
in `public/favicon.svg` matches the one in `src/components/BrandMark.astro`.

Update the file's header comment, which currently says the mark is a HIT monogram
"only because permission to use the Veritas shield is still outstanding". Keep its
good instinct — that these tests deliberately do not assert what the icon *looks
like* — but correct the premise.

## Reused existing code

- `SiteIcons` from `src/components/SiteIcons.astro` (glossary entry: `SiteIcons`)
  — already composed by `HeadExtras`, so every shell including the ones that
  render their own `<html>` picks the new links up with no further wiring.
- `withBase` from `src/lib/url.ts` (glossary entry: `withBase`) — every icon href
  goes through it so the paths resolve under both base modes. Its
  file-extension branch already leaves `/favicon-32.png` without a trailing
  slash, so the new PNG needs no special handling.
- `src/lib/siteIcons.test.ts` — the existing home for icon-kit assertions; the new
  tests extend it rather than starting a second file.
- `--crimson` (`#a41034`) from `src/styles/tokens.css` — the header mark takes the
  token; only the standalone favicon file hardcodes the hex, and only because an
  external SVG cannot read a CSS custom property.
- `sharp` — already a devDependency, already imported by `siteIcons.test.ts` for
  the dimension assertions, so generating the PNGs adds no dependency.

**Existing-implementation survey.** `SiteIcons.astro` already exists and is
already composed into `HeadExtras`, so the decisions doc's claim that the browser
icon is "an unused blue placeholder that no shell even links" is **stale** — that
half shipped in `launch--images` (69516b2). What did not ship is the H mark
itself, in either the icon or the header. There is no existing brand-mark
component, no H mark asset anywhere in `public/` or `src/`, and no raster favicon
of any kind. `public/images/harvard-shield.png` is referenced from exactly one
render site (`BaseLayout.astro:120`) plus three data/ledger files
(`src/data/media.json`, `src/data/responsiveImages.json`,
`src/data/imageCredits.json`) and two tests (`src/lib/imageCredits.test.ts`,
`src/lib/url.test.ts` — the latter only as a path fixture, not a dependency on
the header using it).

## Reproduction Test

Pins the defect that actually produces the generic globe: the icon kit declares no
raster fallback, so a browser that does not use SVG favicons falls through to an
origin-root `/favicon.ico` that does not exist on the subpath deploy.

**Target**: `src/lib/siteIcons.test.ts` — run with
`codeyam-editor editor refresh-tests --test 'the icon kit › declares a raster fallback alongside the SVG'`.

```ts
// A browser that does not use SVG favicons -- and Google's search-result
// crawler -- ignores the declared SVG and issues an implicit GET /favicon.ico
// against the ORIGIN root. On the project-subpath deploy that path is outside
// the site's base entirely, so it 404s and the tab falls back to a generic
// globe with no error anywhere. Declaring a raster icon explicitly, through
// withBase, is what stops that request being made.
describe('the icon kit', () => {
  it('declares a raster fallback alongside the SVG', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/SiteIcons.astro'), 'utf-8');
    expect(src).toContain('favicon-32.png');
    expect(existsSync(join(PUBLIC_DIR, 'favicon-32.png'))).toBe(true);
  });
});
```

Status: PROPOSED — confirm red at execution. Expected failure: `SiteIcons.astro`
today declares only `/favicon.svg` and `/apple-touch-icon.png`, so the
`toContain('favicon-32.png')` assertion fails first, with the component source in
the diff.

The other half of the user-visible change — that the mark is now the H lockup
rather than the HIT monogram — has no unit repro by design: `siteIcons.test.ts`
deliberately refuses to assert what the artwork looks like, so the swap is
demonstrated by the scenarios below rather than by a test.

## Scenarios to Demonstrate

The header renders on every page, so this change lands in every existing capture.
Recapture with `--target` per the usual rule rather than sweeping.

- **Homepage header** — the crimson H lockup in place of the Veritas shield, next
  to the "Harvard Alumni in Tech" wordmark on the white nav. The optical spacing
  check from change 2 is read off this frame.
- **A deep page header** (an event or blog post shell) — confirms the shells that
  render their own `<html>` get the same mark, since they reach it through
  `HeadExtras`/`BaseLayout` rather than independently.
- **Mobile header at <=720px** — the nav wraps at that breakpoint; the taller
  lockup should not push the brand row into a second line.
- **The icon kit at size** — the favicon rendered at 16, 32 and 128px side by
  side, which is where the inset decision in change 3 is settled and where the T
  in the negative space either survives or does not.
- **The iOS home-screen icon** — the 180x180 apple-touch PNG, confirming it is the
  H mark and not the leftover HIT monogram.