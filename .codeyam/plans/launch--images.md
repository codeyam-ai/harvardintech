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