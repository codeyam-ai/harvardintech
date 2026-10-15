---
title: "Bring all content to publication quality before going public: fill the supporter recognition wall, testimonials, communities and sponsors (owner ruled on 2026-10-02 that nothing ships empty or switched off)"
mode: backend
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

The owner ruled on 2026-10-02 that nothing goes public empty or switched off.
Today four areas would break that rule. The missing material (donor names,
partner logos, quotes, photos) has to come from the team. Code can't invent it.
So this cycle makes every gap **visible, countable and blocking**, gives the
team an exact list of what to send, and fills the gaps that need no new
material.

## Where things stand (inventory, 2026-10-15)

| Area | Today | What's missing |
|---|---|---|
| Supporter wall (`/donate`) | 0 donors; the band shows "first campaign launches soon" | Donor names (with consent); a donation link (`donateUrl` is blank, so the button opens an email) |
| Testimonials (`/donate`) | 2 real quotes | Mohammed Ally: no portrait or event photo. Jessica Li: event caption unconfirmed. Only two quotes in total (owner's note: add more) |
| Communities | AI, Founders and Investors pages are live | AI and Investors: no banner image. Founders: no named lead. Investors still says "Launch webinar coming" |
| Sponsors (`/sponsor`) | Only the 3 "Example" partners, all drafts, so the public wall reads "No partners listed yet" | Real partners and logos; the Presenting Partner level is switched off; the inquiry form link is blank |

Also switched off or thin elsewhere: 3 of 7 priority cards are drafts, and 0 of
20 volunteer projects have an image.

## What this cycle builds

1. **A content-gap check.** One function reads the content collections and
   returns every launch gap: an empty list, placeholder or drafted entries
   standing in for real ones, a missing required image or lead, a blank link,
   a switched-off level or section. It's plain data, unit-tested against
   fixtures.
2. **Gaps shown on the cutover runbook.** A "Content still missing" section on
   the passphrase-only `/cutover-runbook` page lists each gap with what to
   send, who it's for, and where to add it in the content editor. Each item
   disappears by itself once the content lands.
3. **The cutover step is blocked while gaps remain.** The runbook's "switch to
   public" step shows as not ready while the check reports any gap, so no one
   can launch an empty section by mistake.
4. **Fill what needs no new material:**
   - Remove "Launch webinar coming" from Investors, or replace it with the
     WhatsApp join call to action the other communities use.
   - Give the supporter wall's empty band and the partner wall's empty state
     the soft "nothing here yet" panel with a button, as chosen in the decision
     sheet (row d-q3). Each panel points at the right next step (give / become
     a partner) instead of reading as broken.

## Not in this cycle

- Writing or inventing any donor, partner, quote or photo.
- Choosing a donation platform, or building a sponsor inquiry form. Both are
  their own decisions; the check lists them as gaps.
- Merging the duplicate sponsor copy in `src/data/sponsorPage.json`. That's
  decision-sheet row c-dup-copy, its own plan.

## Done when

- The check reports exactly the gaps listed above against today's content, and
  reports none against a fully filled fixture.
- `/cutover-runbook` shows the list, and the public-switch step reads "not
  ready".
- Investors no longer promises a webinar.
