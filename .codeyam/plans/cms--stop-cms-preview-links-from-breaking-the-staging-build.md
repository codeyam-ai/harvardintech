---
title: "cms -- Stop CMS Preview Links From Breaking The Staging Build"
mode: backend
createdAt: "2026-09-10T15:18:11Z"
prefix: "cms"
source: manual
---

## Summary

Nothing published through the content editor reaches any site. `src/data/cms.json` commits every CMS edit to the `staging` branch, and every `staging` deploy since 2026-08-20 has failed with `InvalidContentEntryDataError: projects → preview-g6kj69ws1715hjq3dvawc45mjc … previewCreatedAt: Expected type "string", received "date"`.

The root cause is a CMS bug, not bad content. When an editor mints a preview link, `@codeyam/cms` clones the entry to `preview-<token>.md` and writes `previewCreatedAt: 2026-08-20T17:24:30.165Z` **unquoted**. YAML parses that as a date, but `previewFields.previewCreatedAt` is `z.string()`. `needsQuoting` in the CMS frontmatter serializer does not quote ISO timestamps. This is still true in 0.14.0, which `main` runs, and our 0.14.0 patch does not touch it. So `main` builds today only because it currently holds no preview files. The first preview link minted on either branch breaks that branch's build.

This plan makes the site's schema accept what the CMS actually writes. It then brings `staging` up to date with `main` by merging, not resetting, so the editor → staging → promote flow works again.

## Key Decisions

- **Fix the schema on our side; do NOT exclude `preview-*.md` from the loaders.** Preview files are a feature: `routableEntries` builds them at their token URL and `publishedEntries` hides them from listings. Excluding them from `collectionGlob` would silently break every preview link.
- **Accept a string OR a date and normalise to an ISO string.** Nothing in `src/` or `astro.config.mjs` reads `previewCreatedAt` (verified 2026-09-10), so normalising cannot change any rendered output. It only stops the build from rejecting the field.
- **Report the serializer bug upstream to `@codeyam/cms`.** Our override is a shim. It can be removed once the CMS either quotes ISO timestamps or declares the field as `z.coerce`/union.
- **Merge `main` into `staging`, don't reset it** (user decision, 2026-09-10). This keeps Nicole's editor history on the branch the CMS writes to, and no force-push is needed. The DROP items are removed in the same merge so a later Promote can't carry them to `main`.
- **Order matters:** land the schema fix on `main` first, so the merge brings it (and CMS 0.14.0) to `staging` together.

## Implementation

### 1. Accept the CMS's unquoted preview timestamp

**File**: `src/content/config.ts`

Replace the five `...previewFields` spreads with a site-level variant that keeps `previewOf` and `previewLock` from the CMS but overrides `previewCreatedAt` to accept `string | Date`, transformed to an ISO string. Define the variant in a small framework-free module so it can be unit-tested without `astro:content`.

**New file**: `src/lib/previewFieldsSchema.ts` (new)

Exports `sitePreviewFields`, which is `{ ...previewFields, previewCreatedAt: <string|date → ISO string>.optional() }`, plus a one-paragraph comment naming the upstream bug and when to delete the shim.

### 2. Bring `staging` up to date with `main`

After change 1 is on `main`, open a PR `main → staging` (or merge locally and push) and resolve it as follows:
- **Take `main`'s side** for `src/content/momentumSections/testimonials.md` and `src/content/projects/social-media-marketing-specialist-events.md`. The KEEP/RESCUE items were already applied to `main` on 2026-09-10, and the three new role files are byte-identical on both branches.
- **Delete in the merge commit:** `src/content/momentumSections/how-your-support-will-be-used.md`, the three `preview-*.md` files (two in `projects/`, one in `momentumSections/`), and `public/images/gallery/hit-bod.webp`. These previews are stale share links to content that has already been rescued.
- The merge also moves `staging` from `@codeyam/cms` 0.5.0 to 0.14.0. Confirm `src/data/cms.json` still targets `staging` after the merge.

