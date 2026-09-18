---
title: "launch -- History Events Archive And Webinars"
mode: ui
createdAt: "2026-09-14T17:34:51Z"
prefix: "launch"
order: 3
source: manual
---

## Summary

Bring back the original site's history before harvardintech.com leaves Strikingly. There are four pieces:

1. **Snapshot.** A one-time script saves every photo, video thumbnail and write-up from the Strikingly pages into the repo under `archive/strikingly/`, with a manifest. It must run **before the domain cutover**, because the images exist only on Strikingly's CDN.
2. **Events archive.** 33 NYC-era events (2013–2019) are imported as ordinary event entries. `/events` then shows them in a separate **Archive** block, folded by year, so 41 past events don't become one long grid. Photos and speakers come in phase 2.
3. **Webinars.** The 11 recordings from about 2020 come back as blog posts, each with its video embedded. A new `/webinars` page lists them and is reached from the nav under Content Hub → Webinars. This also keeps the original `/webinars` address working.
4. **Sept 28 event.** "An Elevated Evening of Ideas, Connection & Conversation" is added as a normal event. Its ticket link shows only while the event is upcoming. After the date it drops into Past Events by itself.

Facts used here, all checked against the saved pages:
- **The 33 archive events.** 32 come from `/events` and one (#0, "Future of Healthcare Tech", no date) appears only in the home page's copy of the list. All 32 `/events` items have a Strikingly photo.
- **Galleries.** There are 42 distinct gallery photos: the 20 shared by `/home` and `/events`, plus 9 for Japan, 8 for NYC and 5 for San Francisco. The L.A. gallery is empty.
- **Webinar thumbnails.** There are 10 distinct thumbnails on Vimeo, YouTube and Wistia; webinar W6 reuses W5's.
- **Existing gallery files.** `public/images/gallery/` holds only 400px crops of the home gallery, so full-size originals are not saved anywhere yet.

## Owner decisions (2026-09-14)

- **Past-events archive.** Decision: *Plan it.* Recommended approach: "import the text now as a folded 'Archive' section by year; add photos and speakers later."
- **Webinars.** Decision: *Bring back as posts.* Note: "Bring back under webinars!"
- **Save the original site's photos and write-ups before the domain switch.** Decision: *Plan it.*
- **The Sept 28 event.** Decision: *Skip.* Note: "We should have this added but it's not likely the site will change over in time so likely this should be kept as an older event."
  - How this plan reads it: add the entry now (it is upcoming today, Sept 14). Once the date passes it stays as an ordinary past event, and the ticket link stops rendering.

## Open questions / needs input

1. **Date for #0 "Future of Healthcare Tech"** (for the **owner or NYC alumni organizers**). It sits above the April 2019 event in the original list, so it is probably 2019 or later. It gets imported with `draft: true` and a placeholder date, and it is published once someone supplies the real date. We should not show a made-up date.
2. **The four pre-event invitations: #3, #8, #10 and #11** (for the **owner**). These read as invitations ("Please join us…", "At this month's event we will discuss…"). The options are to keep them word for word as the historical record (the default), or to change them to past tense.
3. **Default location "New York, NY"** (for the **owner**). This would apply to the 30 events with no stated venue. All 33 are from the NYC era. If declined, `location` stays empty.
4. **Tagging the archive to the NYC chapter** (for the **owner**). Setting `chapter: nyc` would put 32 more past events on `/chapters/nyc`, and `ChapterEvents` has no fold. The default is to leave them untagged in phase 1.
5. **Webinar dates** (for the **owner**). The snapshot records the provider's upload date where one is public: Vimeo's oEmbed `upload_date`, YouTube's watch-page `uploadDate`, and Wistia's media JSON `createdAt`. Any webinar still undated ships as a draft until someone sets its date.
6. **Webinar W6 (Parallax/Proactive Investors)** (for the **owner**). This one is only a link to `goodhealthoutcomes.com/prlx_harvard_webinar`, and its thumbnail is W5's. The options are a link-only post, if the snapshot finds the page is still live, or dropping it.
7. **Webinars W5, W7 and W8 are "Harvard in Tech Seattle" productions** (for the **owner**). Should the posts say so? That depends on the decision to hide the Seattle chapter until it has a lead.
8. **Repo size** (for the **developer**, reported back to the owner). Committing about 86 images: the snapshot prints the total. If it is over about 50 MB, keep the manifest and write-ups in the repo and move the photos to the org's shared Drive instead.
9. **Rebuild after Sept 28** (for **whoever deploys**). The site is static, so the ticket link only disappears on the first build after the event. If there is no build by then, the link lingers on a past event. See also Implementation step 7 on the date's time zone.

## Recommendations

**Webinars: where they live**

- **A. Blog posts with a `series: "webinars"` field, plus a `/webinars` listing page. ← Pick.**
  - It reuses the per-post page `src/pages/blog/[slug].astro` and the existing `embedUrl` → `src/components/Embed.astro` path. It needs one new optional field and one new page.
  - It matches the owner's "as posts" and "under webinars".
  - It keeps the original site's `/webinars` URL alive.
  - Editors already know the Blog screen in the CMS.
- **B. A dedicated `webinars` collection with `/webinars` and `/webinars/[slug]`.** This gives cleaner fields (`videoUrl`, `speakers`), but it means a new schema, a new registry entry, a second per-entry route and a new CMS card, all for 11 frozen items.
- **C. A section on `/events` (`#webinars`).** Eleven iframes on a page that already carries the Luma embed and 41 past events is too heavy, and the recordings get no page of their own.

**Archive: how it gets imported**

- **1. A generator script driven by the snapshot manifest and a hand-reviewed table of titles. ← Pick.**
  - Title cleaning needs judgment (there is no reliable place to split the sponsor list off a title). A small committed table holds that judgment, and the script applies it the same way every time.
  - Tests can check the rules, and phase 2 re-runs the same script to add images and speakers.
- **2. Writing 33 markdown files by hand.** This works once but can't be repeated, and typos slip back in.
- **3. Rendering straight from `manifest.json` with no content entries.** This is quickest, but editors couldn't correct the entries in the CMS.

**Display:** keep recent past events (2020 and later: 8 today, 9 after Sept 28) as cards. Put everything before 2020 under **Archive, 2013–2019** as one native `<details>` per year, newest first, all closed. That gives 7 fold rows instead of 33 cards. It needs no JavaScript and works with the keyboard.

## Implementation

**Phase 0: snapshot (run before cutover; nothing else depends on its timing)**

1. **`scripts/snapshot-strikingly.mjs` (new)**, a Node ESM script with no dependencies. It uses built-in `fetch`, the same shell pattern as `scripts/download-assets.mjs`.
   - It fetches `https://www.harvardintech.com` plus `/events`, `/webinars`, `/japan`, `/nyc`, `/san-francisco`, `/l-a`, `/about-us` and `/volunteers`. `--from <dir>` reads saved HTML instead.
   - Hidden sections are still present in each page's `$S.stores=` JSON, so they get parsed from there.
   - Each Strikingly image field carries `storageKey` and `format`. The download URL is `https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/<storageKey>.<format>`, and if that fails, the rendered-page form `…/upload/c_limit,fl_lossy,h_9000,w_1920,f_auto,q_auto/<storageKey>.<format>`.
   - It saves the following under **`archive/strikingly/` (new)**. That is at the repo root on purpose: outside `public/`, so it is never deployed, and outside `src/`, so Astro ignores it.

     | Path | What it holds |
     |---|---|
     | `events/NN-YYYY-MM-DD-<slug>.<ext>` | the 33 archive photos, plus `sept-28.<ext>` for the Sept 28 image (`13213024/298042_2283`) |
     | `galleries/home-events/NN.<ext>` | the shared gallery of 20 |
     | `galleries/japan/`, `galleries/nyc/`, `galleries/san-francisco/` | 9, 8 and 5 photos (L.A. is recorded as empty) |
     | `webinars/WNN.<ext>` | 10 provider thumbnails (W6 is recorded as a duplicate of W5) |
     | `pages/<path>.json` | the raw `pageData` for each page, keeping every write-up word for word |
     | `manifest.json` | one record per item (fields below) |

   - Each `manifest.json` record holds: `kind` (event, webinar or gallery), `page`, `section`, `index`, `rawTitle`, `rawSubtitle`, `text`, `linkUrl`, `videoUrl`, `thumbnailUrl`, `sourceUrl`, `file`, `bytes`, `sha256`, `w`, `h`, `publishedAt` (webinars only) and `httpStatus` (for W6's external page). The top level adds `capturedAt` and totals.
   - Behaviour:
     - It is idempotent: an existing file with the same sha256 is skipped.
     - `--dry-run` lists what would be saved.
     - It exits non-zero if any download fails, and prints counts and total MB.
2. **`src/lib/strikinglyArchive.js` (new)**, plain ESM so both the scripts and vitest can import it (the precedent is `src/lib/donorImport.js`). It has pure helpers:
   - `storeFromHtml`
   - `strikinglyImageUrl(storageKey, format)`
   - `archiveItems(pageData)`, `webinarItems(pageData)`, `galleryItems(pageData)`
   - `parseArchiveDate(rawTitle)`
   - `cleanTitleText`, `cleanWriteup`
   - `toEmbedUrl(videoUrl)`:
     - `vimeo.com/ID` → `https://player.vimeo.com/video/ID`
     - `youtu.be/ID` → `https://www.youtube-nocookie.com/embed/ID`
     - `*.wistia.com/medias/ID` → `https://fast.wistia.net/embed/iframe/ID`
     - tracking query strings are dropped (W9's `mc_cid`)
     - anything else returns `undefined`
3. Run the script, commit `archive/strikingly/`, and tick it off in the cutover runbook (`src/pages/cutover-runbook/`) as a pre-cutover step. The cutover plan owns the runbook's wording.

**Phase 1: archive text, webinars and the Sept 28 event**

4. **`archive/strikingly/curated-events.json` (new)**, the hand-reviewed table: `index → { title, location?, draft?, topicFromWriteup?, organizations[] }`. It is filled in from the Appendix table.
   - **Title cleaning rules:**
     - **T1.** Strip the leading date and its separator (`:`, `,` or a space). The date becomes `date` in `YYYY-MM-DD` form, and the ordinal typo "23nd" is read as 23rd.
     - **T2.** Remove invisible characters (U+200B, U+200E) and collapse whitespace.
     - **T3.** Move the trailing list of organisations out of the title and into `organizations` (kept for phase 2). The split point is set per item in this table and is never guessed.
     - **T4.** Keep a named headline guest in the title as "with *Name*" (for example "Fireside Chat with Andrew McLaughlin").
     - **T5.** Drop a leading "Harvard in Tech" (every event is ours).
     - **T6.** When the same series repeats within a year, add the topic from the write-up after a colon and mark it `topicFromWriteup` for the owner to review. This applies to the four 2018 Crypto + Blockchain Circles.
     - **T7.** A fixed typo table covers titles and organisations: M icrosoft, M ic, S parkNotes, LearnVes→LearnVest, Union Square Venture→Ventures, HerCampus→Her Campus, Linkedin→LinkedIn, "Circle​on", "Paxos ,Winston", and trailing `,`/`;`.
   - **Write-ups** are kept word for word, apart from invisible characters, stray spaces before punctuation, and a short listed set of typos that the owner can veto: Altcheck→Altchek, Gleuck→Glueck, "tech-in"→"teach-in", "to to", "lead by"→"led by".
   - **Venue rules:**
     - **V1.** Use a venue only where the original states one. That is 3 events: #9 "R3 offices, New York, NY", #21 "Grand Central Tech, New York, NY" and #29 "Trigger Media, New York, NY".
     - **V2.** Otherwise use "New York, NY" (pending question 3).
     - **V3.** Never infer a venue from a sponsor or host name (Work-Bench, Gunderson Dettmer and so on).
5. **`scripts/import-archive-events.mjs` (new)** reads the manifest and the curated table and writes 33 files named `src/content/events/YYYY-MM-DD-<slug>.md`. That is the existing naming convention, and each file has frontmatter only: `title`, `date`, `location`, `description`.
   - #0 gets `draft: true`.
   - The script refuses to overwrite a file whose content differs from what it would write, so hand edits made later in the CMS survive a re-run.
   - No schema change is needed in phase 1.
6. **Archive display.**
   - In **`src/lib/events.ts`**, add:
     - `ARCHIVE_BEFORE = '2020-01-01'`
     - `splitArchive(past, before)`, returning `{ recent, archive }`
     - `groupByYear(events)`, returning `{ year, events }[]` with the newest year first. It must group on `getUTCFullYear()`: date-only entries are UTC midnight, so a local-time year would push a Jan 1 event into the previous year for US visitors.
   - **`src/components/EventsArchive.astro` (new)**:
     - The heading is "Archive, 2013–2019", with the year range derived from the data.
     - One sentence of introduction.
     - Each year is `<details><summary>2018 · 9 events</summary>`. Inside is an `<ol>` of compact rows: date (for example "Aug 18"), title, location and the full write-up. No cards and no photos.
   - **`src/components/EventsPage.astro`** follows `launch--mobile-and-layout`'s sections: no Upcoming list while the Luma embed is on (the owner confirmed this after Nicole's walkthrough, 2026-09-14). The page renders, in order:
     - Past Events, showing only `recent`, through `EventsSection.astro`;
     - the mobile plan's "View all past events" link to Luma;
     - `EventsArchive`, when `archive` is not empty;
     - one line linking to `/webinars`.

     Whichever of the two plans lands second keeps this order.
   - `src/pages/events.astro` needs no change.
   - The landing page (`src/pages/index.astro`) uses only `upcoming`, so it is unaffected.
7. **Sept 28 event: `src/content/events/2026-09-28-an-elevated-evening-of-ideas-connection-and-conversation.md` (new)**.
   - Frontmatter:
     - `title: "An Elevated Evening of Ideas, Connection & Conversation"`
     - `location: "Private rooftop, Hudson Yards, New York, NY"`
     - `link: "https://hi.switchy.io/_t_t"`
     - `chapter: "nyc"`
     - `description`: condensed from the original: tabletop conversations on emerging tech, sunset views over the Hudson, 6–9 PM, light bites included, Harvard alumni only with +1s accompanied by a ticketed alum, advance registration required.
   - **Date.** Use `date: 2026-09-28T18:00:00-04:00`. With a bare `2026-09-28`, `splitEvents` would treat the event as past from 8 PM ET on Sept 27, so a build on the day itself would drop the ticket link. Check that the CMS date control keeps the time when it saves; if it doesn't, fall back to the date-only form and note the risk.
   - **"Ticket link only while upcoming"** already holds: `src/components/EventCard.astro` renders `link` only when `!isPast`. The link stays in the frontmatter as part of the record, and no code change is needed.
8. **Webinar posts.**
   - Blog schema in **`src/content/config.ts`**: add `series: z.string().optional()`.
   - **`src/data/collections.json`**: register `series` on `blog` as a `select` with the single option `webinars`, and a hint.
   - **`scripts/import-webinars.mjs` (new)** writes 11 files named `src/content/blog/webinar-<slug>.md` from the manifest.
   - Frontmatter for each post:
     - `title`: from the Appendix. Only W0 had a title on Strikingly; the rest are derived from the write-ups.
     - `date`: `publishedAt`, or `draft: true` if unknown.
     - `summary`: the speaker line.
     - `coverImage: /images/webinars/WNN.jpg`
     - `embedUrl`: from `toEmbedUrl`
     - `series: webinars`
   - The body is the full write-up as markdown; the blog body is rendered. W6 gets no `embedUrl`, just a link in the body, subject to question 6.
   - Copy the 10 thumbnails to **`public/images/webinars/` (new)**, and add records to **`src/data/media.json`** with alt text of the form "Video still from *title*".
9. **`src/lib/webinars.ts` (new)**: `webinarPosts(posts)` keeps `series === 'webinars'` and sorts newest first.
   - **`src/pages/webinars.astro` (new)** uses BaseLayout. It shows an intro and a thumbnail card grid (image, title, speakers, year) linking to `/blog/<slug>`, where the embed plays. There are no iframes on the listing page: 10 third-party players on one page is heavy and loads trackers.
   - It uses the same draft filtering as `events.astro`, via `publishedEntries` and `INCLUDE_DRAFTS`.
10. **`src/components/Embed.astro`**: add `allow="fullscreen; picture-in-picture"` and `allowfullscreen`, and use a 16:9 aspect-ratio box instead of `min-height: 400px`. This is shared with `pages`, and existing embeds only gain the ability to go full screen.
11. **Nav.** In **`src/data/nav.json`**, add Content Hub → `{ "label": "Webinars", "url": "/webinars" }` where Blog was. The blog is hidden from the menu for launch (`launch--content-and-pages`, 2026-09-14). Webinar posts are blog entries, so their `/blog/<slug>` pages still build. In **`src/lib/sitePages.ts`**, add `'webinars'` to `RESERVED_PAGE_SLUGS`, under the hand-built routes.
12. **Cross-references.**
   - `src/components/landing/FocusAreas.astro` says "Events, webinars, and podcasts across the year." That copy belongs to the **focus-areas plan**, whose audit recommendation is to remove the band. If the band stays, `/webinars` now makes the "webinars" claim true ("podcasts" still isn't), and its link could point at `/webinars`.
   - Tell the **redirects plan** that `/webinars` is now a real page and should be dropped from its redirect list. `/nyc`, `/japan` and the other old addresses stay with that plan.

**Phase 2: photos, speakers and an explicit archive flag (about 1–2 days, after phase 1 ships)**

13. **Events schema** in `src/content/config.ts`:
    - `image: z.string().optional()`
    - `speakers: z.array(z.object({ name: z.string(), role: z.string().optional() })).optional()`
    - `archive: z.boolean().optional()`
14. Mirror those three fields in `src/data/collections.json`: an `image` field, a `list` field with `name` and `role`, and a `boolean`.
15. `archive: true` replaces the `ARCHIVE_BEFORE` cutoff in `splitArchive`. The importer writes it, and an editor can archive any later event.
16. Widen `EventLike`, `EventEntryLike` and the `eventsTaggedTo` projection in `src/lib/events.ts`.
17. Display changes:
    - `EventCard.astro` shows `image`.
    - `EventsArchive.astro` rows get a thumbnail about 96px wide and a "Speakers:" line.
18. Copy the 33 photos from `archive/strikingly/events/` to `public/images/events/archive/` (new), with `media.json` alt records.
19. Speakers are extracted by hand from the write-ups into `curated-events.json`, not parsed, and then written by re-running `import-archive-events.mjs`.
20. Optionally, if the owner wants, a chapter gallery for NYC or San Francisco can use the saved `galleries/` photos. Japan's gallery is saved for the record only.

## Tests

The vitest `include` pattern is `src/**/*.test.{ts,tsx}`, so every helper lives under `src/lib`.

- **`src/lib/strikinglyArchive.test.ts` (new)**:
  - `parseArchiveDate` handles every observed form: "April 17, 2019:", "Aug 18th, 2018:", "May 23nd, 2018", "Oct 6, 2015,", "June 11, 2018 " (no colon). It returns `null` for "Future of Healthcare Tech".
  - `cleanTitleText` removes U+200B and U+200E, collapses whitespace and applies the typo table.
  - `strikinglyImageUrl('117929/DSC00341_blzqo1','jpg')` gives the custom-images URL.
  - `toEmbedUrl` covers Vimeo (with tracking params stripped), youtu.be and Wistia, and returns `undefined` for an unknown host.
  - `archiveItems` on a small fixture store gives the item count and the fields.
- **`src/lib/events.test.ts`** (extend):
  - `splitArchive` boundaries: 2019-12-31 goes to the archive, 2020-01-01 to recent.
  - `groupByYear` puts the newest year first, keeps the order within a year, and assigns a `2015-01-01` entry to 2015 even in a US time zone.
  - An empty list gives `[]`.
- **`src/lib/webinars.test.ts` (new)**: `webinarPosts` filters on `series`, ignores other posts and sorts newest first.
- **`src/lib/eventsArchiveContent.test.ts` (new)** reads `src/content/events/`:
  - There are 32 published entries dated before 2020, plus #0 as a draft.
  - No title starts with a month or a digit, and none contains an invisible character or ends in `,` or `;`.
  - Every file in `archive/strikingly/curated-events.json` maps to exactly one entry.
  - The Sept 28 file has its `link`.
  - Tests that read `src/content` at run time aren't picked up by change-based test attribution, so run the whole suite, not `--test` filtering.
- **Existing guards that must stay green:**
  - `src/data/collections.test.ts`: registry versus schema drift for `series` (and the phase-2 fields).
  - `src/lib/sitePages.test.ts`: `webinars` is reserved.
  - `src/lib/nav.test.ts`, "points every internal link at a page that exists": `/webinars` is found through `staticRoutes()`, which already scans `src/pages/*.astro`.
  - `src/lib/media.test.ts`: the new `media.json` records.

## Scenarios to Demonstrate

These are registered as scenarios for the routes and components. Astro components aren't glossary entities.

- **Events Route – Archive Folded By Year** (`/events`): the Luma embed, 3 recent past, the "View all past events" link, and archive entries across 2018, 2016 and 2013. All year folds are closed.
- **EventsArchive – 2018 Expanded**: an interactive scenario that clicks the 2018 summary and shows the rows with the full write-ups.
- **EventsPage – Archive Only, Nothing Upcoming**: there is no Recent Past block, and the archive still renders.
- **Events Route – Sept 28 Upcoming With Ticket Link** (date `@today+14d`) and **Sept 28 After It Passes** (`@today-1d`): the card sits under Past Events with no link.
- **Webinars Route – Eleven Recordings** (`/webinars`) and **Webinars Route – None Published**.
- **Blog Post – Webinar With Vimeo Embed** (`/blog/webinar-…`) and **Blog Post – Link-Only Webinar** (W6).
- **Nav – Content Hub With Webinars**.
- Extend the existing `.codeyam/scenarios/events-route-upcoming-and-past.json` and `eventspage-upcoming-and-past.json` so their seeds include archive-era entries. Their current states (no archive) must still render unchanged.

## Out of scope

- Redirects for the old addresses (`/nyc`, `/japan`, `/l-a`, `/about-us`, `/volunteers`): that is the redirects plan. This plan only makes `/webinars` real.
- Rewriting or removing the focus-areas band copy: that is the focus-areas plan.
- Re-hosting the webinar videos themselves. The embeds depend on the Vimeo, YouTube and Wistia uploads staying up. The snapshot saves the metadata only.
- Republishing the Japan gallery or any chapter gallery. It is saved for the record only.
- Tagging archive events to a chapter (question 4) and changing the "View Upcoming Events" Eventbrite button.
- Phase 2 (steps 13–20) ships separately, after phase 1.

## Appendix: the 33 archive events and 11 webinars

### A. Archive events

All are NYC era. `*` marks a pre-event invitation write-up; `†` marks a topic added from the write-up (rule T6). The raw title and organisations are kept in the manifest. The "Removed from title" column lists the organisations taken off the title by rule T3.

| # | Date | Cleaned title | Venue (V1) | Removed from title (→ `organizations`) |
|---|---|---|---|---|
| 0 | *unknown* (draft) | Future of Healthcare Tech | — | HBS Healthcare Alumni Association, Cambridge Biosciences, KindBody |
| 1 | 2019-04-17 | Tech Talk with HLS Professor Susan Crawford | — | — |
| 2 | 2018-08-18 | Summer Social | — | Handy, Her Campus, Rebag, Huge |
| 3 | 2018-08-07 | Blockchain for Good * | — | — |
| 4 | 2018-06-11 | GDPR Teach-in with Katherine Gardner | — | Gunderson Dettmer ("Summer Social" dropped) |
| 5 | 2018-06-07 | Women in Tech Panel | — | SVRF, Spring, Google, CN2 |
| 6 | 2018-05-23 | Crypto + Blockchain Circle: Smart Contracts | — | Emergent LLP, Post Oak Labs, R3, ConsenSys, DLx Law LLP |
| 7 | 2018-05-22 | A Conversation with Facebook Co-Founder Chris Hughes | — | Work-Bench, First Republic Bank |
| 8 | 2018-04-30 | Crypto + Blockchain Circle: Crypto Investment Funds † * | — | Pantera Capital, Boothbay Management, Grayscale, Outlier Ventures |
| 9 | 2018-03-20 | Crypto + Blockchain Circle: The Future of Crypto Exchanges † | R3 offices | R3, Pythagoras Investment Management, Paxos, Winston & Strawn, Circle, HBUS, NEA |
| 10 | 2018-02-07 | Crypto + Blockchain Circle: Enterprise Applications † * | — | Microsoft, R3, Crowell & Moring, Comcast Ventures |
| 11 | 2017-12-05 | Startup Law Panel * | — | Gunderson Dettmer, HIRSH Business Law, WilmerHale, Rent the Runway |
| 12 | 2017-09-28 | Fall Social | — | Mic, Foursquare, Betterment, pymetrics, NextGenVest |
| 13 | 2017-03-07 | Leaders in Engineering Panel | — | Google, LinkedIn, SparkNotes / OkCupid, betaworks |
| 14 | 2017-02-22 | Emerging Founders Breakfast with Aaron Rudenstein | — | Citymaps |
| 15 | 2016-12-01 | Emerging Founders Breakfast with Derek Flanzraich | — | Greatist |
| 16 | 2016-11-02 | Design Leaders in Tech | — | Yieldmo, Etsy, Google, LearnVest, Foossa |
| 17 | 2016-10-26 | Welcome to NYC Tech | — | Sweeten, Handy, B12, Forbes |
| 18 | 2016-08-03 | Fourth Annual Summer Social | — | Cadre, Eloquii, Mic, Sweeten, Blue Apron |
| 19 | 2016-02-03 | Fireside Chat with Marc Goodman | — | — (author of "Future Crimes") |
| 20 | 2015-11-30 | Bitcoin Panel | — | LedgerX, MIT Media Lab, Blockchain, Berkman Center, NYTimes |
| 21 | 2015-11-17 | Welcome to NYC Tech | Grand Central Tech | Hello Alfred, Mark43, Margaux |
| 22 | 2015-10-06 | Panel on Innovation and Biotech | — | Pfizer, Venrock, Piper Jaffray, Fierce Biotech |
| 23 | 2015-08-19 | Women in Tech Dinner with Jennifer Hyman | — | Rent the Runway |
| 24 | 2015-08-08 | Summer Social | — | Birchbox, Roivant, Launch, Bond Street, NYTimes |
| 25 | 2015-03-24 | Harvard Innovation | — | Glamsquad; Harvard's Chief Digital Officer |
| 26 | 2015-02-18 | Seed Stage Founders Roundtable | — | ROKO Labs, Callida Energy |
| 27 | 2014-11-18 | Transitioning into Tech | — | Union Square Ventures, Hitlist, "How To Speak Tech" |
| 28 | 2014-08-13 | Summer Social | — | Behance, Shoptiques, Mark43, Rock Health, General Catalyst |
| 29 | 2014-04-08 | Breakfast at Trigger Media | Trigger Media | — (Vanessa Liu, COO) |
| 30 | 2014-01-31 | HBS Tech Trek Mixer | — | eBay, AOL, Betaworks, Google, Foursquare, Thrive Capital, Warby Parker |
| 31 | 2013-11-21 | Fireside Chat with Andrew McLaughlin | — | Digg |
| 32 | 2013-08-13 | Summer Social | — | Paperless Post, Floored, BaubleBar, HowAboutWe |

**Events per year:**

| Year | Events |
|---|---|
| 2019 | 1 (+ #0 once dated) |
| 2018 | 9 |
| 2017 | 4 |
| 2016 | 5 |
| 2015 | 7 |
| 2014 | 4 |
| 2013 | 2 |

**Total:** 32 published plus 1 draft. With the 8 existing entries (2024–2026) that makes 41 past events, and 42 after Sept 28.

### B. Webinars (about 2020, from `/webinars`)

Only W0 had a title on Strikingly; the other titles are derived from the write-ups.

| # | Title | Speakers / host | Recording | Thumbnail |
|---|---|---|---|---|
| W0 | COVID-19 and Clean Air: How the Pandemic Has Created Opportunities for Technological Advances with Atmofizer | Prof. Dr. Gregor Luthe, Torsten Maehle | vimeo.com/516712836 | i.vimeocdn.com/video/1069926247_960.jpg |
| W1 | Telepsychiatry and Closing Access Gaps in a Crisis | Samir Malik (Genoa Telepsychiatry) | vimeo.com/413168012 | i.vimeocdn.com/video/885812709_1280.jpg |
| W2 | How COVID-19 Will Change Technology, Markets and Business | Rodrigo Salvaterra (J.P. Morgan Chase) | vimeo.com/413178887 | i.vimeocdn.com/video/885827892_640.jpg |
| W3 | COVID-19, Pregnancy Outcomes and Telemedicine | Dr. Eduardo Vadia, Dr. Sina Haeri (Access Physicians) | ourgroundswell.wistia.com/medias/46kd8ic53q | embed-ssl.wistia.com/deliveries/4948bfeb… |
| W4 | Cybersecurity in the Supply Chain | Jim Fleming (ISM), Charlotte de Brabandt | christinelenzo.wistia.com/medias/i3xpv4s280 | embed-ssl.wistia.com/deliveries/417d2750… |
| W5 | EduTech Solutions to COVID-19 | Prof. Mark Esposito; Harvard in Tech Seattle | youtu.be/S4c48202-D8 | i.ytimg.com/vi/S4c48202-D8/hqdefault.jpg |
| W6 | COVID-19 Testing, Telehealth and Data-Driven Solutions | Dr. David Stark, Nathaniel T. Bradley (Parallax; hosted by Proactive Investors) | external page only: goodhealthoutcomes.com/prlx_harvard_webinar | duplicate of W5's (not used) |
| W7 | Reopening the Economy During COVID-19 | Mayor Kate Gallego of Phoenix; Harvard in Tech Seattle | youtu.be/NbIq-FBp_A8 | i.ytimg.com/vi/NbIq-FBp_A8/hqdefault.jpg |
| W8 | COVID-19: Is Telemedicine the Future of Health Care? | Greg Jarzabek, Myra S. White, Hassaan Ebrahim, Debbi Gillotti, Chad Hiner, Roger Hackett, Mahenoor Yusuf; Harvard in Tech Seattle | youtu.be/kcjF1y6kcco | i.ytimg.com/vi/kcjF1y6kcco/hqdefault.jpg |
| W9 | Interfaith Webinar: Finding Moral Strength in a Crisis (with the COVID Foundation) | Greg M. Epstein, Lama Rod Owens, Rabbi Jonah C. Steinberg, Pat and Tammy McLeod, Sana Shareef | vimeo.com/422004140 (tracking params stripped) | i.vimeocdn.com/video/897847210_640.jpg |
| W10 | Media and Technology in Growth Markets | Marcus Brauchli (North Base Media) | vimeo.com/418466741 | i.vimeocdn.com/video/893045735_295x166.jpg |