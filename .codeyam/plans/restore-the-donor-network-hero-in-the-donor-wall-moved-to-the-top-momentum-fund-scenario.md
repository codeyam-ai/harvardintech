---
title: "Restore the donor network hero in the 'donor wall moved to the top' Momentum Fund scenario"
mode: ui
createdAt: "2026-10-19T17:42:47Z"
source: proposed-plan
---

## Summary

The `momentum-fund-the-donor-wall-moved-to-the-top` scenario (`.codeyam/scenarios/momentum-fund-the-donor-wall-moved-to-the-top.json`) seeds 19 donors and four `momentumSections` with the recognition band at order 4. Its description says the recognition band is pulled out of the reorderable flow and opens the page as the hero, with the network graphic, the founding-supporter count and the search box. On current code the live preview of that scenario shows the plain 'Let's go further together.' hero with no network, and the committed screenshot was refreshed to match on 2026-10-14. Nothing in that session touched the donate page, so this predates it.

## Key Decisions

- Decide whether the recomposition (recognition band as hero) is still wanted. If yes, fix the page; if it was deliberately retired, rewrite the scenario's description to match.

## Implementation

1. Read `src/pages/donate.astro`, `src/components/MomentumFundPage.astro` and `src/components/donate/MomentumNetwork.astro` for the condition that promotes the recognition band to the hero.
2. Compare with the scenario's seed (donors, momentumSections) to find which condition no longer holds.
3. Fix the condition or update the scenario description, then recapture `momentum-fund-the-donor-wall-moved-to-the-top` and compare with `momentum-fund-public-visitor`, which still shows the network.