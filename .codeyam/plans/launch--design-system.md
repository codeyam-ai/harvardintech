---
title: "launch -- Design System"
mode: ui
createdAt: "2026-09-14T17:35:40Z"
prefix: "launch"
order: 6
source: manual
dependsOn: ["launch--responsive-audit-of-every-public-page"]
---

## Summary

This plan finishes moving the site onto the Atlas design system (`.wrap`, `.sec`, `.sec-head`, `.kick`, `.btn*`, `--ink` / `--crimson` / `--paper` in `src/styles/tokens.css`) and retires the older `.s-*` / inline-style layer. It has six phases. Each can ship on its own, in order.

1. **Shell and cleanup.** Blog posts and 404 move into `BaseLayout`. The 12 unused components and their 27 isolation scenarios are deleted. The nav, footer and branding are audited for Strikingly leftovers.
2. **Shared parts.** One pill button set, one "Learn more →" link, a page banner, a section head, an empty state, a date formatter and a social-links row.
3. **Chapters, communities and `/events` onto Atlas.** Left-aligned "Chapter · City" banners, and the new community page type is restyled.
4. **The same banners, cards and empty states** on sponsor, volunteer, volunteer project, CMS pages and blog.
5. **Homepage copy and shared links become CMS-editable**, reusing the `momentumSections` kicker/intro pattern.
6. **Hex-to-token cleanup outside donate/give**, a guard test, and a behaviour-neutral `MomentumNetwork` split.

The donate/give campaign look is **paused** and is not restyled by any phase.

**Coordination.** This plan restyles. The sibling plans in `.codeyam/plans/` own content and behaviour:

| Sibling plan | What it owns that this plan builds on |
|---|---|
| `launch--chapters-and-communities.md` | `CommunityPage`, the `label` prop, forming chapters, new CTA blocks |
| `launch--contact-and-calls-to-action.md` | Blank contact email, the `connectLinks` helper, Luma-only events |
| `launch--images.md` | Favicon, social-icon swap, unused-image cleanup |
| `launch--mobile-and-layout.md` | Phone menu, `/events` restructure, homepage empty events |
| `launch--content-and-pages.md` | Blog index, privacy page |
| `launch--giving-pages-short-term.md` | Donate/give |

## Owner decisions (2026-09-14)

- **Phase 1.** Plan it.
  > "Make sure also that menu, footer, branding etc. are all updated and not drawing off the old strikingly site."

  The audit is Phase 1, step 4.
- **Phases 2, 3, 4, 5, 6.** Plan it (all).
- **Banner heading style.** Left-aligned.
  > "Depends on the module."

  The variants are listed under Recommendations.
- **Empty-state style.** Soft panel + button.
- **Communities.** A separate page type. `launch--chapters-and-communities.md` owns the content side, and also creates `CommunityPage.astro` (its step 9). This plan owns that component's look (Phase 3, step 3).
- **Button shape.** Pill everywhere. The owner chose this over the recommended "square, pill for giving".
- **Chapter banner wording.** A "Chapter" label plus the city.
- **The 12 unused components.** Delete, and remove any isolation scenarios that still render them.
- **Donate page look.** UNDECIDED / PAUSED.
  > "I'm not sure - we should pause on this for now and see what Nicole's changes have led; maybe keep as-is for now."

  Phase 6 therefore leaves donate/give alone, and the campaign-look alignment is blocked.

## Open questions / needs input

1. **Owner.** Two sibling plans conflict on the footer's plain-text "· Cookie Policy" (`src/data/settings.json` `footerText`). `launch--giving-pages-short-term.md` (L11) removes it. `launch--content-and-pages.md` writes a `/privacy/` policy and links it from the footer. Pick one before either ships. This plan only restyles whichever footer link results.
2. **Owner or Nicole.** The footer and ChapterConnect still list Twitter (`twitter.com/harvardintech`). Should it stay, be relabelled "X", or be dropped? `src/lib/brandIcons.ts` already has an `x` icon.
3. **Owner.** Deleting `Greeting.tsx` removes the harness's only React-island example (`islands` in `src/pages/isolated-components/[name].astro`). Is that fine? The plan deletes the island branch too. If a future island is expected, it keeps an empty `islands` map instead.
4. **Owner.** Should `/give` copy editing (from the earlier Phase 5 recommendation) wait for Nicole's staging edits to land? `src/data/givePage.json` already exists. I've held it back because the donate/give area is paused.
5. **Owner.** The `MomentumNetwork` split is in the paused area. Do it now while it's behaviour-neutral, or after the donate decision? My pick is after Nicole's staging content merges, to avoid conflicts.
6. **Chapters-and-communities plan author.** Please confirm that plan ships before Phase 3. This plan restyles its `CommunityPage`, `ChapterHero` `label` and CTA blocks rather than recreating them. If Phase 3 must go first, it adopts that plan's props (`label`, `status`) as specified there.

