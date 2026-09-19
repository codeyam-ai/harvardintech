---
kind: goal-meter
kicker: Launching soon
title: 'Our 2026 goal: raise $10,000.'
linkLabel: View the campaign
linkUrl: ''
raised: '$0'
goal: '$10,000'
percent: 0
order: 5
---

The fundraising progress band, and the one place on this page carrying figures
somebody has to maintain by hand.

THE NUMBERS BELOW ARE REAL AS OF 2026-09-14: the campaign has not launched, so
$0 has been raised against a 2026 goal of $10,000, and the bar is drawn at 0%.
They replaced placeholder figures ($20 of $100,000) that were never true.
Keep them true or clear all three — an empty band is honest, a wrong one is not.

There are two ways this band can draw itself, and they never both apply:

- Widget id set — Givebutter's own widget renders the meter and reports the
  live total. Nothing needs maintaining, which is why this is the better mode
  once a campaign exists. Raised, Goal and Percent are ignored entirely.
- Widget id blank, figures filled in — the band draws its own bar from
  Raised, Goal and Percent. Percent is what the bar is actually drawn to; it is
  not calculated from the other two, so if you change the money you must change
  the percentage as well or the picture will contradict the numbers beside it.

With no widget id and no figures the band renders nothing at all, which is what
it did before these fields existed.

To swap the hand-typed figures for Givebutter's live meter, fill in the Goal
meter widget ID box above. The ID is the one thing that cannot be guessed,
because a wrong one would display someone else's campaign meter on our page. Get
it from Givebutter — Dashboard, your campaign, Share, Embed — and copy the `id=`
value out of the code they give you. Once it is set, Raised, Goal and Percent
below are ignored and nobody has to maintain them again.

The Goal meter link address is blank for the same reason — it points at the
Givebutter campaign page, and guessing it would send readers somewhere wrong. The
link needs BOTH boxes filled to appear, so "View the campaign" sitting in the
text box on its own draws nothing.

The Kicker and both link boxes belong to this band and disappear with it, so a
blank widget ID leaves nothing stranded on the page.
