---
title: "Give the chapter Sign up band a benefit-led pitch"
mode: ui
createdAt: "2026-10-13T18:41:49Z"
source: proposed-plan
---

## Summary

Every chapter page carries two newsletter pitches. The global-community band's card now leads with what lands in the inbox ("Get the newsletter" — events, chapter news and alumni stories, local news first). The chapter's own "Stay in touch / Sign up" band (`src/components/ChapterSignUp.astro`) still reads "Join the Harvard Alumni in Tech community." with a bare "Subscribe" button, which says nothing about what a reader gets and repeats the ask without a reason. Rewrite that band so it pitches the chapter-local benefit — hearing about this city's events first — and so the two pitches on one page complement rather than echo each other.

## Key Decisions

- Keep the band and its Mailchimp link (`siteLinks().mailingList`, overridable via `subscribeUrl`); change wording only.
- Make it chapter-specific where possible (e.g. pass the city name so the intro can say "Hear about London events first"), since the global-community card already covers the general pitch.
- Do not add a subscriber count; that figure is hard-coded in several places already and drifts.
- Leave the header "Subscribe" button alone — it must stay one short word at 390px.

## Implementation

### 1. Rewrite the band copy

**File**: `src/components/ChapterSignUp.astro` (45 lines)

Update the `SectionHead` `kicker` / `title` / `intro` and the button label. If the copy names the city, add an optional `city` prop and pass it from `src/components/ChapterPage.astro`.

### 2. Keep fixtures and scenarios in step

Update `src/pages/isolated-components/ChapterSignUp.astro` and recapture the `ChapterSignUp - Default` scenario plus the chapter-page scenarios that show the band.