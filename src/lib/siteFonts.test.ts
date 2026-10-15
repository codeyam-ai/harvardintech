import { describe, it, expect } from 'vitest';
import { SITE_FONTS_HEAD, SITE_FONTS_HREF, withSiteFonts } from './siteFonts';

describe('withSiteFonts', () => {
  // The isolated previews write their own <head> without the fonts; the links
  // must land inside it, before it closes, so they load like on the real site.
  it('inserts the font links just before the closing head tag', () => {
    const html = '<html><head><title>x</title></head><body>hi</body></html>';
    expect(withSiteFonts(html)).toBe(
      `<html><head><title>x</title>${SITE_FONTS_HEAD}</head><body>hi</body></html>`,
    );
  });

  // A page that already loads the stylesheet must not request it twice.
  it('leaves a document that already links the fonts unchanged', () => {
    const html = `<html><head><link href="${SITE_FONTS_HREF}" rel="stylesheet" /></head></html>`;
    expect(withSiteFonts(html)).toBe(html);
  });

  // Astro escapes `&` in attribute values, so the already-linked check has to
  // recognise the escaped spelling too.
  it('recognises an html-escaped link as already present', () => {
    const escaped = SITE_FONTS_HREF.replaceAll('&', '&amp;');
    const html = `<html><head><link href="${escaped}" rel="stylesheet" /></head></html>`;
    expect(withSiteFonts(html)).toBe(html);
  });

  // A fragment with no head has nowhere sensible to put links.
  it('returns a document without a head unchanged', () => {
    expect(withSiteFonts('<div>fragment</div>')).toBe('<div>fragment</div>');
    expect(withSiteFonts('')).toBe('');
  });

  // Only the first head is touched, so the links are never duplicated.
  it('inserts the links exactly once', () => {
    const out = withSiteFonts('<head></head><template><head></head></template>');
    expect(out.split(SITE_FONTS_HREF).length - 1).toBe(1);
  });
});
