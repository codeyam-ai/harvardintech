---
title: "launch -- Giving Pages Short Term"
mode: ui
createdAt: "2026-09-14T17:29:50Z"
prefix: "launch"
order: 5
source: manual
---

## Summary

No donation platform is live yet. Today every giving button on the site ends in an email:
- The `/donate` buttons go to `/give`, and `/give`'s buttons open a `mailto:`.
- The homepage "Donate" button opens a `mailto:` directly.

The pages also show made-up figures: $20 raised of $100,000 on `/donate`, and a $50,000 goal at 8% on `/give`. They make tax and 501(c)(6) claims for an organization that is not yet a non-profit, and they show example sponsors.

This plan puts the site into one honest **short-term giving state** until the Givebutter campaign launches. One existing setting switches it all back on.

**Short-term giving state (until Givebutter launches)**

| Surface | Shows | Hidden |
|---|---|---|
| `/donate` | Opening band with a real `<h1>` and generic pre-launch copy. Mission and "why" story. One 2026 priority. Goal meter at $0 of $10,000. Accomplishments. Testimonials. "What your gift powers". Closing band. | Every giving button. Donor wall content: tiers, search, share, "give today and yours will be among them". The three old priority lines, including the 501(c)(6) one. |
| `/give` | Nothing. It redirects to `/donate`. | The whole page, including the tax FAQ, the fake $50,000 / 8% card and "Secure giving through Givebutter". |
| Homepage giving band | Pre-launch message. "Sponsorship" button goes to `/sponsor`, plus a link to `/donate`. | "Donate" `mailto:` button. |
| `/sponsor` | Opening band. Empty partner wall ("We are lining up partners…"). "Start a conversation": email button, and the Google Form once its URL is set. | The whole "Ways to partner" levels section (owner, after Nicole's walkthrough, 2026-09-14). Example sponsors. Empty "form is on the way" box. |

**Message that replaces every donate button** (one component, copy editable in one place): *"Our first fundraising campaign opens soon — our 2026 goal is $10,000."* It is plain text, not a button, followed by a secondary link, "Other ways to help →" (goes to `/volunteer`).

**How Givebutter switches it all on:** paste the Givebutter campaign URL into **Page settings → Donate URL**. That setting is `donateUrl` in `src/content/pageCopy/donate.md`. Every giving button then comes back and points straight at Givebutter, on `/donate` and on the homepage. Separately, paste the widget ID into the goal-meter section and the live meter replaces the hand-typed $0 / $10,000. No code change is needed. `resolveGiveCtaHref` in `src/lib/giving.ts` already sends a configured URL straight to the platform; this plan makes a blank URL mean "closed" rather than "email".

**What `/give` is, and whether `/donate` can absorb it.**
- **What it does:** commit 61ecd73 added it as a "practical questions before you give" step: `/donate` argues for the fund, and `/give` holds the checkout.
- **How it's reached:** it is not in the nav (`src/data/nav.json`). The only way in is the `/donate` buttons.
- **It already drops out on launch:** `src/pages/give.astro` says so itself: "Configuring `donateUrl` … takes this page OUT of the path entirely."
- **Most of it repeats `/donate`:** it reuses `/donate`'s priorities and accomplishments collections.
- **What only `/give` has:** an amount picker that only fills in an email, a supporter-recognition blurb that repeats the donor wall, the "why monthly" line, and the tax FAQ. Givebutter's checkout covers the amounts and its own legal text.
- **Conclusion:** `/donate` can absorb what little is worth keeping, so `/give` is not necessary. Hide it now (redirect). Deleting it is a separate kill decision (see open questions).

## Owner decisions (2026-09-14)

- **Donate buttons that end in email:** "Were going to have a givebutter campaign but in the short term we'll want to remove this."
- **/donate page:** undecided, no note.
- **/give page (Change):** "Investigate why a second page exists; if necessary we'll want to 'Hide' but if not necessary we'll likely want to make a separate decision to kill."
- **Goal meter:** "Goal is $10,000 for 2026 and amount raised is $0 (the campaign has not launched)."
- **Priorities / budget:** "Launch fundraising campaign & raise $10,000 is our 2026 goal."
- **Donor wall (Change):** "We need to decide if this gets hidden or not."
- **Donor tiers, search and share message (Change):** "Display a generic message that's not this."
- **Donate page story (Keep):** "Need to decide if we hide this or not."
- **Tax FAQ:** "We're not yet a non-profit. I am not a lawyer, we should not have any legal language outside of what GiveButter has, but I would like you to audit and review for commendations."
- **HAA wording:** "We should have this as a todo to review with Ben (plan)"
- **Presenting Partner sponsor level:** Hide.
- **Example sponsors (Change):** "We should review whether we want to show this or not."
- **Sponsor inquiry form box (Change):** "Plan a contact form addition or - if this adds to scope - flag that we need to set up a Google form (and have a recommendation for that)."
- **Homepage giving band (Change):** "Fix this or park as a plan."
- **Sponsor page:** "review the sponsor and giving pages to make sure that we're not duping content and recommend what gets kept."
- **Mohammed Ally testimonial (Change):** "I'm pretty sure this is a real quote from a real alumni. We should have a todo to add other quotes."
- **Donate page has no h1:** Plan it.
- **Donate page's distinct look:** paused. Keep it as is and see what Nicole's changes lead to. No restyle in this plan.
- **"Ways to partner": removed for launch (owner, 2026-09-14, after Nicole's walkthrough).**
  - Keep the sponsorship page and its "Start a conversation" section.
  - Remove "Ways to partner", which Nicole says is not fleshed out. This replaces the earlier plan to show the levels, including the chapters plan's trimmed Chapter level and new Global level.
  - The level entries stay in the CMS. Whether the section comes back later is still open (question 9).

## Open questions / needs input

1. **Owner:** kill `/give` for good? This plan only redirects it. A kill would delete:
   - `src/pages/give.astro`
   - `src/components/give/*`
   - `src/data/givePage.json`
   - `src/lib/givePageContent.ts`
   - the eight `give*` / `givingcard-*` scenarios

   Recommendation: kill it once Givebutter is live and nobody has missed the page.
2. **Owner:** should the nav item stay labelled "Donate" before launch? Suggestion: "Momentum Fund", switching back at launch. The default in this plan is to leave it as "Donate".
3. **Owner, then Ben:** what does the $10,000 pay for? The priority band will carry the owner's line alone until the uses are agreed.
4. **Ben (HAA wording todo):** review every Harvard/HAA statement in rows L6–L10 of the legal audit below. Two points need his answer:
   - The CMS hint in `src/data/collections.json` says the Harvard Alumni Association *requires* the Shared Interest Group disclaimer. Is that true, and is the wording still correct?
   - Can the site say "The official Harvard Alumni Group for technology"?
5. **Ben or the owner:** create the sponsorship Google Form (spec in step 9) and paste its URL.
6. **Owner, with Mohammed Ally:** confirm the quote is his words, verbatim. Its last sentence ("What the fund pays for is the part nobody sees…") talks about a fund that has not launched yet, and reads like campaign copy. If he didn't say it, cut the quote to its first two sentences.
7. **Owner and chapter leads (todo):** collect 2–3 more real quotes, each with the speaker's OK to use their name and photo, as `src/content/testimonials/*.md` entries.
8. **Owner:** `settings.json` → `givebutterAccountId` is already set. Per `src/lib/givebutter.ts`, that loads Givebutter's script on every page even though no widget is showing yet. Keep it, or clear it until launch? Recommendation: keep it, since it's harmless and needed at launch.
9. **Owner, later:** does "Ways to partner" come back once the levels are fleshed out, or is it gone for good? For launch it is removed (step 9). Its entries stay in the CMS, so it can return with one change.

## Recommendations

**A. Short-term state for `/donate`, `/give` and the buttons**
- **Option 1: hide `/donate` and `/give` entirely** until launch. This loses the story the owner chose to keep, and leaves the "Donate" nav item with nowhere to go.
- **Option 2: keep both pages and only swap buttons for the message.** This keeps two pages repeating each other, and keeps `/give`'s tax FAQ and fake $50,000 card.
- **Option 3 (pick): keep `/donate` as an honest pre-launch page, hide `/give` behind a redirect, and add one site-wide "giving closed" switch** driven by the existing `donateUrl`.
- **Why option 3:** the story stays live (owner: Keep), nothing can take or ask for money, and launch is one CMS field. It also needs no restyle: copy, heading level and hiding only.

**B. Donor wall.** Pick: **hide its donor content, keep the band as the opening frame.**
- The band is `/donate`'s hero. `src/components/MomentumFundPage.astro` renders it even when its section is in draft, and removing it would leave the page with no opening at all.
- With zero donors, the band already shows only its empty state. Tiers, search and share only appear once donors exist.
- So what's needed is changing its words to the generic message. No layout change.
- Once real donors arrive after launch, restore the recognition copy.

**C. Example sponsors.**
- Options: keep them behind the "Example placements" notice, delete them, or hide them with `draft: true`.
- Pick: **hide with draft**. The wall then shows its own empty message ("If you would like your organization to be the first one listed here…"), which is honest and itself an invitation.
- Keep the files so real sponsors can copy their shape.

**D. Sponsor inquiry.**
- Options: build a form into the site (a static site needs a third-party backend such as Formspree, which adds scope), or use a Google Form.
- Pick: **Google Form.** `EmbedForm` in `src/components/EmbedForm.astro` already embeds one from the CMS field `inquiryFormUrl` with no code. Until the URL exists, hide the empty "on the way" box rather than show it.

**E. Homepage giving band.** Pick: **fix it now rather than park it.** It uses the same switch and message, and it is about 20 lines of change.

**Legal/tax/charitable-status audit** (every public statement found by searching `src`; `isolated-components` excluded)

| # | Where | Statement | Recommendation |
|---|---|---|---|
| L1 | `src/data/givePage.json` FAQ | "Is my contribution tax-deductible? Not yet… establishing itself as a 501(c)(6)… trade association rather than a charity… check with your own tax adviser…" | **Remove.** Legal/tax advice; leave that to Givebutter. |
| L2 | `src/data/givePage.json` FAQ | "…establishing the organisation's legal foundation…" | **Remove** (goes with `/give`). |
| L3 | `src/data/givePage.json` `processor` → `GivingCard.astro` | "Secure giving through Givebutter" | **Remove** now (untrue until launch); let Givebutter's own page say it. |
| L4 | `src/content/pillars/establish-the-organizational-foundation.md` | "Complete the legal, filing, and organizational work required to establish a 501(c)(6)." | **Remove from public view** (draft). The priority is replaced by the 2026 goal. |
| L5 | `src/content/pageCopy/donate.md` `ctaBody` | "Every gift… goes directly into the events, chapters, and connections…" | **Keep, softened** to "will support". "Goes directly" is a promise about how money is spent. |
| L6 | `src/content/sponsorPage/sponsor.md` `disclaimer` (+ fallback in `src/data/sponsorPage.json`) | "…a Shared Interest Group of the Harvard Alumni Association. It is independently governed and financed… not gifts to Harvard University." | **Keep until Ben reviews.** The CMS says HAA requires it. |
| L7 | `src/data/settings.json` `description` (site meta description) | "The official Harvard Alumni Group for technology…" | **Keep until Ben reviews.** |
| L8 | `src/content/heroSlides/where-harvard-alumni-build-the-future.md` kicker; `src/components/landing/HeroCarousel.astro` default | "The Official Harvard Alumni Group for Technology" | **Keep until Ben reviews.** |
| L9 | `src/components/landing/Hero.astro` default `description` | "We are the official Harvard Alumni Group for technology…" | **Keep until Ben reviews.** |
| L10 | `src/content/blog/welcome.md` | "…the official Harvard alumni group for technology." | **Keep until Ben reviews.** |
| L11 | `src/data/settings.json` `footerText` | "© 2026 … All rights reserved. · Cookie Policy". There is no cookie-policy page under `src/pages`. | **Leave to `launch--content-and-pages`.** That plan writes a privacy and cookie policy and links "Cookie Policy" to the new `/privacy/` page, as the owner asked. Don’t change it here. |
| L12 | `src/data/givePage.json` `cardNote` | "…no payment is taken here." | **Remove** (goes with `/give`). |

**Duplication across the giving and sponsor pages**

| Content | Appears on | Keep on |
|---|---|---|
| Priorities list (`pillars`, group `priorities`) | `/donate`, `/give` | `/donate` |
| Accomplishment figures | `/donate`, `/give` | `/donate` |
| Campaign goal | `/donate` goal meter ($20 of $100,000); `/give` card ($50,000, 8%). The two disagree. | `/donate` goal meter only ($0 of $10,000) |
| Supporter recognition explained | `/donate` network band; `/give` recognition band | `/donate`, after launch |
| "Help build the foundation…" line | `/donate` `heroSubhead`; `/give` `heroTitle` | `/donate` |
| "Become part of the foundation." / "One community. Shared momentum." | `/donate` closing band; `/give` closing band | `/donate` |
| Sponsorship ask | homepage band "Sponsorship" (`mailto:`); homepage SupportUs cards (go to `/sponsor`); `/sponsor` | `/sponsor`; homepage links to it |
| Legal line | `/sponsor` disclaimer; `/give` tax FAQ | `/sponsor` only, pending Ben |
| "Volunteer-led community…" pitch | `/sponsor` intro; `/donate` "why" story | Both. Different audiences, different wording. |

## Implementation

1. **Giving switch.** In `src/lib/giving.ts`:
   - Add `isGivingOpen(donateUrl?: string): boolean`. It is true only for a non-blank, trimmed URL.
   - Add `GIVING_SOON_MESSAGE`, the replacement message text.
   - Change `resolveGiveCtaHref` to return the platform URL or `undefined`. Nothing points at `/give` any more.
   - Delete `GIVE_PAGE_PATH`, and rewrite the module comment around "blank URL = giving closed".
2. **Message component.** Create `src/components/donate/GivingSoonNote.astro` (new). It renders the message plus the "Other ways to help →" link to `/volunteer` (via `withBase`), in the current type styles, with no new visual design.
3. **One place renders buttons.** In `src/components/donate/GiveButton.astro`:
   - When `isGivingOpen(donateUrl)` is false, render `GivingSoonNote` instead of the link.
   - When it is true, link to `resolveGiveHref` directly; the `checkout` split no longer matters.

   Every `/donate` button goes through `GiveButton` (`MomentumNetwork`, `GiftPillars`, `MomentumClose`), so the whole page follows the switch.
4. **The `/donate` h1.** In `src/components/donate/MomentumNetwork.astro`, change both `<h2 id="momentum-network-title">` to `<h1>`. Nothing else changes: its CSS targets `.network-headline`, not `h2`, and the component is used only by `src/components/MomentumFundPage.astro`, where it is the hero.
5. **Donor wall copy becomes generic (content only).**
   - `src/content/momentumSections/donors.md`: set kicker to "The Momentum Fund" and title to "Let's go further *together*."
   - `src/content/pageCopy/donate.md`: set `networkTitle` to "The Momentum Fund".
   - `src/content/pageCopy/donate.md`: set `donorsEmptyMessage` to "Harvard Alumni in Tech's first fundraising campaign launches soon, with a 2026 goal of $10,000."
   - `src/content/pageCopy/donate.md`: soften `ctaBody` (audit L5).
   - Update the matching fallback keys in `src/data/donatePage.json`.
   - Leave `donorTiers` / `shareMessage` in place. They do not render with zero donors; rewrite them at launch.
6. **Goal meter.** In `src/content/momentumSections/goal-meter.md`, set:
   - `raised: '$0'`, `goal: '$10,000'`, `percent: 0`
   - `kicker: Launching soon`
   - `title: 'Our 2026 goal: raise $10,000.'` (replaces the false "Our first gifts are already building momentum.")

   Rewrite the body note to say the figures are real as of 2026-09-14.
7. **Priorities.**
   - Add `draft: true` to the three `group: priorities` entries in `src/content/pillars/`: `establish-the-organizational-foundation.md`, `secure-essential-annual-software.md`, `fund-chapter-events-and-programming.md`.
   - Add `src/content/pillars/launch-the-2026-fundraising-campaign.md` (new). It has `group: priorities`, `order: 1`, the title "Launch our fundraising campaign and raise $10,000", and no `amount` (the meter carries the number).
   - In `src/content/momentumSections/priorities.md`, set the title to "Our 2026 priority". Keep `ctaLabel` so the button returns at launch.
8. **Hide `/give`.**
   - Delete the route `src/pages/give.astro`. Leave its components, `src/data/givePage.json` and `src/lib/givePageContent.ts` unused until the kill decision.
   - Add `redirects: { '/give': '/donate' }` in `astro.config.mjs`. Check the generated redirect under the subpath deploy (`base`); if the base isn't applied automatically, write the target with it.
   - The sitemap drops `/give` automatically.
9. **Sponsor page.**
   - Stop rendering `SponsorLevels` ("Ways to partner") in `src/components/SponsorPage.astro`. Keep the opening band, `SponsorWall` and `SponsorInquiry` ("Start a conversation").
   - Leave every `src/content/sponsorLevels/*.md` entry in place, so the section can come back (question 9).
   - A link to `/sponsor#levels` now has nothing to land on. `launch--contact-and-calls-to-action` repoints its homepage links to `/sponsor`; search for any other `#levels` link and do the same.
   - Add `draft: true` to `src/content/sponsorLevels/presenting.md` and to the three `src/content/sponsors/example-*.md`.
   - In `src/components/sponsor/SponsorInquiry.astro`, render the `EmbedForm` column only when `formUrl` is set.
   - Google Form spec for Ben:
     - fields: Name, Email, Organization, Interest (Event / Chapter / Community / Not sure), Message
     - responses go to a Sheet owned by the harvardintech Google account, with email notification to `ben@harvardintech.com`
     - paste the `/viewform?embedded=true` URL into Sponsorship page → inquiry form URL
10. **Homepage band.**
    - `src/pages/index.astro`: load `loadDonateUrl` (from `src/lib/donatePageContent.ts`) and pass `donateUrl` to `src/components/landing/HomeSections.astro`, which passes it on to `GivingCampaign`.
    - In `src/components/landing/GivingCampaign.astro`:
      - When giving is closed: render the message plus "Read about the Momentum Fund →" (goes to `/donate`) instead of "Donate".
      - When open: "Donate" goes to `resolveGiveHref`.
      - "Sponsorship" goes to `withBase('/sponsor')`, not a `mailto:`.
      - Change the blurb to pre-launch copy.
11. **Legal cleanup.**
    - L11 (the footer “Cookie Policy”) is handled by `launch--content-and-pages`, which links it to the new `/privacy/` page. Don’t change `footerText` in this plan.
    - L1–L3 and L12 disappear with `/give`. L4 is covered by step 7.
    - Leave L6–L10 unchanged, and record them as Ben's review todo in this plan's open questions.
12. **Testimonial.** Do not change `src/content/testimonials/mohammed-ally.md` until question 6 is answered.
13. **Replace old strings everywhere.** Search the whole repo, including `.codeyam/scenarios` and `src/pages/isolated-components`, for replaced strings: "$100,000", "$20", "Our first gifts", "A grid, *lit from within*". Update any seed that only asserts old copy.

## Tests

- **`src/lib/giving.test.ts`** (update):
  - `isGivingOpen`: blank, whitespace or absent → false; URL → true; trims.
  - `resolveGiveCtaHref`: returns the URL when open and `undefined` when closed, never `/give`.
  - `resolveGiveHref`: its existing cases stay as they are.
  - Remove the "differs from `resolveGiveHref`" case, which assumed `/give`.
- **`src/lib/givingContent.test.ts`** (new): a content guard that reads files with `fs`, like `src/lib/selectOptions.test.ts`. It asserts:
  - (a) no file under `src/content/**` or `src/data/{donatePage,sponsorPage,settings}.json` matches `/501\(c\)|tax[- ]deductib|tax adviser|charitable/i`;
  - (b) `goal-meter.md` has raised `$0`, goal `$10,000`, percent `0`;
  - (c) exactly one published `group: priorities` pillar;
  - (d) `sponsorLevels/presenting.md` and every `sponsors/example-*.md` are drafts;
  - (e) `src/pages/give.astro` does not exist and `astro.config.mjs` redirects `/give`.

  Content changes are invisible to test attribution, so run this guard directly rather than trusting "base debt".
- **`src/lib/sponsors.test.ts`** (update): state what the wall does with a sponsor whose level is drafted, so a real Presenting-tier sponsor later is not dropped silently.
- No test in this repo renders Astro components, so the h1, the message and the hidden form box are shown by the scenarios below, not unit tests.

## Scenarios to Demonstrate

- `momentum-fund-public-visitor`: `/donate` pre-launch, with the h1, generic opening, no buttons, the message, $0 of $10,000, and the single priority.
- `momentum-fund-arriving-from-the-email`: the `?name=` greeting still shows above the new h1.
- `momentum-fund-a-giving-platform-is-chosen`: `donateUrl` set, and every button is back and points at Givebutter. This is the launch switch.
- `momentum-fund-the-goal-meter-held-as-coming-soon`: still valid.
- `goalmeter-the-2026-goal-before-launch` (new).
- `givebutton-giving-closed` (new): the message in place of the pill.
- `harvard-in-tech-landing-page` and `giving-campaign`: the homepage band, pre-launch.
- `giving-campaign-platform-live` (new): the homepage band with a URL set.
- `sponsorpage-full-page-no-partners`: no "Ways to partner" section, the empty wall, and "Start a conversation".
- `sponsorinquiry-awaiting-a-form`: email button only, no box.
- `sponsorinquiry-form-configured`: the Google Form embedded.
- `sponsorpage-full-page-with-examples` and `sponsor-route-example-partner-wall`: keep as component states. Re-seed the route scenario if it read the now-drafted content.

## Out of scope

- Any restyle of `/donate` (paused pending Nicole's changes). This plan changes copy, heading level and visibility only.
- Deleting `/give`'s components, data and scenarios (the separate kill decision, question 1).
- Setting up the Givebutter campaign, its widget ID, and importing donors.
- Rewriting donor tiers or the share message for launch.
- Answers on HAA wording (Ben) and any new legal text.
- A contact form built into the site (Google Form recommended instead).
- Nicole's content still sitting on the staging branch, including the drafted `how-your-support-will-be-used` section (parked plan `one-site-content-edits-publish-straight-to-main`).
- The unused `heroSubhead` / `heroImage` / `heroVideo` fields noted in `MomentumFundPage.astro`.