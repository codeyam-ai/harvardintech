/**
 * The one stylesheet request for all three webfont families the tokens name
 * (Crimson Pro display, Inter body, JetBrains Mono kickers). Weights are pinned
 * to what the tokens actually use. Shared by BaseLayout and the isolated-preview
 * middleware so the site and its previews can never load different faces.
 */
export const SITE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';

/** The preconnect pair plus the stylesheet link, as head markup. */
export const SITE_FONTS_HEAD =
  '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
  `<link href="${SITE_FONTS_HREF}" rel="stylesheet" />`;

/**
 * Adds the webfont links to an HTML document's head, once. A document that
 * already carries the stylesheet (or has no head) comes back unchanged.
 */
export function withSiteFonts(html: string): string {
  if (html.includes(SITE_FONTS_HREF.replaceAll('&', '&amp;')) || html.includes(SITE_FONTS_HREF)) {
    return html;
  }
  const at = html.indexOf('</head>');
  return at === -1 ? html : html.slice(0, at) + SITE_FONTS_HEAD + html.slice(at);
}
