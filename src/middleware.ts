// Gives the isolated-component previews the site's webfonts.
//
// Those 120-odd pages each write their own <head> and never render BaseLayout,
// which is where the site loads its fonts — so every preview fell back to
// Times and Arial and looked unlike the real pages. Adding the links here, to
// that one route family, fixes all of them without touching each page.
// Every other route is passed through untouched.
import { defineMiddleware } from 'astro:middleware';
import { withSiteFonts } from './lib/siteFonts';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const isPreview = context.url.pathname.includes('/isolated-components/');
  const isHtml = response.headers.get('content-type')?.includes('text/html') ?? true;
  if (!isPreview || !isHtml) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(withSiteFonts(html), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
