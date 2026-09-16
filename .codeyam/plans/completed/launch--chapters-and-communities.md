---
title: "launch -- Chapters And Communities"
mode: ui
createdAt: "2026-09-14T17:27:39Z"
prefix: "launch"
source: manual
---

## Summary

Replace the "six identical chapter pages" model with a data-driven **local presence** model with three kinds of page:

| Kind | Entries | What the page leads with |
|---|---|---|
| **Active chapter** (`status: active`) | SF & Bay Area, NYC, London, Boston & Cambridge | Named lead(s), upcoming **and recent past** events, sign-up |
| **Forming chapter** (`status: forming`) | DC and DMV, Seattle / Pacific Northwest | "Join the local WhatsApp" + "Volunteer to lead or support this chapter" CTAs; no lead block |
| **Community** (own page type) | AI, Founders | Lead, callouts (e.g. bi-weekly global calls), WhatsApp CTA, community-tagged events |

Everywhere else is derived from the same data or checked against it: the nav, the "Our chapters" row, the stat strip, the hero copy, the Chapter Partner sponsor level and the donate page.

Two more changes:
- A new **Global community** CTA serves everyone outside the four cities. It offers the WhatsApp form, the newsletter and volunteering, and takes the place where Japan / L.A. used to be.
- The WhatsApp group is **never linked directly**. Every WhatsApp CTA points at the Google Form (`https://forms.gle/GqgaCDDWhWAgpJC68`). That includes the existing homepage section, which today links `chat.whatsapp.com` twice.

## Owner decisions (2026-09-14)

- **DC and DMV (Change):** "There's no lead right now, just a WhatsApp channel. I wonder if we could have CTAs to volunteer to lead or support the chapter + join WhatsApp to discuss / meet other local alumni among other things."
- **Seattle / Pacific Northwest (Change):** "Same situation as DC and DMV; I want to have a template for these places that enable us to have a CTA to volunteer and join WhatsApp."
- **AI community (Change):** "James Nicholson is the lead (pilot) for this. I'd like a format with a CTA to join the WhatsApp and some callouts of what happens (bi-weekly calls with alumni globally)."
- **Founders community (Change):** "Founders community is in WhatsApp + local events in certain geographies. Have a CTA to WhatsApp."
- **Boston & Cambridge (Change):** "Boston & Cambridge hosted an Alumni Day event and will host more soon. We should update the image to have the alumni day picture if it doesn't already. We may also want to name the lead (Aimee, will get class info / last name)."
- **Japan and L.A.:** "Drop both; replace with a CTA for Global community and with a callout to join WhatsApp, subscribe to newsletter, and volunteer."
- **Hero slides (Change):** "Right now there are or will be in-person events in 4 cities: SF, NYC, London, Boston."
- **Stat "8,000+":** "8,500+ newsletter subscribers and 750+ alumni in our WhatsApp".
- **Stat "6 global chapters":** "Update it based on above guidance and make sure it's consistent."
- **Accomplishments (Change):** "Update the data / stats."
- **"2 new chapters: London and San Francisco":** "Remove this."
- **Chapter Partner sponsor level (Change):** "Keep and trim cities and have a digital / global / other offering of some sort."
  - *Superseded for launch (2026-09-14):* after Nicole's walkthrough, the owner removed "Ways to partner" from `/sponsor`, so no level shows on the page.
  - Step 13 still updates the stored levels, so they are right if the section returns.
- **Mailing lists (Keep one list):** "These are not per-chapter but we can filter based on geography that folks respond they're in."
- **Chapter pages are nearly empty (Plan it):** also show recent past events.
- **Design:** communities get their OWN page type, not the chapter page. The chapter banner is a "Chapter" label plus the city name.
- **SF lead:** Jessica, in the interim.
- **WhatsApp:** link only the Google Form, never the group itself.
- **Nicole's walkthrough (2026-09-14):**
  - Keep every chapter with a high concentration of alumni in the menu, even without an event lead. This agrees with DC and Seattle as forming chapters.
  - A chapter without a lead asks "Interested in getting involved with the {city} chapter?" with a Contact us button (step 6).
  - Founders events: the owner chose tagging by hand (step 12). They sit high on the page, under the join CTA (step 9).
  - She is replacing the blurry London, AI and Founders banners herself in the content editor. This plan must not overwrite them.

## Open questions / needs input

