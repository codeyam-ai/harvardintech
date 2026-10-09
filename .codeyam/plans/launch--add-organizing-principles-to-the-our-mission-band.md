---
title: "launch -- Add organizing principles to the Our mission band"
mode: ui
createdAt: "2026-10-09T23:41:46Z"
prefix: "launch"
source: manual
dependsOn: ["launch--add-an-our-mission-section-for-the-mission-link"]
---

## Summary

Add HIT's four **organizing principles** to the new Our mission band on the homepage. Both 2026 all-hands decks present them as part of who HIT is, and the user approved them for public use. They belong next to the purpose and vision that the queued Our mission plan already brings in from the June deck.

## Key Decisions

- **Depends on the Our mission plan** (`launch--add-an-our-mission-section-for-the-mission-link`). That plan creates the `mission` band, its `MissionStatement` component and its content entry. This plan extends it, so it cannot run first.
- **Wording, from the October 5, 2026 deck (newest), lightly tidied:**
  - **Excellence with Integrity** — Pursue the highest standards of work, while acting ethically and transparently.
  - **Add Value + Pay It Forward** — Elevate and uplift each other's work.
  - **Collaborative Growth** — Make decisions for the good of the organization and community.
  - **Service-Driven Leadership** — Be accountable, communicate clearly, and measure success by positive impact.
  The June deck says "Add 2x Value". The October wording is used.
- **Editable in /admin.** The principles go in the mission entry as a structured list (title + text), and the component defaults hold the same wording, following the band convention the mission plan describes. Use the markdown body only if the homeSections schema cannot carry a list.
- **Laid out as a compact 4-up row** (2×2 on tablet, stacked on phone) under the purpose and goals, so the band still reads as one statement.

## Implementation

### 1. Content

**File**: `src/content/homeSections/mission.md` (created by the dependency plan)

Add a `principles` list with the four items above. If the `homeSections` schema in `src/content/config.ts` has no field for it, add an optional `principles: z.array(z.object({ title: z.string(), text: z.string() }))`, and the matching list widget in `src/data/collections.json` so /admin can edit it.

### 2. Rendering

**File**: `src/components/landing/MissionStatement.astro` (created by the dependency plan)

Render the principles under the goals, falling back to the defaults when the entry has none. Pass them through from `src/components/landing/HomeSections.astro` the same way the band's other fields are passed.

## Reused existing code

- `sectionCopy` from `src/lib/homeSections.ts`
- `loadHomeSections` from `src/lib/homeSectionsContent.ts`
- `SectionHead` from `src/components/ui/SectionHead.astro`

## Scenarios to Demonstrate

- Mission band with principles on the full homepage, at desktop, tablet and phone widths
- Isolated `MissionStatement` with an entry that has no principles, so the defaults render