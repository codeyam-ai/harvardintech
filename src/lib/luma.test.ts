import { describe, expect, it } from 'vitest';
import { eventCoverSrc } from './luma';

describe('eventCoverSrc', () => {
  // A Luma upload is asked for at card size through the CDN's resize path,
  // square, so the card never downloads the full-size original.
  it('resizes a Luma upload to a square of the requested width', () => {
    expect(
      eventCoverSrc('https://images.lumacdn.com/uploads/uz/f83ca1d3.png', 560),
    ).toBe(
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,quality=80,width=560,height=560/uploads/uz/f83ca1d3.png',
    );
  });

  // Luma serves covers from two folders; both live under the same host and
  // take the same resize prefix.
  it('resizes a Luma event-covers path the same way', () => {
    expect(
      eventCoverSrc('https://images.lumacdn.com/event-covers/u2/736d91fd', 280),
    ).toBe(
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,quality=80,width=280,height=280/event-covers/u2/736d91fd',
    );
  });

  // A URL that already carries resize options is left alone rather than given
  // a second, nested prefix the CDN would not understand.
  it('leaves an already-resized Luma URL unchanged', () => {
    const resized =
      'https://images.lumacdn.com/cdn-cgi/image/width=400/uploads/uz/f83ca1d3.png';
    expect(eventCoverSrc(resized, 560)).toBe(resized);
  });

  // A cover an editor uploaded to the site is served as-is: only Luma's CDN
  // understands the resize path.
  it('passes a site-hosted image through unchanged', () => {
    expect(eventCoverSrc('/images/events/sf-event-room.webp', 560)).toBe(
      '/images/events/sf-event-room.webp',
    );
  });

  // A lookalike host must not be rewritten — the check is on the exact
  // Luma image origin, not a substring of it.
  it('does not rewrite a URL on a different host', () => {
    const other = 'https://example.com/images.lumacdn.com/uploads/a.png';
    expect(eventCoverSrc(other, 560)).toBe(other);
  });
});
