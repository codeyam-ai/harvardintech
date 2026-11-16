---
title: "launch -- Relaunch /donate (Momentum Fund) on 11/30"
mode: ui
createdAt: "2026-11-16T23:15:00Z"
prefix: "launch"
source: manual
---

## Summary

At the 2026-11-16 go-live, /donate (the Momentum Fund campaign page) was **unlisted**: reachable by URL so donor-email links keep working, but `noindex`, robots-disallowed, out of the sitemap, and with every link to it withdrawn. The owner plans to ship it publicly on **2026-11-30**, after a closer content review and once the Givebutter donation link exists.

**Blocked on (owner):**
1. The Givebutter campaign/donation URL.
2. A content review pass of the page (hero, sections, FAQ, donor wall, goal meter) — the owner wants to check the copy closely before it is public.

## Key Decisions

- The Givebutter link goes in the CMS field the code already reads: Momentum Fund page → `donateUrl` (`src/data/donatePage.json`, read by `loadDonateUrl` / `resolveGiveHref` in `src/lib/giving.ts`). Setting it switches every giving button, on /donate AND the homepage band, off the mailto fallback in one place.
- `givebutterAccountId` is already set in `src/data/settings.json`; confirm it matches the account the campaign link belongs to.
- Relisting is all-or-nothing for /donate: page indexable, in the sitemap, linked from the menu and the homepage — never half (e.g. linked but still `noindex`).
- Ship on the same day as, or independently of, /sponsor (see `launch--relaunch-sponsor-page-on-11-30`); each has its own switch.

## Implementation

1. Content review with the owner: walk /donate section by section (render it in the preview at desktop and phone width), collect edits, apply them in the CMS content (`src/content/momentumSections`, `src/data/donatePage.json`, `src/content/pillars`, `src/content/testimonials`, `src/content/donors`).
2. Set `donateUrl` to the Givebutter link; verify every giving button points at it.
3. Remove `'/donate'` from `UNLISTED_PATHS` in `src/lib/unlistedPages.ts` (this drops the robots Disallow and lets the sitemap include it).
4. Remove `noindex` from the `<BaseLayout>` call in `src/pages/donate.astro`.
5. Restore the menu: in `src/data/nav.json` turn "Get involved" back into a dropdown — Volunteer `/volunteer/`, Donate `/donate/` (plus Sponsorship if /sponsor ships too). Update `src/lib/nav.test.ts` ("points Get involved straight at volunteering…") to the restored dropdown.
6. Restore the homepage band: untick Draft on `src/content/homeSections/giving.md` ("Giving campaign").
7. Update `src/lib/robots.test.ts` and `src/lib/unlistedPages.test.ts` for the shorter unlisted list.
8. Recapture the /donate, homepage and nav scenarios; update `DEPLOY_SETUP.md` "Unlisted pages".

## Verification

On the built public site: /donate has no `noindex`, appears in `sitemap-0.xml`, is not in robots.txt; the menu and the homepage giving band link to it; every Donate button opens the Givebutter link; donor-email links (`/donate?name=…`) still greet by name.
