---
title: "Seeded scenario captures break while site content is uncommitted"
mode: backend
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

Scenario capture on this Astro site cannot produce trustworthy frames of SEEDED app scenarios while any file under `src/content/` or `src/data/` is uncommitted. The content sandbox (`initContentSandbox` in `astro.config.mjs`, `.codeyam/tmp/content-sandbox/`) does not engage, so seeds are refused ("served committed content"). The documented workaround of stashing those files for the capture pass also failed this session: it produced frames with the chapters and communities collections EMPTY (no Chapters menu group), and `recapture-stale` reported them as clean "Recaptured". Every content-changing feature therefore ends with seeded frames that must be restored by hand and force-recaptured after the commit.

## Key Decisions

- A capture whose seed or collections did not land must fail loudly, never report "Recaptured".
- The sandbox should seed from the WORKING TREE's `src/content` when it is dirty, rather than switching off, so content edits and seeded scenarios can be captured together before the commit.

## Implementation

1. In `astro.config.mjs` (`initContentSandbox`), seed the sandbox from the working-tree `src/content`/`src/data` when dirty, and never leave a collection directory empty across a dev-server restart (the empty-collection-dir watcher bug).
2. Add a post-capture assertion for seeded app scenarios: when a collection the page renders is empty but the seed or production content has rows, fail the capture.
3. Re-verify with `harvard-in-tech-phone-menu-open` and `webinars-route-the-surviving-recordings`, which both captured empty roster frames this session.