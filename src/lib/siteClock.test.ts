import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pinnedNow, siteNow, SITE_CLOCK_FILE } from './siteClock';

// siteNow() is the one clock every events page splits upcoming from past
// against. A scenario pins it by seeding `siteClock/now.md`; without that file
// (production) it must fall through to the real time. These tests pin both
// halves, because either one breaking silently brings back the drifting
// screenshots (pinned date ignored) or a frozen live site (fallback lost).

describe('pinnedNow', () => {
  // the seed adapter writes the value quoted, so the quoted form must parse
  it('reads a double-quoted ISO date from the frontmatter', () => {
    const text = '---\nnow: "2026-11-10T12:00:00Z"\n---\n';
    expect(pinnedNow(text)?.toISOString()).toBe('2026-11-10T12:00:00.000Z');
  });

  // a hand-written file may use single quotes or none; both mean the same date
  it('reads single-quoted and unquoted dates alike', () => {
    expect(pinnedNow("now: '2026-10-23'")?.toISOString()).toBe('2026-10-23T00:00:00.000Z');
    expect(pinnedNow('now: 2026-10-23T09:30:00Z')?.toISOString()).toBe(
      '2026-10-23T09:30:00.000Z',
    );
  });

  // the `now:` line is found wherever it sits among other frontmatter keys
  it('finds now among other frontmatter lines', () => {
    const text = '---\ntitle: clock\nnow: "2026-01-02T00:00:00Z"\nnote: x\n---\n';
    expect(pinnedNow(text)?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  // no `now:` key means nothing is pinned, so the caller uses the real clock
  it('returns undefined when there is no now line', () => {
    expect(pinnedNow('---\ntitle: clock\n---\n')).toBeUndefined();
    expect(pinnedNow('')).toBeUndefined();
  });

  // a value that is not a date must not become an Invalid Date that empties
  // both the upcoming and past lists
  it('returns undefined when the now value is not a date', () => {
    expect(pinnedNow('now: "next tuesday-ish"')).toBeUndefined();
  });
});

describe('siteNow', () => {
  // a readable file with a usable date wins over the real clock
  it('returns the pinned date when the file carries one', () => {
    const now = siteNow(() => 'now: "2026-11-10T12:00:00Z"');
    expect(now.toISOString()).toBe('2026-11-10T12:00:00.000Z');
  });

  // production has no siteClock folder, so the read throws — use real time
  it('falls back to the real clock when the file cannot be read', () => {
    const before = Date.now();
    const now = siteNow(() => {
      throw new Error('ENOENT');
    });
    expect(now.valueOf()).toBeGreaterThanOrEqual(before);
    expect(now.valueOf()).toBeLessThanOrEqual(Date.now());
  });

  // a present but unusable file must not freeze the site on a bad date
  it('falls back to the real clock when the file has no usable date', () => {
    const before = Date.now();
    const now = siteNow(() => 'now: "garbage"');
    expect(now.valueOf()).toBeGreaterThanOrEqual(before);
  });

  describe('default reader', () => {
    const prev = process.env.CODEYAM_CONTENT_ROOT;
    let dir: string | undefined;
    afterEach(() => {
      if (prev === undefined) delete process.env.CODEYAM_CONTENT_ROOT;
      else process.env.CODEYAM_CONTENT_ROOT = prev;
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    });

    // the seeded file lands under the sandbox content root; the default reader
    // must look exactly there, and re-read on each call so a scenario switch
    // takes effect without restarting the dev server
    it('reads siteClock/now.md under the active content root on every call', () => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'siteclock-'));
      process.env.CODEYAM_CONTENT_ROOT = dir;
      const file = path.join(dir, SITE_CLOCK_FILE);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '---\nnow: "2026-10-23T00:00:00Z"\n---\n');
      expect(siteNow().toISOString()).toBe('2026-10-23T00:00:00.000Z');
      fs.writeFileSync(file, '---\nnow: "2026-03-01T00:00:00Z"\n---\n');
      expect(siteNow().toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });
  });
});
