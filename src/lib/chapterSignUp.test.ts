import { describe, it, expect } from 'vitest';
import { chapterSignUpCopy } from './chapterSignUp';

describe('chapterSignUpCopy', () => {
  // A chapter page names its city in both lines, so the band pitches the local
  // benefit rather than repeating the general newsletter ask further down.
  it('names the city in the title and the line', () => {
    expect(chapterSignUpCopy('London')).toEqual({
      title: 'Hear about London events first',
      intro:
        "One newsletter, with what's coming up in London at the top and news from the wider community below.",
    });
  });

  // The longest chapter name is passed through untouched; the heading wraps
  // rather than the copy shortening it.
  it('keeps a long chapter name whole', () => {
    expect(chapterSignUpCopy('Seattle / Pacific Northwest').title).toBe(
      'Hear about Seattle / Pacific Northwest events first',
    );
  });

  // With no name the band makes no place claim at all.
  it('falls back to place-neutral wording without a name', () => {
    expect(chapterSignUpCopy()).toEqual({
      title: 'Hear about events first',
      intro:
        "One newsletter, with what's coming up near you at the top and news from the wider community below.",
    });
  });

  // An empty or whitespace-only name is treated as missing, so a blank CMS
  // field never produces "Hear about  events first".
  it('treats a blank name as missing', () => {
    expect(chapterSignUpCopy('')).toEqual(chapterSignUpCopy());
    expect(chapterSignUpCopy('   ')).toEqual(chapterSignUpCopy());
  });

  // Surrounding whitespace from a hand-edited field is trimmed off.
  it('trims whitespace around the name', () => {
    expect(chapterSignUpCopy('  London ').title).toBe('Hear about London events first');
  });
});
