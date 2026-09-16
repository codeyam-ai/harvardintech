// Prefix an internal absolute path with the configured base path so links
// resolve whether the site is served from the domain root (custom domain,
// base '/') or a project subpath (user.github.io/<repo>, base '/<repo>/').
//
// `import.meta.env.BASE_URL` is derived from `base` in astro.config.mjs and
// always ends with '/': it is '/' in local dev / the codeyam preview and
// '/<repo>/' in the Pages CI build. External URLs, protocol-relative URLs,
// and non-absolute strings (mailto:, #anchor) pass through untouched — only
// internal absolute paths starting with '/' get the base.
//
// It is also where an internal page path picks up its trailing slash, so the
// site links to one canonical form of each URL — see `withTrailingSlash` below.
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + withTrailingSlash(path);
}

// Astro writes every page as `<route>/index.html`, so `/events` and `/events/`
// are the same page — but they are two different URLs to a search engine, to an
// analytics report, and to a static host deciding whether to 301. Linking to one
// form everywhere is what stops the site splitting its own traffic in two.
//
// The slash is added HERE rather than by setting `trailingSlash: 'always'` in
// astro.config.mjs, because that option also makes the dev server and the
// codeyam preview 404 on a slash-less URL — so every hand-typed address and
// every capture path would have to carry the slash too. Normalizing at the one
// helper every internal link already passes through gets the canonical form on
// the page without making the slash-less form stop working.
//
// Four kinds of path are left exactly as they are:
//   - one that already ends in '/' (including the bare '/')
//   - one carrying a fragment or a query — the slash belongs before the '#' or
//     '?', and rewriting that correctly is a URL parse this helper does not do
//   - one whose last segment has a file extension: '/images/shield.png' is a
//     FILE, and '/images/shield.png/' is a 404
//   - a protocol-relative '//host' URL, which is not an internal path at all
function withTrailingSlash(path: string): string {
  if (path.startsWith('//')) return path;
  if (path.endsWith('/')) return path;
  if (path.includes('#') || path.includes('?')) return path;
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  if (lastSegment.includes('.')) return path;
  return `${path}/`;
}