## Recommendations

**How to express the shared parts (Phase 2):**

| Option | What it is | Verdict |
|---|---|---|
| A | CSS classes only in `tokens.css` | Cheap, but empty states, banners and social rows carry markup, so they would stay copy-pasted. |
| B | An Astro component for every part | Wraps a one-line `<a class="btn">` in a component for no gain. |
| **C (pick)** | Classes for atoms (`.btn`, `.btn-out`, `.link-more`, `.card`); components for parts with markup (`PageBanner`, `SectionHead`, `EmptyState`, `SocialLinks`) | Matches how Atlas already works. The markup-bearing parts are where the 5 header patterns and ~9 empty states diverged. |

**Banner and heading variants, per module ("depends on the module"):**

| Variant | Where it applies |
|---|---|
| **Left-aligned** (default) | Every page banner: chapter, community, `/events`, sponsor, volunteer, volunteer project, CMS site pages, blog post. Every `.sec-head` section heading. |
| **Centered** (`SectionHead align="center"`) | Short single-call-to-action bands only: `ContactUs`, `GetInvolved`, `GivingCampaign` (homepage), `ChapterSignUp`, the chapters plan's `GlobalCommunityCta` / `FormingChapterCta`, and the 404 message. |
| **Own variant, unchanged** | `HeroCarousel` (full-bleed photo with overlay) and `UtilityBar` (centred strip). |
| **Untouched (paused)** | `GiveHero` and the donate hero. |

**Pill shape.** Make `.btn` pill at the token level (`--radius-pill`). `GiveButton` is already a pill, so donate/give need no restyle for this decision.

## Implementation

### Phase 1: Shell and cleanup (about 2 hours)

Visual change: the 404 and blog pages gain the site header, footer and fonts, and the 404's blue link becomes crimson. Elsewhere, only the footer eyebrow token changes.

