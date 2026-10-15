---
title: "launch -- Introduce the HIT Directory in the WhatsApp band"
mode: ui
createdAt: "2026-10-09T23:41:46Z"
prefix: "launch"
source: manual
---

## Summary

Add a short teaser for the **HIT Directory (beta)**. The teaser says the directory is a feature of the alumni WhatsApp community and encourages people to join. The site does not mention the directory today.

This is a teaser only (user, 2026-10-15): "We don't want to reveal all the information just yet — we just want to say it's a feature in the WhatsApp and encourage folks to join." So the site does **not** publish the access number, the "hit" keyword, or step-by-step usage.

## Key Decisions

- **It goes in the homepage WhatsApp band (`#community`), not on a new page.** The directory lives inside the WhatsApp community, so the teaser is one more reason to join, right next to "Apply to join."
- **Layout (revised with the user in the live preview, 2026-10-15, from a four-way exploration):** the band becomes one column, read top to bottom:
  1. "Join our WhatsApp community" on one line, with the lede below it.
  2. A full-width join card in the site's standard card style (white, hairline border, 3px crimson left rule, no shadow; the same card as `UpcomingEvents` rows). Inside it, top to bottom: the "How to join" kicker, a plain sentence (no "Verify your alumni status" headline), the "See the admissions criteria →" link, then one larger-than-standard **"Apply to join the community"** button, full width on phones. It has no divider and no second action beside the button. Apply must be the most prominent thing on the band.
  3. The HIT Directory as a quiet, unfilled strip under the card, in ink rather than crimson (user: the red version was "too loud").
- **Copy:** an "Inside the community" kicker with a "Beta" tag, the title "The HIT Directory", and the sentence "Find fellow alumni and ask for an introduction without leaving WhatsApp. Open to every member of the community."
  - It names the feature and one line of what it does, then points to joining.
  - It gives no phone number, no keyword, and no WhatsApp link. That keeps the existing no-WhatsApp-links rule (`isWhatsAppGroupLink`, `noPersonalEmail.test.ts`) intact with nothing to weigh.
- **The copy is a component prop with a default**, so scenarios can override or blank it. A blank value renders no note, which is the off switch until the full launch.
- **No credit to the lead on the site.**

## Out of scope (future)

- Moving every WhatsApp join form to the new app's process. The user expects this later, but the new process isn't ready. `WHATSAPP_FORM_URL` and the "Apply to join" flow stay exactly as they are.
- Publishing the access number and keyword. That waits for the full launch.

## Implementation

### 1. Teaser note in the WhatsApp band

**File**: `src/components/landing/WhatsappCommunity.astro`

Add an optional `directoryTeaser?: string` prop that defaults to the copy above. When the prop is non-empty, render it as a small note (for example `<p class="wa-note">`) under `.wa-lede` in the `wa-invite` column. Bold the lead-in phrase and use muted, smaller type than the lede. On phones it still reads before the How-to-join card. Update the header comment to explain why there is no number or link.

## Reused existing code

- `WhatsappCommunity` from `src/components/landing/WhatsappCommunity.astro`, the band being extended
- `isWhatsAppGroupLink` from `src/lib/localPresence.ts`, the rule the teaser respects by carrying no link

## Scenarios to Demonstrate

- The homepage WhatsApp band showing the teaser, at desktop and phone widths
- An isolated `WhatsappCommunity` with default props (teaser shown)
- An isolated `WhatsappCommunity` with the teaser blanked (the band as it is today)

Capture notes: the band is below the fold. Frame it with a `hover` interaction and `--target` the recapture.
