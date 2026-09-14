---
title: "One Site: Content Edits Publish Straight To Main"
mode: ui
createdAt: "2026-09-14T17:24:43Z"
source: manual
---

> **PARKED 2026-09-14 at the user's request.** The user is not ready to change the publishing setup yet and wants to make other changes first. Do not run this plan unless the user asks for it. If it does run, it supersedes the two queued staging plans (`cms--stop-cms-preview-links-from-breaking-the-staging-build` and `make-the-review-harvardintech-com-switch-a-single-setting`).

## Decision needed from Jared (flagged 2026-09-14)

In the site audit, the owner marked this plan “Plan it”, then asked that it be flagged for Jared’s review before it goes back into the queue.

**The decision.** Should the site drop the separate staging site, and have Nicole’s content-editor saves go straight to the reviewed site?

**Why it came up**
- Staging has failed to build since Aug 20, so Nicole’s saves reach no site at all.
- The Promote button can’t work while `main` and `staging` disagree.
- The GitHub repo has since moved to the `codeyam-ai` account. Staging still lives under the old `nseldeib` account at `nseldeib.github.io/harvardintech-staging`, and it wasn’t moved.

**The options**
1. **One site now; add a private editor copy at launch.** This is the recommendation, and it is what this plan describes.
   - The editor commits to `main`, and there’s nothing to sync.
   - At launch, the same branch is also built into a private, gated copy with the editor. The public site leaves the editor out, because its pages carry draft text.
   - The spare staging repo and its deploy key are kept for that private copy.
2. **One site, with the second private copy running from today.**
   - Same end state, and launch day needs no new setup.
   - Until launch there are two identical gated sites.
3. **Keep staging and fix it.**
   - Apply the preview-date fix and merge `main` into `staging`.
   - After every developer change, someone must copy it into staging by hand. That drift is what broke it.

**Context worth knowing**
- **Launch timing.** The public launch is waiting on the domain move, which Ben controls, and the owner is “not ready to shift”. So nothing about launch day is urgent.
- **Nicole’s saves.** Until this is decided, they still go to the broken staging branch.
- **The preview-date fix is needed either way.** The first preview link minted on `main` would otherwise break `main`’s build.

---

## Summary

