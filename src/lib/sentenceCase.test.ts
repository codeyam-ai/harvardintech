// A guard over the site's own writing standard: sentence case in the headings the
// site authors, and American spelling in the copy it ships.
//
// This is the automated half of the 2026-10-02 standard. The other half is the
// hint text on the title/kicker fields in `src/data/collections.json`, which is
// what an editor reads while typing. A hint teaches; it cannot catch a regression
// a month later, and the drift this replaced had reached six collections before
// anyone noticed.
//
// SCOPE — deliberately narrow, because the standard is narrower than "all text".
// Checked: the heading-ish fields the SITE authors (section titles, eyebrows,
// navigation labels, stat captions, page headlines).
// NOT checked, and these are decisions rather than omissions:
//   • Titles of published work (blog posts, webinar recordings) and the names of
//     real past events. "COVID-19: Is Telemedicine the Future of Health Care?" is
//     the title of a real webinar and "HBS Tech Trek Mixer" is the name of a real
//     event; rewriting either would misname the thing itself.
//   • Named recognition tiers — "Founding Supporter", "Leadership Circle",
//     "Sustaining Donors". These are designations, not sentences, and
//     `FOUNDING_SUPPORTER_LABEL` in `src/lib/momentumNetwork.ts` is the code
//     constant that proves it. Hence no `ctaLabel` field is checked below.
//   • Volunteer role titles ("LinkedIn Engagement Specialist"), which read as
//     position names.
//   • Source-code comments. The spelling scan reads content and data, not prose
//     inside `.astro` files, so a British spelling in a comment does not fail
//     here. That is a real gap and the reason it is named rather than hidden.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const readJson = (rel: string) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

/** Capitalized words that are genuinely proper and may appear mid-heading. */
const PROPER = new Set([
  'Harvard',
  'Alumni',
  'Tech',
  'WhatsApp',
  'LinkedIn',
  'Medium',
  'Momentum',
  'Fund',
  'Givebutter',
  'Luma',
]);

/**
 * Words after the first that start with a capital and are not proper nouns.
 * All-caps tokens (AI, SF, DC, NYC, MA) and anything carrying a digit are left
 * alone — those are acronyms and years, not Title Case.
 */
function titleCaseOffenders(value: string): string[] {
  const words = value.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
  return words
    .slice(1)
    .filter((w) => /^[A-Z]/.test(w))
    .filter((w) => w !== w.toUpperCase())
    .filter((w) => !/\d/.test(w))
    .filter((w) => !PROPER.has(w));
}

