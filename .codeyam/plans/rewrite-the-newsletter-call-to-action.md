---
title: "Rewrite the newsletter call to action"
mode: ui
createdAt: "2026-10-09T19:31:06Z"
source: manual
---

## Summary

The newsletter call to action in the "Not near a chapter? Join the global
community." band reads as a label plus an apology. The card's button text is
"Subscribe to the newsletter", which is generic. The line under it, "One list,
not one per city — we ask where you are so we can tell you what is near you.",
is about how the list works internally and never says what a reader gets. This
band appears on the homepage and at the bottom of every chapter page, so it is
the site's main newsletter pitch. Rewrite both strings so they lead with what
lands in the inbox. Keep the "one list, local news first" idea, but as a benefit
rather than a disclaimer.

## Key Decisions

- **Proposed copy** (the user can revise it before running the plan):
  - Button: **"Get the newsletter"**. It is an action with a clear outcome and
    is shorter than the two sibling cards ("Join the WhatsApp community",
    "Volunteer with us"), so the three still line up.
  - Line under it: **"Events, chapter news and alumni stories in one email —
    with what's happening near you up top."**
  - Alternatives considered: "Never miss an event" / "One email with every
    upcoming event and what's new near you." This version is events-led and
    stronger if events are the main draw. It is still on the table.
- **No subscriber count in the copy.** "Join 8,500+ alumni" is persuasive, but
  that figure is already hardcoded in four places (`Stats.astro`,
  `donatePage.json` and two isolated-component fixtures). The completed
  "make the site's numbers agree" plan exists because copies like these drift
  apart. Adding a fifth copy would recreate that problem.
- **Scope: the newsletter card only.** The chapter-page "Stay in touch / Sign
  up" band (`ChapterSignUp.astro`) and the header "Subscribe" button are left
  alone. The header button has to stay one short word to fit at 390px. The
  chapter band is a separate, smaller pitch and can get its own pass if wanted.

## Implementation

### 1. Rewrite the newsletter action

**File**: `src/components/GlobalCommunityCta.astro`

In the `actions` array, change the second entry's `label` to
"Get the newsletter" and its `blurb` to the new line above. Leave `href`
(`newsletterUrl` from `joinCtas()`) unchanged. Update the header comment's
"the newsletter (hear from us occasionally)" only if it stops describing the
card accurately.

### 2. Keep the isolated fixture in step

**File**: `src/pages/isolated-components/GlobalCommunityAction.astro`

This fixture repeats the old label and blurb word for word. Update it to the
new strings so the `GlobalCommunityAction` scenario shows what ships.

## Reused existing code

- `GlobalCommunityCta` from `src/components/GlobalCommunityCta.astro` (glossary entry: `GlobalCommunityCta`)
- `GlobalCommunityAction` from `src/components/GlobalCommunityAction.astro` (glossary entry: `GlobalCommunityAction`). It renders the card and needs no change.
- `joinCtas` from `src/lib/localPresence.ts`. It supplies the link; no change.

## Scenarios to Demonstrate

- Homepage global-community band at desktop: three cards in a row, all the
  same height, with the new newsletter copy.
- The same band at 390px mobile: cards stacked, new line wraps cleanly.
- A chapter page footer band (for example NYC) showing the same card.