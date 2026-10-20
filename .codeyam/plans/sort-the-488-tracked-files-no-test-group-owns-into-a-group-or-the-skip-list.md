---
title: "Sort the 488 tracked files no test group owns into a group or the skip list"
mode: backend
createdAt: "2026-10-20T18:43:29Z"
source: proposed-plan
---

## Summary

`codeyam-editor editor commit --out-of-workflow` and `verify-test-cache` refuse with "488 tracked file(s) are owned by no test partition and are not in testCacheIgnorePatterns". On 2026-10-15 this blocked a plan-closure commit (the work had to be committed with plain git after ending the build session). The agent-config folders were already added to the ignore list; what remains is project content: `archive/strikingly/**` (the old site snapshot), `.gitattributes`, `.gitignore`, `.github/workflows/deploy.yml`, and others the gate only lists the first 20 of.

## Key Decisions

- Archive material, git metadata and CI files cannot change a vitest result: add them to `testCacheIgnorePatterns` in `.codeyam/editor.json` by folder glob, not file by file.
- Anything under `src/` that reaches here belongs in the vitest partition's `sourceFilePatterns` instead, so a change to it still invalidates the cache.
- Show the user the proposed glob list before writing it.

## Implementation

1. Run `codeyam-editor editor verify-test-cache` and capture the full unowned list from `.codeyam/state/command-output/verify-test-cache.txt`.
2. Group the paths by top-level folder; draft ignore globs for non-source folders and partition globs for any source paths.
3. Apply in `.codeyam/editor.json`, re-run `verify-test-cache` until it reports zero unowned files, and confirm `commit --out-of-workflow --dry-run` passes.