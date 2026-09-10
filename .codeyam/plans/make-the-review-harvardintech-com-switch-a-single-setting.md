---
title: "Make The review.harvardintech.com Switch A Single Setting"
mode: backend
createdAt: "2026-09-10T15:35:07Z"
source: manual
dependsOn: ["cms--stop-cms-preview-links-from-breaking-the-staging-build"]
---

## Summary

The staging (review) track is served from https://nseldeib.github.io/harvardintech-staging. The planned move to `review.harvardintech.com` is documented as "three lines in the `staging` job" in `DEPLOY_SETUP.md`, but it is really a set of code edits on switch day. You have to drop `DEPLOY_BASE_PATH`, repoint `PAGES_SITE`, and restore a `CNAME` write. Two more address settings the docs never mention also have to change: `siteUrl` in `src/data/cms.json` and in `src/data/settings.json`. The CMS uses them for its "view on site" links, preview links and deploy-status check.

This plan turns the switch into one GitHub repository variable, `REVIEW_DOMAIN`. While it is unset, the staging build behaves exactly as it does today. Once it is set, the staging build serves from that domain at the root and writes the matching `CNAME`. Switch day then needs no code change. It becomes a short checklist: add the DNS record, set the Pages custom domain, set the variable, re-run the deploy, and update the two `siteUrl` values.

## Key Decisions

- **One Actions variable, `vars.REVIEW_DOMAIN`, not a secret.** The domain isn't sensitive. Leaving it unset means today's behaviour, so merging this plan changes nothing about the live flow.
- **Resolve the values in a shell step that writes `$GITHUB_ENV`.** Don't use an inline `${{ cond && '' || x }}` expression. That idiom returns the fallback whenever the middle value is an empty string, which is exactly the "base path becomes empty" case, so it would silently keep the subpath.
- **`astro.config.mjs` needs no change.** It already does `base = process.env.DEPLOY_BASE_PATH || '/'`, so an empty base path builds at the root.
- **Write the `CNAME` only when the variable is set, and last.** Write it after the build output is final, and remove any stray `dist/CNAME` when the variable is unset. This also defuses the ordering trap in the cutover runbook (step S4). Once `main` ships an apex `public/CNAME`, that file would be copied into the staging output, and the review track must overwrite it rather than claim the apex domain.
- **Keep `siteUrl` in the data files rather than deriving it in CI.** Both tracks' `/admin` read the same `settings.json` and `cms.json`, so a CI-only override in the staging job would leave the prod build's `/admin` pointing at the old address. `settings.json`'s value is already editable in `/admin` as "Public site URL". The switch-day checklist updates both files.
- **No DNS change now** (user decision, 2026-09-10). `harvardintech.com` DNS is at GoDaddy (`domaincontrol.com`) and `review.harvardintech.com` has no record. The plan only prepares the switch. The domain stays untouched until the migration is approved.
- **Runs after the staging-fix plan.** Both edit `deploy.yml` and `DEPLOY_SETUP.md`, and the staging deploy must be green to verify that "unset means unchanged".

## Implementation

### 1. Make the staging job read its origin from `REVIEW_DOMAIN`

**File**: `.github/workflows/deploy.yml`

In the `review` job:
- Add a "Resolve staging origin" step before "Build staging site".
  - If `${{ vars.REVIEW_DOMAIN }}` is empty, export `DEPLOY_BASE_PATH=/harvardintech-staging` and `PAGES_SITE=https://nseldeib.github.io` (today's values).
  - Otherwise export an empty `DEPLOY_BASE_PATH` and `PAGES_SITE=https://$REVIEW_DOMAIN`.
- Remove those two keys from the build step's `env:`. Keep `PREVIEW_GATE: '1'` and `INCLUDE_DRAFTS: '1'` exactly as they are.
- In "Publish to staging repo", after `touch dist/.nojekyll`: when `REVIEW_DOMAIN` is set, write it to `dist/CNAME`. Otherwise `rm -f dist/CNAME`.
- Replace the "AT THE CUTOVER … three lines" comments with a pointer to the switch-day checklist (change 3).

### 2. Update the deploy contract test to the new shape

**File**: `src/lib/deployTracks.test.ts`

The test currently pins literal `env:` values in the `review` job:
- `builds the staging track with a base matching the repo it publishes to` must now read the default (unset-variable) base from the resolve step. It should still require that base to equal `pagesBasePathFor(pushTargetRepo(...))`.
- `writes no CNAME on the staging track` becomes "writes a CNAME only from `REVIEW_DOMAIN`". The only `dist/CNAME` write must be guarded by the variable and must come after the build.
- `gates both tracks while neither is meant to be public` stays as it is.

**File**: `src/lib/deployTracks.ts`

Add a small pure helper only if it keeps the test readable, for example one that pulls the default base path out of the resolve step. Keep the module framework-free.

### 3. Rewrite the switchover as a switch-day checklist

**File**: `DEPLOY_SETUP.md`

Replace "Moving staging onto `review.harvardintech.com` is three lines…" with this checklist:
1. At GoDaddy, add `CNAME review → nseldeib.github.io`. This is additive and leaves the apex, `www`, MX and SPF untouched.
2. In the `harvardintech-staging` repo, go to Settings → Pages → Custom domain, enter `review.harvardintech.com`, wait for the certificate, then enforce HTTPS.
3. In `harvardintech`, go to Settings → Variables and set `REVIEW_DOMAIN=review.harvardintech.com`.
4. Re-run the staging deploy.
5. In `/admin` → Settings, set "Public site URL" to `https://review.harvardintech.com` (this writes `src/data/settings.json`), and update `siteUrl` in `src/data/cms.json` to match. The CMS has no field for that second value, so it is a one-line edit.
6. Update the working-site link in `docs/nicole-review.md`.

To undo: unset the variable and re-run the deploy. Also fix the variable table below the checklist to show the new mechanism.

**File**: `src/components/cutover/OperatorDetail.astro`

In the S2 operator detail, add the `REVIEW_DOMAIN` step and the `siteUrl` step to the existing "Add a single record at GoDaddy… Set the review repo's Pages custom domain…" list.

## Reused existing code

- `pagesBasePathFor` and `pushTargetRepo` from `src/lib/deployTracks.ts`: the existing base-path ↔ push-target contract, extended rather than replaced.
- The `base`/`site` fallbacks in `astro.config.mjs` (`process.env.DEPLOY_BASE_PATH || '/'`): already handle an empty base, so there is no build change.
- The CMS Settings field "Public site URL" (`siteUrl`, defined in `node_modules/@codeyam/cms/src/lib/settingsEditor.ts`): lets an editor update `src/data/settings.json` on switch day without a developer.
- `.github/workflows/deploy.yml` `review` job and its `REVIEW_DEPLOY_KEY` publish step: unchanged apart from the resolve step and the conditional `CNAME`.

## Scenarios to Demonstrate

- **Variable unset (the state after merge):** the staging deploy is green and https://nseldeib.github.io/harvardintech-staging/ loads with styles, assets and `/admin` links intact. This is byte-for-byte the same URL shape as today.
- **Variable set, checked locally before any DNS exists:** build with `DEPLOY_BASE_PATH=` and `PAGES_SITE=https://review.harvardintech.com`, then check that `dist` asset and link paths are root-relative and that a `CNAME` containing `review.harvardintech.com` would be written.
- **Contract test:** `deployTracks.test.ts` fails if someone hard-codes a `CNAME` write or lets the default base drift from the staging repo name.