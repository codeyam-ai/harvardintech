---
title: "launch -- Relaunch /sponsor (Sponsorship) on 11/30"
mode: ui
createdAt: "2026-11-16T23:15:00Z"
prefix: "launch"
source: manual
---

## Summary

At the 2026-11-16 go-live, /sponsor (the Sponsorship page) was **unlisted**: reachable by URL, but `noindex`, robots-disallowed, out of the sitemap, and with every link to it withdrawn. The owner plans to ship it publicly on **2026-11-30**, after a closer content review.

**Blocked on (owner):** a content review pass of the page (intro copy, partnership levels, partner wall, the "Start a conversation" inquiry route).

## Key Decisions

- Relisting is all-or-nothing: page indexable, in the sitemap, and every withdrawn link restored together.
- The inquiry route stays as decided on 2026-11-16: partner inquiries go to info@ (`emailFor('sponsorInquiry', …)` on the page). The homepage cards keep the owner's standing rule that cards lead to a page or form, never an inbox — so they link to /sponsor, as before.
- Independent of /donate (see `launch--relaunch-donate-page-on-11-30`); if both ship together, restore the full "Get involved" dropdown in one change.

## Implementation

1. Content review with the owner: walk /sponsor at desktop and phone width; apply edits in `src/content/sponsorPage`, `src/content/sponsorLevels`, `src/content/sponsors`.
2. Remove `'/sponsor'` from `UNLISTED_PATHS` in `src/lib/unlistedPages.ts`, and `noindex` from `<BaseLayout>` in `src/pages/sponsor.astro`.
3. Menu: add Sponsorship `/sponsor/` back under the "Get involved" dropdown in `src/data/nav.json` (a dropdown needs 2+ items — Volunteer + Sponsorship, plus Donate if it ships); update `src/lib/nav.test.ts`.
4. Homepage, restore what was withdrawn (each spot has a comment marking it):
   - `src/components/landing/SupportUs.astro`: the "Sponsor an event", "Host us in your space" and "Share job opportunities" cards → /sponsor ("Start a conversation →"); grid back to 5 columns.
   - `src/components/landing/GetInvolved.astro`: the "Sponsor or host" button → /sponsor; restore "speak, host, or sponsor" wording.
5. SF Bay Area chapter: restore the "Host an event" → /sponsor link in `src/content/chapters/sf-bay-area.md`.
6. Update `src/lib/robots.test.ts` / `src/lib/unlistedPages.test.ts`; recapture the /sponsor, homepage support/get-involved, chapter and nav scenarios; update `DEPLOY_SETUP.md` "Unlisted pages".

## Verification

On the built public site: /sponsor has no `noindex`, appears in the sitemap, is not in robots.txt; the menu, the homepage support cards, the Get involved button and the SF chapter page all link to it.
