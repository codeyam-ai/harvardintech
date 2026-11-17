---
title: "launch -- Submit harvardintech.com to Google Search Console"
mode: ui
createdAt: "2026-11-17T01:00:00Z"
prefix: "launch"
source: manual
---

## Summary

harvardintech.com went live on GitHub Pages on 2026-11-16, replacing the Strikingly site. Register it in Google Search Console and submit the sitemap so Google re-crawls the new pages quickly and drops the old Strikingly URLs. This is mostly an owner task in Google's UI; the build side only needs a verification record if Google asks for one.

## Key Decisions

- Verify as a **Domain property** (`harvardintech.com`) via a DNS TXT record in GoDaddy — it covers https, http and www in one property. Adding a TXT record does not affect email: never edit or remove the existing SPF (`v=spf1 …`), `dc-…._spfm` or `_dmarc` TXT records; the Google record is an additional, separate TXT row.
- Submit `https://harvardintech.com/sitemap-index.xml` (the site's robots.txt already points at it). /admin, /donate and /sponsor are intentionally absent from the sitemap and disallowed in robots.txt; Search Console reporting them as "blocked by robots.txt" or "excluded by noindex" is expected until the 11/30 relaunch plans run.
- No code change is expected. If Google offers only the HTML-file or meta-tag method, add the file under `public/` (or the meta tag in `src/components/SEO.astro`) as a one-line change.

## Implementation

1. Owner: open https://search.google.com/search-console → Add property → Domain → `harvardintech.com`.
2. Owner (GoDaddy DNS): Add New Record → Type TXT, Name `@`, Value = the `google-site-verification=…` string Google shows, TTL 1 hour. Save. Leave every other TXT record untouched.
3. Back in Search Console: Verify (DNS can take minutes to an hour).
4. Sitemaps → submit `sitemap-index.xml`.
5. Optional: URL Inspection → Request indexing for `https://harvardintech.com/`.
6. Claude: confirm the TXT record is public and that MX/SPF/DMARC are unchanged; re-run a live check of robots.txt and the sitemap.

## Verification

Search Console shows the property verified and the sitemap "Success" with ~46 discovered URLs; MX (Zoho) and SPF records unchanged.
