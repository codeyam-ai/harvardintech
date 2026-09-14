// Where a page is ADVERTISED, as opposed to where it is SERVED.
//
// Until the domain cutover those are two different places. The preview is served
// from a project subpath on GitHub Pages (codeyam-ai.github.io/harvardintech/),
// but every URL the site hands to a crawler, a share card or an answer engine
// must name harvardintech.com — the preview is noindex and passphrase-gated, so
// a canonical link or og:url pointing at it advertises a page nobody can read.
//
// `CANONICAL_ORIGIN` names the advertised origin; `site` (PAGES_SITE) keeps
// naming where the build really lives. At launch the two meet, and the variable
// can simply be dropped — `canonicalOrigin` then falls back to `site`.
//
// Server-only module — read from `.astro` frontmatter and endpoints, never a
// client island (it reads `process.env`, the same as `previewGate.ts`).

/**
 * The origin every advertised URL is built on: `CANONICAL_ORIGIN` when set,
 * else the build's own `site`, else `fallback` (the request origin).
 */
export function canonicalOrigin(site: URL | undefined, fallback: string): string {
  return process.env.CANONICAL_ORIGIN || site?.origin || fallback;
}

/**
 * The advertised URL for a served path.
 *
 * `base` (Astro's `BASE_URL`, e.g. `/harvardintech/` or `/`) is removed from the
 * front of `pathname` before it is joined onto `origin`, because the base is a
 * fact about where the preview is hosted, not part of the page's address on the
 * real domain. Runs of slashes collapse to one, so no join produces `//`.
 */
export function canonicalFor(pathname: string, base: string, origin: string): string {
  const trimmedBase = base.replace(/\/+$/, '');
  let rest = pathname;
  if (trimmedBase && (rest === trimmedBase || rest.startsWith(`${trimmedBase}/`))) {
    rest = rest.slice(trimmedBase.length);
  }
  rest = `/${rest}`.replace(/\/{2,}/g, '/');
  return new URL(rest, `${origin.replace(/\/+$/, '')}/`).href;
}
