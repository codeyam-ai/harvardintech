import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import collections from '../data/collections.json';

// Guards the brand name in everything a visitor can read.
//
// The organisation is "Harvard Alumni in Tech" — always that, always in title
// case (owner, 2026-10-14). The old Strikingly site and the 2020 webinar posts
// said "Harvard in Tech", "Harvard in Technology" or a lowercase "Harvard alumni
// in tech", and that wording keeps coming back through archive imports and CMS
// edits. This scans the site's content, data and components for it.
//
// URLs are stripped first: `harvardintech.com` and slugs like
// `harvard-in-tech-fall-welcome-mixer` are addresses, not copy, and must not
// change. An all-caps "HARVARD ALUMNI IN TECH" is fine — that is how the banner
// and footer render the correct name.
//
// The pattern itself is NOT defined here: it is the `copyWarnings` rule in
// `src/data/collections.json`, the same rule the content admin uses to warn an
// editor as they type. One rule, so the warning and this guard cannot drift.
// That rule's own text spells the retired names, so it is left out of the scan.
//
// NOTE: tests that read `src/content` at run time are invisible to change-based
// test attribution — nothing in the dependency graph links a markdown file to
// this spec — so this one only runs as part of the whole suite.
const SCANNED_DIRS = ['src/content', 'src/data', 'src/components'].map((dir) =>
  path.join(process.cwd(), dir),
);
const SCANNED_EXTENSIONS = new Set(['.md', '.mdx', '.json', '.yaml', '.yml', '.astro', '.ts', '.tsx']);
const COLLECTIONS_FILE = path.join(process.cwd(), 'src/data/collections.json');
const OFF_BRAND = new RegExp(
  (collections as { copyWarnings: { pattern: string }[] }).copyWarnings[0].pattern,
  'g',
);

/** A file's scannable text — for collections.json, everything but the rule itself. */
function scannableText(file: string): string {
  const raw = fs.readFileSync(file, 'utf8');
  if (file !== COLLECTIONS_FILE) return raw;
  const { copyWarnings: _rule, ...rest } = JSON.parse(raw);
  return JSON.stringify(rest);
}

function offBrandMentions(text: string): string[] {
  return text.replace(/https?:\/\/\S+/g, '').match(OFF_BRAND) ?? [];
}

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return SCANNED_EXTENSIONS.has(path.extname(entry.name)) && !entry.name.includes('.test.')
      ? [full]
      : [];
  });
}

describe('offBrandMentions', () => {
  // Each retired form of the name is caught, so the scan below cannot pass by matching nothing.
  it('catches every retired form of the name', () => {
    expect(offBrandMentions('Harvard in Tech Seattle presents')).toEqual(['Harvard in Tech']);
    expect(offBrandMentions("a member of Harvard in Technology's AI committee")).toEqual([
      'Harvard in Technology',
    ]);
    expect(offBrandMentions('A space for Harvard alumni in tech: founders')).toEqual([
      'Harvard alumni in tech',
    ]);
  });

  // The correct name, in title case or as the banner renders it in capitals, is not flagged.
  it('accepts the brand as written', () => {
    expect(offBrandMentions('Harvard Alumni in Tech ran a series of sessions')).toEqual([]);
    expect(offBrandMentions('HARVARD ALUMNI IN TECH')).toEqual([]);
  });

  // A web address that spells the old name is an address, not copy, so it is left alone.
  it('ignores URLs', () => {
    expect(offBrandMentions('see https://example.com/Harvard in Tech')).toEqual([]);
  });
});

describe('site copy', () => {
  // No file a visitor reads from still names the organisation the old way.
  it('writes the brand as Harvard Alumni in Tech everywhere', () => {
    const offenders = SCANNED_DIRS.flatMap(listFiles).flatMap((file) =>
      offBrandMentions(scannableText(file)).map(
        (found) => `${path.relative(process.cwd(), file)}: ${found}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