1. **Owner (via Aimee):** Aimee's last name and class year, and her title ("Chapter Lead"?). Boston ships without a named lead until this arrives.
2. **Owner (via Jessica):** Jessica's last name and class year, and whether to show "Interim Chapter Lead".
3. **Owner:** the NYC and London leads, if they should be named. Active chapters do not *require* a lead in the schema.
4. **Owner / James Nicholson:** James's class year and title wording ("Community Lead (pilot)"?), the call cadence details (day and time zone, or just "every other week"), and how members get onto a call (via the WhatsApp group?).
5. **Owner:** the Boston **Alumni Day photo**. There is none in the repo: nothing in `public/images/` or `src/data/media.json` matches alumni day, Cambridge or Boston. Today Boston's `heroImage` is `/images/bg/hero-bg.jpg`, the same photo as the homepage hero.
6. **Owner:** where "Volunteer to lead or support" should point. The default is `/volunteer`, whose CTA is `https://hi.switchy.io/wEYK`. A dedicated "lead a chapter" form would be better if one exists.
7. **Owner:** confirm that the Google Form's confirmation step hands out the WhatsApp group link (or that admins add people). After this plan, the site no longer links the group anywhere.
8. **Owner:** which geographies Founders runs local events in (London co-working days so far), and whether other cities are coming.
9. **Owner:** current figures for the accomplishments that are not given in the notes: LinkedIn followers (currently `8,000+`) and events hosted (`100+`).
10. **Owner:** which city the untagged 2024-10-10 and 2025-05-22 "Harvard Alumni in Tech" events were in, so they can show as NYC's (or another city's) recent past events.
11. **Owner:** whether the stat strip should grow to 5 figures (newsletter, WhatsApp, chapters, events, Est. 2013) or drop one. The default is 5; `Stats.astro` lays the strip out on `--n` columns, so 5 is supported.

## Open questions — status at build (2026-09-16)

Everything below shipped with a stated default rather than blocking. Nothing
here prevents launch; each is a content edit in /admin once the answer arrives.

| # | Question | Status at build |
|---|---|---|
| 1 | Aimee's last name, class year, title | **Open.** Boston ships with no named lead. |
| 2 | Jessica's last name, class year | **Answered by the content already**: `sf-bay-area.md` carries `Jessica Li / Interim chapter lead`. Class year still open. |
| 3 | NYC and London leads | **Open.** Both ship without named leads; the schema does not require them. |
| 4 | James's class year, title, call cadence | **Partly.** Shipped as `Community Lead (pilot)` with "bi-weekly calls with alumni globally". Class year and the day/time-zone still open. |
| 5 | Boston Alumni Day photo | **Open.** Boston keeps `/images/bg/hero-bg.jpg`, the homepage hero — nothing in `public/images/` matches Alumni Day. Body copy now mentions the event. |
| 6 | Where "Volunteer to lead or support" points | **Defaulted** to `/volunteer` via `VOLUNTEER_PATH`. A per-chapter `volunteerUrl` overrides it with no code change. |
| 7 | Does the Google Form hand out the group link? | **Open — and it is why `WhatsappCommunity`'s step-2 copy was left alone.** Writing "we'll send you the invite" would assert a process nobody confirmed. The component had already dropped its group link in the contact cycle, so nothing is blocked. |
| 8 | Which geographies Founders runs events in | **Shipped as** "Local events in select cities — co-working days in London so far, with more cities as founders there volunteer to host them." |
| 9 | Current LinkedIn followers / events hosted | **Open.** `linkedin-followers.md` keeps `8,000+` and `events-hosted` keeps `100+`. Note these are now the ONLY unverified figures on the site. |
| 10 | City for the untagged 2024-10-10 and 2025-05-22 events | **Open.** They remain untagged, so they appear on `/events` and no chapter page. This is why NYC shows no "Recent events" block yet. |
| 11 | Should the stat strip grow to 5? | **Defaulted to 5** (newsletter, WhatsApp, chapters, events, Est. 2013). `Stats.astro` lays out on `--n` columns, so dropping one needs no code change. |

## Recommendations

**A. A `status` field on the existing `chapters` collection, plus a separate `CommunityPage` (pick).**
- Adds `status: active | forming`, `whatsappFormUrl`, `volunteerUrl` and `callouts` to `chapters`, and `callouts` and `whatsappFormUrl` to `communities`.
- A forming chapter becomes active by flipping one select in `/admin`. The URL, nav entry and events all stay put.
- Communities get their own component, as the design decision requires, while keeping their existing collection and route.

