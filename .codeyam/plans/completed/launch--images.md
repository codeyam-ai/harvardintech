---
title: "launch -- Images"
mode: ui
createdAt: "2026-09-14T17:29:07Z"
prefix: "launch"
order: 5
source: manual
---

## Summary

Make every photo on the site true, sharp, and fast before launch, in five parts that each ship alone:

- **A**: quick wins using files already in the repo. These are content edits only.
- **B**: sourcing asks, one list per person.
- **C**: the share and icon kit (favicon, og:image with an absolute URL, footer icons).
- **D**: responsive images (a sharp-built srcset) and performance.
- **E**: cleanup (unused files, duplicates, a licence ledger, logo permission).

Re-verified on disk on 2026-09-14:

- The testimonial photos `event-07` and `event-11` are both 200×200 shared-gallery shots.
- `gallery/91e99da2-9e81-4620-815f-0fc1f87c9eb9-1-105-c.webp` is 1024×768, and `media.json` captions it as an engineering panel. No page uses it.
- `event-05` is byte-identical to `event-03` (MD5 check).
- **New finding:** `event-19` is byte-identical to `event-04`. The homepage 40-photo wall shows two duplicate pairs.
- `chapters/nyc.jpg` is 550×367. `bg/get-involved-bg.jpg` is 2000×1125.
- Board PNGs are 140×140. `BoardMemberCard.astro` renders them at 120px, and 2× screens need 240px.
- `public/favicon.svg` is a blue square with a circle, and no shell links it.
- `SEO.astro` outputs `og:image` exactly as passed, so a relative `/images/...` path goes out as-is.
- No Alumni Day photo exists in the repo. The only match is the Luma listing `src/content/events/2026-06-05-harvard-alumni-in-tech-alumni-day-meetup-in-cambridge-ma.md`, which has no image.

## Owner decisions (2026-09-18, at the confirm gate)

- **Plan approved** — prototyping starts with the Part A content swaps.
- **Q2 (duplicate tiles): YES.** Drop `event-05` and `event-19` from the homepage wall, taking it from 40 tiles to 38 (E3).
- **Q1 (sponsor photo): SUPERSEDED.** The owner did not pick either offered option. Their answer: *"You have access to the drive with photos; I want sharp real photos that are visually distinct."*
  - So the sponsor banner does NOT reuse Jessica's testimonial photo, and it does not keep `event-13` either.
  - Instead, source real photos from Nicole's shared Drive folder **"Website Images"** (`14OXfiC4i1U_IAHA9ClM2AT0xpXiflGy6`, shared 2026-09-16), and give each surface a visually distinct one.
  - Folder contents as of 2026-09-18: 17 PNGs, 2.8-11 MB each - `SF Engineering Panel`, `SF Attendees` x5, `SF` / `SF (1)` / `SF (2)`, `Campus` / `Campus (1)`, `Founders` x3 + `Founder`, `Untitled design (4)`. Two of the `SF Attendees` files share a byte size and are probably duplicates.
  - **Consequence for Part A:** A is no longer "content edits only; no new files". Importing these adds files under `public/images/` plus `media.json` records. The A steps that pointed at existing repo files are re-pointed at imported Drive photos where one is a better fit, and each surface must get a DIFFERENT photo.

### Drive sourcing outcome (2026-09-18)

Downloaded to `scratchpad/drive/img/`, ready to import. **All ten are 3300x1856 (16:9)** - above the 2400px Nicole targeted, and already banner geometry.

| # | File | What it shows | Best use |
|---|---|---|---|
| 1 | `Founder__1Pn6AZ` | Two men in front of a Founders speaker slide (Polli / Peeler / Altchek); the harvardintech handle is visible | Founders community |
| 2 | `Founders__1ct2K4` | Speaker with a mic beside a moderator, panel slide behind; dimmer | Founders, second choice |
| 3 | `Founders__1d6YzT` | Three people smiling at a crowded reception, lots of life behind them | /donate closing band |
| 4 | `Founders__1pA4oR` | Two men, warm close portrait | testimonial / portrait slot |
| 5 | `SF_1__1LGKfx` | Seven women lined up along a brick wall, bright and sharp | SF chapter banner |
| 6 | `SF_Attendees__1VzJwT` | Tight close-up of two women | portrait slot, NOT a banner |
| 7 | `SF_Attendees__1f93Bj` | Three women, close crop | portrait slot |
| 8 | `SF__1QXttk` | **Wide room shot** - seated audience, brick, tall windows, plants | /sponsor banner (best banner in the set) |
| 9 | `SF_attendees__1XfMS6` | Three women around a phone, candid | give collage |
| 10 | `Untitled_design_4__1E7Uq1` | Stage panel, eight seated, SUMMER SOCIAL 2016 slide | wide banner, but dated 2016 |

