---
title: "launch -- Make the sites numbers agree"
mode: ui
createdAt: "2026-10-02T20:35:15Z"
prefix: "launch"
source: manual
---

## Summary

Three places where the site's own numbers do not line up, found in the
2026-10-02 content/UX/brand audit. Each is catchable by a visitor comparing two
pages, and on a fundraising site that reads as carelessness about facts rather
than as a typo.

The owner settled the fundraising figure on 2026-10-02: **$10,000 for now.**

## 1. Six chapter pages, four claimed

`src/content/chapters/` holds six entries — `boston-cambridge`, `dc-dmv`,
`london`, `nyc`, `seattle`, `sf-bay-area` — and each is a browsable page linked
from the homepage via `src/components/landing/OurChapters.astro`.

The site tells visitors there are four:

- `src/content/stats/global-chapters.md` — value `4`, label
  "Chapters with in-person events"
- `src/data/donatePage.json` — `stats[2]`, value `4`, label "Chapters & Growing"
- `src/content/sponsorPage/sponsor.md` and `src/data/sponsorPage.json` — the
  intro sentence reads "across four chapters and a global community"

So the number itself is consistent at four; what contradicts it is that six
chapter pages exist and are reachable. A sponsor reading "four chapters" and then
clicking through finds six. The two statistic labels also disagree with each
other on what is being counted.

`src/content/chapters/dc-dmv.md` says in its own body that the chapter has nobody
organizing events yet, which is almost certainly the origin of the gap: six
chapters exist, fewer are currently active.

**What this plan must establish first:** which chapters are actually running
in-person events right now. Do not assume it is four because the stat says four
— that figure predates at least one chapter page. The audit did not settle this
and it is not inferable from the files: `london.md` mentions no events in its
body yet the Luma calendar's one upcoming event is a London co-working day.

**Then:** say it once, in one phrasing, and use that phrasing everywhere. The
honest shape is two numbers, not one — "six chapters, four running regular
in-person events" — which is a stronger story than a single flattened figure and
removes the contradiction instead of hiding it. If a single number is wanted for
the statistic band, count the chapters that exist and let the label carry the
nuance.

## 2. One entry in the statistics row is not a statistic

`src/content/stats/` holds five entries. Four are quantities with descriptive
labels: `8,500+` newsletter subscribers, `750+` in WhatsApp, `4` chapters, `100+`
events hosted. The fifth, `harvard-alumni-in-tech.md`, is value `Est. 2013` with
the label "Harvard Alumni in Tech" — a name and a date sitting in a row of
measurements, where the label slot is carrying the organization's name rather
than describing what was counted.

Relabel it "Founded" so the pattern holds, or move the founding year into the
About copy where it reads as history rather than as a metric. Relabelling is the
smaller change and keeps the band at five items, which matters to the layout.

## 3. The orphaned giving page carries a $50,000 goal

`src/data/givePage.json` sets `"goal": "$50,000"`. Every live surface says
$10,000:

- `src/content/momentumSections/goal-meter.md` — title "Our 2026 goal: raise
  $10,000.", `goal: '$10,000'`
- `src/data/donatePage.json` — `donorsEmptyMessage`, "a 2026 goal of $10,000"
- `src/content/pillars/launch-the-2026-fundraising-campaign.md` — "raise $10,000"

**This is not currently visible to anyone.** `/give` was retired and now
redirects to `/donate/` (`src/lib/redirects.ts`, asserted by
`src/lib/givingContent.test.ts`), and `src/lib/givePageContent.ts` has no `.astro`
consumer. The file is dead content.

It is still worth fixing rather than ignoring, for one reason: the donor FAQ in
that same file is valuable and may be brought back to `/donate` (a separate
piece of work). If it returns with a $50,000 goal beside it, the contradiction
becomes live at exactly the moment nobody is looking for it. Set it to `$10,000`
now so the file is safe to resurrect.

Do **not** delete the file as part of this plan — the FAQ it holds is the subject
of its own pending decision.

## Key Decisions

- **$10,000 is the figure**, owner-confirmed 2026-10-02. It is already what every
  live surface says; this plan only removes the stale outlier.
- **The chapter count is researched, not guessed.** This plan does not ship a
  number the audit invented.
- **The `goal-meter` band keeps its hand-maintained figures.** Its own body
  documents that a Givebutter widget id would make them self-updating; no widget
  exists yet, so the figures stay manual and this plan does not change that
  mechanism.

## Verification

- `npm test` green. `src/lib/givingContent.test.ts` already pins the `/give`
  redirect, so the dead-file edit cannot quietly resurrect the route.
- Recapture the homepage statistics band, `/donate` and `/sponsor`.
- Grep the tree for a bare "four chapters" afterwards; the prose copy exists in
  two files (`src/content/sponsorPage/sponsor.md` and the `src/data` mirror) and
  both must agree.