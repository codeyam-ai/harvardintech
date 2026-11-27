---
title: "perf -- Skip type checks on content-only edits (ne)"
mode: backend
createdAt: "2026-11-27T16:20:33Z"
prefix: "perf"
source: codeyam-audit-speed
---

## Summary

Both static checks run on every change, including text- and data-only edits under `src/data/` and `src/content/`.
Neither declares `inputs` (the `config-query` advisory `noInputs`). `tsc` takes about 7 s and `astro-check` about 24 s
per run (session-finalize Phase 0.5). Declaring `inputs` lets them skip when no file they read changed. Estimate: about
1–2 min saved per cycle (31 s × about 4 verify-build runs per cycle on content-only edits).

Submitted by: ne

## Key Decisions

- Use the inputs the advisory suggests: `["**/*.ts","**/*.tsx"]` for `tsc` and `["**/*.astro","**/*.ts","**/*.tsx"]` for `astro-check`.
  Then add every other file they read (`tsconfig.json`, `astro.config.mjs`, `src/content/config.ts` schema), because a missing
  input causes a false skip.
- Decide whether `tsc` is redundant. The editor's Astro default treats `astro check` as a replacement for `tsc`, since it already
  checks `.ts`/`.tsx`. Keep `tsc` only if it covers files `astro check` does not (for example `scripts/*.mjs` or `scripts/*.ts`),
  and record which.

## Implementation

### 1. Add inputs

**File**: `.codeyam/editor.json`

Add an `inputs` array to each entry in `staticChecks`.

### 2. Decide on tsc

Compare what `npx tsc --noEmit` and `npx astro check` each cover in this repo. Keep or remove `tsc` accordingly.

### 3. Verify

Make a content-only edit (one `src/data/*.json` value) and confirm `codeyam-editor editor verify-build` skips both checks. Then
make a `.astro` edit and confirm both run.

## Reused existing code

- `.codeyam/editor.json` (`staticChecks`)

## Scenarios to Demonstrate

- No visual change.

## General fix for the CodeYam editor (for Jared)

Verified general. In the editor source, `default_static_checks_from_stack` (`crates/codeyam-editor/src/commands/editor/template.rs`,
around line 1478) seeds the `astro-check` check for the `astro-github-pages` stack with `filePatterns` but no `inputs`. The generic
web-stack `tsc` fallback does the same. So every project scaffolded on these stacks runs its static checks on every change.
Seeding `inputs` there (with the config files they read) fixes it for all new projects. — ne