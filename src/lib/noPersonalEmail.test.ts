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

  // The shared inbox is written once in settings and read through `emailFor`
  // everywhere it is DISPLAYED, so the owner's "sparingly" rule holds and a
  // change of address reaches every surface at once.
  //
  // The privacy policy is the documented exception, and the only one. A policy
  // has to state the address a reader writes to in order to see or delete what
  // is held about them — GDPR expects a contact point in the text itself, and
  // "the address in our footer" is not one. It is markdown in a content
  // collection, which has no interpolation seam, so the address is literal there
  // rather than resolved through `emailFor`.
  //
  // The cost is real and worth naming: change the inbox and the policy is the one
  // place that will NOT follow automatically, and a policy naming a dead contact
  // is worse than ordinary stale copy. This assertion is what makes that visible
  // — a new inbox fails here until the policy is updated to match.
  const INBOX_IN_PROSE = 'src/content/pages/privacy.md';

  // The inbox appears literally in exactly two files: settings.json, which every
  // displayed surface reads through `emailFor`, and the privacy policy, which
  // must name its contact point in the text.
  it('writes the shared inbox only in settings.json and the privacy policy', () => {
    expect(
      FILES.filter((f) => f.text.includes(SHARED_INBOX))
        .map((f) => f.path)
        .sort(),
    ).toEqual([INBOX_IN_PROSE, 'src/data/settings.json'].sort());
  });

  // The exception above is a list of one. Anything else hardcoding the inbox
  // should read it through `emailFor` instead, so this pins the exception rather
  // than leaving it as a precedent the next surface can quietly join.
  it('keeps the prose exception to the privacy policy alone', () => {
    const literal = FILES.filter(
      (f) => f.text.includes(SHARED_INBOX) && f.path !== 'src/data/settings.json',
    ).map((f) => f.path);
    expect(literal).toEqual([INBOX_IN_PROSE]);
  });
});