Done when the `staging` run of `Deploy to GitHub Pages` is green and https://nseldeib.github.io/harvardintech-staging/ shows the Momentum Fund redesign and the three new volunteer roles.

### 3. Correct the deploy comments that describe this wrongly

**File**: `.github/workflows/deploy.yml`

- The comment above the `review:` job says CMS edits go to `main` via `src/data/cms.json`. They go to `staging`.
- The comment in the `main` build step calls the staging job "dormant". It runs on every `staging` push.

**File**: `DEPLOY_SETUP.md`

- Its claim that staging builds are green needs a note that the staging track depends on this fix.

The other stale docs found by the 2026-09-10 audit (testimonials "start empty", projects "production default", CMS 0.13.0 references) are out of scope here and belong in a separate docs plan.

### 4. File the upstream CMS issue

This is not a repo change. Report to `@codeyam/cms` that `needsQuoting` in `src/lib/frontmatter.ts` leaves ISO datetimes bare while `previewFields.previewCreatedAt` is `z.string()`, so every minted preview breaks a consumer's build. Link the issue from the shim's comment.

## Reused existing code

- `previewFields` from `node_modules/@codeyam/cms/src/content-helpers.ts`: the CMS schema being extended, not replaced.
- `isPreview`, `publishedEntries`, `routableEntries` from `src/lib/drafts.ts` (glossary entry: `isPreview`): the existing preview invariants. They key off `previewOf` only, so they are unaffected.
- `collectionGlob` in `src/content/config.ts`: left unchanged. Preview files keep loading.
- `.github/workflows/promote.yml`: the fast-forward promote. It works again once `staging` contains `main`.

## Reproduction Test

A preview entry whose frontmatter carries the CMS's unquoted `previewCreatedAt` timestamp fails schema validation, which is what took the `staging` build down.

**Target**: `src/lib/previewFieldsSchema.test.ts` (new) — run with `codeyam-editor editor refresh-tests --test <registered name>` once it is registered.

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import { sitePreviewFields } from './previewFieldsSchema';

describe('sitePreviewFields', () => {
  // The CMS writes `previewCreatedAt: 2026-08-20T17:24:30.165Z` unquoted, so YAML hands the
  // schema a Date. It must validate and come back as the same instant in ISO form.
  it('accepts the unquoted timestamp the CMS writes and normalises it to an ISO string', () => {
    const schema = z.object({ title: z.string(), ...sitePreviewFields });
    const parsed = schema.parse({
      title: 'Social Media Marketing Specialist- Events',
      previewOf: 'social-media-marketing-specialist-events',
      previewCreatedAt: new Date('2026-08-20T17:24:30.165Z'),
    });
    expect(parsed.previewCreatedAt).toBe('2026-08-20T17:24:30.165Z');
  });

  // A quoted timestamp (or a future CMS that quotes it) must keep working unchanged.
  it('still accepts a quoted timestamp string', () => {
    const schema = z.object({ title: z.string(), ...sitePreviewFields });
    expect(
      schema.parse({ title: 'x', previewCreatedAt: '2026-08-20T17:24:30.165Z' }).previewCreatedAt,
    ).toBe('2026-08-20T17:24:30.165Z');
  });
});
```

Status: PROPOSED — confirm red at execution. Expected failure: `sitePreviewFields` doesn't exist yet, so the import fails. Swapping in the CMS's `previewFields` instead reproduces the production error: `Expected string, received date`.

## Scenarios to Demonstrate

- A volunteer project preview page, built from a `preview-<token>.md` with an unquoted `previewCreatedAt`, rendering at its token URL.
- The `/volunteer` listing with a preview entry present: the preview is NOT listed. This is the existing invariant and must still hold.
- The staging site after the merge: the Momentum Fund page and the three new roles live on https://nseldeib.github.io/harvardintech-staging/.