1. **404.** `src/pages/404.astro` renders inside `src/layouts/BaseLayout.astro` using `.wrap` / `.sec`, a `.kick` "404", an h1 and a centred pill `.btn btn-solid` home link. Drop the undefined `--color-primary` and the inline `--space-*` styles.
2. **Blog.** Wrap `src/pages/blog/[slug].astro` in `BaseLayout`, passing `title` / `description` / `image` / `noindex` (BaseLayout already accepts all four). Delete the duplicated `SEO`, `HeadExtras` and `customBodyHtml` blocks, and swap the inline-styled `<main>` for `.wrap` with `--text-width`. `launch--content-and-pages.md` adds the `/blog/` index; this plan shapes only the post shell.
3. **Delete the 12 unused components.** None has an importer outside the isolation harness:
   - `src/components/BoardMemberCard.astro`, `src/components/landing/Hero.astro`, `src/components/donate/MomentumHero.astro`
   - `src/components/Greeting.tsx` and `src/components/Greeting.test.tsx`
   - The DonorWall pieces in `src/components/donate/`: `DonorWall`, `DonorWallIntro`, `DonorWallEmpty`, `DonorTierBand`, `DonorTierChips`, `DonorCard`, `DonorAvatar`, `FoundingBadge`

   Also remove:
   - Their imports, state maps and `getStaticPaths` entries in `src/pages/isolated-components/[name].astro` (lines 2, 11, 13, 34–43, 65, 216+, 638–811, 821, 837–840, 891–909, 967, 1062–1066).
   - The isolation pages `src/pages/isolated-components/MomentumHero.astro`, `MomentumHero-Video.astro` and `MomentumHero-VideoMissing.astro`.
   - The glossary entries `BoardMemberCard` and `Greeting` in `.codeyam/glossary.json`, and the three `Greeting.test.tsx` rows in `.codeyam/test-registry.json`.

   **Keep** `src/lib/donors.ts` (still used by `NetworkSupporterRoll` and `MomentumNetwork`), `src/lib/donorFilter.ts` and their tests.

   **Scenarios to remove:** 27 `.json` files in `.codeyam/scenarios/`, plus their 54 PNGs in `.codeyam/scenarios/screenshots/`:
   - `boardmembercard-with-photo`, `boardmembercard-initials-fallback`, `hero`, `greeting-hydrated-counter-clicked`
   - `momentumhero-personalized`, `momentumhero-video-backdrop`, `momentumhero-video-path-that-resolves-to-nothing`
   - `donor-wall-no-donors-yet`, `donor-wall-the-first-founding-donor`, `donor-wall-three-levels-and-twenty-names`, `donor-wall-anonymity-beside-named-donors`, `donor-wall-filtered-to-one-giving-level`, `donor-wall-empty-the-invitation`
   - `donor-wall-intro-heading-and-founding-line`, `donor-wall-intro-no-founding-donors`, `donor-wall-intro-nothing-to-introduce`
   - `donor-tier-band-a-declared-giving-level`, `donor-tier-band-other-supporters`, `donor-tier-chips-every-band`
   - `donor-card-named-donor`, `donor-card-anonymous`, `donor-card-founding-donor-with-a-note`, `donor-card-with-a-photo`
   - `donor-avatar-photo`, `donor-avatar-initials-fallback`, `donor-avatar-anonymous`, `founding-badge-the-mark`

   `momentum-fund-filtering-the-donor-wall` is a `/donate` page scenario and **stays**.
4. **Strikingly audit of the nav, footer and branding.** Findings, and who acts on each:

   | Item | Finding | Who acts |
   |---|---|---|
   | Social badges | `src/lib/socialIcon.ts` serves Strikingly "persona" badges from `public/images/social/` (`twitter.png`, `facebook.png`, `email.jpg`, `linkedin.svg`). `src/components/ChapterConnect.astro` is the only renderer. | `launch--images.md` C6 swaps them for `brandIcons`. This plan's `SocialLinks` (Phase 2, step 6) subsumes that swap; whichever lands first deletes the files. |
   | Support icons and old section images | `public/images/support/*.png` (5) came from `assets.strikingly.com/…/flat-circle-160`. `public/images/sections/board-wordmark.png` and `board-logo.png` are unused. | `launch--images.md` part E deletes them. **Gap:** it only trims the `support/` fetches from `scripts/download-assets.mjs`. Recommend deleting that whole one-off script: it reads `.codeyam/tmp/extract.json` and pulls every asset from `strikinglycdn.com`. |
   | Chapter title and teal band | The teal "Sign Up" band (`ChapterSignUp.astro`). The "Harvard Alumni in Tech {name}" all-caps ruled title (`ChapterHero.astro`). The CMS hints "HARVARD IN TECH <CITY>" at `src/data/collections.json` lines 137 and 248. | The chapters plan changes the wording (step 7). This plan changes the look in Phase 3 and fixes the two hints. |
   | Footer | `BaseLayout.astro` uses an inline `style="color:#fff"` eyebrow. The mail link belongs to the contact plan. "Cookie Policy" is open question 1. | Here: switch the eyebrow to `.kick--light`. |
   | Favicon | `public/favicon.svg` is a `#0066cc` placeholder that no page links to. | `launch--images.md` C4–C5 (a crimson "HIT" monogram plus the `<link rel="icon">`). |
   | Nav, shield, testimonial | The nav is data-driven and clean; the `harvard-in-tech` slugs in `src/data/nav.json` are the real Medium and LinkedIn account URLs. The shield waits on the HAA permission item in `launch--images.md`. `src/content/testimonials/jessica-li.md` says "Harvard in Tech", but it is a verbatim quote. | No change. |
5. **Tokens.** In `src/styles/tokens.css`, add a spacing and type scale (`--s-1…--s-6`, `--t-sm…--t-xl`) and `--radius-pill: 999px`. These are unused until Phase 2.

### Phase 2: Shared parts (half a day)

