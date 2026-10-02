// The public surfaces the responsive audit covers, and the sizes it covers them at.
//
// "Surface" here means A PAGE A VISITOR SEES, not a component. Responsive
// behaviour is a property of the whole route — the header, the bands and the
// footer reflowing together — so auditing an isolated component at four widths
// proves almost nothing about the page it sits on. One representative concrete
// URL per route pattern is the unit.
//
// This list is the audit's scope in one place so the coverage guard in
// `responsiveCoverage.ts` can assert against it, rather than each test carrying
// its own idea of which pages are public.
//
// No `fs` and no Astro imports: this is plain data, so both the guard and its
// unit tests read it directly.

/** One public surface the audit covers. */
export interface PublicRoute {
  /** Stable identifier, used in failure messages so a human knows which page to open. */
  key: string;
  /** The route pattern as Astro declares it, including any `[slug]`. */
  route: string;
  /** The file that renders it — how a scenario is matched back to a route. */
  pageFilePath: string;
  /** A concrete URL the audit actually captures. */
  auditUrl: string;
}

/**
 * The eleven capturable public surfaces, in the order the audit walks them.
 *
 * Deliberately EXCLUDED, and not to be "fixed" back in:
 *
 * - `/admin` — it ships from `@codeyam/cms` inside `node_modules`, so any
 *   layout fix belongs upstream rather than in this repo.
 * - The cutover runbook — an internal page excluded from the public build at
 *   the route level by `includeCutoverRunbook`. The two internal documents that
 *   used to sit beside it, the status page and the donor-wall deck, were retired
 *   to `docs/archive/` on 2026-10-01 and are no longer routes at all.
 * - `/give` — the giving plan retired the route (it now redirects to
 *   `/donate`), so there is no page left to audit. Its components still sit in
 *   `src/components/give/` pending a separate decision to delete them, but
 *   nothing renders them at a URL.
 * - `/404` — NOT excluded on merit. The page is public, it is one of the
 *   surfaces most in need of this audit (it renders its own inline `<main>`
 *   rather than going through `BaseLayout`, so it has no header, no footer and
 *   no responsive rules), and the audit wanted frames of it. It is excluded
 *   because the capture harness cannot photograph it: every entry point —
 *   `register`, `preview`, `recapture-stale` — treats an HTTP 404 RESPONSE as a
 *   failed navigation and refuses to write a frame. Astro serves this page with
 *   a 404 status at both `/404` and any unknown path, which is correct, so
 *   there is no 200-status URL that reaches it. Listing it here would leave the
 *   coverage guard below permanently red with no action that could clear it.
 *   The audit therefore assesses it by reading its source and records both the
 *   assessment and this tooling gap as findings in the report.
 *
 * `/donate` IS audited, but its findings are recorded only: the campaign look is
 * paused by owner decision until Nicole's content merges, so the audit writes
 * down what it sees there and proposes no change.
 *
 * Two of these URLs only exist while their scenario's seed is applied —
 * `/our-story/` is a CMS page the scenario seeds, and the volunteer project
 * slug likewise. Both return 404 against an unseeded dev server, which is
 * expected and not a finding.
 */
export const PUBLIC_AUDIT_ROUTES: readonly PublicRoute[] = [
  { key: 'home', route: '/', pageFilePath: 'src/pages/index.astro', auditUrl: '/' },
  { key: 'events', route: '/events', pageFilePath: 'src/pages/events.astro', auditUrl: '/events' },
  {
    key: 'chapter',
    route: '/chapters/[slug]',
    pageFilePath: 'src/pages/chapters/[slug].astro',
    auditUrl: '/chapters/nyc',
  },
  {
    key: 'community',
    route: '/communities/[slug]',
    pageFilePath: 'src/pages/communities/[slug].astro',
    auditUrl: '/communities/founders',
  },
  {
    key: 'blog-post',
    route: '/blog/[slug]',
    pageFilePath: 'src/pages/blog/[slug].astro',
    auditUrl: '/blog/spotlight-charlie-cheever',
  },
  {
    key: 'site-page',
    route: '/[slug]',
    pageFilePath: 'src/pages/[slug].astro',
    auditUrl: '/our-story/',
  },
  {
    key: 'volunteer',
    route: '/volunteer',
    pageFilePath: 'src/pages/volunteer.astro',
    auditUrl: '/volunteer',
  },
  {
    key: 'volunteer-project',
    route: '/volunteer/projects/[slug]',
    pageFilePath: 'src/pages/volunteer/projects/[slug].astro',
    auditUrl: '/volunteer/projects/chapter-launch-team-toronto',
  },
  {
    key: 'sponsor',
    route: '/sponsor',
    pageFilePath: 'src/pages/sponsor.astro',
    auditUrl: '/sponsor',
  },
  {
    key: 'webinars',
    route: '/webinars',
    pageFilePath: 'src/pages/webinars.astro',
    auditUrl: '/webinars',
  },
  { key: 'donate', route: '/donate', pageFilePath: 'src/pages/donate.astro', auditUrl: '/donate' },
];

/**
 * The widths every audited surface must be captured at.
 *
 * These are the four already configured in `.codeyam/editor.json` — Mobile
 * 390x844, Tablet 768x1024, Laptop 1280x800, Desktop 1440x900. The audit adds
 * no size of its own; Tablet and Laptop had simply never been used.
 */
export const AUDIT_SIZES: readonly string[] = ['Mobile', 'Tablet', 'Laptop', 'Desktop'];
