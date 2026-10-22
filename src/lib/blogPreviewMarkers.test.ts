import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CMS_BODY_ATTR, CMS_ENTRY_ATTR, CMS_FIELD_ATTR } from '@codeyam/cms/lib/stagedPreview';

// The /admin live preview's contract with a blog post page. The CMS patches the
// preview iframe by looking for these attributes; an unmarked page is patched
// "by shape", which is how the edited date never reached the preview — the
// page shows "October 21, 2026" and never the raw `2026-10-21` being edited.
//
// Read from source because vitest does not compile `.astro`. The attribute
// names come from the CMS itself, so a rename upstream fails here rather than
// silently unhooking the preview.
const ROOT = process.cwd();
const ARTICLE = readFileSync(join(ROOT, 'src/components/BlogPostArticle.astro'), 'utf-8');
const BANNER = readFileSync(join(ROOT, 'src/components/ui/PageBanner.astro'), 'utf-8');
const BODY = readFileSync(join(ROOT, 'src/components/BlogPostBody.astro'), 'utf-8');

/** The template half of an `.astro` file — everything after the frontmatter. */
function template(source: string): string {
  return source.split(/^---$/m).slice(2).join('---');
}

describe('BlogPostArticle preview markers', () => {
  // THE BUG. The date is the field that never updated: it must be marked so
  // the preview writes the edited value into the element that shows it.
  it('marks the published date as the date field', () => {
    expect(template(ARTICLE)).toMatch(new RegExp(`<time[^>]*${CMS_FIELD_ATTR}="date"`));
  });

  // The entry key is how the preview tells this post from any other on the
  // page; it is the collection and the file stem, and absent with no slug.
  it('names the article entry as blog plus its slug', () => {
    expect(template(ARTICLE)).toContain(
      `<article ${CMS_ENTRY_ATTR}={slug ? \`blog/\${slug}\` : undefined}>`,
    );
  });

  // The title renders inside PageBanner, so it is marked through its prop.
  it('marks the banner title as the title field', () => {
    expect(template(ARTICLE)).toMatch(/<PageBanner[^>]*titleField="title"/);
  });

  // A body patch replaces everything inside the marker. It wraps the slot
  // alone, so the embed beneath the body survives an edit to the text.
  it('wraps the body slot and leaves the embed outside it', () => {
    const match = new RegExp(`<div ${CMS_BODY_ATTR}>([\\s\\S]*?)</div>`).exec(template(ARTICLE));
    expect(match).not.toBeNull();
    expect(match![1]).toContain('<slot />');
    expect(match![1]).not.toContain('<Embed');
  });
});

describe('BlogPostBody preview markers', () => {
  // The entry key needs the post id; without it the article renders unmarked.
  it('passes the post id through as the slug', () => {
    expect(template(BODY)).toContain('slug={post.id}');
  });
});

describe('PageBanner preview markers', () => {
  // Every other page uses this banner too. The heading is marked only through
  // `titleField`, which is undefined unless a caller sets it — so pages that
  // are not patched exactly carry no marker.
  it('marks the heading only through the titleField prop', () => {
    expect(template(BANNER)).toContain(`<h1 ${CMS_FIELD_ATTR}={titleField}>`);
    expect(BANNER).not.toMatch(/titleField\s*=\s*['"]/);
  });
});
