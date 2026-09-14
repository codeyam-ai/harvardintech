---
title: "launch -- Content And Pages"
mode: ui
createdAt: "2026-09-14T17:29:37Z"
prefix: "launch"
source: manual
---

## Summary

This plan fixes the site's content and page gaps before harvardintech.com moves to the new site. It covers the following:
- a real `/blog/` index instead of the Welcome post, with posts shown as Medium link cards
- removing `/about`
- a written privacy and cookie policy linked from the footer
- static redirects for the old Strikingly URLs and the section URLs that 404
- trailing-slash internal links
- a drift guard for duplicated copy, and corrected status docs
- content fixes to events, focus areas, the volunteer page and one volunteer project
- a decision brief on the old volunteer roster

It is all static-site work. Nothing needs a server, and hosting stays on GitHub Pages.

Facts checked on 2026-09-14:
- `https://medium.com/feed/harvard-in-tech` returns HTTP 200 with 10 items and full `content:encoded` bodies. All 10 are by Jess Li, published Oct 2024 to Feb 2026, with cover images on `cdn-images-1.medium.com`. They are exactly the 10 Medium stubs in `src/content/blog/`. Medium feeds only ever contain the 10 newest posts.
- The two untitled events' Luma pages (`luma.com/yi4it0ao`, `luma.com/xk5vyfvv`) describe the annual "Welcome to NYC" Mixer and the Spring Social. Both were held at Sugar Mouse, 47 3rd Ave, New York, NY.
- The old sitemap (`orig/sitemap_xml.html`) lists `/`, `/about-us`, `/events`, `/japan`, `/l-a`, `/nyc`, `/san-francisco`, `/volunteers` and `/webinars`.

## Owner decisions (2026-09-14)

- **Blog list:** "There's a blog page that seems to have placeholder content; is there a way to use that and/or embed Medium content?"
- **Welcome post / blog entry point:** Change. "Need a recommendation - can we embed medium content or host it on the site or should we take a different approach?"
- **/about:** Change. "Have it go to a section on the site or kill it - make a recommendation."
- **Cookie policy:** Change. "Plan a fix that includes writing up a policy (reference similar organizations)."
- **Redirects:** Plan it. "Figure out if the redirect can support this at the new domain or how to make this work."
- **Section 404s, trailing slashes, status docs, duplicated copy, small inconsistencies:** Plan it (all).
- **Past events list:** Change. "Reference event data and flag for cleaning or removal."
- **Focus areas:** Change. "Hide podcasts if it doesn't exist. For webinars cross-reference older site."
- **/volunteer page benefit:** "I am not sure we should advertise this - flag for content review."
- **Social media volunteer project:** Change. "Edit copy to remove that mention but otherwise have the same JD."
- **Volunteer roster:** "Need more information to mak ea decision."

## Open questions / needs input

1. **Owner (Nadia) with the HAA liaison:** Does the Harvard Alumni Association require specific privacy or trademark wording from Shared Interest Groups? If it does, that wording replaces the policy outline in step 4.
2. **Owner:** We have a London chapter. UK GDPR/PECR treats analytics cookies as needing consent. Choose one of these:
   - (a) add a small consent banner that loads GA only after "Accept"
   - (b) switch GA4 to a no-cookie setup (cookieless pings, i.e. Consent Mode "denied" by default)
   - (c) accept the risk and disclose it only in the policy

   I recommend (a). It is a separate follow-up plan, because `Analytics.astro` scopes consent-gating out today.
3. **Nicole / Ben (content review):** Is "Discounts on select Harvard University online courses" a real benefit that volunteers can claim? If nobody can name the program and how to redeem it, step 11 removes the claim.
4. **Owner:** Please confirm the new titles for the two events: "Welcome to NYC Mixer" (2024-10-10) and "Spring Social" (2025-05-22). Or decide to remove them from the past list.
5. **Owner:** Volunteer roster. Pick one of the options under Recommendations after checking who is still active.
6. **History-plan owner:** Once the webinars section exists, what is its URL? Until then, `/webinars` redirects to `/events/` (step 5), and the plan retargets it when that section ships.