**Six files could NOT be fetched** - the Drive connector hard-caps downloads at 10 MB and reliably times out above ~5.3 MB:
- `SF Engineering Panel` (6.99 MB) - wanted for Jessica Li's testimonial. Fall back to the repo's existing `gallery/91e99da2-...webp` (1024x768), as originally planned.
- `Campus.png` (11.19 MB, over the hard cap) and `Campus (1).png` (8.93 MB) - these are Harvard campus shots and would have been the **ideal Boston/Cambridge banner**. Boston therefore keeps `bg/hero-bg.jpg` per A9.
- `SF (2).png` (9.17 MB), `SF Attendees` (10.15 MB), `SF Attendees` (8.19 MB).
- To get these, someone must re-export them under ~5 MB into the same folder, or attach them directly.

**Discipline note:** every downloadable photo is from an SF or Founders event. They may go on SF surfaces and on non-geographic surfaces (sponsor, donate, give, communities). Putting one on Boston, DC, Seattle, London or NYC would recreate the exact wrong-city problem this plan exists to fix - those keep the text header per A8.

## Owner decisions (2026-09-14)

- **Quick image fixes: Plan it.** Note on Mohammed Ally's testimonial: "For the photo - why is it miscaptioned? We should have a photo of him if possible?"
  - Answer: `src/content/testimonials/mohammed-ally.md` sets `eventPhoto: /images/gallery/event-11.jpg`, a 200px generic stage shot (panellists under a "harvardintech" sign) from the shared gallery. The caption "HIT Colorado Co-working Afternoon · Improper City" was typed as a placeholder; the file's own body says "The event photo is also a PLACEHOLDER".
  - He has no portrait on file.
  - Action: remove the event photo now, so the card renders the quote full-width (a supported state). Ask Mohammed for a portrait and a real Colorado photo (B3).
- **Jessica Li testimonial: Change.** Note: "Use the correct photo." Her card will use the 91e99da2 SF engineering-panel webp.
- **Wrong-city banners, headshots, photo requests, share images and favicon, faster loading, licences, logo permission (the Veritas shield, ask the HAA), social icons, the stock volunteer photo, and unused files: Plan it (all).**
- **Boston:** the owner asked separately that Boston use "the alumni day picture". The repo has none, so this is a sourcing ask to Aimee (B1). The banner slot is prepared here; the chapters plan owns the copy.
- **Communities (AI, Founders) and forming chapters (DC, Seattle)** get their own page formats in another plan. Here their image slot is optional, and a text header renders when there's no photo.
- **Nicole's walkthrough (2026-09-14).** The London, AI and Founders banners are blurry, and Nicole is replacing them herself through the content editor.
  - She resized photos from Harvard in Tech's Facebook page to 2400 × 1350.
  - She is collecting them in the "HIT Marketing Internal → Website images" folder.
  - She asked what size is needed; the answer is under Part B.

## Open questions / needs input

1. **Owner:** should `/sponsor` reuse the same SF panel photo as Jessica's testimonial, or keep `event-13` until the photographer delivers? My pick is to reuse it, because it's the only real, sharp event photo we have.
2. **Owner:** on the homepage wall, may we drop the duplicate tiles (`event-05`, `event-19`)? That takes the wall from 40 photos to 38 (E3).
3. **Jessica Li:** is 91e99da2 really the "Leaders in Engineering · San Francisco" event? The media alt text supports it, but nobody has confirmed it.
4. **Owner:** who are the DC, Seattle and London leads? No lead names are in the repo. The asks in B1 are addressed by role until then.
5. **Owner and the HAA:** until the HAA answers, may the header keep `harvard-shield.png` (E5)? It's in the nav on every page.
6. **Designer:** is a crimson "HIT" monogram acceptable as the favicon, so the icon never depends on the shield decision?

## Recommendations

**Delivery of responsive images (D).**

| Option | Summary | Verdict |
|---|---|---|
| (a) Astro `astro:assets` `<Image>` | Needs images imported from `src/`. The CMS writes string paths into `public/images`, and Astro never processes `public/`. It would mean moving the library and changing the CMS contract. | Rejected |
| (b) Re-encode originals only, plus `width`/`height`/`loading` | Cheap, and it saves most of the bytes on the three big JPEGs. Phones still download 2000px heroes. | Included in A as step 10 |
| (c) Build-time sharp script | Runs before `astro build`. Emits width variants for every raster in `public/images` into a gitignored folder, plus a manifest. A `<ResponsiveImg>` component adds `srcset` when a variant exists and falls back to the plain `src` otherwise. It works for CMS uploads with no CMS change, and dev keeps working with no manifest. | **Pick** |

