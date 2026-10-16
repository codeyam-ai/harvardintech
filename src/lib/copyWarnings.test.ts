import { describe, it, expect } from 'vitest';
import {
  copyWarnedFieldLabels,
  entryCopyWarnings,
  findCopyWarnings,
  type CopyWarningRule,
} from '@codeyam/cms/lib/copyWarnings';
import { serializeRegistry } from '@codeyam/cms/lib/collectionRegistry';
import type { FieldDef } from '@codeyam/cms/lib/entryEditor';
import collections from '../data/collections.json';

// The patched CMS's site copy warnings — the advisory half of the brand rule.
// The rule under test is the one the site actually ships in collections.json,
// so a change to it is exercised here and in the entry editor alike.
const SITE_RULES = (collections as { copyWarnings: CopyWarningRule[] }).copyWarnings;
const RULE: CopyWarningRule = { pattern: 'old name', message: 'say new name' };

const FIELDS: FieldDef[] = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'tagline', label: 'Tagline', type: 'text', optional: true },
  {
    name: 'links',
    label: 'Links',
    type: 'list',
    optional: true,
    fields: [{ name: 'label', label: 'Label', type: 'text' }],
  },
  { name: 'order', label: 'Order', type: 'number', optional: true },
];

describe('findCopyWarnings', () => {
  // Every retired form of the brand the site declares is reported, with the wording exactly as written.
  it('reports each retired brand form from the site rule', () => {
    const found = findCopyWarnings(
      SITE_RULES,
      'Harvard in Tech, Harvard in Technology and Harvard alumni in tech',
    ).map((w) => w.found);
    expect(found).toEqual(['Harvard in Tech', 'Harvard in Technology', 'Harvard alumni in tech']);
  });

  // The brand written correctly — title case or the banner's capitals — raises nothing.
  it('accepts the brand as written', () => {
    expect(findCopyWarnings(SITE_RULES, 'Harvard Alumni in Tech and HARVARD ALUMNI IN TECH')).toEqual([]);
  });

  // A web address that spells the old name is an address, so it is not flagged.
  it('ignores web addresses', () => {
    expect(findCopyWarnings(SITE_RULES, 'see https://example.com/Harvard in Tech today')).toEqual([]);
  });

  // The same wording twice in one text is one warning, so the note does not repeat itself.
  it('reports repeated wording once', () => {
    expect(findCopyWarnings([RULE], 'old name, then old name again')).toEqual([
      { found: 'old name', message: 'say new name' },
    ]);
  });

  // A rule whose pattern will not compile is skipped rather than breaking the editor.
  it('skips a rule that does not compile', () => {
    expect(findCopyWarnings([{ pattern: '([', message: 'x' }, RULE], 'old name')).toEqual([
      { found: 'old name', message: 'say new name' },
    ]);
  });

  // With no rules declared there is nothing to report.
  it('returns nothing without rules', () => {
    expect(findCopyWarnings([], 'old name')).toEqual([]);
  });
});

describe('entryCopyWarnings', () => {
  // A flagged text field and a flagged body are each keyed under their own name.
  it('keys warnings by field and body', () => {
    const out = entryCopyWarnings([RULE], FIELDS, { title: 'fine', tagline: 'the old name' }, 'old name body');
    expect(Object.keys(out)).toEqual(['tagline', 'body']);
  });

  // Text inside any row of a list field counts against that list field.
  it('checks every row of a list field', () => {
    const out = entryCopyWarnings([RULE], FIELDS, { links: [{ label: 'ok' }, { label: 'old name' }] }, '');
    expect(out).toEqual({ links: [{ found: 'old name', message: 'say new name' }] });
  });

  // Non-text values such as numbers are ignored rather than stringified.
  it('ignores non-text values', () => {
    expect(entryCopyWarnings([RULE], FIELDS, { order: 3 as never }, '')).toEqual({});
  });

  // A site that declares no rules gets no warnings, whatever the entry says.
  it('returns nothing without rules', () => {
    expect(entryCopyWarnings([], FIELDS, { title: 'old name' }, 'old name')).toEqual({});
  });
});

describe('copyWarnedFieldLabels', () => {
  // Field names become the labels the editor sees, and the body reads as Body.
  it('maps names to labels with the body last as given', () => {
    expect(copyWarnedFieldLabels(['tagline', 'body'], FIELDS)).toEqual(['Tagline', 'Body']);
  });

  // A name with no matching field falls back to the name itself rather than vanishing.
  it('falls back to the name for an unknown field', () => {
    expect(copyWarnedFieldLabels(['mystery'], FIELDS)).toEqual(['mystery']);
  });
});

describe('serializeRegistry copyWarnings', () => {
  // The collection builder rewrites collections.json; the site's rules must survive that rewrite unchanged.
  it('re-emits the copy warning rules', () => {
    const out = JSON.parse(serializeRegistry({ collections: [], copyWarnings: [RULE] }));
    expect(out.copyWarnings).toEqual([RULE]);
  });

  // A registry with no rules gains no empty key, so existing files serialize as before.
  it('omits the key when there are no rules', () => {
    const out = JSON.parse(serializeRegistry({ collections: [], copyWarnings: [] }));
    expect('copyWarnings' in out).toBe(false);
  });
});