## Recommendations

**A. Blog: link cards on a real `/blog/` index. My pick is option 2.**
1. *Import Medium's RSS at build time.* A build step fetches the feed and renders the posts. The drawbacks:
   - the GitHub Pages deploy would depend on Medium being up and not blocking bots
   - the feed only holds the 10 newest posts, so older ones silently drop off
   - editors lose CMS control
2. *Link cards to Medium (picked).* Each post stays a markdown entry that editors control in the CMS. It gains a `mediumUrl` field so its card links straight to Medium. A new `/blog/` index lists the cards with cover image, summary and date. A developer-run script, `scripts/import-medium.mjs` (new), reads the feed and writes a stub for each new Medium post. It runs only when asked and is never part of the build.
3. *Host full posts.* This means copying the `content:encoded` HTML into the site. It creates duplicate content, which needs `rel=canonical` to point at Medium, and it would keep hotlinking Medium's CDN images. It also makes a second copy that drifts when authors edit on Medium. It costs the most and adds the least value.

Why option 2: it gives readers a real blog page and gives Medium the traffic. It works with the feed's 10-item cap, and it keeps the CMS as the editor's single place to work.

The Welcome post is retired (set to `draft: true`), and its intro paragraph becomes the index's lede. `/blog/welcome` then redirects to `/blog/`.

**B. /about: remove it. My pick is option 3.**
1. *Grow `/about` into a full page.* That duplicates the hero mission copy.
2. *Keep it as a one-line page.* It stays dead weight.
3. *Delete `src/content/pages/about.md` and redirect `/about` and `/about-us` to `/#about` (picked).* The nav's "Mission" already goes there, and nothing links to `/about`.

**C. Privacy and cookie policy: a new `pages` entry at `/privacy/`, linked from the footer.**
This is not legal advice. Have the HAA liaison, or a volunteer lawyer, review the text before launch.

Suggested sections:
1. Who we are: a volunteer-run Harvard alumni group, with the contact email.
2. What we collect, and through which tool:
   - Google Analytics 4 (`G-GCBX577FFD`): pages viewed, approximate location, device. Uses first-party cookies such as `_ga`.
   - Luma: event registration data, under Luma's own policy.
   - Mailchimp: newsletter email address and open/click stats.
   - Google Forms: volunteer and WhatsApp-application answers.
   - Givebutter: donations. We do not store card data.
3. Why we use it: running events, sending newsletters, and understanding site use. We never sell data.
4. Cookies: a table listing each cookie's name, provider, purpose and lifetime. It also covers how to block or delete cookies, and links Google's opt-out add-on.
5. Third parties: links to the Luma, Mailchimp, Google and Givebutter privacy pages.
6. Retention: how long we keep each kind of data, and deletion on request by email.
7. Your rights: access, correction and deletion, with a short note on GDPR/UK rights for London members.
8. Children: the site is not directed at people under 13 (or 16 in the UK/EU).
9. Changes: a "last updated" date.

Comparable public policies:
- Harvard University Privacy Statement: https://www.harvard.edu/privacy-statement/
- Harvard Club of Boston Privacy Policy: https://www.harvardclub.com/privacy-policy
- Hack Club Privacy Policy, from a volunteer-heavy nonprofit that covers cookies and children: https://www.hackclub.com/privacy/

**D. Redirects: Astro `redirects` now, Cloudflare optional later. My pick is option 1.**
GitHub Pages cannot send real 301s.
1. *Astro `redirects` in `astro.config.mjs` (picked).* With static output, Astro writes a small HTML page per old path. The page does a `<meta http-equiv="refresh">` and includes `rel=canonical` to the new URL. It needs no infrastructure, works on both builds, and Google treats it as a redirect.
2. *GoDaddy forwarding.* GoDaddy DNS hosts the domain today (`docs/scoping/domain-transfer-runbook.md`). It can only forward a whole domain, not individual paths, so it can't work while the apex points at GitHub Pages.
3. *Cloudflare in front.* Moving nameservers to Cloudflare's free plan gives true per-path 301s through Redirect Rules. However, it moves DNS away from GoDaddy, and the MX/SPF records for the HostGator email must be copied over exactly. The runbook avoids that risk on purpose. This is worth doing after launch if search traffic matters.

