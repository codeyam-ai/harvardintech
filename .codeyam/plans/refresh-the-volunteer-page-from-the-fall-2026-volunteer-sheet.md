---
title: "Refresh the volunteer page from the Fall 2026 volunteer sheet"
mode: ui
createdAt: "2026-10-09T22:46:11Z"
source: proposed-plan
---

## Summary

The user wants the /volunteer page brought in line with the "Fall 2026 | HIT Volunteer Opportunities" Google Sheet (Drive file 1YmLbinAVIhGYnJHKpy3B0aSpc7QpNoAZGggR0BcIJWc, tab "Fall 2026"). The sheet lists roles such as Alumni Volunteer Coordinator, City Volunteer and City Lead or Co-Lead (SF / Bay Area, Boston / Cambridge, NYC x AI Events), Founders Task Force volunteer and co-lead, and Editorial, each with a description and a point of contact. The site's volunteer projects live in the `projects` collection (`src/content/projects/*.md`) and render on /volunteer.

## Key Decisions

- Publish ROLES ONLY: title, description, and (if the user agrees) the point-of-contact name. Never publish the volunteer names, emails, phone numbers or availability columns the sheet also holds.
- One project entry per distinct role, not per "1 of ∞" row; the sheet repeats each role across rows.
- Confirm with the user which existing project entries (IG Content Creator, LinkedIn Engagement Specialist, Social Media Marketing Specialist, Writer) stay, merge, or retire.
- City lead/co-lead roles link naturally from the new "Lead or co-lead a chapter →" item in the Chapters menu, which already points at /volunteer.

## Implementation

1. Read the sheet's Fall 2026 tab and draft the role list for the user to confirm.
2. Add or update `src/content/projects/<role>.md` entries (title, blurb, active, dates, body), following the shape of `src/content/projects/ig-content-creator.md`.
3. Update the volunteer-page scenarios (`volunteer-page-open-projects`, `volunteer-page-no-open-projects`) and recapture after the content is committed.