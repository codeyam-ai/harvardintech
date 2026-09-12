import { describe, it, expect } from 'vitest';
import { socialDisplayLabel } from './socialLabel';

describe('socialDisplayLabel', () => {
  // The label settings.json still carries reads under the network's current name.
  it('shows the legacy Twitter label under the X name', () => {
    expect(socialDisplayLabel('Twitter')).toBe('X (Twitter)');
  });

  // An editor who already renamed the link to "X" gets the same, clearer label.
  it('shows a bare X label under the X name with Twitter in brackets', () => {
    expect(socialDisplayLabel('X')).toBe('X (Twitter)');
  });

  // Casing and stray whitespace from the CMS do not defeat the match.
  it('matches regardless of casing and surrounding whitespace', () => {
    expect(socialDisplayLabel('  twitter ')).toBe('X (Twitter)');
  });

  // Every other network passes through exactly as typed.
  it('leaves other labels unchanged', () => {
    expect(socialDisplayLabel('LinkedIn')).toBe('LinkedIn');
    expect(socialDisplayLabel('Facebook')).toBe('Facebook');
  });

  // A longer label that merely contains the word is someone's own wording, not
  // the bare network name, so it is not rewritten.
  it('does not rewrite a label that only contains the word', () => {
    expect(socialDisplayLabel('Twitter Spaces')).toBe('Twitter Spaces');
  });
});
