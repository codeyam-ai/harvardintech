// Old-URL → new-URL map for the Strikingly site this one replaces.
//
// Two groups live here. The first is the OLD SITEMAP (`orig/sitemap_xml.html`):
// every address the Strikingly site published, which search engines have indexed
// and which members have bookmarked. The second is the SECTION 404s — paths like
// `/chapters/` that look like index pages because a real page sits one level
// below them, but that were never routes here.
//
// GitHub Pages cannot send a real 301: it serves static files and nothing else.
// With `output: 'static'` Astro writes one small HTML file per entry carrying a
// `<meta http-equiv="refresh">` and a `rel=canonical` to the target, which is
// what Google documents as an acceptable substitute when server redirects are
// unavailable. Real 301s would need Cloudflare in front of the domain, which
// moves DNS off GoDaddy and means re-creating the HostGator MX/SPF records by
// hand — a risk the domain-transfer runbook avoids on purpose. Worth revisiting
// after launch if search traffic justifies it.
//
// Every target carries a trailing slash, matching what `withBase` now emits for
// internal links (see `src/lib/url.ts`), so a redirect never lands on a URL that
// then has to redirect again.
//
// Targets are written SITE-ROOT-RELATIVE and get the deploy's base path from
// `redirectsForBase` below — they are not usable as-is. See its comment.
export const REDIRECT_TARGETS: Record<string, string> = {
  // --- old sitemap -------------------------------------------------------
  // The mission hero, which is where the nav's own "Mission" link goes. There
  // is no longer an /about page to send these to — see the plan's B.
  '/about-us': '/#about',
  '/about': '/#about',

  '/nyc': '/chapters/nyc/',
  '/san-francisco': '/chapters/sf-bay-area/',

  // No chapter exists for either city. The chapters section is the honest
  // destination: it shows what does exist and how to start one. Retarget these
  // to their own chapter pages if LA or Japan ever launches.
  '/l-a': '/#chapters',
  '/japan': '/#chapters',

  '/volunteers': '/volunteer/',

  // The old site's /webinars held the 2020 COVID-era sessions. They have no home
  // here yet — the history/archive plan builds that section. Until it ships,
  // /events is the closest true answer; retarget when it does.
  '/webinars': '/events/',

  // --- section 404s ------------------------------------------------------
  // Each of these has real pages BELOW it (`/chapters/nyc/`) but no index of its
  // own, so anyone who trimmed the URL back by hand got a 404.
  '/chapters/': '/#chapters',
  '/communities/': '/#community',
  '/volunteer/projects/': '/volunteer/',
};

/**
 * The map Astro is actually given, with every TARGET prefixed by the deploy's
 * base path.
 *
 * Astro prefixes the base on the redirect's SOURCE but not on its target. On a
 * project-subpath build (`DEPLOY_BASE_PATH=/harvardintech`) it writes
 * `dist/nyc/index.html` — reached at `/harvardintech/nyc/` — whose refresh
 * points at a bare `/chapters/nyc/`. That is the domain ROOT of
 * codeyam-ai.github.io, where this site does not live, so every old URL would
 * redirect a visitor to a 404. The `rel=canonical` it emits alongside is wrong
 * for the same reason, which is the more expensive half: a canonical pointing
 * at a 404 is what a search engine records.
 *
 * Sources are deliberately left alone — prefixing them too would build
 * `/harvardintech/harvardintech/nyc/`.
 *
 * On the custom-domain build the base is '/', the prefix is empty, and the map
 * passes through unchanged.
 */
export function redirectsForBase(base: string): Record<string, string> {
  const prefix = base.replace(/\/$/, '');
  if (prefix === '') return { ...REDIRECT_TARGETS };
  return Object.fromEntries(
    Object.entries(REDIRECT_TARGETS).map(([from, to]) => [from, `${prefix}${to}`]),
  );
}
