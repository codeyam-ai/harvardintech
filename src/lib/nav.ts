// Pure, framework-free helpers for the site navigation. No `fs` and no Astro
// imports, so the rules unit-test directly — the same shape as `./drafts.ts`
// and `./events.ts`. The layout supplies the data; this module only reshapes it.
//
// The Chapters dropdown is DERIVED from the `chapters` collection rather than
// hand-listed in `nav.json`. Publishing a chapter through the CMS is therefore
// the only step needed to put it in the menu, and drafting, renaming, or
// deleting one can no longer leave a menu entry pointing at a 404.
//
// The group is injected here rather than marked in `nav.json` because the CMS
// round-trip would erase a marker: `normalizeNavItem` in @codeyam/cms rebuilds
// every nav item from `label` plus `children`/`url` and drops any other key, and
// it collapses a dropdown with no children back to a plain link. A group the
// layout injects is the only form that serializer cannot corrupt.
import { byPresence } from './localPresence';
import type { NavItem } from './site';

/**
 * The minimum shape needed to build a chapter link: `{ slug, ...data }`, the
 * same projection `index.astro` builds for the "Our chapters" section.
 */
export interface ChapterLike {
  slug: string;
  city: string;
  order?: number;
  /** `active` or `forming`; absent means active. Ordering only — a forming
   *  chapter is a real chapter with a real page, so it is never hidden from
   *  the menu, just listed after the cities that have events. */
  status?: string;
}

/**
 * The minimum shape needed to build a community link. `name` rather than `city`
 * — a community is defined by an interest, not a location — but the ordering and
 * draft rules are the chapter rules, so the two derivations stay symmetric.
 */
export interface CommunityLike {
  slug: string;
  name: string;
  order?: number;
}

/** The label the injected dropdown carries in the header. */
export const CHAPTERS_LABEL = 'Chapters';

/**
 * The last entry in the Chapters dropdown: somewhere to go for the large
 * majority of alumni who are not in one of the four cities.
 *
 * Before this, a visitor who opened Chapters and found no city near them hit a
 * dead end — the menu's implicit message was "this is not for you". The item
 * points at the homepage band that offers the WhatsApp community, the
 * newsletter and volunteering, none of which need a local chapter to join.
 *
 * It lives beside the chapter items rather than in `nav.json` because it is
 * only meaningful WITH them: on a site with no chapters published the dropdown
 * does not exist and neither should this.
 */
export const GLOBAL_COMMUNITY_ITEM: NavItem = {
  label: 'Global community',
  url: '/#global-community',
};

/** The group derived communities are merged INTO. Unlike Chapters — a group
 *  this module injects wholesale — Communities already exists in `nav.json`
 *  carrying hand-authored links (WhatsApp), so the derived items join it. */
export const COMMUNITIES_LABEL = 'Communities';

/** The group the derived Chapters dropdown is inserted after, reproducing
 *  today's menu order. Absent (renamed or removed), the group is appended. */
const INSERT_AFTER_LABEL = 'Programs';

/**
 * Menu items for the given chapters, ordered exactly as the "Our chapters"
 * section orders its cards (`OurChapters.astro`) — active chapters first, then
 * forming ones, and within each group by `order` with `city` breaking ties and
 * sorting the entries that carry no `order` at all. Sharing the convention is
 * what keeps the two surfaces from ever disagreeing.
 *
 * The status tier goes in FRONT of the `order` pin rather than replacing it, so
 * an editor who has pinned an order still gets it — within their tier. A
 * visitor opening the menu meets the cities that actually hold events first,
 * which is what the menu is mostly used to find.
 *
 * The label is the chapter's own `city`, so the menu shows the name the editor
 * typed; the url is built from the `slug`, matching the `/chapters/<slug>`
 * route. Paths are returned base-agnostic — the layout wraps them in `withBase`
 * at render, as it already does for every other nav item.
 *
 * Callers pass chapters that are already draft-filtered (via `publishedEntries`),
 * so draft visibility stays one rule applied identically at every call site.
 */
export function chapterNavItems(chapters: ChapterLike[]): NavItem[] {
  return byPresence(chapters).map((chapter) => ({
    label: chapter.city,
    url: `/chapters/${chapter.slug}`,
  }));
}

/**
 * The top-level menu with the derived Chapters dropdown inserted directly after
 * `Programs`, or appended when no such item exists.
 *
 * The dropdown ends with `GLOBAL_COMMUNITY_ITEM`, so the menu always offers a
 * way in to someone who lives in none of the listed cities — which is most
 * alumni. It is appended HERE rather than by the caller because it is part of
 * what this group means, and a caller that forgot it would leave that visitor
 * at a dead end with nothing to say so.
 *
 * With no chapters the group is omitted entirely rather than rendered empty: an
 * empty dropdown is a caret that opens onto nothing, and the CMS serializer
 * collapses it back into a plain link pointing nowhere. The global item does
 * NOT keep it alive on its own — a lone "Global community" under a "Chapters"
 * caret would be a menu lying about what it contains.
 *
 * Returns a new array — the input is not mutated.
 */
export function withChapterGroup(items: NavItem[], chapterItems: NavItem[]): NavItem[] {
  if (chapterItems.length === 0) return [...items];

  const group: NavItem = {
    label: CHAPTERS_LABEL,
    children: [...chapterItems, GLOBAL_COMMUNITY_ITEM],
  };
  const anchor = items.findIndex((item) => item.label === INSERT_AFTER_LABEL);
  if (anchor === -1) return [...items, group];

  return [...items.slice(0, anchor + 1), group, ...items.slice(anchor + 1)];
}

