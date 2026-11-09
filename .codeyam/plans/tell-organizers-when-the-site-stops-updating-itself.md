---
title: "Tell organizers when the site stops updating itself"
mode: backend
createdAt: "2026-11-09T22:28:21Z"
source: proposed-plan
---

## Who benefits
Volunteer organizers and editors who are not developers. They rely on the site updating on its own (CMS saves deploy, the nightly Luma import adds events) and do not read GitHub Actions logs.

## Evidence
- obs-1797287eaa3b (2026-11-06): one ordinary CMS save silently stopped every deploy until a developer changed code.
- obs-f05b342faa7c (2026-11-09): an organizer noticed missing London events only by checking the site against Luma by hand, because the import had been importing nothing for two weeks.

## Smallest useful version
When the deploy workflow fails, or the Luma import ends with a refused feed, send one notification (an email or a GitHub issue opened by the workflow) to a configured organizer address. It should say in plain words what stopped and since when.

## Case against
GitHub already emails the person whose push triggered a failed workflow. The two root causes seen so far have each been fixed in code. A notification channel needs an owner to watch it, and for a small volunteer site it may be noise between incidents. Making the import fail loudly (see the app theme) might cover most of the need for free.