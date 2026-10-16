---
title: "Warn content editors when copy uses a retired brand name"
mode: ui
createdAt: "2026-10-16T16:16:42Z"
source: proposed-plan
---

## Who benefits
The volunteers who edit the site in the content admin, and the owner, who has had to ask twice in a week for the same copy to be made consistent.

## Evidence
- obs-901e87f1cf07 (2026-10-15): the owner found the brand written several ways and asked for one form everywhere.
- obs-db73de50a6e5 (2026-10-14): public figures live in five places, so keeping copy consistent means hunting every copy by hand.

## Smallest useful version
When an editor saves an entry in the content admin, show an inline warning if the text contains "Harvard in Tech", "Harvard in Technology" or a lowercase "Harvard alumni in tech", reusing the same pattern as the new guard test. A warning, not a block.

## Case against
The guard test already catches it on the next development session, and the deploy runs no tests, so the warning only helps if editors read it. It covers one rule; a general style checker is much bigger. The editors are a small group who now know the rule.