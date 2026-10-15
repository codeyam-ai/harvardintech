---
title: "Always write the brand as Harvard Alumni in Tech"
mode: ui
createdAt: "2026-10-14T23:30:00Z"
source: user
---

## Summary

The user (2026-10-14): "Harvard Alumni in Tech should always be capitalized (not sentence case and no Harvard in Tech)." About 45 places still say "Harvard in Tech", "Harvard in Technology" or a lowercase "Harvard alumni in tech", across live copy, archived event and webinar posts, photo alt text and testimonials.

## Key Decisions

- **Decided by the user on 2026-10-14: change everything, testimonial quotes included.** That covers Jessica Li's quote in `src/content/testimonials/jessica-li.md` and its copies in isolated-component fixtures.
- Do NOT touch URLs, domains (`harvardintech.com`), file names, slugs or `id`s. Only change human-readable text.
- Keep event titles that become the brand name readable (for example "Harvard in Tech Fall Welcome Mixer" becomes "Harvard Alumni in Tech Fall Welcome Mixer").

## Implementation

1. Sweep every human-readable occurrence (find them with `command grep -rniE "harvard (in tech|alumni in tech)"`) in:
   - live copy: `src/components/WebinarsPage.astro`, `src/pages/webinars.astro`, `src/components/landing/WhatsappCommunity.astro`, `src/content/accomplishments/newsletter-subscribers.md`, `src/content/communities/investors.md`
   - archive content: `src/content/events/*.md`, `src/content/blog/webinar-*.md`
   - `src/data/media.json` alt and caption text
   - `src/content/testimonials/jessica-li.md` (quote and byline)
   - fixtures in `src/pages/isolated-components/` and `.codeyam/scenarios/*.json` seed copies, so scenarios do not drift from content
2. Recapture the affected content-driven scenarios. Content edits are invisible to screenshot staleness, so use `--target --force`.

## Tests

- Add a guard test that fails if any non-URL text under `src/content`, `src/data` or `src/components` matches `Harvard in Tech` or a lowercase `Harvard alumni in tech`.