Visual change: every Atlas `.btn` becomes a pill, site-wide. Blog dates read "January 15, 2026" instead of "1/15/2026". Everything else stays the same until Phases 3–4 adopt the parts.

1. **Buttons.** In `src/styles/tokens.css`, `.btn` gets `border-radius: var(--radius-pill)`, a new `.btn-light` covers white-on-crimson or ink, and `.s-btn` becomes a documented alias of `.btn.btn-solid`. This collapses 8 button styles to solid, outline, outline-on-dark and light. `src/components/give/*` and `src/components/donate/*` keep their own pill CSS (paused).
2. **More link.** Add a `.link-more` class and use it for all 7 copies: `EventCard.astro`, `landing/UpcomingEvents.astro`, `landing/ContentHub.astro` (2), `landing/FocusAreas.astro`, `landing/WhatsappCommunity.astro` and the Phase 3 chapter cards. `donate/GoalMeter.astro` is excluded (paused).
3. **`src/components/ui/SectionHead.astro` (new).** Props `kicker`, `title`, `intro`, `align: 'left' | 'center'`, plus a slot for the right-hand action. Renders `.sec-head`; add `.sec-head--center`.
4. **`src/components/ui/PageBanner.astro` (new).** Props `label`, `title`, `lede`, `image?`, `tone: 'paper' | 'photo'`. Left-aligned with a `.kick` label above the h1. The photo variant has an overlay and a capped height (no `100svh`). The paper tone replaces the text-only fallback that `launch--images.md` relies on for chapters with no photo. Built from the current `sponsor/SponsorHero.astro` / `volunteer/VolunteerHero.astro` layout.
5. **`src/components/ui/EmptyState.astro` (new).** A soft `--paper-2` panel with a message, an optional pill `.btn` and an optional secondary link. Adopt it in the empty branches of `landing/BoardOfDirectors.astro` and `landing/OurChapters.astro`. Adopt it in `landing/UpcomingEvents.astro` only after `launch--mobile-and-layout.md` step 6 rewrites `.ue-empty`. `ComingSoon.astro` stays a band but uses the panel tokens.
6. **`src/components/ui/SocialLinks.astro` (new).** Inline SVG from `src/lib/brandIcons.ts` (`linkedin`, `x`, `facebook`, `email`, `medium` exist), in `on-dark` and `on-light` variants. It consumes the contact plan's `connectLinks(socials, email?)`, so the e-mail badge appears only when `contactEmail` is non-blank. Use it in the `BaseLayout.astro` footer, `landing/ContactUs.astro` and `ChapterConnect.astro`; chapter and community pages gain LinkedIn. Land it after the contact plan's step 4.
7. **Dates.** `src/lib/dates.ts` (new) exposes `formatLongDate` and `dateParts` (UTC, en-US). `src/lib/eventDateParts.ts` and `formatEventDate` in `src/lib/events.ts` re-export from it, and `BlogPostArticle.astro` stops calling `toLocaleDateString()`. `src/lib/cutoverFormat.ts` (internal runbook) is excluded.
8. **Cards.** Add a `.card` class (hairline border, `--radius`, padding scale) for Phases 3–4 to adopt.

### Phase 3: Chapters, communities and `/events` onto Atlas (about a day)

Visual change: the biggest in the plan. Chapter and community banners become left-aligned and shorter, with a "Chapter" / "Community" label above the name, so "Seattle / Pacific Northwest" no longer wraps. The teal Sign Up band becomes a centred Atlas CTA band. Headings, cards and pill buttons match the homepage.

Runs after `launch--chapters-and-communities.md` (open question 6).

1. **Banner.** `src/components/ChapterHero.astro` renders `PageBanner`, keeping the chapters plan's `label` prop ("Chapter" / "Chapter · Forming" / "Community"): photo tone when `heroImage` is set, paper tone otherwise. Delete `src/components/ChapterHeader.astro`; the paper tone replaces it. The label logic lives in `src/lib/pageBanner.ts` (new), `bannerFor({ kind, status, name })`. Update the two CMS hints in `src/data/collections.json` (lines 137, 248).
2. **Chapter sections.** Replace `.s-section` / `.s-title` / inline styles with `.wrap .sec` + `SectionHead`, `.card`, `EmptyState` and `.link-more` in `ChapterPage.astro`, `ChapterLeads.astro`, `ChapterLinks.astro` and `EventCard.astro`, and:
   - `ChapterEvents.astro`: "no upcoming events" becomes an `EmptyState` with a Subscribe button.
   - `ChapterSignUp.astro`: the centred variant.
   - `ChapterConnect.astro`: `SocialLinks` on-light.
   - The chapters plan's new CTA blocks, when they exist: `JoinWhatsAppCta`, `FormingChapterCta`, `GlobalCommunityCta`, `CommunityCallouts`.
