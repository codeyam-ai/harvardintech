---
title: "launch -- Introduce the HIT Directory in the WhatsApp band"
mode: ui
createdAt: "2026-10-09T23:41:46Z"
prefix: "launch"
source: manual
---

## Summary

Tell members that the **HIT Directory (beta)** exists and how to use it. On WhatsApp, members can search other members, request an introduction, and see who is attending an event. You reach it by texting "hit" to +1 617 500 0295 on WhatsApp. The October 5, 2026 all-hands showed it working, and the user approved publishing both the tool and its access number. Today the site never mentions the directory.

## Key Decisions

- **It goes in the homepage WhatsApp band (`#community`), not a new page.** The directory runs inside WhatsApp and serves the same people, so it belongs beside "Apply to join". Shape: a short "Already a member?" block under the How-to-join card.
- **Copy:** "Already a member? Use the HIT Directory (beta) to find alumni, request introductions and see who's coming to an event. Text **hit** to **+1 617 500 0295** on WhatsApp."
- **Print the number as text, not as a `wa.me` link.** `isWhatsAppGroupLink` treats `wa.me` and `api.whatsapp.com` as group invites. The repo's guards and tests (`noPersonalEmail.test.ts` scans components for those hosts) exist so that no WhatsApp link ships in the public HTML. A visible number keeps that rule and still tells people what to do. If the build agent finds the guard is only about group invites and the user wants a tap-to-open link, raise it as a question rather than weakening the guard.
- **The number lives in one constant** next to `WHATSAPP_FORM_URL`, so it is changed in one place.
- **No credit to the lead on the site.** The user approved the tool and its access, not naming Jan.

## Implementation

### 1. Directory constant

**File**: `src/lib/contact.ts`

Add `HIT_DIRECTORY_WHATSAPP_NUMBER = '+1 617 500 0295'` and `HIT_DIRECTORY_KEYWORD = 'hit'`, with a comment saying why there is no link.

### 2. "Already a member?" block

**File**: `src/components/landing/WhatsappCommunity.astro`

Add the block below the `wa-how` card (or as a quiet foot inside the `wa-invite` column). Keep it secondary to the Apply button: no second solid button. Take props with the constants as defaults, so scenarios can override them.

## Reused existing code

- `WhatsappCommunity` from `src/components/landing/WhatsappCommunity.astro`
- `isWhatsAppGroupLink` from `src/lib/localPresence.ts`, which is the reason for the text-only number
- `WHATSAPP_FORM_URL` from `src/lib/contact.ts`, the neighbouring constant

## Scenarios to Demonstrate

- Homepage WhatsApp band showing the directory block, at desktop and phone widths
- Isolated `WhatsappCommunity` with default props

Capture notes: the band is below the fold. Frame it with a `hover` interaction and `--target` the recapture.