**B. A separate `formingChapters` collection.** Simpler per-collection forms, but promoting DC to active means deleting and re-creating the entry, moving event tags and re-pointing the nav. That fights the "flip when a lead appears" workflow.

**C. Keep one `ChapterPage` with a `kind` prop covering communities too.** This has the smallest diff, but it contradicts the owner's decision and keeps the "Harvard Alumni in Tech AI" banner problem alive.

**Why A:**
- It matches how the site already works: one collection per surface, with nav and cards derived from content (`src/lib/nav.ts`).
- It is the only option where the owner's "template for these places" is a single field.
- It keeps the counts testable: stats, hero and sponsor copy are guarded against `status` by a unit test (see Tests) instead of being hand-synced.

Numbers in CMS copy stay editable text rather than being computed at render time, because editors own that copy. The guard test reports drift and never blocks a publish, the same convention as `unresolvedNavUrls`.

## Reused existing code

Survey run at the Confirm gate (2026-09-16), before any code was written. Every
constant and entity this plan proposes was grepped against the tree first.

**Already exists — reuse, do not redefine.** `src/lib/contact.ts` (landed by
`launch--contact-and-calls-to-action`, commit af07e4c) already owns:
- `WHATSAPP_FORM_URL = 'https://forms.gle/GqgaCDDWhWAgpJC68'` — this *is* the
  plan's `WHATSAPP_JOIN_FORM_URL`. `localPresence.ts` imports it; it must not
  declare a second copy.
- `VOLUNTEER_PATH = '/volunteer'` — this *is* the plan's
  `DEFAULT_VOLUNTEER_URL`. Same rule: import, do not redeclare.
- `emailFor('formingChapter')` — already registered in `EMAIL_SURFACES`, so
  step 6's Contact-us button has its seam today.

**Already exists — this plan EXTENDS it, it is not a rebuild:**
- `eventsTaggedTo` (`src/lib/events.ts:50`) — gains `event.communities` matching
  alongside `chapter` (step 4).
- `withChapterGroup` (`src/lib/nav.ts:80`) — gains the appended
  `GLOBAL_COMMUNITY_ITEM` (step 10).
- `ChapterEvents.astro` — gains a `variant` prop and a second section id so one
  component renders both the upcoming and the recent-past block (step 8).

**Confirmed genuinely new — no equivalent field under another name:**
`chapters.status`, `whatsappFormUrl`, `volunteerUrl` and `callouts` appear in
`src/content/config.ts` in no spelling; the chapters schema carries no
status/lifecycle field at all.

**Step 1's `NEWSLETTER_URL` was right, and it found real duplication.** The
Mailchimp signup is `https://mailchi.mp/0222623e1169/fbrj32e9wb`, repeated as a
bare literal in FIVE components — `BaseLayout.astro:89`, `ChapterSignUp.astro:10`,
`landing/Hero.astro:14`, `landing/HeroCarousel.astro:35`,
`landing/UpcomingEvents.astro:31` — plus one content file. It is now named once
in `src/lib/contact.ts` as `NEWSLETTER_URL` and re-exported from
`localPresence.ts`. New call sites use the constant; the five existing literals
are deliberately NOT swept up, as that is an unrelated change to five components
this plan otherwise does not touch. Worth a follow-up.

(Distinct from the LinkedIn newsletter in `src/data/nav.json`, which is a feed
to follow rather than a list to join. Both are real and they are not
interchangeable.)

**Step 5 is largely already done.** `WhatsappCommunity.astro` already resolves
`verifyUrl` from `WHATSAPP_FORM_URL` and no longer defaults to
`chat.whatsapp.com`. What remains of step 5 is the step-2 copy rewrite. The one
surviving `chat.whatsapp.com` string under `src/` is a fixture at
`src/pages/isolated-components/[name].astro:135`, which test (d) must exclude or
the fixture must be changed.

## Implementation

1. **Pure model, `src/lib/localPresence.ts` (new).** Framework-free, the same shape as `nav.ts` and `events.ts`. It exports:
   - `chapterStatus`, `presenceSummary`, `joinCtas`, `isWhatsAppGroupLink` — and **re-exports** `WHATSAPP_FORM_URL` and `VOLUNTEER_PATH` from `src/lib/contact.ts` rather than declaring its own copies (see *Reused existing code*). The newsletter URL is the LinkedIn one in `src/data/nav.json`, not a Mailchimp URL.
   - `isWhatsAppGroupLink(url)`, which is true for `chat.whatsapp.com` / `wa.me`.
   - `chapterStatus(entry)`, where absent means `active`.
   - `presenceSummary(chapters) → { active, forming, activeCount, formingCount }`.
   - `joinCtas(entry)`, which resolves the form, volunteer and newsletter URLs, falling back to the defaults and never returning a group link.
