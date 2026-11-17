---
title: "launch -- Cancel Strikingly once DNS has settled"
mode: ui
createdAt: "2026-11-17T01:00:00Z"
prefix: "launch"
source: manual
---

## Summary

harvardintech.com moved from Strikingly to GitHub Pages on 2026-11-16 (apex A → GitHub's four IPs, www CNAME → codeyam-ai.github.io; the old records had TTLs up to 4 hours). Once the old records have expired everywhere, cancel the Strikingly subscription — but only after confirming nothing still depends on it. Earliest: 2026-11-19.

## Key Decisions

- Wait at least 2–3 days after the cutover before cancelling, so no resolver can still be serving the old Strikingly address.
- Before cancelling, export anything worth keeping from Strikingly (old page copy, images, form submissions/contact lists, any blog posts not migrated) — after cancellation it may be unrecoverable.
- Check Strikingly is not providing anything else: email (no — email is Zoho), domain registration (no — the domain is at GoDaddy), forms or a store.
- Do NOT touch DNS as part of this; the records are already final.

## Implementation

1. Claude: confirm publicly that `harvardintech.com` A = 185.199.108–111.153 and `www` CNAME = codeyam-ai.github.io from several resolvers, and that https://harvardintech.com serves the new site.
2. Owner: log in to Strikingly; export/download any content, images and form submissions worth keeping; note anything not already on the new site (Claude can compare and add missing content via a follow-up plan).
3. Owner: confirm the Strikingly site has no custom domain connection still pending and no other service (store, forms, membership) in use.
4. Owner: cancel the subscription (and turn off auto-renew); keep the receipt.
5. Claude: re-check https://harvardintech.com and email records once more after cancellation.

## Verification

Strikingly subscription cancelled; harvardintech.com and www still serve the GitHub Pages site; MX/SPF unchanged; any exported content saved somewhere durable.
