---
title: "launch -- Contact And Calls To Action"
mode: ui
createdAt: "2026-09-14T17:26:45Z"
prefix: "launch"
source: manual
---

## Summary

Remove Ben's personal inbox, and every other email address, from the public site. Contact becomes the socials, and the calls to action go to the volunteer form, `/volunteer` or `/sponsor`. One setting stays so a generic address can come back later: `settings.contactEmail`, left blank for now. Every surface that shows an email must also work with socials only. Other fixes:
- LinkedIn is added to the chapter and community "Connect" rows.
- The "Start a chapter" CTA goes.
- The WhatsApp section links only to the Google Form, and "admissions criteria" goes to the criteria doc.
- The Eventbrite button goes, leaving Luma as the one events system.
- Every link that leaves the site opens in a new tab (from Nicole's walkthrough, 2026-09-14).

## Owner decisions (2026-09-14)

- **The one personal inbox used everywhere.** "We should remove ben's email from anywhere and instead consistently have contact info via socials. I've asked Ben if there's a more generic email to list."
- **Contact email changed from the original.** Plan it. "Just show socials and remove the contact email mentions."
- **SF chapter contact and "Host us".** Plan it. "We need a new SF lead (Jessica in interim); remove any personal emails and have CTAs go to volunteer or other appropriate form."
- **"Start a chapter" CTA.** Change. "Don't think we want this CTA: instead have a more general volunteer CTA (this might exist already)."
- **WhatsApp join steps.** Change. "Make sure corrections are made as needed. Just link to the Google Form; remove the WhatsApp link request to join direct link."
- **WhatsApp admissions criteria.** "Admissions criteria should go to the criteria doc."
- **Two event systems.** Luma only. "Luma is what's used now; Eventbrite may have been used in the past but is not now."
- **Confirm the owners of the outside accounts.** Skip.
- Also in scope: one source for contact and social links, and LinkedIn on the chapter and community "Connect" rows. Removing the donate-email buttons is covered by the separate giving plan.
- **Outside links (from Nicole's walkthrough, 2026-09-14).** She asked that the WhatsApp and Content Hub links open in a new tab "so that they're not leaving our website entirely". Decided while planning (easy to reverse): every link that leaves harvardintech.com opens in a new tab, not only those, because a mixed rule is harder to keep straight (step 14).

## Open questions / needs input

1. **Generic address (for Ben, through the owner).** Is there a shared inbox, such as `info@harvardintech.com`? The plan ships with `contactEmail: ""`. If Ben supplies an address, it is a one-line settings edit and every email surface comes back by itself (see the fallback rule). Nothing blocks on this.
   - Nicole's walkthrough (2026-09-14) names `info@harvardintech.com` as the address a chapter's "Contact us" button should use. Once Ben confirms that inbox is monitored, set `contactEmail` to it. The footer, ContactUs, the Connect rows and the forming-chapter Contact us button in `launch--chapters-and-communities` then all come back.
2. **SF interim lead (for the owner or Jessica).** Should the SF page publicly show "Jessica Li: Interim chapter lead"? The team entry `src/content/team/jessica-li.md` lists her as "Director of Operations". The default is to add the lead line; drop it if she prefers not to be listed.
3. **WhatsApp after the form (for the owner).** What happens once someone submits the form? For example, "we'll email you the invite". The default is a single step with no promise we can't verify.
4. **Speaker and job-post asks (for the owner).** Does the volunteer form (`https://hi.switchy.io/wEYK`) cover people offering to speak? The default sends "Speak at an event" to the volunteer form and "Share job opportunities" to `/sponsor` ("Start a conversation"). The Community level that says "share what you are hiring for" is hidden with "Ways to partner" for launch.
5. **Sponsor inquiry form (for the owner).** `inquiryFormUrl` is `''` in `src/content/sponsorPage/sponsor.md`. With the email removed, the `/sponsor` close needs a form URL. Until one exists, the fallback is "Message us on LinkedIn".

## Recommendations

- **A. Delete `contactEmail` everywhere, including the schema and the settings type.** This is the cleanest result today. The cost comes back when Ben supplies a generic address: every surface has to be rebuilt.
- **B. Keep one optional `contactEmail` setting, blank it, and make every consumer degrade to socials only (pick).** One setting and one helper become the single source. A future generic address is a content edit, not a code change. The rule is testable: a blank email renders no `mailto:`.
- **C. Swap in `info@harvardintech.com` now.** It appears on the original site and in `nyc.md`. The owner said "remove the contact email mentions", and Ben has not confirmed that inbox, so this goes against the decision.

**Pick B.** It carries out the owner's decision today and turns Ben's pending answer into a one-field edit.

**Fallback rule (applies everywhere):** an email is shown only when `contactEmail` is non-blank after trimming.
- A section or element whose only job is to show an email is omitted entirely: no empty line and no dead link.
- A CTA that used to open a `mailto:` gets a non-email destination instead: the volunteer form, `/volunteer`, `/sponsor` or LinkedIn. It never becomes an empty `mailto:?subject=`.

## Implementation

**Every email and mailto on public pages.** Found by grepping `mailto:`, `ben@`, `info@` and `contactEmail`, excluding `isolated-components` and tests.

| # | Where | Today | Replacement |
|---|-------|-------|-------------|
| 1 | `src/data/settings.json` `contactEmail` | `ben@harvardintech.com` | `""` (Ben's generic address later) |
| 2 | `src/layouts/BaseLayout.astro:138` footer | mailto link | Omitted when blank; footer shows socials only |
| 3 | `src/components/landing/ContactUs.astro` | synthesized E-mail disc | Omitted when blank; lede drops "or drop us a note" |
| 4 | `src/components/ChapterConnect.astro` | email line and E-mail badge | Both omitted when blank; badges become LinkedIn, Twitter, Facebook |
| 5 | `src/content/chapters/nyc.md:4` | `contactEmail: info@harvardintech.com` | Line removed |
| 6 | `src/components/landing/GetInvolved.astro:14` | "Start a chapter" mailto to ben@ | CTA removed; the "Volunteer" CTA goes to `/volunteer` |
| 7 | `src/components/landing/SupportUs.astro:17` | ben@ default; 3 mailto cards | Jobs → `/sponsor`; Speak → volunteer form; Volunteer → `/volunteer` |
| 8 | `src/components/SponsorPage.astro:21` and `src/components/sponsor/SponsorInquiry.astro` | ben@ default; "Email us about sponsorship" | Form when `formUrl` is set, otherwise "Message us on LinkedIn"; mailto button only if an email is set |
| 9 | `src/pages/llms.txt.ts:32` | `Email:` line | Line omitted when blank; socials remain |
| 10 | `src/components/StructuredData.astro:22` | `email` when truthy | No change; a blank value is already skipped |
| 11 | `src/pages/index.astro:100`, `src/pages/sponsor.astro:38`, chapter and community `[slug].astro` | pass `contactEmail` | Pass the helper's value (`undefined` when blank) |
| 12 | `GivingCampaign`, `MomentumFundPage`, `donate/MomentumNetwork`, `donate/DonorWall`, `donate/GiftPillars`, `src/pages/give.astro:40`, `src/pages/donate.astro:124` | ben@ defaults and donate mailtos | **Giving plan.** Cross-reference only (see the gate in step 10) |

The original SF page's `risdhillon@gmail.com` is already gone from `src/content/chapters/sf-bay-area.md`. The original home page's "Host us in your space" mailto was replaced by a `/sponsor#levels` link, which now goes to `/sponsor` (row 7).

**Steps**

1. **Single source.** Create `src/lib/contact.ts` (new), which exports:
   - `resolveContactEmail(value?: string): string | undefined`: trims the value; blank becomes `undefined`.
   - `connectLinks(socials, email?)`: returns every `settings.socials` entry in its settings order, plus an `E-mail` entry only when an email is present.
   - `VOLUNTEER_PATH = '/volunteer'`.
   - `WHATSAPP_FORM_URL = 'https://forms.gle/GqgaCDDWhWAgpJC68'`.
   - `WHATSAPP_CRITERIA_URL = 'https://docs.google.com/document/d/1IvWhYTdFqOzMYg6ySXx7pmMOfwhDwDHfXHdDkZRbkyE/edit?tab=t.0#heading=h.2l2z5vqeznos'` (from the original site's WhatsApp copy).

   The volunteer form URL keeps its existing home, `ctaUrl` in `src/content/volunteerPage/volunteer.md`. Do not copy it.
2. **Settings type.** In `src/lib/site.ts`, change `SiteSettings.contactEmail` to `contactEmail?: string`. Set it to `""` in `src/data/settings.json` only at step 10.
3. **Footer and home.** In `src/layouts/BaseLayout.astro`, render the footer mail link only when the resolved email is set. In `src/components/landing/HomeSections.astro`, make `email` optional and rewrite its "Required" doc comment. In `ContactUs.astro`, make `email` optional, use `connectLinks` so the E-mail disc appears only when an email is set, and rewrite the lede and header comment.
4. **Connect rows (chapters and communities).** Rewrite `ChapterConnect.astro` to use `connectLinks(settings.socials, resolveContactEmail(emailProp ?? settings.contactEmail))`. This drops the twitter/facebook name filter, so LinkedIn appears. Render the `<p>` email line only when an email is set. Remove `contactEmail` from `src/content/chapters/nyc.md`. Keep the optional schema field in `src/content/config.ts` and `src/data/collections.json`. Change its hint to: "Leave blank: the page shows the site's social links. Only set a shared (non-personal) inbox."
5. **Get involved.** In `GetInvolved.astro`, remove the `email` prop, the `buildMailto` import and the "Start a chapter" button. The one primary CTA becomes "Volunteer with us" → `withBase(VOLUNTEER_PATH)`. The `/volunteer` page already exists and carries the form CTA and open projects. Optionally add a secondary "Sponsor or host" → `withBase('/sponsor')`. Rewrite the lede from "...sponsor, or start a chapter where you live" to "...or sponsor, there's a place for you to help". Update the header comment.
6. **Support us and SF "Host us".** In `SupportUs.astro`, remove the ben@ default and `buildMailto`. Every card gets a real `href`:
   - Sponsor → `/sponsor`
   - Host → `/sponsor`
   - Jobs → `/sponsor`
   - Speak → the volunteer form `ctaUrl`, passed in from `src/pages/index.astro` via HomeSections
   - Volunteer → `/volunteer`

   CTA text follows the destination: "Start a conversation →" or "Volunteer →".
   - "Ways to partner" is removed from `/sponsor` for launch (owner, 2026-09-14; see `launch--giving-pages-short-term`), so `#levels` no longer exists. That is why Host and Jobs go to `/sponsor` rather than `/sponsor#levels`.

   Also edit `src/content/chapters/sf-bay-area.md`:
   - Add `leads: [{ name: Jessica Li, role: Interim chapter lead }]` (Q2).
   - Add `links: [{ label: Volunteer, url: /volunteer }, { label: Host an event, url: /sponsor }]`.
7. **Base path fix for chapter links.** In `ChapterLinks.astro`, wrap `link.url` in `withBase()`. Root-relative CMS links such as `/volunteer` currently break on the subpath deploy (`siteUrl` is a GitHub Pages subpath). Update its comment, which mentions WhatsApp and Eventbrite.
8. **Sponsor close.** `SponsorPage.astro` drops the ben@ default and passes `email` through as optional. `SponsorInquiry.astro`:
   - Make `email` optional; render the mailto button only when it is set.
   - With no `formUrl` and no email, render "Message us on LinkedIn" → the LinkedIn social from settings.
   - Rewrite the `EmbedForm` `fallbackMessage`, which currently says "email us using the button on the left", so it no longer mentions email.
9. **WhatsApp.** In `WhatsappCommunity.astro`:
   - Delete the `whatsappUrl` prop and step 2 ("Request to join the WhatsApp group using this link").
   - "Apply to join" → `WHATSAPP_FORM_URL`. "See the admissions criteria →" → `WHATSAPP_CRITERIA_URL`. Both open in a new tab through `externalLinkAttrs` (step 14).
   - Keep step 1's verified copy: "Fill out this short form (under 2 minutes) to verify your alumni status."
   - Remove the "no separate criteria page" comment, which is wrong.
   - Search for `chat.whatsapp.com` afterwards: it must return zero hits outside tests.
10. **Blank the setting (gated).** Set `"contactEmail": ""` in `src/data/settings.json` only once the giving plan has removed the donate mailtos (row 12). `give.astro:40` uses `??`, so a blank string would reach `buildMailto` and render `mailto:?subject=…`. If this plan lands first, it adds a `resolveContactEmail` guard to `give.astro` and `donate.astro` and leaves the buttons themselves to the giving plan. Check `.codeyam/tmp/content-sandbox-active/data/settings.json`, which still holds ben@. A stale content-sandbox snapshot masks `src/data` edits.
11. **Machine-readable surfaces.** In `src/pages/llms.txt.ts`, emit `- Email:` only when resolved. `StructuredData.astro` needs no change.
12. **Luma only.** In `EventsPage.astro`, delete the `eventbriteUrl` prop and its "View Upcoming Events" button. `src/pages/events.astro` already renders `LumaCalendar` with `LUMA_CALENDAR_URL` above the list. The closing "View all past events" link to Luma belongs to `launch--mobile-and-layout` (owner decision after Nicole's walkthrough, 2026-09-14). Do not add a second Luma link here.
13. **Scrub.** Update the default and fixture addresses in `src/lib/mailto.test.ts` and `src/lib/url.test.ts` to `hello@example.com`. Leave `buildMailto` itself unchanged: giving and SponsorInquiry still use it when an email exists.
14. **Outside links open in a new tab.** Create `src/lib/externalLink.ts` (new), exporting `externalLinkAttrs(href, siteOrigin)`:
   - It returns `{ target: '_blank', rel: 'noopener noreferrer' }` for an `http(s)` link to another host.
   - It returns nothing for internal, root-relative, `mailto:`, `tel:` and `#` links. A `www.`/apex variant of the site's own domain counts as internal.
   - Apply it to every outside link: `WhatsappCommunity.astro` (step 9), `ContentHub.astro` (Medium, LinkedIn, the newsletter), `EventCard.astro`, `ChapterLinks.astro` (step 7), `ChapterConnect.astro` (step 4), and the volunteer apply links when they point off-site.
   - `LumaSubscribe.astro` already sets `target="_blank"`; switch it to the helper so there is one rule.

## Tests

- `src/lib/contact.test.ts` (new):
  - `resolveContactEmail` returns `undefined` for `""`, `"  "` and `undefined`, and the trimmed value otherwise.
  - `connectLinks` keeps the settings order and includes LinkedIn.
  - `connectLinks` adds `E-mail` only when an email is present, and never emits `mailto:` for a blank email.
  - The WhatsApp constants: the form is a `forms.gle` URL and the criteria URL is a `docs.google.com/document` URL.
- `src/lib/noPersonalEmail.test.ts` (new): reads every file under `src/components`, `src/pages`, `src/layouts`, `src/content` and `src/data`, skipping `isolated-components` and `*.test.*`. It asserts:
  - No `ben@`, `benwei@` or `@gmail.com`.
  - No `chat.whatsapp.com`, no `eventbrite.com` and no "Start a chapter".
  - Until the giving plan lands, an explicit allowlist names the row-12 files and fails once they are clean, so the list cannot go stale.
- `src/lib/seoEndpoints.test.ts`: change "surfaces contact email and socials" so that with a blank setting, `Email:` is absent and each social still appears. With a mocked non-blank email, `Email:` is present.
- `src/lib/site.test.ts`: the settings still load when `contactEmail` is `""` or missing.
- `src/lib/externalLink.test.ts` (new):
  - An `https` link to another host gets `target="_blank"` and `rel="noopener noreferrer"`.
  - The site's own origin (including its `www.`/apex twin), root-relative paths, `mailto:`, `tel:` and `#anchor` get nothing.
- Register the new test files before `prove-red`: `--test` matches registered `describe › it` names, not filenames. Content-driven assertions (nyc.md, settings.json) are invisible to test attribution, so run them on the branch, not "on base".

## Scenarios to Demonstrate

- `contactus-default`: socials only, with no E-mail disc and no "drop us a note".
- `chapterconnect-default`: LinkedIn, Twitter and Facebook badges, with no email line. Retarget `chapterconnect-per-chapter-email` to "a shared inbox is configured" (the email line and badge come back), so both sides of the fallback rule are shown.
- `chapter-route-sf-bay-area`: interim lead Jessica, Volunteer and Host buttons that resolve under the base path, and the Connect row with LinkedIn.
- `chapter-route-new-york-city`: no `info@` line.
- `community-route-founders-with-leads-and-events`: LinkedIn in the Connect row.
- `get-involved`: a single Volunteer CTA and no "Start a chapter".
- `support-us`: five cards and no mailto.
- `whatsapp-community`: one step, Apply → form, criteria → doc, both opening in a new tab (a driven capture).
- `content-hub`: the Medium, LinkedIn and newsletter links open in a new tab.
- `eventspage-upcoming-and-past` and `events-route-upcoming-and-past`: no Eventbrite button.
- `sponsorinquiry-awaiting-a-form`: LinkedIn fallback and no email copy.
- `harvard-in-tech-landing-page`: the footer shows socials only.
- New: "Contact with a shared inbox configured". Settings email set to `hello@example.com`, showing that the footer, ContactUs and Connect all regain the email.

Content edits don't mark screenshots stale, so recapture with `--target --force`. Screen every changed PNG for wrong-page frames.

## Out of scope

- Donate and giving email buttons, and the ben@ defaults in giving components (row 12): see the giving plan.
- Confirming the owners of the outside accounts (owner: skip).
- Recruiting a permanent SF lead; choosing or creating the generic inbox.
- The Mailchimp "Subscribe" link, Luma embed configuration and `src/pages/isolated-components/`.
- Design-review mockups under `public/design-review-4ece6c14/`, which contain old addresses. They are not site pages; delete or hide them in the launch-cleanup plan if they ship.