2. **Schema, `src/content/config.ts`.**
   - `chapters` gains:
     - `status: z.enum(['active','forming']).optional()`
     - `whatsappFormUrl: z.string().optional().refine(u => !u || !isWhatsAppGroupLink(u), 'Link the Google Form, not the WhatsApp group')`
     - `volunteerUrl: z.string().optional()`
     - `callouts: z.array(z.object({ title: z.string(), text: z.string().optional() })).optional()`
   - `communities` gains `whatsappFormUrl` (same refine) and `callouts`.
   - `events` gains `communities: z.array(z.string()).optional()`, so a London co-working day can also appear on Founders without losing its `chapter: london` tag.
   - Update the stale "(NYC, SF, L.A., Japan)" comment at line 158.
3. **CMS registry, `src/data/collections.json`.** Mirror every new field:
   - `status` as a `select` (Active / Forming), with a hint explaining that forming shows the volunteer + WhatsApp CTAs.
   - `callouts` as a `list`.
   - `whatsappFormUrl` with a hint that says "Google Form only".
   - `communities` on events as a `list`.

   `src/data/collections.test.ts` fails on schema/registry drift, so steps 2 and 3 land together.
4. **Events, `src/lib/events.ts`.**
   - Add `recentPastEvents(past, { limit = 3 })`.
   - Extend `eventsTaggedTo` (or add `eventsForCommunity`) so it matches `event.communities?.includes(id)` as well as `chapter`.
   - Extend `unmatchedChapterTags` inputs to cover `communities` tags. Its caller is in `src/pages/chapters/[slug].astro`.
5. **WhatsApp form-only, `src/components/landing/WhatsappCommunity.astro`.**
   - Drop the `whatsappUrl` prop and its `chat.whatsapp.com` default.
   - Rewrite step 2 as something like "After you're verified, we'll send you the invite". Wording depends on open question 7.
   - Point "Apply to join" at `WHATSAPP_JOIN_FORM_URL`.
6. **Shared CTA blocks (new).** Each takes plain props, for scenarios:
   - `src/components/JoinWhatsAppCta.astro` (new): "Join the {name} WhatsApp" linking to the form only.
   - `src/components/FormingChapterCta.astro` (new): "{city} is forming. Help lead it." with two buttons, *Volunteer to lead or support* (`volunteerUrl`) and *Join WhatsApp to meet local alumni* (the form).
     - Under them goes Nicole's line, "Interested in getting involved with the {city} chapter?", with a *Contact us* button to `mailto:` the site contact address.
     - The button goes to `info@harvardintech.com`. This is one of the few places `launch--contact-and-calls-to-action` shows the shared inbox (owner, 2026-09-15: "sparingly"). It renders only when that plan's `emailFor('formingChapter')` returns an address.
   - `src/components/GlobalCommunityCta.astro` (new): "Not near a chapter? Join the global community" with three actions: WhatsApp form, newsletter (Mailchimp, one list, noting that geography is asked there) and volunteer.
   - `src/components/CommunityCallouts.astro` (new): a grid of `callouts`.
7. **Chapter banner and leads.**
   - `src/components/ChapterHero.astro`: replace `Harvard Alumni in Tech ${name}` with a small uppercase `label` kicker (default `"Chapter"`) above the `name` title. A forming chapter's kicker reads "Chapter · Forming".
   - `src/components/ChapterHeader.astro`: add the same `label` to the no-image fallback.
   - `src/components/ChapterLeads.astro`: add a `heading` prop (default "Chapter Leads").
8. **Chapter page, `src/components/ChapterPage.astro` and `src/pages/chapters/[slug].astro`.**
   - The route passes `status`, `past` (via `recentPastEvents`), `callouts` and the resolved CTAs.
   - Active chapters render upcoming events, then "Recent events in {city}" using `ChapterEvents.astro` with `EventCard variant="past"`. `ChapterEvents` gets a `variant` prop and a new section id.
   - Forming chapters render `FormingChapterCta` in place of the leads block.
   - Every chapter ends with `GlobalCommunityCta` above `ChapterConnect`.
   - Fix the stale Japan mention in the header comment.
