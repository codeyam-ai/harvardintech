---
title: "launch -- Add the Investors community"
mode: ui
createdAt: "2026-10-09T23:41:46Z"
prefix: "launch"
source: manual
---

## Summary

Add an **Investors** community alongside Founders and AI, for Harvard alumni in venture capital and angel investing. The October 5, 2026 all-hands introduced it as a digital community pilot led by Stefan Pagacik (C'79), and the user approved naming it publicly. Today the site has only two communities, so investors have nowhere to land.

## Key Decisions

- **Content entry only.** Communities are one markdown file each. The page at `/communities/<slug>` and the menu's Communities group are both built from the collection, so adding the file adds the page and the menu link.
- **Present it honestly as a pilot that is getting started.** The deck says the channel has not hard-launched yet; that will happen through a webinar. Public copy should invite people to join and must not promise a schedule. Safe callouts from the deck:
  - An investor group of Harvard alumni in venture capital and angel investing
  - A launch webinar with HIT leadership is coming
  - An in-person event is planned, possibly with HIT Boston/Cambridge
- **Name only the lead.** The deck names the four task-force members, but the user approved the community and its lead, not those four. Lead: `Stefan Pagacik`, role `Community lead (pilot)`, matching how the AI page labels James Nicholson.
- **Same join form as the other communities.** Use the shared WhatsApp verification form. The schema refuses a direct group link, by design.

## Implementation

### 1. Community entry

**New file**: `src/content/communities/investors.md`

Frontmatter mirrors `src/content/communities/ai.md`: `name: Investors`, a `tagline`, a `blurb`, three `callouts` from the list above, `leads` (Stefan Pagacik, Community lead (pilot)), `whatsappFormUrl: https://forms.gle/GqgaCDDWhWAgpJC68`, `showGallery: false`, and an `order` after AI. The body is one or two short paragraphs on who it is for: alumni who invest, and founders who want to meet them.

### 2. Menu and tests

Confirm the nav's derived Communities group picks it up. Update any test or fixture that asserts the community list is exactly Founders and AI (search `src/lib/nav.test.ts` and the communities tests).

## Reused existing code

- The `communities` collection schema in `src/content/config.ts`
- `CommunityPage` from `src/components/CommunityPage.astro` and `JoinWhatsAppCta` from `src/components/JoinWhatsAppCta.astro`
- `WHATSAPP_FORM_URL` from `src/lib/contact.ts`

## Scenarios to Demonstrate

- `/communities/investors` with its callouts, the lead, and the join call to action
- The menu's Communities group listing Founders, AI and Investors (desktop and phone menu)