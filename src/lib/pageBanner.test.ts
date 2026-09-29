import { describe, it, expect } from 'vitest';
import { bannerFor } from './pageBanner';

describe('bannerFor', () => {
  // An ordinary chapter: the kind sits above the city, never folded into it.
  it('labels an active chapter', () => {
    expect(bannerFor({ kind: 'chapter', name: 'New York City' })).toEqual({
      label: 'Chapter',
      title: 'New York City',
    });
  });

  // A forming chapter says so in the one place every visitor looks first,
  // rather than leaving them to infer it from a missing leads block further
  // down the page.
  it('says so when a chapter is still forming', () => {
    expect(bannerFor({ kind: 'chapter', status: 'forming', name: 'Seattle' }).label).toBe(
      'Chapter · Forming',
    );
  });

  // Any other status is an ordinary chapter. `status` is free text on the
  // collection, so an unrecognised value must not produce a stray label.
  it('treats an unknown status as an ordinary chapter', () => {
    expect(bannerFor({ kind: 'chapter', status: 'flourishing', name: 'London' }).label).toBe(
      'Chapter',
    );
  });

  // THE CASE THIS MODULE EXISTS FOR. A community is not a place, and the old
  // banner folded the org name into the title — so the AI page announced
  // "HARVARD ALUMNI IN TECH AI", which reads as a product launch rather than a
  // group of people. The name is carried through untouched.
  it('labels a community without touching its name', () => {
    expect(bannerFor({ kind: 'community', name: 'AI' })).toEqual({
      label: 'Community',
      title: 'AI',
    });
  });

  // A community has no roster status, so one passed by mistake changes nothing.
  it('ignores a status on a community', () => {
    expect(bannerFor({ kind: 'community', status: 'forming', name: 'Founders' }).label).toBe(
      'Community',
    );
  });

  // The title is the name verbatim — a long one is the banner's problem to wrap,
  // not this function's to shorten.
  it('passes a long name through unchanged', () => {
    expect(bannerFor({ kind: 'chapter', name: 'Seattle / Pacific Northwest' }).title).toBe(
      'Seattle / Pacific Northwest',
    );
  });
});