9. **Community page type.** `src/components/CommunityPage.astro` (new) contains:
   - a hero labelled "Community"
   - the lead(s) via `ChapterLeads heading="Community Lead"`
   - the markdown body
   - `CommunityCallouts`
   - `JoinWhatsAppCta` as the primary CTA
   - upcoming and recent community events (tag or `communities`), placed directly under the join CTA, where Nicole expects to find Founders events
   - the gallery toggle
   - `ChapterConnect`

   `src/pages/communities/[slug].astro` switches from `ChapterPage` to `CommunityPage`.
10. **Nav, `src/lib/nav.ts`.**
    - `ChapterLike` gains `status?`. `chapterNavItems` sorts active before forming, then by `order` and city.
    - A new `GLOBAL_COMMUNITY_ITEM` (`{ label: 'Global community', url: '/#global-community' }`) is appended by `withChapterGroup` whenever chapters exist.
    - `src/layouts/BaseLayout.astro` already spreads `c.data`, so it only needs checking.
11. **"Our chapters" row, `src/components/landing/OurChapters.astro`.**
    - Use the same active-then-forming sort.
    - The count kicker reads "04 cities · 2 forming".
    - Forming cards get a "Forming · help lead it" badge.
    - Add a final `id="global-community"` card or band built from `GlobalCommunityCta`, in the place of the old Japan / L.A. cards.
    - `src/pages/index.astro` spreads `c.data`, so `status` flows through.
12. **Content: chapters and communities.**
    - `src/content/chapters/dc-dmv.md` and `seattle.md`: `status: forming`, forming-voice body copy.
    - `sf-bay-area.md`: `leads: [{ name: 'Jessica …', role: 'Interim Chapter Lead' }]` (open question 2).
    - `boston-cambridge.md`: `status: active`. Swap `heroImage` for the Alumni Day photo and add Aimee's lead entry once open questions 1 and 5 are answered.
    - `nyc.md`, `london.md`: `status: active`.
    - `src/content/communities/ai.md`:
      - `leads: [{ name: 'James Nicholson', role: 'Community Lead (pilot)' }]`
      - callouts such as "Bi-weekly calls with alumni globally" and "Share what you're building / reading"
      - replace the "just getting started" body
    - `founders.md`: callouts "WhatsApp group" and "Local events in select cities (London co-working days)".
    - Leave `heroImage` alone on London, AI and Founders if Nicole has already replaced it in the content editor.
    - Add `communities: [founders]` to the three `src/content/events/*alumni-founders-co-working-day*.md` events.
    - Tag `2026-04-30-…-leaders-in-engineering-panel.md` with `chapter: sf-bay-area` (its location is San Francisco).
13. **Content: numbers and copy.**
    - Stats:
      - `src/content/stats/alumni-technologists.md` becomes `8,500+` / "Newsletter subscribers".
      - `src/content/stats/whatsapp-alumni.md` (new) is `750+` / "Alumni in our WhatsApp".
      - `global-chapters.md` becomes `4` / "Chapters with in-person events".
    - Accomplishments:
      - `whatsapp-community-members.md` becomes `750+`.
      - `newsletter-subscribers.md` (new) is `8,500+`.
      - Delete `new-chapters-launched.md`.
      - `linkedin-followers.md` and `events-hosted-and-co-hosted.md` per open question 9.
    - Hero: in `src/content/heroSlides/a-global-community-with-a-home-in-your-city.md` the lede becomes "…in person in SF, New York, London and Boston, with chapters forming in DC and Seattle."
    - Sponsor. These are stored only, because "Ways to partner" is hidden for launch (see `launch--giving-pages-short-term`). The edits keep the levels right for when it returns, and keep test (c) green.
      - In `src/content/sponsorLevels/chapter.md` the summary lists only SF, New York, London or Boston, plus a benefit line: "Or back the global community instead".
      - `src/content/sponsorLevels/global.md` (new) adds a "Global Community Partner" level with newsletter recognition (8,500+), WhatsApp community and AI bi-weekly call sponsorship.
    - "Six chapters" copy:
      - `src/content/sponsorPage/sponsor.md` intro becomes "four chapters and a global community".
      - `src/content/pageCopy/donate.md` stats `8,000+ Members` becomes `8,500+ Newsletter subscribers`, and `'6' Chapters & Growing` becomes `'4'`.
