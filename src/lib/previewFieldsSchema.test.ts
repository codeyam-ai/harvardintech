import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import { previewFields } from '@codeyam/cms/content';
import { sitePreviewFields } from './previewFieldsSchema';

// The reproduction, and the guard.
//
// When an editor mints a preview link the CMS clones the entry and writes the
// timestamp UNQUOTED. YAML hands that to Zod as a Date, upstream declares it a
// string, and the entry fails validation — which stops the WHOLE build, not just
// that one page. Every `staging` deploy from 2026-08-20 onward failed this way;
// `main` escaped only because it happened to hold no preview files, and pointing
// the editor at `main` removed that luck.
//
// `astro/zod` rather than `astro:content` so this runs under plain vitest with no
// content-layer bootstrap — the same reason the rest of `src/lib` is framework-free.
const entry = z.object(sitePreviewFields);
const upstreamEntry = z.object(previewFields);

/** Exactly what the CMS writes for `previewCreatedAt: 2026-08-20T17:24:30.165Z`. */
const YAML_PARSED_DATE = new Date('2026-08-20T17:24:30.165Z');

describe('sitePreviewFields — the bug it exists for', () => {
  // The failing case, stated against the UPSTREAM schema so this test also
  // documents why the shim is needed. If a future @codeyam/cms release fixes the
  // serializer or widens the field, this assertion flips and the shim can go —
  // which is the signal to delete `previewFieldsSchema.ts` entirely.
  it('upstream previewFields still rejects what the CMS actually writes', () => {
    const result = upstreamEntry.safeParse({
      previewOf: 'social-media-marketing-specialist-events',
      previewCreatedAt: YAML_PARSED_DATE,
    });

    expect(result.success).toBe(false);
  });

  // The fix: the same input now parses. This is the assertion that would have
  // caught the outage on the day it was introduced.
  it('accepts the unquoted timestamp YAML turns into a Date', () => {
    const result = entry.safeParse({
      previewOf: 'social-media-marketing-specialist-events',
      previewCreatedAt: YAML_PARSED_DATE,
    });

    expect(result.success).toBe(true);
  });

  // Accepting is only half of it. Everything downstream — `isPreview`, the
  // preview index, the staleness copy — was written against a string, so a Date
  // reaching them would move the failure from the build to the page, which is
  // worse because it is silent.
  it('normalises the Date back to the ISO string the CMS meant to write', () => {
    const parsed = entry.parse({ previewCreatedAt: YAML_PARSED_DATE });

    expect(parsed.previewCreatedAt).toBe('2026-08-20T17:24:30.165Z');
    expect(typeof parsed.previewCreatedAt).toBe('string');
  });

  // A correctly QUOTED timestamp must still work — the serializer quotes some
  // values already, so both spellings reach the schema in practice.
  it('passes an already-quoted timestamp through untouched', () => {
    const parsed = entry.parse({ previewCreatedAt: '2026-08-20T17:24:30.165Z' });

    expect(parsed.previewCreatedAt).toBe('2026-08-20T17:24:30.165Z');
  });

  // The field is optional: an ordinary entry carries no preview marker at all,
  // and must not be forced to invent one.
  it('leaves an ordinary entry with no preview fields alone', () => {
    const parsed = entry.parse({});

    expect(parsed.previewCreatedAt).toBeUndefined();
    expect(parsed.previewOf).toBeUndefined();
  });

  // The other two preview fields are untouched by the shim and must keep
  // working, or a preview link would validate but not resolve.
  it('keeps previewOf and previewLock as the upstream schema declares them', () => {
    const parsed = entry.parse({
      previewOf: 'social-media-marketing-specialist-events',
      previewLock: 'a-passphrase',
    });

    expect(parsed.previewOf).toBe('social-media-marketing-specialist-events');
    expect(parsed.previewLock).toBe('a-passphrase');
  });

  // A genuinely wrong type is still wrong. Widening to string|Date must not have
  // widened to anything.
  it('still rejects a value that is neither a string nor a date', () => {
    expect(entry.safeParse({ previewCreatedAt: 12345 }).success).toBe(false);
  });
});
