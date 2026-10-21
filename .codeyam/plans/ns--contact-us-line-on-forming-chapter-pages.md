---
title: "NS -- Contact us line on forming chapter pages"
mode: ui
createdAt: "2026-10-21T23:52:26Z"
prefix: "NS"
source: manual
---

## Summary

From Nicole's 14 Sep notes, still not done: on chapters with no lead yet (Seattle and DC, `status: forming`), add "Interested in getting involved with the Seattle chapter? Contact Us", with Contact Us going to info@harvardintech.com or to a named organizer's address. The forming-chapter body (`FormingChapterCta.astro`) currently offers three buttons (WhatsApp, newsletter, volunteer) and no way to just write to someone.

## Key Decisions

- **The chapter's `contactEmail` wins, with the site inbox as the fallback.** The `contactEmail` field already exists on chapters, so Nicole can put Nadia's (or anyone's) address on Seattle in /admin without a code change. When it's blank, the line uses the site-wide `contactEmail` (`info@harvardintech.com`).
- **Add forming chapters to the allowed email surfaces.** `src/lib/contact.ts` restricts the shared inbox to the surfaces in `EMAIL_SURFACES` ("sparingly", owner rule 2026-09-15). Nicole asked for this one by name, so it becomes a sixth surface, `formingChapter`. When no address resolves, the line isn't shown, the same as every other surface, so there's never a dead `mailto:`.
- **The city name in the line comes from the chapter's own name**, so DC reads "…with the DC & DMV chapter?".

## Implementation

### 1. Allow the surface

**File**: `src/lib/contact.ts`

Add `'formingChapter'` to `EMAIL_SURFACES`.

### 2. Render the line

**File**: `src/components/FormingChapterCta.astro`

Add a `contactEmail` prop. Below the three buttons, render "Interested in getting involved with the {name} chapter? <a>Contact us</a>". The link is `buildMailto` to `emailFor('formingChapter', contactEmail ?? settings.contactEmail)`, and the line is omitted when that resolves to `undefined`.

**File**: `src/components/ChapterPage.astro`

Pass the chapter's `contactEmail` through to `FormingChapterCta`.

## Reused existing code

- `emailFor`, `EMAIL_SURFACES` from `src/lib/contact.ts`
- `buildMailto` from `src/lib/mailto.ts`

## Scenarios to Demonstrate

- Seattle (forming), no chapter email: line links to info@harvardintech.com
- Seattle with a chapter `contactEmail` set: line links to that address
- Site contact email blank and no chapter email: line hidden
- An active chapter (London): no line