// A guard over the public site's source: no personal inbox, no direct WhatsApp
// group link, no Eventbrite, no chapter-founding mailto, and the shared inbox
// written in exactly one place (settings.json) — every surface reads it through
// `emailFor` (src/lib/contact.ts), so the owner's "sparingly" rule holds.
//
// The giving components still carry personal-inbox defaults until the giving
// plan replaces them. They are named in `GIVING_PENDING` below, and that list
// fails as soon as a named file is clean, so it cannot quietly go stale.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SCANNED = ['src/components', 'src/pages', 'src/layouts', 'src/content', 'src/data'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'isolated-components' ? [] : walk(path);
    return /\.test\./.test(name) ? [] : [path];
  });
}

const FILES = SCANNED.flatMap((d) => walk(join(ROOT, d))).map((abs) => ({
  path: relative(ROOT, abs).split(sep).join('/'),
  text: readFileSync(abs, 'utf8'),
}));

const PERSONAL = /\bben@|\bbenwei@|@gmail\.com/i;
const SHARED_INBOX = 'info@harvardintech.com';

/** Row 12 of the contact plan: the giving plan removes these defaults. */
const GIVING_PENDING = [
  'src/components/MomentumFundPage.astro',
  'src/components/landing/GivingCampaign.astro',
  'src/components/donate/MomentumNetwork.astro',
  'src/components/donate/DonorWall.astro',
  'src/components/donate/GiftPillars.astro',
  'src/pages/give.astro',
];

describe('public source contact rules', () => {
  // The scan must actually see the site, or every assertion below passes vacuously.
  it('scans the site source', () => {
    expect(FILES.some((f) => f.path === 'src/data/settings.json')).toBe(true);
    expect(FILES.some((f) => f.path === 'src/layouts/BaseLayout.astro')).toBe(true);
  });

  // No personal inbox anywhere outside the giving files still awaiting their plan.
  it('names no personal inbox outside the pending giving files', () => {
    const offenders = FILES.filter((f) => !GIVING_PENDING.includes(f.path) && PERSONAL.test(f.text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  // Each pending file must still need its exemption; a clean one comes off the list.
  it.each(GIVING_PENDING.map((p) => [p]))('%s still needs its giving-plan exemption', (path) => {
    const file = FILES.find((f) => f.path === path);
    expect(file, `${path} no longer exists — remove it from GIVING_PENDING`).toBeDefined();
    expect(PERSONAL.test(file!.text), `${path} is clean — remove it from GIVING_PENDING`).toBe(true);
  });

  // The WhatsApp group is joined through the form, never linked directly.
  it('never links the WhatsApp group directly', () => {
    expect(FILES.filter((f) => /chat\.whatsapp\.com/i.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  // Luma is the one events system.
  it('never links Eventbrite', () => {
    expect(FILES.filter((f) => /eventbrite\.com/i.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  // The chapter-founding mailto is gone; volunteering is the way in.
  it('offers no chapter-founding mailto', () => {
    expect(FILES.filter((f) => /start a chapter/i.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  // The shared inbox is written once, in settings, and read through `emailFor`.
  it('writes the shared inbox only in settings.json', () => {
    expect(FILES.filter((f) => f.text.includes(SHARED_INBOX)).map((f) => f.path)).toEqual([
      'src/data/settings.json',
    ]);
  });
});
