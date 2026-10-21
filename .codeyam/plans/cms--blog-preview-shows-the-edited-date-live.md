---
title: "cms -- Blog preview shows the edited date live"
mode: ui
createdAt: "2026-10-21T23:51:40Z"
prefix: "cms"
source: manual
---

## Summary

Nicole: "I added a new blog entry; the title populates live on the right side, but the date does not update in real time." The /admin live preview patches the embedded page in one of two ways. It patches exactly when the page marks its elements with the CMS's public marker attributes (`data-cms-entry`, `data-cms-field`, `data-cms-body`), and approximately, "by shape", when it doesn't. This site marks nothing (`grep data-cms- src` finds no matches), so the blog post previews by shape. That catches the title, which appears verbatim, but not the date: the page shows `formatLongDate(date)` ("October 21, 2026"), never the raw `2026-10-21` being edited. The fix is in this repo: mark the blog article so the patcher writes the date into the `<time>` element. Its `setFieldText` already formats `<time>`/`date` fields and keeps `datetime` valid.

## Key Decisions

- **Mark the template; don't change the CMS.** The markers are the CMS's documented contract for exact preview. Marking also removes the "approximate preview" banner on blog posts.
- **Blog post page only.** That's what Nicole reported. Chapters, communities and projects could get the same markers later, and listing them as follow-ups keeps this change small.
- **Check that the formats agree.** The patcher formats through the CMS's `formatPreviewDate`, and the built page through `formatLongDate` (`src/lib/dates.ts`). If they differ (e.g. "Oct 21" vs "October 21"), the preview briefly shows a different format from the published page. Note it in the plan's outcome, and match them if the CMS exposes a way.

## Implementation

### 1. Mark the blog article

**File**: `src/components/BlogPostArticle.astro`

Add `data-cms-entry={`blog/${slug}`}` to `<article>` (this needs a new `slug` prop), `data-cms-field="title"` to the element that renders the title (inside `PageBanner`, so it may need a pass-through attribute prop on `src/components/ui/PageBanner.astro` or wherever it lives), `data-cms-field="date"` on the `<time>`, and `data-cms-body` on `.post-body`'s slot wrapper. The body wrapper must not also contain the `Embed`, otherwise a body patch would wipe the embed. Wrap the `<slot />` alone.

**File**: `src/pages/blog/[slug].astro`

Pass the entry's slug through.

## Reused existing code

- `formatLongDate` from `src/lib/dates.ts`
- The marker contract and `setFieldText` in `node_modules/@codeyam/cms/src/lib/stagedPreview.ts` / `node_modules/@codeyam/cms/src/client/stagedPreviewPatch.ts` (no edits)

## Reproduction Test

Changing the date of a blog entry in the editor doesn't change the date on the previewed page.

**Target**: an isolated-component or jsdom test beside `BlogPostArticle` (follow how `src/pages/isolated-components/BlogPostArticle.astro` is exercised). Run with `codeyam-editor editor refresh-tests --test <name>`.

```ts
// The live preview can only patch the date if the page marks it.
it("marks the blog date for the live preview", async () => {
  const html = await renderBlogArticle({ slug: 'welcome', title: 'Hi', date: new Date('2026-10-21') });
  expect(html).toMatch(/<time[^>]*data-cms-field="date"/);
  expect(html).toMatch(/data-cms-entry="blog\/welcome"/);
});
```

Status: PROPOSED. Confirm red at execution. Expected failure: no `data-cms-field` attribute in the rendered markup.

## Scenarios to Demonstrate

- Blog post page as published (unchanged look)
- Blog post with an embed (embed survives a body patch)