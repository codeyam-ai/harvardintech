// The /admin passphrase screen: only a hash ships, never the passphrase.
import { describe, it, expect } from 'vitest';
import { assertAdminPassphrase, injectAdminGate, passphraseHash } from './adminGate';

const PAGE = '<!doctype html><html><head><title>Content · CodeYam CMS</title></head><body><main>cms</main></body></html>';

describe('admin gate', () => {
  // The secret never appears in the built page — only its SHA-256.
  it('writes the hash, not the passphrase, into the page', () => {
    const out = injectAdminGate(PAGE, passphraseHash('Sample-Passphrase!'));
    expect(out).not.toContain('Sample-Passphrase');
    expect(out).toContain(passphraseHash('Sample-Passphrase!'));
    expect(out).toContain('noindex, nofollow');
  });

  // Whitespace around what the editor typed is ignored on both sides.
  it('hashes the trimmed passphrase', () => {
    expect(passphraseHash('  abc  ')).toBe(passphraseHash('abc'));
    expect(passphraseHash('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  // The screen sits at the top of <head>, before the CMS's own scripts.
  it('inserts at the top of the head element, only once', () => {
    const once = injectAdminGate(PAGE, passphraseHash('x'));
    expect(once.indexOf('hait-admin-ok')).toBeLessThan(once.indexOf('<title>'));
    expect(injectAdminGate(once, passphraseHash('x'))).toBe(once);
  });

  // A deploy build with no secret fails rather than shipping an open CMS.
  it('refuses an empty passphrase', () => {
    expect(() => assertAdminPassphrase('')).toThrow(/ADMIN_PASSPHRASE/);
    expect(() => assertAdminPassphrase('   ')).toThrow();
    expect(() => assertAdminPassphrase('set')).not.toThrow();
  });
});