3. **Community page type (look).** Restyle `src/components/CommunityPage.astro` (new, created by the chapters plan's step 9) with the same parts and `label="Community"`. `src/pages/communities/[slug].astro` already switches to it in that plan. If Phase 3 ships first, create `CommunityPage` here with that plan's section order, so the two do not diverge.
4. **`/events`.** Move `src/components/EventsPage.astro`, `EventsSection.astro` and `LumaCalendar.astro` to `PageBanner` (label "Programs", title "Events") + `SectionHead` + a `.card` grid. This comes after `launch--mobile-and-layout.md` steps 7–10 (embed-first order, `embedActive`, iframe height) and the contact plan's step 12 (the Eventbrite button is deleted).
5. **Retire the old layer.** Delete the `.s-section`, `.s-inner`, `.s-narrow`, `.s-title`, `.s-title--plain` and `.s-btn` rules from `tokens.css` once `command grep -rE 'class="[^"]*\bs-(section|inner|narrow|title|btn)' src` returns nothing. `sponsor/*` and `volunteer/*` still use them, so this may slip to the end of Phase 4. The `--color-*` / `--space-*` aliases stay: give components still read them.

### Phase 4: Banners and cards everywhere else (half a day)

Visual change: subtle. Consistent left banners with a label, pill buttons, one card style, and soft-panel empty states on sponsors and volunteer projects, which many visitors will see first.

1. **Banners.** Move to `PageBanner`: `sponsor/SponsorHero.astro` (drops its centred text), `volunteer/VolunteerHero.astro`, `volunteer/VolunteerProjectHeader.astro`, `pages/SitePageHeader.astro`, and the `BlogPostArticle.astro` header (label "Blog").
2. **Cards.** Adopt `.card` in `sponsor/SponsorLevelCard.astro`, `sponsor/SponsorWallItem.astro`, `volunteer/VolunteerProjectCard.astro`, and `landing/BoardMemberTile.astro` (radius and border only).
3. **Empty states.** Move to `EmptyState`: `volunteer/VolunteerProjectsEmpty.astro`, `sponsor/SponsorPlaceholderNotice.astro`, the no-partners branch in `sponsor/SponsorWall.astro`, and the none case in `volunteer/VolunteerRelatedProjects.astro`.
4. **Section heads.** `sponsor/SponsorLevels.astro`, `sponsor/SponsorInquiry.astro` and `volunteer/VolunteerBenefits.astro` move to `SectionHead`. Finish Phase 3, step 5 if it slipped.
5. **Out:** `src/components/give/*` and `src/pages/give.astro` (paused).

### Phase 5: Editor-editable content (about a day)

Visual change: none by default. Every new field falls back to today's copy.

1. **Homepage section copy.** Extend `homeSections` in `src/content/config.ts` with `kicker` and `intro`, the same pattern as `momentumSections.kicker`. `title` becomes the band heading and still labels the coming-soon placeholder. Update `src/lib/homeSections.ts`, `src/lib/homeSectionsContent.ts` and `src/components/landing/HomeSections.astro`, and pass the fields into each band's `SectionHead`. Seed the current copy into the 13 `src/content/homeSections/*.md` files and add the fields to `src/data/collections.json`.

   Merge note: the contact plan (optional `email`) and the giving plan (`donateUrl`) also edit `HomeSections.astro`.
2. **One links group.** Add `links.{mailingList, whatsappJoinForm, luma}` to `src/data/settings.json`, read through `src/lib/site.ts`. There is no Eventbrite key: Luma only, per the contact plan. The chapters plan's `WHATSAPP_JOIN_FORM_URL` becomes a read of `links.whatsappJoinForm`. Replace the hardcoded Mailchimp URL in `BaseLayout.astro:83`, `ChapterSignUp.astro:10`, `landing/HeroCarousel.astro:35` and `landing/UpcomingEvents.astro:31`, plus the Luma URLs in `src/lib/luma.ts`. The chapters plan leaves the Mailchimp consolidation out of its scope, so it lands here.
3. **Contact email.** Owned entirely by `launch--contact-and-calls-to-action.md` (blank `contactEmail`, socials only). Nothing here.
4. **`/events` intro.** In `EventsPage.astro`, the hand-typed city list (line 29) becomes one derived from the published chapters collection, the same way the `UtilityBar` derivation works.
5. **Held.** `/give` copy (open question 4).

### Phase 6: Tokens and hex cleanup outside donate/give (half a day, plus the optional split)

Visual change: none intended. Screenshots should be pixel-identical.

1. **Replace hand-typed hex with tokens.** Add `--white` and `--overlay` if needed. Files, with hex counts:
   - `layouts/BaseLayout.astro` (4), `components/PreviewGate.astro` (7), `landing/HeroCarousel.astro` (5)
   - 4 each: `sponsor/SponsorHero.astro`, `landing/GivingCampaign.astro`, `landing/GetInvolved.astro`
   - 3 each: `landing/GalleryExpand.astro`, `landing/ContactUs.astro`
   - 2 each: `volunteer/VolunteerHero.astro`, `landing/WhatsappCommunity.astro`, `landing/UpcomingEvents.astro`, `landing/OurChapters.astro`, `landing/GalleryLightbox.astro`, `landing/ContentHub.astro`, `ComingSoon.astro`
   - 1 each: `nav/UtilityBar.astro`, `nav/PrimaryNav.astro`, `landing/GalleryTile.astro`, `landing/FocusAreas.astro`

   Excluded: `src/components/donate/**`, `src/components/give/**` and `src/styles/cutover-runbook.css`.
2. **Guard.** `src/lib/designSystem.test.ts` (new) keeps new stray colours out of the non-donate tree (see Tests).
3. **Optional, behaviour-neutral: split `src/components/donate/MomentumNetwork.astro` (1,122 lines).** Move markup regions into `src/components/donate/network/*.astro` (new) and remaining client logic into `src/lib/momentumNetworkDom.ts`, with no change to DOM output, class names or CSS values. Ship it only if every `momentum-fund-*` frame is pixel-identical and `src/lib/momentumNetworkDom.test.ts` passes. Timing per open question 5.
4. **BLOCKED on the donate-look decision:** campaign-look alignment (donate/give onto `SectionHead`, `.card`, `EmptyState`), the `GiveButton` split of look vs destination (`src/components/donate/GiveButton.astro`), consolidating the `--momentum-*` tokens, and retiring the `--color-*` / `--space-*` aliases.

## Tests

**Existing tests to update:**

| Test | Change |
|---|---|
| `src/components/Greeting.test.tsx` | Deleted, and its 3 rows removed from `.codeyam/test-registry.json` (Phase 1). |
| `src/lib/socialIcon.test.ts` | Deleted with `socialIcon.ts`, here or by `launch--images.md` C6, whichever lands first. |
| `src/lib/brandIcons.test.ts` | Extended: every `settings.socials[].icon` resolves to a brand icon, so `SocialLinks` never renders label-only. |
| `src/lib/eventDateParts.test.ts` and `src/lib/events.test.ts` | Unchanged assertions still pass through the re-exports. |
| `src/lib/homeSections.test.ts` | `kicker`, `intro` and `title` are optional. A blank value falls back to the band default. Hidden and coming-soon rules are unchanged. |
| `src/lib/site.test.ts` | The `links` group is present, every link is absolute https, and there is no `eventbrite` key. |
| `src/data/collections.test.ts` | New CMS fields exist for `homeSections` and `settings.links`. |
| `src/lib/momentumNetworkDom.test.ts` | Must stay green through the optional split. |

**New tests:**

| Test | What it asserts |
|---|---|
| `src/lib/dates.test.ts` (new) | `formatLongDate('2026-01-15')` returns "January 15, 2026" in UTC regardless of the host timezone. `dateParts` matches the old `eventDateParts` output. |
| `src/lib/pageBanner.test.ts` (new) | A chapter gives `{label:'Chapter', title: city}`, a forming chapter gives `'Chapter · Forming'`, and a community gives `{label:'Community', title: name}`. The title never contains "Harvard Alumni in Tech". |
| `src/lib/designSystem.test.ts` (new) | (a) Every `var(--x)` used under `src/` is defined in `tokens.css`, which catches the 404's `--color-primary` class of bug. (b) After Phase 4, no `class="…s-(section\|inner\|narrow\|title\|btn)"` remains. (c) After Phase 6, no hex literal in `<style>`/`style=` outside `donate/`, `give/`, `cutover/` and `isolated-components/`. (d) No `public/images/social/` or `strikingly` reference remains in `src/`. |

**Procedure:** register each new file before `prove-red`; `refresh-tests --test` matches registered `describe › it` names.

## Scenarios to Demonstrate

**Capture rules** (from project memory): capture serially, capture twice for font-race churn, screen every changed PNG for wrong-page frames, and restore unrelated frames from HEAD.

- **Phase 1:**
  - `not-found-page` (new, shared with `launch--mobile-and-layout.md`; create it once): the site header and footer, with a crimson pill home button.
  - `blog-post-welcome` and `blog-preview-link-shared-draft`: inside the site shell.
  - The 27 removed scenarios are gone. `momentum-fund-public-visitor` is unchanged.
- **Phase 2:**
  - `givebutton-both-variants` is unchanged (already a pill).
  - `board-of-directors-empty` shows the soft panel.
  - `chapterconnect-default` and `chapterconnect-per-chapter-email` show LinkedIn and SVG badges.
  - `contactus-default`, plus `blogpostarticle-an-ordinary-post` with the long date.
- **Phase 3:**
  - `chapter-route-new-york-city`, `chapter-route-sf-bay-area`, `chapter-route-longest-chapter-name-wraps`.
  - `chapterhero-with-image`, `chapterhero-no-image-fallback`, `chapterpage-full-chapter`, `chapterpage-sparse-no-leads`.
  - `chaptersignup-default`, `chapterevents-rich-list`, `chapterevents-community-heading`.
  - `community-route-ai-on-day-one`, `community-route-founders-with-leads-and-events`.
  - `events-route-upcoming-and-past`, `eventspage-no-events`, `luma-calendar`, `upcoming-events-empty`.
- **Phase 4:**
  - Sponsor: `sponsorpage-full-page-no-partners`, `sponsorwall-no-partners-yet`.
  - Volunteer: `volunteerhero-default`, `volunteerprojectsempty-production-default`, `volunteer-page-no-open-projects`, `volunteerprojectheader-long-title-and-blurb`, `volunteerrelatedprojects-one-other-project`.
  - CMS pages: `sitepageheader-title-and-lede`, `site-page-a-page-written-in-the-cms`.
- **Phase 5:**
  - `home-sections-editor-kicker-and-intro` (new): one band with an edited kicker and intro.
  - `harvard-in-tech-homepage-phased-for-launch`: identical frames with no edits.
- **Phase 6:**
  - The full homepage, chapter, sponsor and volunteer set, pixel-identical.
  - All `momentum-fund-*` frames identical if the split ships.

## Out of scope

- **Donate/give restyling** of any kind: `GiveHero`, `GivingCard`, `GiveButton` look, `MomentumClose`, the `--momentum-*` palette. Blocked on the donate-look decision and Nicole's staging changes.
- **Owned by sibling plans:**
  - `launch--chapters-and-communities.md`: chapter and community content, schema, `status`, CTA behaviour.
  - `launch--contact-and-calls-to-action.md`: contact email, Eventbrite removal, `ChapterLinks` base-path fix.
  - `launch--images.md`: the favicon, share card, shield permission and unused-image deletion.
  - `launch--mobile-and-layout.md`: the phone menu and the `/events` structure.
  - `launch--content-and-pages.md`: the privacy page and the blog index.
- **Removing dead helpers** in `src/lib/donors.ts` / `donorFilter.ts` left after the DonorWall deletion.
- **The FocusAreas "kill" decision, and the cutover runbook** (`src/components/cutover/*`, `src/styles/cutover-runbook.css`).