---
title: "Global community menu: newsletter above WhatsApp in one column"
mode: ui
createdAt: "2026-11-09T19:20:38Z"
source: manual
---

## Context

User feedback 2026-11-09: in the header's Global community dropdown, the two side-by-side columns (WhatsApp community | Newsletter) feel odd. Keep the newsletter visually distinct from WhatsApp, but stack everything in one column.

## What changes

Desktop dropdown and phone/tablet drawer, top to bottom:

1. **Newsletter**: the bold link at the top, with a smaller grey "Subscribe" line under it (the same small second line the Chapters menu uses for "Online · WhatsApp group"). The whole block is one link to the Mailchimp signup. No divider.
2. **WHATSAPP COMMUNITY** heading, then Join the community, AI, Founders, Investors (unchanged).

## Approach

- `src/data/nav.json`: put Newsletter before the WhatsApp column and give it `note: "Subscribe"`.
- `src/components/nav/PrimaryNav.astro`: when a columns menu mixes a plain-link column with titled columns, stack the columns vertically instead of side by side. The plain-link column renders its note under the bold label.
- `src/pages/isolated-components/[name].astro`: update the pinned fixture to the new order.
- Keep the CMS save path: `note` is already a supported nav field.

## Scenarios

- PrimaryNav - Communities Derived (desktop, dropdown pinned open): recapture showing the stacked layout.
- Add a phone-width capture of the drawer showing Newsletter above WhatsApp.

## Out of scope

Other menus keep their current layout.