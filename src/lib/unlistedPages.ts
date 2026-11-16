// Pages that are built and reachable by direct URL, but kept out of sight until
// they are ready: no menu item or homepage link points at them, they carry
// `noindex`, robots.txt disallows them and the sitemap omits them.
//
// Owner, 2026-11-16 (go-live day): the fundraising pages (/donate, /sponsor) are
// not ready, but donor emails already link to /donate, so the URLs must keep
// working. To bring a page back, remove it from this list and restore its links
// (nav.json "Get involved", the homepage giving band's `draft` flag).
// `/admin` is the CMS (go-live, 2026-11-16): unlinked, noindex and behind the
// admin passphrase screen; it is listed here so robots.txt and the sitemap
// leave it out too.
export const UNLISTED_PATHS = ['/admin', '/donate', '/sponsor'] as const;

/** True when `pathname` (any base prefix already stripped) is an unlisted page. */
export function isUnlistedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return UNLISTED_PATHS.some((u) => p === u || p.startsWith(`${u}/`));
}

/** True when a full page URL (as the sitemap integration passes it) is unlisted. */
export function isUnlistedUrl(url: string, base = '/'): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url;
  }
  const prefix = base.replace(/\/+$/, '');
  if (prefix && pathname.startsWith(prefix)) pathname = pathname.slice(prefix.length) || '/';
  return isUnlistedPath(pathname);
}
