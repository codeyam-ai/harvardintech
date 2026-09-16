import { describe, it, expect } from 'vitest';
import { buildMailto } from './mailto';

describe('buildMailto', () => {
  // With only a recipient, the result is a bare mailto: with no query string.
  it('builds a bare mailto when only a recipient is given', () => {
    expect(buildMailto({ to: 'hello@example.com' })).toBe('mailto:hello@example.com');
  });

  // A subject is appended as a query parameter.
  it('appends the subject as a query parameter', () => {
    expect(buildMailto({ to: 'a@b.com', subject: 'Hello' })).toBe('mailto:a@b.com?subject=Hello');
  });

  // Spaces in the subject must encode as %20, not +, for mail clients.
  it('encodes spaces in the subject as %20 rather than plus', () => {
    expect(buildMailto({ to: 'a@b.com', subject: 'Sponsor an Event' })).toBe(
      'mailto:a@b.com?subject=Sponsor%20an%20Event',
    );
  });

  // Both subject and body are included in the query string.
  it('includes both subject and body when supplied', () => {
    const result = buildMailto({ to: 'a@b.com', subject: 'Hi', body: 'There' });
    expect(result).toContain('subject=Hi');
    expect(result).toContain('body=There');
  });

  // A body alone (no subject) still produces a valid query string.
  it('handles a body with no subject', () => {
    expect(buildMailto({ to: 'a@b.com', body: 'Just a body' })).toBe(
      'mailto:a@b.com?body=Just%20a%20body',
    );
  });
});
