// The blog's single on/off switch for launch.
//
// The owner's decision on 2026-09-14, after Nicole's walkthrough, was to hide
// the blog until there are real articles written for it — a Content Hub card
// leading to one welcome post reads as an empty room. Nicole's counter-point
// stands and is why this is a switch rather than a deletion: a blog built into
// the site is a priority for SEO and AEO, and Harvard alumni are to be invited
// as contributing writers.
//
// So nothing about the blog is removed. The ten Medium stubs keep building at
// their own `/blog/<slug>` URLs, so no link anyone already holds breaks. What
// this hides is every route INTO the blog: the Content Hub's Blog card, the
// recent-posts list above it, and the nav entry (removed from `nav.json`, which
// is CMS-owned data and cannot read this constant).
//
// To bring the blog back: flip this to `true`, restore the Content Hub child in
// `src/data/nav.json`, and point both at the `/blog/` index — see the plan's
// recommendation A for the index itself, which is deferred with this switch.
export const BLOG_ENABLED = false;

// A channel is a route into the blog when it points at an internal `/blog` path.
// Matching the PATH rather than the label keeps the rule working when an editor
// renames the card in the CMS, which is the whole point of the channels prop.
export function isBlogChannel(url: string): boolean {
  return url === '/blog' || url.startsWith('/blog/');
}