/**
 * Menu items for the given communities, ordered the way chapters are: by the
 * optional `order` pin, then alphabetically by name. The label is the
 * community's own `name`, the url is built from the `slug` to match the
 * `/communities/<slug>` route.
 *
 * Callers pass communities already draft-filtered (via `publishedEntries`), the
 * same contract `chapterNavItems` has.
 */
export function communityNavItems(communities: CommunityLike[]): NavItem[] {
  return [...communities]
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name))
    .map((community) => ({ label: community.name, url: `/communities/${community.slug}` }));
}

/**
 * The top-level menu with the derived community links merged into the existing
 * `Communities` group, after whatever that group already lists by hand.
 *
 * This is the asymmetry with `withChapterGroup`: Chapters is a group this module
 * OWNS, so it injects the whole thing; Communities is a group an editor already
 * owns in `nav.json` (the WhatsApp link), so the derived items are appended to
 * its children rather than replacing them. An editor reordering or renaming the
 * hand-authored links keeps working, and publishing a community still needs no
 * nav edit at all.
 *
 * With no communities the menu is returned unchanged — including the case where
 * `nav.json` has no Communities group, which is then NOT created: an empty
 * dropdown is the same caret-onto-nothing the chapters rule avoids.
 *
 * Returns a new array; neither the input list nor its item objects are mutated.
 */
export function withCommunityItems(items: NavItem[], communityItems: NavItem[]): NavItem[] {
  if (communityItems.length === 0) return [...items];

  const anchor = items.findIndex((item) => item.label === COMMUNITIES_LABEL);
  if (anchor === -1) return [...items, { label: COMMUNITIES_LABEL, children: communityItems }];

  const existing = items[anchor];
  const merged: NavItem = {
    ...existing,
    children: [...(existing.children ?? []), ...communityItems],
  };

  return [...items.slice(0, anchor), merged, ...items.slice(anchor + 1)];
}

/**
 * Every site-internal url in the menu tree, in declaration order. Internal means
 * rooted at `/`; the `https://` links out to Medium, LinkedIn, and the
 * newsletter are another site's problem and out of scope for the guard.
 */
export function internalNavUrls(items: NavItem[]): string[] {
  const urls: string[] = [];

  const walk = (nodes: NavItem[]) => {
    for (const node of nodes) {
      if (node.url?.startsWith('/')) urls.push(node.url);
      if (node.children) walk(node.children);
    }
  };
  walk(items);

  return urls;
}

/**
 * Reduce a nav url to the page it actually lands on: drop any `#fragment` so
 * `/events#webinars` resolves against `/events`, read a bare `/#about` as the
 * home page, and ignore a trailing slash.
 */
function toPath(url: string): string {
  const withoutFragment = url.split('#')[0];
  const trimmed = withoutFragment.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * The urls with no page behind them. `knownPaths` is every route the site
 * actually builds — the static pages plus what the `[slug]` routes generate
 * from published content.
 *
 * This is what catches the hand-authored links that remain in `nav.json` after
 * the chapters stop being hand-listed: `Content Hub → Blog` points at one
 * specific post (`/blog/welcome`) and breaks the moment that post is drafted,
 * renamed, or deleted.
 *
 * Reported as a unit test rather than a build gate on purpose: the deploy
 * workflow runs `npm run build` and never runs vitest, so a dead link informs
 * developers without ever blocking an editor's publish.
 */
export function unresolvedNavUrls(urls: string[], knownPaths: string[]): string[] {
  const known = new Set(knownPaths.map(toPath));
  return urls.filter((url) => !known.has(toPath(url)));
}

/**
 * The menu with every link to a hidden homepage band removed, and any dropdown
 * left empty by that removal removed with it.
 *
 * This is the second half of "Hidden": an editor who takes a band off the page
 * must not be left with a menu item that scrolls to nothing. It is the same rule
 * that already governs Chapters and Communities — a menu entry may not outlive
 * what it points at — applied to the hand-authored anchors in `nav.json`.
 *
 * Matching is on the fragment-bearing url exactly as `hiddenSectionAnchors`
 * emits it (`/#board`), so a link to a real page (`/events`, `/donate`) is never
 * touched, and neither is a `coming-soon` band's link: that band is still on the
 * page, so following the link lands on the placeholder.
 *
 * An emptied dropdown is dropped rather than rendered as a caret onto nothing —
 * the rule `withChapterGroup` already applies to an empty chapter list.
 *
 * Returns a new tree; neither the input list nor its item objects are mutated.
 */
export function withoutHiddenSections(items: NavItem[], hiddenAnchors: string[]): NavItem[] {
  if (hiddenAnchors.length === 0) return [...items];
  const hidden = new Set(hiddenAnchors);

  const prune = (nodes: NavItem[]): NavItem[] => {
    const out: NavItem[] = [];
    for (const node of nodes) {
      if (node.url && hidden.has(node.url)) continue;
      if (!node.children) {
        out.push(node);
        continue;
      }
      const children = prune(node.children);
      // A group that had children and lost them all goes too. A group that never
      // had any is a plain link the CMS serializer already collapsed, so it is
      // left exactly as found.
      if (children.length === 0 && node.children.length > 0) continue;
      out.push({ ...node, children });
    }
    return out;
  };

  return prune(items);
}
