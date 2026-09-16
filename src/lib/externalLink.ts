// Which links open in a new tab: every link that leaves the site (owner,
// 2026-09-14, after Nicole's walkthrough — "so that they're not leaving our
// website entirely"). One rule, applied through one helper, so no component
// decides it alone and the rule cannot drift between sections.
//
// Pure, so both branches are unit-testable.

/** The live domain and its `www.` twin always count as the site's own. */
const OWN_HOSTS = ['harvardintech.com', 'www.harvardintech.com'];

function wwwTwin(host: string): string {
  return host.startsWith('www.') ? host.slice(4) : `www.${host}`;
}

/**
 * Whether `href` leaves the site. Only an absolute `http(s)` URL on another
 * host does. Relative and root-relative paths, `#anchors`, `mailto:` and `tel:`
 * never do. `siteOrigin` (the page's own origin — the preview host, or
 * localhost in dev) and its `www.`/apex twin count as the site's own too.
 */
export function isExternalHref(href: string, siteOrigin?: string): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const own = new Set(OWN_HOSTS);
  if (siteOrigin) {
    try {
      const host = new URL(siteOrigin).hostname;
      own.add(host);
      own.add(wwwTwin(host));
    } catch {
      // An unparseable origin adds nothing; the live domain is still own.
    }
  }
  return !own.has(url.hostname);
}

export interface ExternalLinkAttrs {
  target?: '_blank';
  rel?: string;
}

/**
 * The attributes to spread onto an `<a>`: a new tab with `noopener noreferrer`
 * for an outside link, nothing for any other.
 *
 *   <a href={url} {...externalLinkAttrs(url, Astro.url.origin)}>
 */
export function externalLinkAttrs(href: string | undefined, siteOrigin?: string): ExternalLinkAttrs {
  return href && isExternalHref(href, siteOrigin) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}