Nicole's content-editor saves commit to the `staging` branch. Every `staging` deploy has failed since 2026-08-20, and her saves only reach the reviewed site through a manual Promote. Promote has been blocked too, because `main` and `staging` diverged. On 2026-09-12 the user decided to drop the staging track: one branch (`main`) and, for now, one site. The editor will commit to `main`, so Nicole's saves appear on the passphrase-gated reviewed site (https://nseldeib.github.io/harvardintech/) in about two minutes. To review a page before sharing it, she uses the editor's drafts and preview links.

At the public launch, the public build deliberately leaves the editor out (`includeCmsIntegration`), because the editor's pages embed draft text. On 2026-09-14 the default was set: keep the spare second hosting repository (`nseldeib/harvardintech-staging` and its `REVIEW_DEPLOY_KEY` secret) rather than deleting it. At launch, a private editor build of `main` is published there, at review.harvardintech.com. This plan documents that launch-day step; it does not build it.

## Key Decisions

- **One branch.** `src/data/cms.json` targets `main`. Nothing deploys `staging` any more. The branch itself is left on GitHub untouched.
- **Fix the preview-link date bug first.** The editor writes `previewCreatedAt` as an unquoted timestamp, YAML reads it as a date, and `previewFields` declares a string, so the first preview file on `main` would break `main`'s build. Accept a string or a date and normalise to an ISO string. This is carried over from the superseded staging plan.
- **Rescue Nicole's last five staging-only files onto `main`,** copied byte-exact from `origin/staging`, after the date fix lands:
  - `src/content/projects/preview-g6kj69ws1715hjq3dvawc45mjc.md`
  - `src/content/projects/preview-qq5aaysz3mrtnmbx2z2gfkqghc.md`
  - `src/content/momentumSections/preview-vf2bygxsmb7pgcwyc0c30zmjyc.md`
  - `src/content/momentumSections/how-your-support-will-be-used.md`
  - `public/images/gallery/hit-bod.webp`

  `momentumSections/testimonials.md` keeps `main`'s version, as decided on 2026-09-10.
- **Retire the staging machinery:** the `review` job and the `staging` push trigger in `deploy.yml`, and `promote.yml`. **Keep** the second repository and its deploy-key secret, because launch day reuses them.
- **Correct every link and direction** so all of them point to the one site. This was the user's explicit ask.
- **Supersede both queued staging plans.** This plan absorbs the date fix from `cms--stop-cms-preview-links-from-breaking-the-staging-build`. `make-the-review-harvardintech-com-switch-a-single-setting` becomes part of the launch-day docs.

## Implementation

### 1. Accept the editor's unquoted preview timestamp
**New file**: `src/lib/previewFieldsSchema.ts` exports `sitePreviewFields`, which is `{ ...previewFields, previewCreatedAt: string | Date → ISO string, optional }`. It includes a short comment naming the upstream `@codeyam/cms` 0.14.0 serializer bug and when to delete the shim.
**File**: `src/content/config.ts` replaces the five `...previewFields` spreads with `...sitePreviewFields`.

### 2. Point the editor at `main`
- `src/data/cms.json`: `repo.branch` becomes `main`, and `siteUrl` becomes `https://nseldeib.github.io/harvardintech`.
- `src/data/settings.json`: `siteUrl` gets the same value.

### 3. Bring over Nicole's remaining staging-only files
Check out the five files listed above from `origin/staging`, unchanged.

### 4. Retire the staging deploy track
- `.github/workflows/deploy.yml`:
  - Remove the `review` job and `staging` from `on.push.branches`.
  - Drop the `workflow_call` trigger (it existed only for promote).
  - Rewrite the header comment for one track today, plus the launch-day private editor build.
  - Fix the "dormant `staging` job" comment in the build step.
- Delete `.github/workflows/promote.yml`.

### 5. Correct every reference
- `docs/nicole-review.md`: one site, one link list. Remove the "Working site" row, the "Two sites" section and the Promote instructions. Rewrite "What happens when she edits" and the ready-to-send note.
- `DEPLOY_SETUP.md`: one gated track today. The launch-day step becomes: add the private editor build of `main` to the kept repository, then point review.harvardintech.com at it.
- `docs/scoping/README.md`, `docs/scoping/domain-transfer-runbook.md`, `CMS_SETUP.md`: the same correction.
- Cutover runbook screens (`src/lib/cutoverProgress.ts`, `src/components/cutover/OperatorDetail.astro`, `RunbookChecks.astro`, `RunbookOnTheDay.astro`, `DecisionDetail.astro`): stop saying the gated track "already exists". Say it is switched on at launch from the kept repository.
- Comments in `src/lib/previewGate.ts`, `src/lib/draftVisibility.ts` and `astro.config.mjs`: the review track is a launch-day build of `main`, not the `staging` branch.
- `public/review/index.html` (the todos page), wherever it points at staging.
- Isolation fixtures that hard-code the staging target (`DeployStatus-*`, `StagingBar-*`, `DecisionTick*`, `StepTick*`): the target branch becomes `main`, and `SITE_URL` becomes the reviewed site. Update the `deploystatus-live` scenario description to match.

### 6. Draft the note to Nicole
A short, plain message the user can send: one link, where she edits, that saves appear in about two minutes, and how drafts and preview links work.

## Tests

- **New** `src/lib/previewFieldsSchema.test.ts`: the reproduction test below.
- `src/lib/deployTracks.test.ts`: remove the staging-track assertions (the `review` job is gone). Keep the reviewed-track base-path and gate assertions. Add one asserting no job deploys a `staging` branch.
- `src/lib/deployWatch.test.ts`: the marker URL fixture moves to the reviewed site.
- `src/lib/deployStage.test.ts`: the success subhead names `main`.
- `src/lib/publishTrack.test.ts`: unchanged. The public build still excludes the editor.

## Reproduction Test

A preview entry whose frontmatter carries the editor's unquoted `previewCreatedAt` fails schema validation. That is what broke the `staging` build, and it would break `main` too once a preview file lands there.

**Target**: `src/lib/previewFieldsSchema.test.ts` (new)

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import { sitePreviewFields } from './previewFieldsSchema';

describe('sitePreviewFields', () => {
  it('accepts the unquoted timestamp the CMS writes and normalises it to an ISO string', () => {
    const schema = z.object({ title: z.string(), ...sitePreviewFields });
    const parsed = schema.parse({
      title: 'Social Media Marketing Specialist- Events',
      previewOf: 'social-media-marketing-specialist-events',
      previewCreatedAt: new Date('2026-08-20T17:24:30.165Z'),
    });
    expect(parsed.previewCreatedAt).toBe('2026-08-20T17:24:30.165Z');
  });

  it('still accepts a quoted timestamp string', () => {
    const schema = z.object({ title: z.string(), ...sitePreviewFields });
    expect(
      schema.parse({ title: 'x', previewCreatedAt: '2026-08-20T17:24:30.165Z' }).previewCreatedAt,
    ).toBe('2026-08-20T17:24:30.165Z');
  });
});
```

Status: PROPOSED. Confirm it fails at execution. Expected failure: `sitePreviewFields` does not exist yet.

## Scenarios to Demonstrate

- The editor's deploy panel after Publish: the success line names `nseldeib/harvardintech` and `main`.
- A volunteer project preview page, built from a `preview-*.md` with an unquoted `previewCreatedAt`, rendering at its token URL.
- The `/volunteer` listing with preview entries present: previews are not listed.
- The cutover runbook's step S2 with the corrected launch-day wording.

## Out of scope

- Deleting the second repository, its deploy key, or the `staging` branch on GitHub. All are left in place, and the repository and key are reused at launch.
- Building the launch-day private editor copy. It is documented only.
- The four Momentum Fund donate-page scenarios whose test data does not load on this dev server. That is a separate follow-up.