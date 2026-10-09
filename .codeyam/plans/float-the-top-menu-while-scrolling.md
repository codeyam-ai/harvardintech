---
title: "Float the top menu while scrolling"
mode: ui
createdAt: "2026-10-09T19:31:06Z"
source: manual
---

## Summary

Make the top menu float. When you scroll down any page, the white header row
(wordmark, Events / Chapters / Communities / Content hub / About / Get involved,
and the Subscribe button) stays pinned to the top of the screen instead of
scrolling away. Today `.site-nav` in `BaseLayout.astro` is `position: relative`,
so a reader deep in a long blog post or the events archive has to scroll all
the way back up to reach the menu or Subscribe.

## Key Decisions

- **Pinned full-width bar, not a detached pill.** The header keeps its current
  look and stays stuck to the top edge (`position: sticky; top: 0`). This is
  the smallest visual change, and it works on every page without retuning the
  mega-menu panels, which are positioned against the header. If the user would
  rather have a rounded card that hovers below the edge, or a bar that hides
  while scrolling down, revise the plan before running it.
- **The crimson utility strip scrolls away.** It is a one-line tagline
  (`UtilityBar.astro`), and pinning it as well would take an extra ~25px of
  every screen for no navigation value. Only `.site-nav` sticks. It already sits
  directly after the strip in `<body>`, so sticky works without any markup
  change.
- **A shadow appears once the page has scrolled.** At the top of the page the
  header looks exactly as it does now. Once scrolled, a soft shadow separates
  it from the content passing underneath. Use a tiny script or a sentinel
  `IntersectionObserver` that sets a `data-scrolled` attribute. Without
  JavaScript the header still sticks; it just has no shadow.
- **In-page anchors must clear the pinned header.** Links such as `#sign-up`
  (chapter pages), `#global-community` and the homepage section anchors
  currently land with the heading at the very top of the screen, where the
  pinned header would cover it. Add `scroll-padding-top` on `html`, sized to the
  header height at each breakpoint.
- **The mobile menu must stay scrollable.** At ≤1040px the menu opens inline
  inside the header (`.nav-drawer` in `PrimaryNav.astro`) and lists every
  chapter, community and link, which is taller than a phone screen. Once the
  header is pinned, the bottom of an open menu would be unreachable. Give the
  open drawer a `max-height` of the viewport minus the header row, with
  `overflow-y: auto` and `overscroll-behavior: contain`.

## Implementation

### 1. Pin the header

**File**: `src/layouts/BaseLayout.astro`

Change `.site-nav` from `position: relative` to `position: sticky; top: 0`,
keeping `z-index: 50`. Check this still sits above page content, and below the
mega panels (`z-index: 70`) and any modal or preview overlay. Add a
`[data-scrolled]` rule that adds a soft `box-shadow`, using existing tokens if
one fits. Add the small inline script that toggles `data-scrolled`, alongside
the existing `data-js` script.

### 2. Keep anchor targets visible

**File**: `src/styles/tokens.css`

Add `html { scroll-padding-top: … }` to match the header height: about 64px on
desktop, and the smaller padded heights at ≤1040px and ≤520px. Measure from a
capture rather than guessing.

### 3. Make the open mobile menu scroll inside itself

**File**: `src/components/nav/PrimaryNav.astro`

Inside the `@media (max-width: 1040px)` block, cap the open `.nav-drawer`
height at the viewport (`100dvh`) minus the header row, and let it scroll.
Confirm that opening, closing and the `data-open` toggle still work, and that
`navDisclosure` behaviour is unchanged.

## Reused existing code

- `PrimaryNav` from `src/components/nav/PrimaryNav.astro` (glossary entry: `PrimaryNav`). Its drawer and mega-panel positioning is relative to the header and keeps working under sticky.
- `src/lib/navDisclosure.test.ts` covers menu open/close behaviour and should stay green.
- Existing PrimaryNav scenarios (`primarynav-derived-chapters`, `primarynav-get-involved-merged`, and others) for regression captures.
- Existing-implementation survey: nothing in `src/` sets `position: sticky`, `scroll-padding` or `scroll-margin` today, so there is nothing to reuse or conflict with.

## Scenarios to Demonstrate

- A long page (a blog post or the events archive) scrolled partway down at
  desktop: the header is pinned with its shadow, and the crimson strip is gone.
- The same page at the very top: the header looks exactly like today.
- Desktop mega menu (Chapters) opened while scrolled: the panel drops below the
  pinned header correctly.
- Phone (390px) with the menu open while scrolled: the drawer fits the screen
  and its last item (Subscribe) can be reached by scrolling inside it.
- A chapter page reached via `#sign-up`: the "Stay in touch" heading is fully
  visible below the header.

Note: captures do not scroll for URL fragments. Use a scroll or hover
interaction to frame the scrolled states.