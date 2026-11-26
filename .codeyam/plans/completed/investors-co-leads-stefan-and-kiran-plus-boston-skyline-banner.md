---
title: "Investors: co-leads Stefan and Kiran plus Boston skyline banner"
mode: ui
createdAt: "2026-11-26T02:30:47Z"
step: 11
source: prototype
---

## What was prototyped

The Investors community page (`/communities/investors`) now has two co-leads and a Boston skyline banner.

### Leads (content: `src/content/communities/investors.md`)
- **Stefan Pagacik** is listed first. His role changed from "Investor Community Digital Lead" to "Investor Community Co-Lead". He has no LinkedIn button (the user didn't want one). He has a new bio, drafted from public web profiles because LinkedIn blocks automated fetches. It names AMPRESTA (CEO and co-founder), AI4Impact (co-founder), World Wide Generation (past role), Harvard College and a Suffolk MBA. **The user should check it against his LinkedIn before go-live.**
- **Kiran Govindaraju** is listed second, as "Investor Community Co-Lead", with the bio the user supplied and a headshot.
  - The headshot `public/images/team/kiran-govindaraju.webp` is a 400×400 attention crop made from the user's upload `.codeyam/design/user_files/KiranPic_09082025.jpg`.

### Banner
- `public/images/communities/investors-boston-skyline.webp` (2400×480) is the Back Bay skyline with the Prudential Center, seen from Cambridge across the Charles at dusk. Source: Wikimedia Commons, "King of Hearts", CC BY-SA 4.0. It is credited in the banner.
- Front matter: `heroImage`, `heroCredit`, `heroCreditUrl`, and `heroImagePosition: 82% center`, so the Pru stays in frame on phones.

### Code changes (plumbing)
- `src/content/config.ts`: the communities schema gains `heroCredit`, `heroCreditUrl` and `heroImagePosition` (all optional). Credit mirrors the existing chapters fields.
- `src/pages/communities/[slug].astro` and `src/components/CommunityPage.astro` pass the three fields through to `ChapterHero`.
- `src/components/ChapterHero.astro` gains an optional `heroImagePosition` prop, forwarded to `PageBanner`'s existing `imagePosition` (object-position).

### Registries
- `src/data/media.json`: entries for `team/kiran-govindaraju.webp` and `communities/investors-boston-skyline.webp`.
- `src/data/imageCredits.json`: provenance rows for both. The headshot is own-work. The banner is stock-licensed, CC BY-SA 4.0, with the Commons URL.

## Verified visually
- Desktop at 1440 wide: the full panorama shows with the river, and the credit sits bottom-right. Both leads render with photos and bios, Stefan first.
- Phone at 390 wide: the banner is cropped to show the Pru. Title, tagline and credit are legible.

## Scenarios
- No new scenarios were registered. The existing `community-route-investors-lead-headshot` scenario reads live content and now shows both co-leads. Its description still says Stefan is the only lead and should be updated. Its screenshot needs recapturing.
- Consider a scenario for the community banner with a credit and an image position.

## Follow-ups for Build
- Tests: the communities schema accepts `heroCredit`, `heroCreditUrl` and `heroImagePosition`. `CommunityPage` renders the credit and applies the object-position.
- `src/lib/contentGaps.test.ts` references Stefan. Check whether the co-lead change affects it.
- Possibly expose the new fields in the CMS admin config for communities, if chapters expose `heroCredit` there.