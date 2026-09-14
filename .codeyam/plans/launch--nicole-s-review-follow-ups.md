---
title: "launch -- Nicole's Review Follow-Ups"
mode: ui
createdAt: "2026-09-14T20:23:36Z"
prefix: "launch"
source: manual
---

## Summary

Nicole recorded a ten-minute walkthrough of the new site ("New Website Feedback", ScreenPal, 2026-09-14: https://go.screenpal.com/watch/cOQ2qunwsis). She covered the chapters menu, chapter banners, the events page, WhatsApp, the AI and Founders communities, the Content Hub, the blog, Membership (mission, sponsorship, volunteering) and outside links.

This plan does three things:
1. **Builds the site changes she asked for that no other launch plan owns.** These are outside links opening in a new tab, a trimmed sponsor page, a de-duplicated events page, and a "get involved" contact line on chapter pages.
2. **Records her answers to open questions in other launch plans,** so those plans run with her input.
3. **Lists where her feedback conflicts with a decision already made,** for the owner to settle before the affected plan runs.

She also said she is replacing several blurry banner images herself through the content editor, and adding volunteer projects and the mission statement. Those are content edits she owns. This plan must not overwrite them.

## What Nicole said, by topic (timestamps in the video)

| # | Topic | What she said | Where it lands |
|---|---|---|---|
| N1 | Chapters menu (0:11) | Keep every chapter with a high concentration of alumni in the menu, even with no event lead. | Agrees with the owner's decision (DC and Seattle stay as forming chapters). No change. |
| N2 | Chapter "get involved" line (0:32) | A chapter page with no lead says "Interested in getting involved with the Seattle chapter? Contact us", and the button goes to info@harvardintech.com. | **This plan, step 4.** It supplies the copy and the address for `launch--chapters-and-communities`'s forming-chapter template. |
| N3 | Contact address (0:44) | The contact button goes to `info@harvardintech.com`. (The transcript reads "infoarvardntech.com"; it is the site's existing shared inbox.) | Answers open question 1 in `launch--contact-and-calls-to-action` (option C, swap in `info@`). |
| N4 | Blurry chapter banners (0:58) | London and others are blurry. She resized Facebook photos to 2400 × 1350, is putting them in the "HIT Marketing Internal → Website images" folder, and will swap them in herself. She asked what dimensions are needed. | Content she owns. The answer to her question is under **Answers for Nicole**. `launch--images` must not overwrite a banner she has already replaced. |
| N5 | Events page, upcoming (2:20) | Remove the "Upcoming" list under the calendar, because the Luma calendar at the top already shows upcoming events. | **This plan, step 3.** |
| N6 | Events page, past (2:44) | Keep past events in the current card format. After a few, add "View all past events" linking to Luma. A more compact alternative is Upcoming/Past tabs on the calendar. | **This plan, step 3** (the link). **Conflict C2** (vs. the 33-event archive). |
| N7 | WhatsApp links (4:08) | "Apply to join" and "See the admissions criteria" should open in a new tab, so people do not leave the site. | **This plan, step 1.** `launch--contact-and-calls-to-action` already opens the criteria link in a new tab; this covers both. |
| N8 | WhatsApp page, later (3:40, 4:42) | Eventually WhatsApp gets its own page listing channels, current topics, and a year-ahead calendar of discussion topics planned by leads. "For now just having this section is also fine." | Later. Not for launch. |
| N9 | AI community (5:15) | The banner is blurry; she will replace it. The page will hold James's content: a calendar of topics, upcoming webinars, and webinar recaps. | Banner: content she owns. Content: later, and it depends on the webinars section in `launch--history-events-archive-and-webinars`. |
| N10 | Founders community (6:05) | The banner is a little blurry; she has the same photo and others from Facebook. Founders events should appear from Luma, under the Subscribe button. | **Conflict C3** (manual tagging vs. Luma). |
| N11 | Content Hub links (7:07) | Medium, LinkedIn and the LinkedIn newsletter should open in a new tab. | **This plan, step 1.** |
| N12 | Blog (7:49) | Hide the standalone blog until there are articles. Keeping a built-in blog is a priority for SEO and AEO. Invite Harvard alumni as contributing writers. | **Conflict C1** (vs. the Medium link-card blog). |
| N13 | Mission (8:45) | Membership → Mission should carry the mission statement. She will try to write it. | Content she owns. The nav "Mission" link goes to the homepage mission band (`/#about`, per `launch--content-and-pages`). |
| N14 | Sponsorship (9:00) | Keep the sponsorship page. Keep the "Start a conversation" section that emails about sponsorship. Remove "Ways to partner", which is not fleshed out. | **This plan, step 2.** |
| N15 | Volunteering (9:34) | The page stays and migrates at launch. She is adding projects. Is it for operational volunteers only, or also roles like a Seattle chapter lead or a podcast host? | **Question Q1** for Ben and Nadia. |

## Conflicts for the owner to settle

- **C1. Blog.** `launch--content-and-pages` picked "a real `/blog/` index with posts shown as Medium link cards". Nicole wants the blog hidden until there are real articles, with a built-in blog kept as a priority.
  - Recommendation: hide `/blog/` from the menu and the homepage for launch (the Draft switch, no code), and keep the link-card plan for when articles exist.
  - A hidden blog still ships its route, so nothing is lost. The only cost is one fewer menu item.
- **C2. Past events.** The owner chose to bring back the 33-event archive (`launch--history-events-archive-and-webinars`). Nicole wants a few past events plus "View all past events" to Luma, or Upcoming/Past tabs.
  - Recommendation: keep the archive; it holds write-ups and speakers Luma does not. Show the most recent few on `/events`, with "View all past events" going to the archive page on the site rather than off-site to Luma.
  - Owner to confirm, since this changes where the link points.
- **C3. Founders events.** `launch--chapters-and-communities` tags events to communities by hand and lists automatic Luma import as out of scope. Nicole wants Founders events "pre-populated from Luma".
  - Option (a): keep manual tagging. It is cheap and matches every other page.
  - Option (b): a Luma calendar embed filtered to Founders. It is only possible if Founders events carry a Luma tag or sit on their own Luma calendar. Needs checking with whoever runs Luma.

## Questions

- **Q1 (Ben and Nadia, from Nicole):** is the volunteer page for operational roles only, or also chapter leads and a podcast host? It changes which projects Nicole adds.
- **Q2 (owner):** does the Ways to partner content come back later, or is it gone? This plan removes the section from the page but keeps its content in the CMS, so it can return with a toggle.
- **Q3 (owner):** should the site-wide rule be "every link that leaves harvardintech.com opens in a new tab"? Nicole named WhatsApp and the Content Hub. Step 1 applies it to every outside link, because a mixed rule is harder to keep straight.

## Answers for Nicole

- **Banner size.** Chapter and community banners fill the whole first screen (`object-fit: cover`, full viewport height), so the browser crops whatever does not fit.
  - 2400 × 1350 (16:9) is a good size.
  - Keep the subject near the middle: on a phone the sides are cropped heavily, and on a wide monitor the top and bottom are.
  - `launch--images` asks for at least 2400px on the long edge, which hers meet.
  - The editor does not resize uploads, so a smaller or larger file ships as it is.
- **Photos from Facebook.** Before they go live, note who took each one and whether we may use it; `launch--images` asks for the same thing.

## Implementation

1. **Outside links open in a new tab (N7, N11, Q3).**
   - New `src/lib/externalLink.ts`: `externalLinkAttrs(href, siteOrigin)` returns `{ target: '_blank', rel: 'noopener noreferrer' }` for an `http(s)` link to another host, and nothing for internal, relative, `mailto:` or `tel:` links.
   - Apply it to the outside links in `src/components/landing/WhatsappCommunity.astro` (Apply to join, admissions criteria) and `src/components/landing/ContentHub.astro` (Medium, LinkedIn, newsletter).
   - Also apply it to the other outside-link components found by the sweep: `EventCard.astro`, `ChapterLinks.astro`, `ChapterConnect.astro`, and the volunteer apply links when they point off-site.
   - Coordinate with `launch--contact-and-calls-to-action`, step 101: whichever runs second uses the helper rather than a hand-written `target`.
2. **Sponsor page (N14).** In `src/components/SponsorPage.astro`, stop rendering `SponsorLevels` ("Ways to partner"). Keep `SponsorHero`, `SponsorWall` and `SponsorInquiry` ("Start a conversation"). The levels stay in the page's CMS copy, untouched (Q2).
3. **Events page (N5, N6).**
   - In `src/components/EventsPage.astro`, remove the "Upcoming" section under the Luma calendar, including its empty message.
   - After the past-event cards, add a "View all past events" link. It goes to the archive page if `launch--history-events-archive-and-webinars` has shipped, and to `LUMA_CALENDAR_URL` (`https://lu.ma/harvardintech`) until then (C2).
   - The Eventbrite button is already removed by `launch--contact-and-calls-to-action`; do not re-add it.
4. **Chapter "get involved" line (N2, N3).**
   - A chapter with no leads shows "Interested in getting involved with the {chapter} chapter?" and a "Contact us" button to `mailto:info@harvardintech.com`.
   - This depends on `launch--chapters-and-communities`, which builds the forming-chapter template. This step supplies its copy and address, and does not build a second template.

## Tests

- `src/lib/externalLink.test.ts` (new):
  - An `https` link to another host gets `target="_blank"` and `rel="noopener noreferrer"`.
  - A link to the site's own origin, a root-relative path, `mailto:`, `tel:` or `#anchor` gets nothing.
  - A `www.` vs apex mismatch of the site's own domain still counts as internal.
- Events: the page renders no "Upcoming" section, and the past list ends with a "View all past events" link.
- Sponsor: the page renders no "Ways to partner" heading, and still renders "Start a conversation".

## Scenarios to Demonstrate

- `/events` with past events: the calendar on top, past cards below, and "View all past events" at the end, with no Upcoming list.
- `/sponsor`: the hero, the sponsor wall and Start a conversation, without Ways to partner.
- The homepage WhatsApp and Content Hub sections, where clicking an outside link opens a new tab (a driven capture).
- `/chapters/seattle`: the "Interested in getting involved…" line and the Contact us button (after `launch--chapters-and-communities`).

## Out of scope

- Replacing banner images, writing the mission statement, and adding volunteer projects. Nicole is doing these in the content editor.
- A standalone WhatsApp page, a topics calendar, and James's AI content hub (N8, N9). These come later, after launch.
- Automatic Luma import (C3), unless the owner picks option (b).