/** Frontmatter `key: value` reader — enough for the flat heading fields below. */
function frontmatter(text: string, key: string): string | null {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return null;
  const line = block[1].match(new RegExp(`^${key}:[ \\t]*(.+)$`, 'm'));
  if (!line) return null;
  return line[1].trim().replace(/^['"]|['"]$/g, '');
}

function collection(dir: string, keys: string[]): Array<[string, string]> {
  const abs = join(ROOT, 'src/content', dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.md'))
    // `preview-*` entries are written by the CMS preview flow, not by hand: they
    // are regenerated from the entry they copy, so fixing one edits a artifact
    // that the next preview overwrites.
    .filter((f) => !f.startsWith('preview-'))
    .flatMap((f) => {
      const text = readFileSync(join(abs, f), 'utf8');
      return keys
        .map((k) => [`src/content/${dir}/${f} (${k})`, frontmatter(text, k)] as [string, string | null])
        .filter((row): row is [string, string] => row[1] !== null);
    });
}

/** Every navigation label, at any depth. */
function navLabels(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (items: Array<{ label?: string; children?: unknown[] }>, path: string) => {
    items.forEach((item, i) => {
      if (item.label) out.push([`src/data/nav.json (${path}[${i}].label)`, item.label]);
      if (Array.isArray(item.children)) walk(item.children as typeof items, `${path}[${i}].children`);
    });
  };
  walk(readJson('src/data/nav.json').items, 'items');
  return out;
}

function donatePageHeadings(): Array<[string, string]> {
  const d = readJson('src/data/donatePage.json');
  const scalars = [
    'accomplishmentsTitle',
    'pillarsTitle',
    'testimonialsTitle',
    'networkSearchTitle',
    'ctaTitle',
  ];
  return [
    ...scalars
      .filter((k) => typeof d[k] === 'string')
      .map((k) => [`src/data/donatePage.json (${k})`, d[k]] as [string, string]),
    ...(d.stats ?? []).map(
      (s: { label: string }, i: number) =>
        [`src/data/donatePage.json (stats[${i}].label)`, s.label] as [string, string],
    ),
  ];
}

function volunteerPageHeadings(): Array<[string, string]> {
  const v = readJson('src/data/volunteerPage.json');
  return [
    ['src/data/volunteerPage.json (headline)', v.headline],
    ['src/data/volunteerPage.json (benefitsTitle)', v.benefitsTitle],
    ['src/data/volunteerPage.json (projectsTitle)', v.projectsTitle],
    ...(v.benefits ?? []).map(
      (b: { title: string }, i: number) =>
        [`src/data/volunteerPage.json (benefits[${i}].title)`, b.title] as [string, string],
    ),
  ];
}

const HEADINGS: Array<[string, string]> = [
  ...navLabels(),
  ...donatePageHeadings(),
  ...volunteerPageHeadings(),
  ...collection('pillars', ['title']),
  ...collection('homeSections', ['title', 'kicker']),
  ...collection('momentumSections', ['title']),
  ...collection('heroSlides', ['title', 'kicker']),
  ...collection('stats', ['label']),
];

describe('site writing standard', () => {
  // Without this the assertions below pass on an empty list, which is exactly how
  // a path-based scan rots into a test that guards nothing.
  it('actually reads the headings it claims to check', () => {
    expect(HEADINGS.length).toBeGreaterThan(40);
    const where = HEADINGS.map(([w]) => w);
    expect(where.some((w) => w.startsWith('src/data/nav.json'))).toBe(true);
    expect(where.some((w) => w.startsWith('src/content/pillars/'))).toBe(true);
    expect(where.some((w) => w.startsWith('src/content/homeSections/'))).toBe(true);
  });

  // Sentence case: only the first word and proper names are capitalized. The
  // navigation is included on purpose — it disagreeing with the headings it leads
  // to ("Content Hub" over "Content hub") is the drift that started this.
  it('writes every site-authored heading in sentence case', () => {
    const offenders = HEADINGS.flatMap(([where, value]) => {
      const caps = titleCaseOffenders(value);
      return caps.length ? [`${where}: ${JSON.stringify(value)} -> ${caps.join(', ')}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  // American English, for a US-registered 501(c)(6) carrying Harvard's identity.
  // Explicit forms only. An `\w*ise` catch-all was tried and rejected: it matches
  // "exercised", "comprised" and "raise", so it would have failed on correct
  // American copy and taught the next reader to disable the check.
  const BRITISH =
    /\b(programmes?|centres?|centred|organis(?:e|es|ed|ing|ation|ations|ational|er|ers)|enquir(?:y|ies|e|es|ed|ing)|recognis(?:e|es|ed|ing|able)|licence[sd]?|favourite|colour|behaviour|catalogue|defence|analyse[sd]?)\b/i;

  // `licence` in `src/data/imageCredits.json` is a DATA FIELD NAME, not copy — it
  // is a key every credit row repeats, and renaming it would change the schema in
  // `src/content/config.ts` for no reader-visible gain.
  const SPELLING_EXEMPT = ['src/data/imageCredits.json'];

  function contentFiles(dir: string): Array<[string, string]> {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) return [];
    return readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) return contentFiles(rel);
      if (!/\.(md|json)$/.test(e.name)) return [];
      if (SPELLING_EXEMPT.includes(rel)) return [];
      if (e.name.startsWith('preview-')) return [];
      return [[rel, readFileSync(join(ROOT, rel), 'utf8')] as [string, string]];
    });
  }

  const COPY = [...contentFiles('src/content'), ...contentFiles('src/data')];

  // The vacuity guard for the spelling assertion below. A path-based scan that
  // silently collects nothing passes every assertion made against it, so this
  // pins the floor and two files the scan must always reach.
  it('actually reads the copy it claims to check', () => {
    expect(COPY.length).toBeGreaterThan(50);
    expect(COPY.some(([p]) => p === 'src/data/nav.json')).toBe(true);
    expect(COPY.some(([p]) => p === 'src/content/pages/privacy.md')).toBe(true);
  });

  // No British spelling survives in the copy the site ships. The exemption list
  // above carries the one deliberate exception and why it is one, so a reader
  // who hits this failure can tell a real regression from a known carve-out.
  it('spells its copy in American English', () => {
    const offenders = COPY.flatMap(([path, text]) => {
      const hit = text.match(BRITISH);
      return hit ? [`${path}: ${hit[0]}`] : [];
    });
    expect(offenders).toEqual([]);
  });
});
