---
title: "Hamburger menu: tapping a section heading slides its links off-screen"
mode: ui
createdAt: "2026-11-10T18:48:46Z"
source: manual
---

## Summary

In the hamburger menu (window 1040px wide or less), clicking, tapping or hovering a section heading such as "Global community" slides that section's links about half the drawer width to the left, mostly off-screen. Reported by the user 2026-11-10 as "the global community drop down seems to have issues showing up from the hamburger menu in smaller browser windows".

## Root cause (verified 2026-11-10 with a headless browser against the dev server)

`src/components/nav/PrimaryNav.astro`. The desktop hover rule

    .nav-item:hover .mega,
    .nav-item:focus-within .mega { transform: translateX(-50%) translateY(0); }

still applies inside the `@media (max-width: 1040px)` drawer. The drawer's reset `.mega { transform: none; }` is a lower-specificity selector, so it loses. Inside the drawer `.mega` is static and full width, so `translateX(-50%)` moves it by half the drawer's width. Measured after clicking the Global community heading: 390px window, panel left = -163px (transform -179px); 1024px window, left = -464px (transform -488px). A fresh load with nothing hovered or focused renders correctly, which is why the committed screenshots look fine.

The heading is a `<button class="nav-top">`, so tapping it on a phone gives it focus (`:focus-within`), and on touch devices the tap also leaves a sticky `:hover`. Every dropdown section (Chapters, Content hub, About, Get involved) has the same rule, so they are all affected, not only Global community.

## Implementation

**File**: `src/components/nav/PrimaryNav.astro`

Inside the `@media (max-width: 1040px)` block, neutralise the hover/focus state with a selector that outranks the desktop one:

    .nav-item:hover .mega,
    .nav-item:focus-within .mega { transform: none; }

No markup or script change. Above 1040px the desktop hover menu is unchanged.

## Reproduction Test

A browser-level check is the only faithful one (jsdom does not compute media-query cascades): at a 390px viewport, open the menu, click the Global community heading, and assert the `.mega` panel's left edge is at or right of the drawer's left edge (currently -163px). Prefer a scenario/interaction capture (`preview-interact` clicking the heading with the drawer open) if no browser test runner is configured.

## Scenarios to Demonstrate

- Phone-width homepage with the menu open and the Global community heading tapped: all of Subscribe, Join the community, AI, Founders and Investors visible and left-aligned under the heading.