Old-to-new map. All targets use trailing slashes.

| Old path | New target | Note |
|---|---|---|
| `/about-us`, `/about` | `/#about` | mission hero |
| `/nyc` | `/chapters/nyc/` | |
| `/san-francisco` | `/chapters/sf-bay-area/` | |
| `/l-a`, `/japan` | `/#chapters` | no chapter exists; retarget if one launches |
| `/volunteers` | `/volunteer/` | |
| `/webinars` | `/events/` | retarget to the history plan's webinars section |
| `/blog/welcome` | `/blog/` | after A |
| `/chapters/` | `/#chapters` | section 404 |
| `/communities/` | `/#community` | section 404 |
| `/volunteer/projects/` | `/volunteer/` | section 404 |
| `/events`, `/` | (unchanged) | already exist |

`/blog/` becomes a real page under A, so it needs no redirect.

**E. Trailing slashes.** Make `withBase()` in `src/lib/url.ts` add a `/` to internal page paths. It leaves alone any path with a fragment, a query, a file extension or an existing slash. Also normalize `src/data/nav.json`. I am not setting `trailingSlash: 'always'`, because that also makes the dev server and the codeyam preview 404 on slash-less URLs.

**F. Duplicated copy: keep the JSON fallbacks and add a drift guard.** `src/lib/pageCopyMerge.ts` merges each collection entry over its JSON file, so the collection always wins. Editing the JSON therefore changes nothing on the live site.

Deleting the JSON files would reach into `readSingleton` typing and scenario seeds (`src/lib/site.ts`), which is too broad a change right before launch.

Instead, a test fails whenever a key present in both places holds different values. Every copy edit in this plan is made in both places.

**G. Volunteer roster: a decision brief.** The old `/volunteers` page had a "Meet Our Team" gallery of 9 volunteers. Each had a photo, a name caption and a LinkedIn link, with no roles or bios:
- Tamara Stariwat
- Yesenia España
- Bethany Graham
- Sreenidhi Perugu
- Pradnya Kale
- Regina Pasternak
- Nicole Soltau
- Kamal Bassan
- Tejas Koulagi

The source data is in `orig_dump2.txt` (lines 210–239).

