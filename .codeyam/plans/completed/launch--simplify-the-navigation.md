---
title: "launch -- Simplify the navigation"
mode: ui
createdAt: "2026-10-02T20:35:43Z"
prefix: "launch"
source: manual
---

## Summary

For a ten-route site, `src/data/nav.json` carries three levels of nesting, two
dropdowns that open onto a single item, and a top-level label that promises
something the site does not offer. Found in the 2026-10-02 content/UX/brand
audit.

## The menu as it stands

```
Programs
  All Events                     -> /events/
Communities
  WhatsApp                       -> /#community
Content Hub
  Webinars                       -> /webinars/
  Medium                         -> medium.com (external)
  LinkedIn                       -> linkedin.com (external)
  Newsletter                     -> linkedin.com (external)
Membership
  About
    Mission                      -> /#about
    Board                        -> /#board
  Get Involved
    Volunteer                    -> /volunteer/
  Support
    Donate                       -> /donate/
    Sponsorship Opportunities    -> /sponsor/
```

## What is wrong with it

**Two dropdowns open onto one choice.** "Programs" contains only "All Events".
"Communities" contains only "WhatsApp", which is not even a page — it jumps to a
homepage section. A menu that opens to reveal a single item costs a click and
teaches visitors that menus here are not worth opening.

**"Membership" fronts things that are not membership.** It holds About, Mission,
Board, Volunteer, Donate and Sponsorship. There is no membership to join, no dues
and no sign-up, so the label sets an expectation the site does not meet — and it
buries the mission statement two levels down on a site with ten pages. Reaching
"Mission" takes three menu levels.

**"Communities" is actively misleading.** `src/pages/communities/[slug].astro`
renders real pages for two interest communities (`src/content/communities/ai.md`,
`founders.md`); the AI one describes a recurring bi-weekly call. Nothing on the
site links to either — the audit confirmed no component, page or data file
references `/communities/`. So the one menu named "Communities" leads away from
the actual community pages.

## Proposed shape

```
Events                           -> /events/
Chapters                            (derived from content, unchanged; stays right after Events)
Communities
  WhatsApp                       -> /#community
  AI / Founders                     (already derived from content, shipped since the audit)
Content hub
  Webinars                       -> /webinars/
  Medium / LinkedIn                 (unchanged, external)
  Newsletter                     -> https://mailchi.mp/0222623e1169/fbrj32e9wb (Mailchimp sign-up)
About
  Mission                        -> /#about
  Board                          -> /#board
Get involved
  Volunteer                      -> /volunteer/
  Donate                         -> /donate/
  Sponsorship                    -> /sponsor/
```

Six top-level items, two levels maximum, no single-item dropdowns.

## Revisions at confirm (2026-10-09)

- **Communities is already done.** `withCommunityItems` (`src/lib/nav.ts`) now
  appends every published community to the Communities group, so the AI and
  Founders pages are reachable. No work remains on that half of the plan.
- **Chapters must follow the rename.** `withChapterGroup` inserts the derived
  Chapters dropdown after the item labelled `Programs` (`INSERT_AFTER_LABEL`).
  Renaming it to "Events" must update that anchor, or Chapters drops to the end.
- **Support merges into Get involved** (owner's choice). The original shape left
  "Get involved" holding only Volunteer, a single-item dropdown, which is the
  defect this plan exists to remove.
- **Newsletter points at the Mailchimp sign-up**, not the LinkedIn newsletter
  (owner's request). Use the sign-up URL the site already uses elsewhere
  (`src/data/settings.json`, `src/lib/contact.ts`, the hero slide).

## Key Decisions

- **"Programs" becomes a direct link named "Events."** The label described a
  category that only ever held the events page. If chapter programming later
  needs its own page, a dropdown can return then.
- **"Membership" is dissolved**, not renamed — About, Get involved and Support
  become top-level. Each is a real thing the visitor can do, and the mission
  stops being three clicks deep.
- **Filling the Communities menu is in scope here** even though it also resolves
  an orphaned-content finding, because it is the only honest way to fix a
  single-item dropdown: the item that belongs there already exists.
- **The blog listing page is NOT in scope.** The audit found 20 of 21 posts
  unreachable and the Content Hub's "Blog" link pointing at one hardcoded post
  (`/blog/welcome`, in `src/components/landing/ContentHub.astro`). The owner did
  not select that work on 2026-10-02. Do not add a `/blog` menu item here, since
  there is still no page for it to point at. It remains open.
- **The external Content Hub links stay external.** Medium, LinkedIn and the
  newsletter are where that audience already is; pulling them in-site is a
  separate content strategy question.

## Watch for

`src/lib/nav.test.ts` is 546 lines and is the largest test file touching this
data. Read it before editing `nav.json` — it almost certainly pins the current
tree's shape, depth or labels, and the plan's job includes updating those
assertions deliberately rather than bending the menu to keep them passing.

Anchor links (`/#about`, `/#board`, `/#community`) are kept as-is. Note for
capture: a URL fragment does not scroll a screenshot, so a scenario framing those
destinations needs an interaction rather than the bare anchor.

## Verification

- `npm test` green, with `src/lib/nav.test.ts` updated to the new tree rather
  than worked around.
- Recapture the header scenarios, including the mobile menu — the phone menu has
  its own audit row and a depth change affects it most.
- Click every item by hand on desktop and at phone width. The nav is data-driven,
  so a typo in a URL fails silently rather than at build time.