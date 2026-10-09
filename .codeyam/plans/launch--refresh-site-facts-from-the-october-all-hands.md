---
title: "launch -- Refresh site facts from the October all-hands"
mode: ui
createdAt: "2026-10-09T23:41:46Z"
prefix: "launch"
source: manual
---

## Summary

Bring the site's public numbers and two recent event pages up to date with the October 5, 2026 volunteer all-hands deck, and soften the AI community's call cadence to match how the calls actually run. The user reviewed the deck for confidentiality and approved exactly these items for public use: the headline stats, the Alumni Day and NYC Fall Mixer results, and the AI cadence wording. Today the homepage says "100+ events" and "4 city chapters", has no attendee figure, and the two 2026 event pages carry only pre-event copy.

## Key Decisions

- **New stat values (from the deck):** `150+` events hosted (was `100+`), a new `10,000+` event attendees stat, and `6+` active communities (was `4` "City chapters and growing"). The deck lists the six as NYC, SF, London, Boston, Founders, AI "& more". This also settles decision-sheet row `new-stat-chapters`, where the user asked for one consistent communities count.
- **Change every place a number appears, not only the homepage.** The same figures are copied into the Momentum Fund page copy, the accomplishments list and the component defaults. If only one copy changes, the site contradicts itself, which row `new-stat-8000` was raised to fix.
- **Event results go on the past-event entries.** Alumni Day (June 5, 2026): 120 alumni at HIT's first Boston/Cambridge event, with open networking and topic tables on AI, Founders, Boston/Cambridge, Security and general interest. NYC Fall Welcome Mixer (Sept 28, 2026): sold out within 24 hours, with more than 90% of registrants attending. Do NOT publish internal-only details from the deck: volunteer names, the attendee list being shared through the Directory, or goals.
- **AI cadence wording is the user's own:** calls are "every other week, as schedules allow". Keep it short. The deck's "bimonthly" was ambiguous, and the user chose this phrasing.

## Implementation

### 1. Homepage stats

**File**: `src/content/stats/events-hosted.md` — value `150+`.

**File**: `src/content/stats/global-chapters.md` — value `6+`, label `Active communities`.

**New file**: `src/content/stats/event-attendees.md` — value `10,000+`, label `Event attendees`, placed next to events (renumber `order` as needed).

The band goes from 5 to 6 stats. Check that `src/components/landing/Stats.astro` lays out 6 cleanly at phone, tablet and desktop widths, and update its built-in default list (lines ~20-21) to the same values.

### 2. The other copies of the same numbers

**File**: `src/content/pageCopy/donate.md` — the `stats` list: `150+` events and `6+` Active communities.

**File**: `src/data/donatePage.json` — the same values, so the fallback copy agrees.

**File**: `src/content/accomplishments/events-hosted-and-co-hosted.md` — value `150+`.

**File**: `src/pages/isolated-components/HomeSections.astro` and `src/pages/isolated-components/MomentumStats.astro` — update the fixture values so scenarios show today's numbers.

### 3. Past-event results

**File**: `src/content/events/2026-06-05-harvard-alumni-in-tech-alumni-day-meetup-in-cambridge-ma.md` — add a `description` with the Alumni Day result above.

**File**: `src/content/events/2026-09-28-harvard-in-tech-fall-welcome-mixer.md` — the current `description` is pre-event promotion ("Space is limited…"). Rewrite it in the past tense and lead with the sell-out and turnout. Decision-sheet row `fix-sept28-event` also touches this entry, so read its note before editing.

### 4. AI cadence

**File**: `src/content/communities/ai.md` — first callout: title `Calls every other week`, text starting "An open call every other week, as schedules allow — …". In the body, change "the bi-weekly call" to "the regular call".

**File**: `src/content/sponsorLevels/global.md` — "Sponsor the AI community's bi-weekly global calls" becomes "Sponsor the AI community's regular global calls".

**File**: `src/pages/isolated-components/CommunityCallouts.astro` and `src/pages/isolated-components/CalloutCard.astro` — match the fixture text. Code comments that say "bi-weekly" can stay.

## Reused existing code

- The `stats` collection rendered by `src/components/landing/Stats.astro`
- The `pageCopy` merge in `src/lib/pageCopyMerge.ts` for the Momentum Fund stats
- The `CommunityCallouts` component in `src/components/CommunityCallouts.astro`

## Scenarios to Demonstrate

- Homepage stats band with 6 stats at desktop and phone widths
- Momentum Fund page stats showing 150+ and 6+
- Past-event pages for Alumni Day and the Fall Mixer showing their results
- AI community page with the new cadence callout

Capture notes: the stats band is below the fold and URL fragments do not scroll captures, so frame it with a `hover` interaction and `--target` the recapture. Content edits are invisible to screenshot staleness, so force with `--target --force`.