Why (c): it's the only option that covers images Nicole uploads later. It keeps the CMS's string-path model, and it degrades to today's markup when anything is missing. The step 10 re-encode from (b) ships first, because it's free and it also shrinks the originals that (c) falls back to.

**Pages with no photo.** Clear `heroImage`. `ChapterHero.astro` already falls back to `ChapterHeader`, a text header, so no new component is needed. The alternative, a generic skyline per city, repeats the wrong-city problem.

## Implementation

### Part A: quick wins with existing files (content edits only; no new files)

1. `src/content/chapters/nyc.md`:
   - Set `heroImage: /images/bg/get-involved-bg.jpg`.
   - Remove the 200px `photos` rows `event-07`, `event-09` and `event-11`, leaving 11 photos.
2. Jessica's testimonial, `src/content/testimonials/jessica-li.md`:
   - Set `eventPhoto: /images/gallery/91e99da2-9e81-4620-815f-0fc1f87c9eb9-1-105-c.webp`.
   - Keep the caption.
   - Delete the "PLACEHOLDER" paragraph.
3. Mohammed's testimonial, `src/content/testimonials/mohammed-ally.md`:
   - Delete `eventPhoto` and `eventCaption`.
   - Rewrite the body note to say "awaiting a portrait and a Colorado photo (see the images plan)".
4. Sponsor banner: set `heroImage` to the 91e99da2 webp in both `src/content/sponsorPage/sponsor.md` and `src/data/sponsorPage.json`.
   - Both are needed because `src/lib/pageCopyMerge.ts` falls back to the JSON whenever the markdown value is blank.
5. `/donate` closing photo: set `ctaImage: /images/hero/hero.jpg` in both `src/content/pageCopy/donate.md` and `src/data/donatePage.json`.
6. `/give` collage in `src/data/givePage.json`: replace `event-05` with `event-21`, which gives six distinct photos.
   - Mirror the change in `src/pages/isolated-components/GiveCollage.astro`.
7. Gallery switch-off: add `showGallery: false` to these files, so none of them shows the shared NYC-era wall:
   - `src/content/chapters/boston-cambridge.md`, `dc-dmv.md`, `london.md`, `seattle.md` and `sf-bay-area.md`
   - `src/content/communities/ai.md` and `founders.md`
8. Photo-less headers:
   - Delete `heroImage` from `ai.md` and `founders.md` (communities), and from `dc-dmv.md`, `seattle.md` and `london.md` (chapters).
   - Reasons: DC and Seattle show NYC events, and London shows a duplicate of `event-03`.
   - These pages then render the text `ChapterHeader`.
   - Skip any of these whose `heroImage` Nicole has already replaced with one of her new photos (see Owner decisions). Clear only the ones still pointing at the old wrong-city or duplicate image.
9. Boston banner slot: `boston-cambridge.md` keeps `heroImage: /images/bg/hero-bg.jpg`, a Harvard campus facade that is correct for Boston.
   - Add a body comment naming the slot, "replace with Alumni Day photo from Aimee", so B1 is a one-field swap.
10. Re-encode the three big JPEGs that pages use with a one-off `node` + sharp command (mozjpeg, quality 78, longest edge kept at 2000px), and update their `sizeBytes` in `src/data/media.json`:
    - `bg/hero-bg.jpg` (605 KB)
    - `bg/get-involved-bg.jpg` (489 KB)
    - `chapters/san-francisco.jpg` (298 KB)
    - `chapters/japan.jpg` (751 KB) is unused and gets deleted in E instead.

### Part B: sourcing asks, one list per person (no code; each delivery is an A-style swap)

Delivery spec for every photo: the original file, landscape at 2400px or more on the long edge for banners, and a note that says who took it and whether we may use it (this feeds E4). Uploads can go through /admin; the CMS converts them to WebP at 2048px or less.
- **Check before relying on that last sentence.** A search of `node_modules/@codeyam/cms/src` on 2026-09-14 found no image resizing or WebP conversion, so uploads may ship at exactly the size uploaded. The build-time variants in D (option c) are what actually make phone-size copies.

