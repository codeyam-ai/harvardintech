---
title: "Draft: permission to use the Veritas shield"
mode: ui
createdAt: "2026-09-18T17:01:55Z"
---

**Status:** awaiting send. The owner sends this — it is not ours to send.
**Raised by:** the `launch--images` plan, item E5.
**Recipient:** Harvard Alumni Association (the office that administers Shared Interest Groups).

## Why this exists

`public/images/harvard-shield.png` renders as a 26px mark in the site header, on
every page, beside the words "Harvard Alumni in Tech". Harvard's shield is a
registered trademark, and a Shared Interest Group's right to display it is not
automatic — it is granted. Nobody in this repo's history recorded a grant, so the
ledger (`src/data/imageCredits.json`) carries it as `haa-permission` with
`licence: "pending"` rather than quietly asserting we are allowed.

This is the only trademark question on the site. Every other image is our own
event photography.

## What we are asking for

Permission to display the Harvard shield as the navigation mark on
harvardintech.com, at the size and in the context described below.

## Draft message

> Subject: Use of the Harvard shield on the Harvard Alumni in Tech website
>
> Hello,
>
> Harvard Alumni in Tech is a volunteer-led Shared Interest Group for Harvard
> alumni working in technology. We run chapters in New York, Boston and
> Cambridge, San Francisco and the Bay Area, and London, with communities forming
> in Washington DC and Seattle.
>
> We are rebuilding our website and want to get the trademark question right
> before it launches rather than after.
>
> The site currently shows the Harvard shield as a small mark in the site header —
> roughly 26 pixels tall, beside the words "Harvard Alumni in Tech", on every
> page. It is not used on merchandise, in advertising, or in any way that implies
> the University endorses or operates the group. Nothing is sold through the site.
>
> Could you confirm whether a Shared Interest Group may display the shield this
> way, and let us know any conditions we should follow — a required form of the
> mark, minimum clear space, or an accompanying disclaimer?
>
> If the answer is no, that is genuinely fine and we would rather know now: we
> have a crimson "HIT" monogram ready to use instead, and swapping it is a
> one-line change.
>
> Thank you,
> [owner name], Harvard Alumni in Tech

## When the answer comes back

- **Granted** — set `licence` on `harvard-shield.png` in `src/data/imageCredits.json`
  to the terms given, and note any conditions in its `note`.
- **Refused or no reply** — swap the nav mark in `src/layouts/BaseLayout.astro` to
  `public/favicon.svg`, the crimson HIT monogram already in the repo, and set the
  shield's ledger row to `unknown` so the audit catches any page that re-adds it.