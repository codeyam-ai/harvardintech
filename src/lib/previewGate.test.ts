import { describe, it, expect } from 'vitest';
import {
  PASSPHRASE_PLACEHOLDER,
  PREVIEW_GATE_PASSPHRASE,
  assertPassphraseConfigured,
  gateAppliesTo,
  substitutePassphrase,
} from './previewGate';

// Which pages the review track's passphrase overlay covers.
//
// The gate itself is a deterrent that ships in the client bundle, so these tests
// are not about security strength — they are about the one deliberate hole in
// it. A CMS preview link exists to be handed to an outside reviewer who has no
// account and no reason to hold the site passphrase; gating those URLs would
// mean sending the link and the passphrase together, which hands that reviewer
// the entire unreleased site to read one page. The exemption is the feature.
//
// Kept as a pure predicate rather than a branch inside PreviewGate.astro for the
// reason publishTrack.ts gives: a decision that can only be exercised by a real
// `astro build` is a decision nothing can test.
describe('gateAppliesTo', () => {
  // the ordinary case — every real page on the review origin stays behind the
  // passphrase, which is the whole point of the review track
  it('gates ordinary site pages', () => {
    expect(gateAppliesTo('/')).toBe(true);
    expect(gateAppliesTo('/donate')).toBe(true);
    expect(gateAppliesTo('/blog/welcome')).toBe(true);
    expect(gateAppliesTo('/chapters/nyc')).toBe(true);
  });

  // the exemption: a preview page is reached by an unguessable URL instead
  it('exempts a preview page in any routed collection', () => {
    expect(gateAppliesTo('/blog/preview-7fk3q9wc2mbn5xr8dt4vha6j0e')).toBe(false);
    expect(gateAppliesTo('/chapters/preview-j2x9m5w7qd3fb8kn0rvt6chsa1')).toBe(false);
    expect(gateAppliesTo('/volunteer/projects/preview-abc123')).toBe(false);
  });

  // the shareable list is exempt for the same reason as the pages it links to —
  // gating the index while exempting its targets would be the worst of both
  it('exempts the shareable previews index', () => {
    expect(gateAppliesTo('/previews/qsrwe18v5cm4ccas8pffxktt4c')).toBe(false);
  });

  // the deploy serves under /harvardintech today and a bare domain after the
  // cutover, so the rule must not depend on which one it is
  it('exempts a preview under a base path', () => {
    expect(gateAppliesTo('/harvardintech/blog/preview-7fk3q9wc2mbn5xr8dt4vha6j0e')).toBe(false);
    expect(gateAppliesTo('/harvardintech/previews/qsrwe18v5cm4ccas8pffxktt4c')).toBe(false);
  });

  // Astro emits directory-style URLs, so the same page arrives both ways
  it('exempts a preview with a trailing slash', () => {
    expect(gateAppliesTo('/blog/preview-7fk3q9wc2mbn5xr8dt4vha6j0e/')).toBe(false);
  });

  // the dangerous near-miss: a REAL page whose slug merely contains the word
  // preview must stay gated. Exempting it would silently un-gate ordinary
  // content, which is the failure mode with no visible symptom.
  it('still gates a real page whose slug merely contains "preview"', () => {
    expect(gateAppliesTo('/blog/my-preview-of-2026')).toBe(true);
    expect(gateAppliesTo('/blog/preview')).toBe(true);
  });
});

// The passphrase has no default any more: the old one sat in plain text in the
// repo and its docs, so it was everyone's. It comes only from the secret.
describe('PREVIEW_GATE_PASSPHRASE', () => {
  // With no secret there is no fallback value to leak — and the retired
  // default must never come back as one.
  it('is empty without the secret, and never the retired default', () => {
    if (!process.env.PREVIEW_GATE_PASSPHRASE) expect(PREVIEW_GATE_PASSPHRASE).toBe('');
    expect(PREVIEW_GATE_PASSPHRASE).not.toBe('crimson2026');
  });
});

describe('assertPassphraseConfigured', () => {
  // A gated build with no secret must stop, not ship an openable gate.
  it('throws when the gate is on and the passphrase is empty or blank', () => {
    expect(() => assertPassphraseConfigured(true, '')).toThrow(/PREVIEW_GATE_PASSPHRASE/);
    expect(() => assertPassphraseConfigured(true, '   ')).toThrow(/PREVIEW_GATE_PASSPHRASE/);
  });

  // Dev and the public build have no gate, so they need no secret.
  it('passes when the gate is off, even with no passphrase', () => {
    expect(() => assertPassphraseConfigured(false, '')).not.toThrow();
  });

  // The normal gated deploy: secret present, build proceeds.
  it('passes when the gate is on and a passphrase is set', () => {
    expect(() => assertPassphraseConfigured(true, 'a real one')).not.toThrow();
  });
});

describe('substitutePassphrase', () => {
  const page = `var PASSPHRASE = '${PASSPHRASE_PLACEHOLDER}'; var AGAIN = "${PASSPHRASE_PLACEHOLDER}";`;

  // Evaluate the substituted script and read the values back — the only honest
  // test that the escaping survives a real JavaScript parser.
  function valuesAfter(pass: string): [string, string] {
    return new Function(`${substitutePassphrase(page, pass)} return [PASSPHRASE, AGAIN];`)();
  }

  // Both quote styles, every occurrence — a missed one would ship a gate that
  // opens on the placeholder text itself.
  it('fills in every placeholder', () => {
    expect(valuesAfter('open sesame')).toEqual(['open sesame', 'open sesame']);
    expect(substitutePassphrase(page, 'x')).not.toContain(PASSPHRASE_PLACEHOLDER);
  });

  // Quotes, backslashes, newlines and a closing </script> must not break out of
  // the string literal or the inline <script> it sits in.
  it('escapes characters that would break the string or the script tag', () => {
    const tricky = `it's a \\ "test"</script>\nline two`;
    expect(valuesAfter(tricky)).toEqual([tricky, tricky]);
    expect(substitutePassphrase(page, tricky)).not.toContain('</script>');
  });

  // The build runs this over every self-gated file; one without a gate must
  // come out byte-for-byte as it went in.
  it('leaves a page with no placeholder unchanged', () => {
    expect(substitutePassphrase('var A = 1;', 'x')).toBe('var A = 1;');
  });
});