**Answer for Nicole's size question (2026-09-14).**
- 2400 × 1350 (16:9) is right for a banner. Upload it as it is; the build makes the smaller copies phones need (D).
- Banners fill the whole first screen and crop to fit: heavily at the sides on a phone, and at the top and bottom on a wide monitor. Keep the subject near the middle.
- For photos taken from Facebook, note who took each one and whether we may use it (E4).

1. **Chapter leads:**
   - **Aimee (Boston):** the Alumni Day photo from the 2026-06-05 Cambridge meetup, which goes into the `heroImage` of `boston-cambridge.md`. Also 6–12 Boston event photos for a curated `photos` list (then `showGallery` can come back).
   - **DC, Seattle and London leads:** one real banner from a local event, and any event photos. Until one arrives, the text header stays.
   - **SF lead:** confirm the panel photo is from the SF event (Q3), plus more SF event photos.
   - **NYC lead:** larger originals of the gallery shots, which are 400px today.
2. **The board** (Ben Wei, Jessica Li, Krysia Lenzo, Nadia Eldeib, Peter Boyce): a square headshot, 600×600 or larger, with a plain background and **no circle crop**, which CSS applies. It replaces `public/images/team/*.png`.
3. **Mohammed Ally:** a portrait for the testimonial `photo` field, and one real photo of the Colorado co-working afternoon at Improper City, with his OK on the caption.
4. **Jessica Li:** a larger portrait. The 140px board PNG doubles as her testimonial `photo`. She also answers Q3.
5. **Designer:** the C kit:
   - an SVG favicon and a 180×180 apple-touch PNG
   - a 1200×630 default share card (wordmark over the NYC skyline, **no Veritas shield** until E5 clears)
   - a white/crimson treatment check of the brand SVG icons
6. **Photographer (next NYC event):**
   - wide room shots and speaker shots, for banners and the sponsor page
   - volunteers at work, to replace the stock `volunteers.webp`
   - consent recorded per E4

### Part C: share and icon kit

1. `src/lib/seo.ts` (new): `absoluteImageUrl(image, site, base)`.
   - Returns `null` for empty input, and passes `http(s)://` URLs through unchanged.
   - Otherwise resolves `withBase`-style against `Astro.site`, so `/images/og/default.jpg` becomes `https://…/harvardintech/images/og/default.jpg`.
2. `src/components/SEO.astro`:
   - Output `absoluteImageUrl(image ?? DEFAULT_OG_IMAGE, Astro.site, import.meta.env.BASE_URL)` for `og:image` and `twitter:image`.
   - Add `og:image:width` and `og:image:height` (1200×630) when the default is used.
   - Always output `summary_large_image`.
3. `public/images/og/default.jpg` (new, 1200×630):
   - Interim: a sharp crop of `bg/get-involved-bg.jpg`.
   - Replaced by the designer card from B5.
   - Add a record to `src/data/media.json`, so the CMS library shows it.
4. `src/components/HeadExtras.astro` is the partial that every shell includes (`BaseLayout.astro`, `BlogPostArticle.astro`, `404.astro`, `cutover-runbook/[...path].astro`). Add:
   - `<link rel="icon" type="image/svg+xml" href={withBase('/favicon.svg')}>`
   - `<link rel="apple-touch-icon" href={withBase('/apple-touch-icon.png')}>`
5. Replace `public/favicon.svg` with a crimson "HIT" monogram (Q6), and add `public/apple-touch-icon.png` (new, 180×180).
6. Footer social icons:
   - Switch `src/components/ChapterConnect.astro` from `socialIconSrc` (the teal Strikingly PNGs) to `brandIcon()` from `src/lib/brandIcons.ts`, rendered as inline SVG exactly as `src/components/landing/ContactUs.astro` does.
   - Then delete `src/lib/socialIcon.ts`, `src/lib/socialIcon.test.ts` and `public/images/social/*` (4 files), and their `media.json` records.

### Part D: responsive images and performance

1. Add `sharp` to `devDependencies` in `package.json`. It's only transitive today (0.34.5 in `node_modules`). The owner or CI runs `npm install`; this plan runs no npm.
2. `scripts/responsive-images.mjs` (new):
   - For each `.jpg`, `.png` and `.webp` in `public/images` wider than 640px, write `public/images/_r/<path>-<w>.webp` at widths 640, 1280 and 1920, skipping any width at or above the original.
   - Write `src/data/responsiveImages.json` (new, generated), mapping each source to its widths.
   - Skip work when the output is newer than the source.
