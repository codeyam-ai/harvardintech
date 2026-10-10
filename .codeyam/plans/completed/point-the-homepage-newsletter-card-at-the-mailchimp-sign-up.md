---
title: "Point the homepage newsletter card at the Mailchimp sign-up"
mode: ui
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

On 2026-10-09 the owner asked for the menu's Newsletter link to go to the Mailchimp sign-up rather than the LinkedIn newsletter, and the menu now does. The homepage Content Hub section still offers a "LinkedIn newsletter" card pointing at linkedin.com/newsletters/..., and the welcome blog post links there too, so the site sends people to two different newsletters depending on where they click.

## Key Decisions

- Use the one sign-up URL the site already treats as canonical: `links.mailingList` in `src/data/settings.json`, read through `siteLinks()` in `src/lib/site.ts`. Do not hard-code the URL again.
- Rename the card to plain "Newsletter" with a blurb about email, since it will no longer be a LinkedIn feed item.
- Decide with the owner whether the LinkedIn newsletter is kept anywhere at all (for example under the LinkedIn company page) or dropped.

## Implementation

- `src/components/landing/ContentHub.astro` line 54: replace the LinkedIn newsletter entry's label, blurb and url (via `siteLinks().mailingList`). Check the brand-icon pick in `src/lib/brandIcons.ts`, which matches on the label text.
- `src/content/blog/welcome.md` line 19: update or remove the LinkedIn newsletter link.
- Recapture the Content Hub component scenarios and the homepage scenarios.