14. **Fallback copy.** The committed fallbacks repeat the old figures, so update them too:
    - `src/components/landing/Stats.astro` (line 14)
    - `src/components/landing/HeroCarousel.astro` (line 53)
    - `src/data/donatePage.json` (line 14)
    - `src/data/sponsorPage.json` (lines 4 and 23)
15. **Workflow notes.**
    - Register the new test files before `prove-red`.
    - Content edits are masked by a stale `content-sandbox-active` snapshot and ignored by the screenshot staleness check. Recapture content-driven scenarios with `--target --force`.

## Tests

- **`src/lib/localPresence.test.ts` (new):**
  - `chapterStatus` defaults to active.
  - `presenceSummary` counts 4 active / 2 forming for the real fixture shape.
  - `joinCtas` falls back to `WHATSAPP_JOIN_FORM_URL` and `/volunteer`, and never returns a `chat.whatsapp.com` URL even if one is passed.
  - `isWhatsAppGroupLink` covers `chat.whatsapp.com`, `wa.me` and `forms.gle`, which returns false.
- **`src/lib/presenceConsistency.test.ts` (new).** Reads content off disk line-by-line, like `chapter.photos.test.ts`. It asserts:
  - (a) `stats/global-chapters.md` `value` equals the active-chapter count.
  - (b) `pageCopy/donate.md`'s Chapters stat equals the same count.
  - (c) the hero lede, `sponsorLevels/chapter.md` summary and `sponsorPage/sponsor.md` intro name no forming city as in-person and never mention Japan, L.A. or "six chapters".
  - (d) no file under `src/` (excluding `isolated-components/` and tests) contains `chat.whatsapp.com`.
  - (e) `accomplishments/new-chapters-launched.md` does not exist.
- **`src/lib/nav.test.ts`:**
  - `chapterNavItems` orders active before forming.
  - `withChapterGroup` appends "Global community" → `/#global-community`, and still omits the group when there are no chapters.
- **`src/lib/events.test.ts`:**
  - `recentPastEvents` is most-recent-first and capped at 3.
  - The community match via `communities` works.
  - `unmatchedChapterTags` reports an unknown `communities` tag.
- **`src/data/collections.test.ts`:** stays green, which proves the registry mirrors every new schema field.
- **`src/lib/chapter.photos.test.ts`:** unchanged. It still guards Boston's new `heroImage` path indirectly, so check that the path exists on disk.

## Scenarios to Demonstrate

- **New:**
  - `chapter-route-forming-dc-dmv`: "Chapter · Forming" banner, volunteer + WhatsApp-form CTAs, Nicole's "Interested in getting involved…" line (its Contact us button shows only when a contact email is set), no leads block.
  - `chapter-route-boston-with-past-events`: Alumni Day under "Recent events in Boston & Cambridge".
  - `chapter-route-london-upcoming-and-past`
  - `community-route-ai-with-callouts`: James as lead, bi-weekly calls callout.
  - `community-route-founders-with-london-coworking`
  - `ourchapters-four-active-two-forming-plus-global`
  - `globalcommunitycta-default`
- **Update (recapture):**
  - `chapter-route-new-york-city`, `chapter-route-sf-bay-area` (interim lead)
  - `chapterhero-with-image`, `chapterhero-no-image-fallback` (label + city)
  - `community-route-ai-on-day-one`, `community-route-founders-with-leads-and-events`
  - `primarynav-derived-chapters`, `primarynav-communities-derived`
  - `stats-band`, `hero-carousel`, `whatsapp-community` (form-only)
  - `sponsorlevels-four-partnership-levels`, `momentumaccomplishments-campaign-track-record`
  - `harvard-in-tech-landing-page`

  Screen every changed PNG for font-race or wrong-page frames.

## Out of scope

- Per-chapter mailing lists. There is one Mailchimp list, segmented by the geography subscribers report. The five other hard-coded Mailchimp URLs are not consolidated here, but the new components use `NEWSLETTER_URL`.
- Deleting `public/images/chapters/japan.jpg` and `la.jpg` and their `src/data/media.json` entries. They are unreferenced by content, so this is a later media cleanup.
- A lead-application form or any change to the Google Form itself.
- `src/pages/isolated-components/`.
- Automatic Luma import or auto-tagging of events by location.
- Nicole's later ideas (2026-09-14), for after launch:
  - a WhatsApp page listing channels, current topics and a year-ahead topics calendar;
  - James's AI content: a topics calendar, upcoming webinars and webinar recaps. This depends on the webinars section in `launch--history-events-archive-and-webinars`.