3. Add `public/images/_r/` and `src/data/responsiveImages.json` to `.gitignore`. Prefix `scripts.build` in `package.json` with `node scripts/responsive-images.mjs &&`. `.github/workflows/deploy.yml` already runs `npm run build`, so it needs no change.
4. `src/lib/responsiveImage.ts` (new), pure logic:
   - `variantWidths(originalWidth)`
   - `srcsetFor(src, manifest, base)`: returns `null` for SVGs, for unknown files, or when no manifest exists (dev)
   - `readResponsiveManifest()`: returns an empty manifest when the file is absent
5. `src/components/ResponsiveImg.astro` (new):
   - Wraps `<img>` with `srcset`, `sizes`, `width`, `height` (from `media.json`) and `decoding="async"`.
   - `loading` is set by the caller: `eager` for heroes, `lazy` everywhere else.
6. Swap raw `<img>` for `ResponsiveImg` in:
   - `ChapterHero.astro`
   - `landing/Hero.astro` and `landing/HeroCarousel.astro`
   - `donate/TestimonialCard.astro` and `donate/MomentumHero.astro`
   - `sponsor/SponsorHero.astro`
   - `give/GivePhoto.astro`
   - `landing/GalleryTile.astro`
   - `BoardMemberCard.astro`

   The markup and CSS stay the same apart from the `srcset` attributes.

### Part E: cleanup

1. Delete the 12 files that no page uses today, with their `src/data/media.json` records:
   - `sections/board-logo.png`, `sections/board-wordmark.png`, `sections/whatsapp.jpeg`
   - `chapters/la.jpg`, `chapters/japan.jpg`
   - `support/{briefcase,chat,quote,star,trophy}.png`
   - After A: `chapters/nyc.jpg`
2. **Keep** `sections/board.png` and `sections/whatsapp-banner.jpg`. The volunteer scenarios in `.codeyam/scenarios/volunteer-*.json` and the `isolated-components/Volunteer*.astro` pages use them as fixtures.
   - Repoint the strings in `src/components/landing/landing-images.test.ts` from `whatsapp.jpeg` to `whatsapp-banner.jpg`.
   - Remove the `support/` fetches from `scripts/download-assets.mjs`.
3. De-duplicate the homepage wall (if Q2 is a yes):
   - In `src/components/landing/EventGallery.astro`, build `defaults` from 1..40 excluding 5 and 19.
   - Delete `gallery/event-05.jpg` and `gallery/event-19.jpg`, with their records.
   - Update `src/pages/isolated-components/GalleryTile.astro` only if it points at one of those two.
4. Licence ledger, `src/data/imageCredits.json` (new): one row per committed image, with `source` (own-event, stock-licensed, haa-permission, unknown), `credit` and `licence`.
   - `volunteers.webp` is recorded as `unknown` (doctored stock art).
   - Remove it from `src/content/projects/social-media-marketing-specialist-events.md` (`image` and `ogImage`). The project is `draft: true`, and `VolunteerProjectThumb.astro` and `VolunteerProjectPhoto.astro` already render without an image. Then delete the file.
5. Logo permission:
   - Draft the ask to the HAA (owner sends it) for use of the Veritas shield by a Shared Interest Group, as it appears in `BaseLayout.astro` (`harvard-shield.png`, 26px nav mark).
   - Record the answer in `imageCredits.json`.
   - If refused, swap the nav mark for the C5 monogram. That's a one-line change in `BaseLayout.astro`.

## Tests

Register each new test file before `prove-red` so it can see it.

- `src/lib/contentImages.test.ts` (new) reads `src/content/**/*.md` and `src/data/*.json` from disk, the same way as `chapter.photos.test.ts`, skipping `media.json`. It asserts that:
  - every `/images/...` path it references exists under `public/`
  - no two `givePage.json` collage entries are byte-identical (MD5 via `node:crypto`)
  - every chapter and community `heroImage`, when set, is at least 1600px wide (sharp `metadata()`), which fails on today's 550px `nyc.jpg`
  - every chapter without a curated `photos` list sets `showGallery: false`
  - `mohammed-ally.md` has no `eventPhoto` until a real one lands, so the placeholder can't come back silently
- `src/lib/seo.test.ts` (new), for `absoluteImageUrl`:
  - a root path plus the `/harvardintech/` base plus a site gives an absolute https URL with no `//`
  - an absolute URL passes through unchanged
  - empty input gives `null`
- `src/lib/responsiveImage.test.ts` (new):
  - `variantWidths(550)` is empty and `variantWidths(2000)` is `[640,1280,1920]`
  - `srcsetFor` gives a correct `w` descriptor string with the base prefix
  - it returns `null` for SVGs and for missing manifest entries
