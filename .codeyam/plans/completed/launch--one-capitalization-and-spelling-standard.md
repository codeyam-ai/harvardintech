---
title: "launch -- One capitalization and spelling standard"
mode: ui
createdAt: "2026-10-02T20:34:30Z"
prefix: "launch"
source: manual
---

## Summary

The site mixes two capitalization systems and two spelling conventions in
visitor-facing copy. Found during the 2026-10-02 content/UX/brand audit. Neither
is a bug; together they are the most visible reason the writing reads as
assembled by several hands rather than designed.

Set one standard, apply it, and record it where the content editor will see it.

## What is actually inconsistent

**Capitalization.** Three of the focus-area pillars are Title Case
(`src/content/pillars/create-meaningful-connections.md`,
`expand-access-to-knowledge.md`, `strengthen-the-network.md`) while the funding
priorities in the same collection are sentence case
(`establish-the-organizational-foundation.md`, `secure-essential-annual-software.md`,
`fund-chapter-events-and-programming.md`).

On `/donate`, eight of nine section headings in `src/content/momentumSections/`
are sentence case and one is Title Case (`how-your-support-will-be-used.md`,
"How Your Support Will Be Used" — currently `draft: true`, so it is not live yet,
but it will be).

`src/data/nav.json` is entirely Title Case ("All Events", "Content Hub",
"Get Involved", "Sponsorship Opportunities") while the homepage headings those
items lead to are sentence case ("Upcoming events", "Get involved" in
`src/content/homeSections/`). The nav and the page disagree on the same words.

The same statistic is capitalized two ways: "Events hosted"
(`src/content/stats/events-hosted.md`) and "Events Hosted"
(`src/data/donatePage.json`, `stats[0].label`).

**The eyebrow label.** The Atlas design system defines a small uppercase kicker
above each section heading. Eight of thirteen `src/content/homeSections/` entries
set `kicker:`; five do not (`get-involved`, `giving`, `whatsapp`, plus `hero` and
`stats`, which render no heading and are correctly exempt). Among those that do,
two registers are mixed: one-word categories ("Leadership", "Calendar",
"Explore", "Community") alongside phrases ("A global community", "Say hello",
"Read, watch, listen", "Support the mission").

**Spelling.** British forms appear in live prose: "volunteer programme"
(`src/content/pages/privacy.md`), "centre" (`src/content/communities/ai.md`),
"organising" (`src/content/chapters/dc-dmv.md`). The site is otherwise American.
`src/data/givePage.json` is wholly British ("enquiry", "recognised",
"organisation's", "adviser") — it is orphaned content today, but it holds the
donor FAQ that may be brought back, so it must be converted at that point rather
than copied across as-is.

`src/pages/404.astro` titles itself "Page Not Found - 404" with a hyphen where
the rest of the site uses em dashes.

## Key Decisions

- **Sentence case, everywhere, including the navigation.** It is already the
  majority, and it is the right register for an editorial serif system. Title
  Case in a Crimson Pro display face reads as a marketing deck rather than a
  publication. Proper nouns keep their capitals; "Harvard Alumni in Tech" is
  unaffected.
- **American English**, for a US-registered 501(c)(6) carrying Harvard's
  identity. The one exception is a direct quotation from someone who wrote it in
  British English — those stay verbatim.
- **Every content section gets a kicker**, and kickers are one-word or two-word
  category labels, not sentences. "Say hello" becomes "Contact"; "Read, watch,
  listen" becomes "Content". This is what gives a long homepage its rhythm.
- **`src/data/imageCredits.json` is out of scope.** Its `licence` key is a data
  field name, not visitor-facing copy, and renaming it would touch the schema in
  `src/content/config.ts` for no reader-visible gain.

## Where the standard gets written down

A style note the content editor can actually find — not a comment buried in a
component. The CMS field hints in `src/data/collections.json` are the surface the
editor reads while typing, so the capitalization rule belongs in the hint text for
title and kicker fields.

## Verification

- `npm test` stays green. `src/lib/noPersonalEmail.test.ts` scans this same
  content tree, so a careless edit there will surface immediately.
- Recapture the affected scenarios. Heading case changes are visible in every
  homepage and `/donate` frame, so expect a wide but shallow diff — confirm the
  changes are the intended ones and nothing re-rendered empty.
- Check `/404` and the nav dropdowns by hand; neither has a scenario today.