The options:
1. **Leave it off (today's state).**
2. **Port it as a CMS-edited gallery on `/volunteer`.** This means a new `volunteers` collection with name, photo, LinkedIn and an active flag.
3. **Add a short text "Thank you to our volunteers" credit line with no photos.**

I'd lean toward option 2, but only after each person confirms they are still active and agree to be listed. Until someone confirms, choose option 1. The work for option 2 is its own small plan and is not included here.

## Implementation

1. **Blog schema and helper.** Add `mediumUrl: z.string().url().optional()` to the `blog` schema in `src/content/config.ts`. Mirror it in the CMS registry (`src/data/collections.json`) so `src/lib/collectionRegistryDrift.test.ts` stays green.
   - Create `src/lib/blog.ts` (new) with these pure helpers:
     - `blogCards(entries)`: published entries only, newest first, `href` set to `mediumUrl ??` `/blog/<id>/`
     - `mediumItemToEntry(item)`: used by the import script
   - Backfill `mediumUrl` on the 10 posts in `src/content/blog/*.md`, using the URL already in each body.
   - Fill in `coverImage` from each post's first feed image.
2. **Blog index.** Create `src/pages/blog/index.astro` (new) inside `BaseLayout`. It shows a lede taken from `welcome.md`, a card grid from `blogCards`, and a "More on Medium" link.
   - Set `src/content/blog/welcome.md` to `draft: true`.
   - Point the nav "Blog" link in `src/data/nav.json` to `/blog/`.
   - Point the "Blog" card in `src/components/landing/ContentHub.astro` (line 39) to `/blog/`. Its post links (line 66) use `blogCards` hrefs.
   - In `src/pages/blog/[slug].astro`, change "← All posts" to link to `/blog/` (coordinate with the design plan's move to `BaseLayout`).
   - `src/pages/llms.txt.ts` already lists `/blog`. Make it `/blog/` and add Privacy.
3. **Import script.** Create `scripts/import-medium.mjs` (new). It fetches the feed and, for each item without a matching `mediumUrl`, writes a stub `.md` file with `title`, `date`, `summary`, `coverImage` and `mediumUrl`. It overwrites nothing. Document it in `docs/editing-the-site.md`.
4. **Privacy page.** Create `src/content/pages/privacy.md` (new). `src/pages/[slug].astro` renders it at `/privacy/`; follow the section outline in C, and set `description` and an "updated" line.
   - In `src/layouts/BaseLayout.astro` (footer, around line 135), add a "Privacy & cookies" link next to `settings.footerText`.
   - Remove the plain-text " · Cookie Policy" from `footerText` in `src/data/settings.json`.
5. **Redirects.** Create `src/lib/redirects.ts` (new), which exports the map in D as plain data. Import it into `astro.config.mjs` as `redirects: ...`.
   - Delete `src/content/pages/about.md` (B).
   - On the project-subpath build (`DEPLOY_BASE_PATH`), check that `dist/nyc/index.html` points its refresh at the base-prefixed URL. If Astro doesn't prefix the base, prefix it in `redirects.ts`.
   - Check that Hero.astro and HeroCarousel.astro don't both render `id="about"` on the home page (they both declare it).
6. **Trailing slashes.** Update `withBase` in `src/lib/url.ts` as described in E. Normalize the internal `url`s in `src/data/nav.json`, and the `url` defaults in `src/components/landing/FocusAreas.astro` and `ContentHub.astro`.
   - Add the trailing slash to the hand-written doc links in `src/lib/nav.ts`, and update the Blog assertions in `src/lib/nav.test.ts` (lines 253–265, 328).
7. **Drift guard.** Create `src/lib/pageCopyDrift.test.ts` (new) to guard these pairs:
   - `volunteerPage.json` ↔ `src/content/volunteerPage/volunteer.md`
   - `sponsorPage.json` ↔ `src/content/sponsorPage/sponsor.md`
   - `donatePage.json` ↔ `src/content/pageCopy/donate.md`
   - `settings.json` `googleAnalyticsId`/`givebutterAccountId` ↔ `src/content/siteIntegrations/site.md`

   Fix any drift the guard exposes, keeping the collection's value.
8. **Status docs.**
   - `docs/nicole-review.md` line 232: say all 5 bios are blank (`ben-wei.md` and `nadia-eldeib.md` have `bio: ''`; the other three have no bio). Refresh the "8 events and 11 blog posts" line after this plan.
   - `public/review/index.html`:
     - line 240: "Chapters (5 cities)" becomes 6
     - lines 311 and 329: add SF Bay Area to the city lists
     - line 313: drop "podcasts"
     - line 373: keep "none have a bio" (correct)
9. **Past events.**
   - `src/content/events/2024-10-10-harvard-in-tech.md`: title "Harvard Alumni in Tech: Welcome to NYC Mixer", location "New York, NY", `chapter: nyc`.
   - `src/content/events/2025-05-22-harvard-in-tech.md`: title "Harvard Alumni in Tech: Spring Social", with the same location and chapter.
   - Keep the filenames, since the ids feed CMS links. If the owner prefers removal (Q4), set `draft: true` instead.
10. **Focus areas** (`src/components/landing/FocusAreas.astro`):
    - Programs blurb: "Events and webinars across the year." Drop "podcasts", since none exists. The old site did have a `/webinars` page (2020 COVID-era sessions), so "webinars" stays and links to the history plan's section once it exists.
    - Chapters blurb: stop hard-coding "Five". Add an optional `chapterCount` prop. `src/components/landing/HomeSections.astro` (line 89) passes the published `chapters` count, which gives "Chapters in 6 cities, and growing."
11. **Volunteer benefit.** Pending Q3, remove the "Other Benefits" item from both `src/content/volunteerPage/volunteer.md` and `src/data/volunteerPage.json`, keeping them identical for step 7. Record the removed text in the PR for Nicole's review.
12. **Social media project.** In `src/content/projects/social-media-marketing-specialist-events.md`, change "For this specific New York event, the volunteer will support…" to "For each event, the volunteer will support…". Leave the rest of the JD unchanged, except for one fix: the last line ("Review post performance…") becomes a list item, which its missing "- " makes it look intended to be. It stays `draft: true`.

## Tests

- `src/lib/blog.test.ts` (new):
  - `blogCards` drops drafts, sorts newest first, and prefers `mediumUrl` over the local route.
  - `mediumItemToEntry` maps a feed item, stored as a trimmed fixture from today's feed, to valid frontmatter.
- `src/lib/redirects.test.ts` (new):
  - Every path from the old sitemap has an entry.
  - No destination is itself a source, so there are no chains.
  - Every destination is `/`-anchored with a trailing slash or `/#fragment`.
  - Chapter targets name real files in `src/content/chapters/`.
- `src/lib/url.test.ts`:
  - `withBase('/events')` returns `/events/`.
  - `/#about`, `/x.pdf`, `/a?b`, `mailto:` and external URLs come back unchanged.
- `src/lib/nav.test.ts`: Blog resolves to `/blog/`, and `unresolvedNavUrls` treats `/blog/` as known.
- `src/lib/seoEndpoints.test.ts`: llms.txt lists `/blog/` and `/privacy/`, and every listed path is an existing route.
- `src/lib/sitePages.test.ts`: a `privacy` page is routable and is not shadowed by a static route.
- `src/lib/pageCopyDrift.test.ts` (new): see step 7. It must fail if either copy of the discount line comes back while the other stays removed.
- `src/lib/launchCopy.test.ts` (new) reads the content and data files and asserts all of the following:
  - No event title equals "Harvard Alumni in Tech" exactly.
  - Every published event has a `location`.
  - No copy contains "podcasts", "Five city", "specific New York event", "online courses", or the plain-text "Cookie Policy".

  Note that test-on-base attribution misreads tests of `src/content` for these, so prove-red against the pre-edit files.
- Register the new test files with `refresh-tests` before `prove-red`.

## Scenarios to Demonstrate

- `blog-index` (new): `/blog/` with the 10 cards, a Medium cover image on each, and the Welcome post absent.
- `blog-index-empty` (new): no published posts. Shows the lede plus a "Read on Medium" link, not an empty grid.
- `blog-post-welcome.json`: retarget to a remaining post, or retire it with the Welcome post.
- `privacy-page` (new): `/privacy/` fully rendered.
- `harvard-in-tech-landing-page.json`: the footer shows the "Privacy & cookies" link.
- `focus-areas.json`: shows the new blurbs, with a 6-chapter count.
- `eventspage-upcoming-and-past.json` and `events-route-upcoming-and-past.json`: the two NYC events appear with their real titles and locations.
- `volunteer-page-open-projects.json`: the benefits list has no discount claim.
- `volunteer-project-detail-full-description-no-photo.json`: the social media JD without "this specific New York event".
- `redirect-old-nyc` (new): the static `/nyc/` redirect page, showing its refresh target.

## Out of scope

- The consent banner or cookieless GA (follow-up from Q2).
- Moving DNS to Cloudflare for true 301s.
- Porting the volunteer roster (G option 2 is its own plan).
- The webinars history section itself.
- Moving `blog/[slug].astro` into `BaseLayout` (design plan).
- Renaming the Medium publication or its handle.
- Writing board bios.
- Deleting the JSON fallbacks entirely.
- Anything under `src/pages/isolated-components/`.