- `src/lib/siteIcons.test.ts` (new):
  - `public/favicon.svg` exists and no longer contains the placeholder `#0066cc`
  - `public/apple-touch-icon.png` is 180×180
  - `public/images/og/default.jpg` is 1200×630
- `src/lib/imageCredits.test.ts` (new):
  - every ledger row names a file that exists
  - every row has a `source`
  - no content file references an image whose `source` is `unknown`
- Existing tests:
  - `src/lib/team.photos.test.ts`: once B2 lands, add "headshot is at least 480px square".
  - `src/lib/socialIcon.test.ts` is deleted with its module (C6).
  - `src/lib/brandIcons.test.ts` already covers the icons `ChapterConnect` will use.

## Scenarios to Demonstrate

Content edits don't make screenshots go stale, so recapture with `--target --force`. Capture twice to rule out the webfont race, and screen every changed PNG for wrong-page frames.

- `/donate` impact band (`momentum-fund-the-impact-band-with-real-quotes`): Jessica with the SF panel photo; Mohammed's quote full-width with no photo.
- `/donate` closing band with `hero/hero.jpg`.
- `/sponsor` hero with the panel photo.
- `/give` collage: six distinct photos.
- `/chapters/nyc`: sharp skyline banner, and an 11-photo gallery with no blurry tiles.
- `/chapters/dc-dmv`, `/chapters/seattle`, `/chapters/london`, `/communities/ai`, `/communities/founders`: text header, no gallery.
- `/chapters/boston-cambridge` and `/chapters/sf-bay-area`: photo banner, no shared gallery.
- Chapter "Connect With Us" footer with the brand SVG icons, replacing the teal PNGs.
- The homepage wall with 38 tiles (only if Q2 is a yes), matching the `event-gallery` scenario.
- The browser tab shows the new favicon. A link unfurl (for example, a LinkedIn post inspector) shows the default card.

## Out of scope

- Page formats for communities and forming chapters (another plan). This plan only leaves their image slot optional.
- Boston page copy and chapter content (the chapters plan). This plan only prepares the banner slot.
- Changing the CMS upload pipeline (`node_modules/@codeyam/cms/src/lib/imageCompression.ts`) or moving the library into `astro:assets`.
- Video (`public/videos/`), the design-review mockups under `public/design-review-4ece6c14/`, and `public/donor-network.html`.
- Re-shooting or retouching photos. B asks people for them; this plan does not produce them.

## Build log — Part A complete (2026-09-18)

Nine photos imported from Nicole's Drive folder into `public/images/events/` as WebP,
2048px on the long edge, 65-176 KB each, all registered in `media.json` with real alt text.

**Banner crops.** The first import at a straight 16:9 rendered *badly*: the hero band is far
wider than 16:9, so it cropped to the ceiling of the room and showed ductwork instead of
people. The three full-bleed banners are therefore re-cropped to 2.4:1 using sharp's
attention strategy, which centres the subject. Anything that later becomes a hero needs the
same treatment — a plain 16:9 resize is not enough.

Placed, each surface getting a different photo:
- `/sponsor` hero -> `events/sf-event-room.webp` (speaker + seated room)
- `/chapters/sf-bay-area` hero -> `events/sf-group-brick-wall.webp`
- `/communities/founders` hero -> `events/founders-summit-pair.webp`
- `/donate` closing band -> `events/founders-reception-trio.webp`
- Jessica Li's testimonial -> `events/sf-attendees-three.webp`, caption relaxed to
  "Harvard in Tech · San Francisco" because the specific SF event is still unconfirmed (Q3)

Also done: Mohammed Ally's placeholder photo and caption removed; `/chapters/nyc` re-pointed
at `bg/get-involved-bg.jpg` with the three 200px tiles dropped; `showGallery: false` on
Boston, DC, London, Seattle, SF and both communities; `heroImage` cleared on DC, Seattle,
London and AI so they render the text header; Boston keeps the campus facade with a comment
naming the swap; give collage `event-05` -> `event-21`; `hero-bg.jpg` 591->324 KB and
`get-involved-bg.jpg` 477->282 KB re-encoded; `media.json` byte sizes resynced.

### Two traps worth remembering

1. **The JSON wins over the markdown.** Editing only `sponsor.md` changed nothing —
   `src/data/sponsorPage.json` is what renders. Both must be edited, as the plan said.
