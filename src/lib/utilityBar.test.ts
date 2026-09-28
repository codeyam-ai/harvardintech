import { describe, it, expect } from 'vitest';
import { UTILITY_LEDE, utilityLine, utilityLineCompact } from './utilityBar';

const CITIES = [
  'Boston & Cambridge',
  'London',
  'New York City',
  'SF & Bay Area',
  'DC and DMV Area',
  'Seattle / Pacific Northwest',
];

describe('utilityLine', () => {
  // The wide-screen line: the lede, then every chapter, dot-separated. This is
  // the text the strip has always shown and the assertion that keeps it.
  it('lists the lede and every city', () => {
    expect(utilityLine(CITIES)).toBe(
      'A global community · Boston & Cambridge · London · New York City · SF & Bay Area · DC and DMV Area · Seattle / Pacific Northwest',
    );
  });

  // One chapter still gets a separator — there is something on both sides of it.
  it('joins a single city to the lede', () => {
    expect(utilityLine(['London'])).toBe('A global community · London');
  });

  // No chapters degrades to the lede ALONE. The failure this guards is a
  // trailing separator with nothing after it, which is what a naive join gives.
  it('drops the separator entirely when there are no cities', () => {
    expect(utilityLine([])).toBe(UTILITY_LEDE);
    expect(utilityLine([])).not.toContain('·');
  });
});

describe('utilityLineCompact', () => {
  // The owner's choice on 2026-09-28: phones show the lede by itself, with no
  // chapter count. Same answer for a full list, one city, or none — the whole
  // point is that its length cannot vary with the data.
  it.each([
    ['a full chapter list', CITIES],
    ['a single city', ['London']],
    ['no cities at all', [] as string[]],
  ])('returns the lede alone for %s', (_label, cities) => {
    expect(utilityLineCompact(cities)).toBe(UTILITY_LEDE);
  });

  // The defect this replaced: ~70 characters of letter-spaced monospace wrapped
  // to three lines on a 390px phone. A count or a separator creeping back in is
  // the first step toward that, so both are asserted absent.
  it('carries no chapter count and no separator', () => {
    const line = utilityLineCompact(CITIES);
    expect(line).not.toContain('·');
    expect(line).not.toMatch(/\d/);
    expect(line).not.toMatch(/chapter/i);
  });

  // It is always shorter than the line it stands in for, whenever there is
  // anything to shorten.
  it('is shorter than the full line whenever chapters exist', () => {
    expect(utilityLineCompact(CITIES).length).toBeLessThan(utilityLine(CITIES).length);
  });
});
