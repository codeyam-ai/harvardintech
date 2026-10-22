---
title: "cms -- Fix image uploads in the content editor"
mode: ui
createdAt: "2026-10-21T23:51:04Z"
prefix: "cms"
source: manual
---

## Summary

Image uploads in the /admin content editor are broken in three ways, and together they explain Nicole's 21 Oct reports ("the new picture does not appear… nothing happens; no error messages", the Seattle hero change failing, the blog's insert-image doing nothing). (1) **An upload doesn't attach to the field it was started from.** Uploading inside the picker opened by a gallery row, a hero field or the body's 🖼️ button only stages the file in the library. She has to then click the new thumbnail, and nothing tells her so. The result is six orphaned uploads today and London still at `photos: []`. (2) **Each publish overwrites `src/data/media.json` with a stale copy.** The upload diffs against the `committed` manifest baked into the static admin page at build time. `githubCommit` then writes that whole file onto the current HEAD tree, so any record added since the admin was last built is dropped. Commit `75d884d` dropped the 19 Oct city-photo records this way. Because a failed deploy also means no admin rebuild, the baseline gets staler with every publish. (3) **One upload makes two files.** Today's commits contain byte-identical `x.webp` + `x-2.webp` pairs.

## Key Decisions

- **Fix it in `@codeyam/cms`, shipped through this repo's `patches/@codeyam+cms+0.15.0.patch` first.** Nicole is blocked now. The patch is the established route (see `CMS_SETUP.md`), and 0.15.0 is now installed (bd01271) and still has all three bugs. Upstream the same change so a later upgrade can drop it, the way the deploy-watch and duplicate-entry halves did.
- **Merge the manifest at commit time instead of staging the whole file.** Before writing, re-read `src/data/media.json` from the target branch's HEAD and apply only this session's add/remove operations to it. A stale page can then never delete records it didn't touch. Stage operations, not a whole-file snapshot.
- **Uploading in a picker selects the upload.** One file uploaded from a picker opened for a target gets passed to that picker's `onSelect`, so it lands in the gallery row, hero field or body. `stageUpload` already returns the asset "so the caller can select it immediately". The picker just never does.
- **Always write `alt`** (the editor's text, or `""` only when the editor explicitly marks the image decorative). Never omit the key.

## Implementation

### 1. Upload in the picker attaches to its target

**File**: `node_modules/@codeyam/cms/src/components/admin/MediaPickerModal.tsx`

After a successful `stageUpload` of a single file, call `onSelect(asset)`. For several files dropped at once, keep today's behaviour but show a "Click a photo to use it" hint. `EntryEditor.onPickImage` (`node_modules/@codeyam/cms/src/components/admin/EntryEditor.tsx`) already routes the result to the field, list row or body.

### 2. Merge the manifest at publish time

**File**: `node_modules/@codeyam/cms/src/lib/mediaStaging.ts`
**File**: `node_modules/@codeyam/cms/src/lib/githubCommit.ts`

Record the staged manifest change as add/remove operations against the baseline. At commit time, fetch the branch-HEAD `media.json`, apply the operations with `addAsset` / `removeAsset`, and write the result. Do the same for the in-dev write path, if it bypasses `githubCommit`.

### 3. One upload, one file

**File**: `node_modules/@codeyam/cms/src/components/admin/UploadDropZone.tsx`

Find why one pick calls `stageUpload` twice: input `onChange` plus a drop handler, a StrictMode double effect, or a re-entrant click. Guard it so a file is staged once. `buildUploadedAsset` currently de-dupes the second call to `-2` instead of rejecting it.

### 4. Regenerate the patch

**File**: `patches/@codeyam+cms+0.15.0.patch`

Regenerate with `npx patch-package @codeyam/cms`. Add a paragraph to `CMS_SETUP.md` under "The patch on top of the package" saying what this half carries and that it is meant to go upstream.

## Reused existing code

- `stageUpload`, `discardUpload`, `stagedManifest` from `node_modules/@codeyam/cms/src/lib/mediaStaging.ts`
- `addAsset`, `removeAsset`, `MEDIA_MANIFEST_PATH` from `node_modules/@codeyam/cms/src/lib/mediaLibrary.ts`
- `onPickImage` in `node_modules/@codeyam/cms/src/components/admin/EntryEditor.tsx`

## Reproduction Test

A publish built from a stale manifest baseline drops a record that HEAD has and this session never touched.

**Target**: a new test next to the manifest-merge helper (where existing CMS-contract tests live in this repo, e.g. `duplicateEntry.test.ts`). Run with `codeyam-editor editor refresh-tests --test <name>`.

```ts
// A stale admin page must not drop media records it never touched.
it("keeps HEAD's records when the staged baseline is older", () => {
  const baseline = { assets: [a] };
  const head = { assets: [a, cityPhoto] };
  const ops = [{ op: 'add', asset: upload }];
  expect(applyManifestOps(head, ops).assets.map((x) => x.filename))
    .toEqual([a.filename, cityPhoto.filename, upload.filename]);
});
```

Status: PROPOSED. Confirm red at execution. Expected failure: no op-based merge exists yet. The publish writes `addAsset(baseline, upload)`, which leaves out `cityPhoto`.

## Scenarios to Demonstrate

- Chapter editor: add a gallery row, upload a photo in the picker, and the row shows the photo with no second click
- Chapter editor: upload a PNG for the hero, and the hero field fills in (PNG becomes WebP)
- Blog editor: 🖼️ then upload, and the image markdown is inserted at the cursor
- Publish from a page built before another editor's upload, and both uploads' records survive