2. **The content sandbox masks content edits.** `.codeyam/tmp/content-sandbox-active/` held a
   stale snapshot and kept serving `event-13` through two dev-server restarts. It had to be
   deleted (backed up to the scratchpad first) before edits appeared. After any `src/content`
   or `src/data` edit: clear that directory, then restart the dev server — HMR alone does not
   do it, and the preview will lie to you convincingly until you do.

### Correction to Part E

E1 says delete `chapters/nyc.jpg` once A re-points the NYC hero. **Do not** — it is still a
fixture in four isolated-component pages (`VolunteerProjects`, `VolunteerProjectCard`,
`VolunteerProjectThumb`, `[name].astro`). It was dropped from A10's re-encode list too.

*(Correction to the sentence that stood here earlier: `chapters/san-francisco.jpg` was NOT
"genuinely unused" — it was also a fixture in `[name].astro`. It only became safe to delete
after that fixture was re-pointed at the new SF photo, which Part E below does.)*

## Build log — Parts C, D and E complete (2026-09-18)

**Part C — share and icon kit.** `src/lib/seo.ts` adds `absoluteImageUrl`, and `SEO.astro`
now emits absolute `og:image` / `twitter:image` for *every* page (a default card when the page
names none), plus `og:image:width/height` and an unconditional `summary_large_image`.
`public/images/og/default.jpg` is a 1200x630 attention crop of the get-involved background,
interim until the designer's card. `favicon.svg` is a crimson HIT monogram — deliberately not
the shield, so the tab does not wait on the HAA — with a 180x180 `apple-touch-icon.png`
rendered from it; both are linked from `HeadExtras.astro`, which every shell includes.

The one thing to know about `absoluteImageUrl`: it deliberately does **not** reuse
`canonicalFor`. A canonical URL names where a page is *advertised* (harvardintech.com) and
strips the base path; a share image must name where the file is *fetchable*, which until the
cutover is `codeyam-ai.github.io/harvardintech/`. Verified against the deploy env: production
emits `https://codeyam-ai.github.io/harvardintech/images/og/default.jpg`. In dev it shows
harvardintech.com only because `PAGES_SITE` is unset there.

C6 was already half-done — `ChapterConnect` uses `brandIcon()` and `socialIcon.ts` was gone.
Only the four teal PNGs remained; they are deleted.

**Part D — responsive images.** `scripts/responsive-images.mjs` renders 640/1280/1920 WebP
variants into `public/images/_r/` and writes `src/data/responsiveImages.json`; both gitignored,
and `npm run build` runs the script first. `responsiveImage.ts` is the pure half (srcset +
intrinsic size), `responsiveManifest.ts` reads the file, `ResponsiveImg.astro` renders the tag
and forwards unknown props (`Hero.astro` needs `data-parallax` to survive). Swapped in at
ChapterHero, landing Hero + HeroCarousel, GalleryTile, SponsorHero, GivePhoto and
donate/TestimonialCard.

The manifest carries `{width, height, variants}` rather than the plan's bare width list,
because `media.json` records only `sizeBytes` and the tag needs intrinsic dimensions to
reserve layout space. The build step already pays for the `metadata()` call.

Measured: the hero's 640px variant is 43 KB against 324 KB for the original — about 7x less
on a phone. Everything degrades to a plain `<img>` when the manifest is absent, which is the
normal state in dev.

**Part E — cleanup.** Eleven files deleted, each guarded by a reference check first:
`board-wordmark.png`, `la.jpg`, `japan.jpg`, `san-francisco.jpg`, the five `support/*.png`,
and the two duplicate tiles. The homepage wall is 38. The duplicates could be removed without
any visual change because every reference was re-pointed at its byte-identical twin
(`event-05` -> `event-03`, `event-19` -> `event-04`) — including three the plan did not
list: `GalleryLightbox.astro`, the London fixture in `[name].astro`, and `nyc.md`'s own photo
list. `media.json` is down to 71 entries; the support-icon fetches are out of
`download-assets.mjs`; `src/data/imageCredits.json` carries all 71 rows (65 own-event,
1 haa-permission, 5 unknown); and the unlicensed `volunteers.webp` is off the draft project
entry. The HAA ask is drafted at `.codeyam/plans/haa-shield-permission-ask.md`.

### Deferred at the prototype stage, DONE at the TDD step

Deleting `sections/whatsapp.jpeg` and `volunteers.webp` was held back from Part E because
both needed test-file edits, which are not allowed before the Demo gate. Both are now gone:

- `whatsapp.jpeg` had one real reference, the fixture list in `landing-images.test.ts`,
  re-pointed at `whatsapp-banner.jpg` exactly as E2 said.
