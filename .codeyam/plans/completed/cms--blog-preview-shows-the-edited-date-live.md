---
title: "cms -- Blog preview shows the edited date live"
mode: ui
createdAt: "2026-10-21T23:51:40Z"
prefix: "cms"
source: manual
---

## Summary

Nicole: "I added a new blog entry; the title populates live on the right side, but the date does not update in real time." The /admin live preview patches the embedded page in one of two ways. It patches exactly when the page marks its elements with the CMS's public marker attributes (`data-cms-entry`, `data-cms-field`, `data-cms-body`), and approximately, "by shape", when it doesn't. This site marks nothing (`grep data-cms- src` finds no matches), so the blog post previews by shape. That catches the title, which appears verbatim, but not the date: the page shows `formatLongDate(date)` ("October 21, 2026"), never the raw `2026-10-21` being edited. The fix is in this repo: mark the blog article so the patcher writes the date into the `<time>` element. Its `setFieldText` already formats `<time>`/`date` fields and keeps `datetime` valid.

## Status check (2026-10-22, before building)

Nothing in this plan is built yet: `grep data-cms- src` still finds no matches, and `BlogPostArticle.astro`, `PageBanner.astro` and `src/pages/blog/[slug].astro` are unchanged since the plan was written. Three findings from re-reading the CMS (0.15.0 + local patch) change the details below:

- **The formats do differ.** `formatPreviewDate` (`node_modules/@codeyam/cms/src/lib/entryPreview.ts`) is `toLocaleDateString()` with no locale or options, so a patched date reads "10/21/2026" (in a US browser) while the published page reads "October 21, 2026". The CMS gives a page no way to choose the format.
- **New entries work too.** Nicole's case is a *new* post, which has no page of its own. The preview borrows another blog post's page as a shell, and `stagedPreview.ts` patches any `[data-cms-entry]` of the same collection on a shell page. Marking the template therefore covers new posts as well as edits.
- **The title lives in `PageBanner`'s `<h1>`.** That component is shared by 38 pages, so the title marker goes in through a new optional prop that only the blog article passes.

## Key Decisions

- **Mark the template; don't change the CMS.** The markers are the CMS's documented contract for exact preview. Marking also removes the "approximate preview" banner on blog posts.
- **Blog post page only.** That's what Nicole reported. Chapters, communities and projects could get the same markers later, and listing them as follow-ups keeps this change small.
- **Accept the format difference in the preview for now.** While someone is editing, the live date shows in the browser's short form ("10/21/2026"). The published page keeps "October 21, 2026". Matching them means changing the CMS's `formatPreviewDate`, which also drives the editor pane, so it's a follow-up for upstream `@codeyam/cms`, not part of this fix. The date now *updates*, which is what Nicole reported missing.
- **Leave the locked-preview branch unmarked.** `BlogPostBody` renders `LockedPreviewBody` for a password-locked preview. Only the `BlogPostArticle` branch gets markers.

## Implementation

### 1. Mark the blog article

**File**: `src/components/BlogPostArticle.astro`

Add `data-cms-entry={`blog/${slug}`}` to `<article>` (this needs a new `slug` prop), `data-cms-field="date"` on the `<time>`, and `data-cms-body` on a new wrapper around `<slot />` alone inside `.post-body`. The wrapper must not contain the `Embed`, or a body patch would wipe the embed.

**File**: `src/components/ui/PageBanner.astro`

Add an optional `titleField?: string` prop. When it's set, the `<h1>` carries `data-cms-field={titleField}`. When it isn't, the other 38 callers render exactly as before.

**File**: `src/components/BlogPostBody.astro`

Pass `slug={post.id}` to `BlogPostArticle`. The route already hands `post` through, so `src/pages/blog/[slug].astro` needs no change.

**File**: `src/pages/isolated-components/BlogPostArticle.astro`

Pass a `slug` so the isolation page renders the markers too.

## Reused existing code

- `formatLongDate` from `src/lib/dates.ts`
- The marker contract and `setFieldText` in `node_modules/@codeyam/cms/src/lib/stagedPreview.ts` / `node_modules/@codeyam/cms/src/client/stagedPreviewPatch.ts` (no edits)

## Reproduction Test

Changing the date of a blog entry in the editor doesn't change the date on the previewed page.

**Target**: `src/lib/blogPreviewMarkers.test.ts`. Vitest here doesn't compile `.astro` files (see `vitest.config.ts`), so the test reads the component source, following the existing `siteIcons.test.ts` / `presenceConsistency.test.ts` pattern. It uses the CMS's exported attribute names (`CMS_ENTRY_ATTR`, `CMS_FIELD_ATTR`, `CMS_BODY_ATTR`), so a rename upstream makes it fail. Run with `codeyam-editor editor refresh-tests --test <name>`.

```ts
it('marks the blog date for the live preview', () => {
  const src = readFileSync('src/components/BlogPostArticle.astro', 'utf-8');
  expect(src).toMatch(/<time[^>]*data-cms-field="date"/);
  expect(src).toMatch(/data-cms-entry=\{`blog\/\$\{slug\}`\}/);
});
it('keeps the embed outside the patched body', () => { /* data-cms-body wraps <slot /> only */ });
it('marks the banner title only when asked', () => { /* PageBanner h1 gets data-cms-field={titleField} */ });
```

The rendered markup is also checked in the isolation scenarios below, which is where `.astro` output is verified in this repo.

Status: PROPOSED. Confirm red at execution. Expected failure: no `data-cms-field` attribute in `BlogPostArticle.astro`.

## Scenarios to Demonstrate

- Blog post page as published (unchanged look)
- Blog post with an embed (embed survives a body patch)

## Follow-ups (not in this change)

- Make `@codeyam/cms`'s `formatPreviewDate` match the site's long date ("October 21, 2026"), or let a page choose the format, so the live preview date matches the published one.
- Add the same markers to chapter, community and project pages.