- `volunteers.webp` was harder than the plan assumed, and the plan's stated reason for
  deleting it was not the blocking one. It is the only **square** image in the repo, and
  three isolated-component pages use it deliberately: `VolunteerProjectPhoto` exists to
  demonstrate the square case that the component's `max-height` bound was written for.
  Deleting it outright would have removed the only fixture for that state. So a licensed
  replacement was made instead — `events/sf-attendees-square.webp`, a 1152x1152 attention
  crop of our own `sf-attendees-two.webp` — the three fixtures re-pointed at it, and only
  then was the stock art deleted.
  (The remaining `volunteers.webp` strings in `mediaCommitGuard.test.ts` and
  `projects.test.ts` are synthetic fixture data for pure functions; they never touch disk.)

The ledger is now 70 rows: 66 own-event, 1 haa-permission (the shield), and 3 `unknown` —
all three `sections/*` fixtures that no content file references, which is what
`imageCredits.test.ts` enforces.

### Deleting an image is not finished when `src/` is clean

Every deletion above was reference-checked against `src/` and `scripts/` first, and that
still was not enough. `recapture-stale` then failed on four scenarios with
`404 /images/gallery/event-19.jpg`, because **`.codeyam/scenarios/*.json` carry their own
seed copies of the content** — a chapter's `heroImage`, a chapter's `photos` list — and those
copies are not reached by a grep of the source tree.

Twelve scenario files were pinning deleted images: nine on `event-05`/`event-19`, five on
`chapters/san-francisco.jpg`, three on `volunteers.webp` (some overlapping). All were
re-pointed the same way the source was — to the byte-identical twin, or to the licensed
replacement — so no capture changes appearance.

**So: before deleting any image, grep `.codeyam/scenarios/` as well as `src/`.** The failure
does not appear at build time, at test time, or in `verify-images`; it appears much later as a
capture failure, once the expensive recapture pass is already running.

## Extraction plan (Deconstruct, 2026-09-18)

1. **`src/components/SiteIcons.astro`** — extract the two `<link>` tags (favicon,
   apple-touch-icon) out of `HeadExtras.astro`. That file is a composition-only
   component — it assembles `PreviewGate`, `Analytics`, `StructuredData` and
   `GivebutterWidgets` — and Part C added raw markup beside them. The icons are a
   distinct concern and should be a sub-component like every other thing in there.

2. **`src/lib/responsiveImageVariants.mjs`** — extract the shared variant contract.
   This is the one with teeth. `scripts/responsive-images.mjs` (the WRITER) and
   `src/lib/responsiveImage.ts` (the READER) each currently carry their own copy of
   two things: the width list `[640, 1280, 1920]`, and the
   `images/_r/<path>-<w>.webp` filename formula. Nothing ties them together. If
   either drifts, every `srcset` on the site points at files the build never wrote —
   and the failure is invisible: the HTML looks perfect, the `src` fallback still
   loads, and only a network panel shows every candidate 404ing.
   - Move `VARIANT_WIDTHS`, `variantWidths()` and `variantPath()` into a plain
     `.mjs` so the node build script can import it directly.
   - `responsiveImage.ts` imports and re-exports them, so its public API is
     unchanged. `allowJs: true` (inherited from `astro/tsconfigs/base`, confirmed)
     makes the `.ts` -> `.mjs` import legal.
   - The script then imports the same module instead of redefining both.

3. **No splits needed.** `ResponsiveImg.astro` renders a single `<img>` and is
   already atomic. `SEO.astro` is a flat list of `<meta>` tags; splitting a meta
   block into sub-components would add indirection with no seam behind it.

4. **No page-file extraction needed.** This feature added no JSX to any page file —
   the `src/pages/isolated-components/*` edits changed fixture data only.

Already pure and correctly separated, nothing to do: `absoluteImageUrl` +
`DEFAULT_OG_IMAGE*` (`seo.ts`); `srcsetFor`, `intrinsicSize` (`responsiveImage.ts`);
`readResponsiveManifest` (`responsiveManifest.ts`, which exists precisely to keep the
filesystem read out of the pure module).

**Glossary registration owed** at `register-incremental`: `ResponsiveImg`, `SiteIcons`,
`absoluteImageUrl`, `srcsetFor`, `variantWidths`, `variantPath`, `intrinsicSize`,
`readResponsiveManifest`. Note in passing that `SEO`, `HeadExtras`, `GalleryTile` and
`EventGallery` are all pre-existing and unregistered — pre-existing debt, called out
here rather than folded into this cycle's scope.