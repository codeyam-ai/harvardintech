import { describe, it, expect } from 'vitest';
import {
  resolveContactEmail,
  connectLinks,
  displayConnectLinks,
  sponsorCta,
  emailFor,
  EMAIL_SURFACES,
  VOLUNTEER_PATH,
  WHATSAPP_FORM_URL,
  WHATSAPP_CRITERIA_URL,
} from './contact';

const SOCIALS = [
  { label: 'LinkedIn', url: 'https://www.linkedin.com/company/harvardintech', icon: 'linkedin' },
  { label: 'Twitter', url: 'https://twitter.com/harvardintech', icon: 'twitter' },
  { label: 'Facebook', url: 'https://facebook.com/harvardintech', icon: 'facebook' },
];

describe('resolveContactEmail', () => {
  // Blank, whitespace-only and absent all mean "no address", so no surface can
  // render a dead `mailto:`.
  it.each([[''], ['   '], [undefined], [null]])('treats %j as no address', (value) => {
    expect(resolveContactEmail(value)).toBeUndefined();
  });

  // A real address comes back trimmed, ready for a mailto.
  it('returns the trimmed address', () => {
    expect(resolveContactEmail('  hello@example.com ')).toBe('hello@example.com');
  });
});

describe('connectLinks', () => {
  // Every social, in the settings order, LinkedIn included: the old Connect row
  // filtered to Twitter and Facebook and dropped it.
  it('keeps every social in settings order, LinkedIn included', () => {
    expect(connectLinks(SOCIALS).map((l) => l.label)).toEqual(['LinkedIn', 'Twitter', 'Facebook']);
  });

  // With an address, one E-mail entry is appended after the socials.
  it('adds an E-mail entry only when an address is present', () => {
    const links = connectLinks(SOCIALS, 'hello@example.com');
    expect(links).toHaveLength(4);
    expect(links[3]).toMatchObject({ label: 'E-mail', icon: 'email' });
    expect(links[3].url.startsWith('mailto:hello@example.com')).toBe(true);
  });

  // A blank address never produces a mailto of any kind.
  it('never emits a mailto for a blank address', () => {
    for (const email of [undefined, '', '  ']) {
      expect(connectLinks(SOCIALS, email).some((l) => l.url.startsWith('mailto:'))).toBe(false);
    }
  });

  // An editor-added mail social wins; the synthesized entry is not a duplicate.
  it('does not duplicate an e-mail link an editor already added as a social', () => {
    const withMail = [...SOCIALS, { label: 'Email', url: 'mailto:hello@example.com', icon: 'email' }];
    expect(connectLinks(withMail, 'hello@example.com').filter((l) => l.url.startsWith('mailto:'))).toHaveLength(1);
  });
});

describe('displayConnectLinks', () => {
  // Twitter reads under the name the network has now, so nobody wonders where
  // it went. Every other social keeps the label the editor typed.
  it('shows Twitter under its current name and leaves the others alone', () => {
    expect(displayConnectLinks(SOCIALS).map((l) => l.label)).toEqual([
      'LinkedIn',
      'X (Twitter)',
      'Facebook',
    ]);
  });

  // The synthesized e-mail entry is not a social and must pass through untouched.
  it('leaves the synthesized e-mail entry untouched', () => {
    const links = displayConnectLinks(SOCIALS, 'hello@example.com');
    expect(links).toHaveLength(4);
    expect(links[3].label).toBe('E-mail');
  });

  // With no address it is the socials alone, still correctly named.
  it('offers the socials alone when there is no address', () => {
    const links = displayConnectLinks(SOCIALS);
    expect(links).toHaveLength(3);
    expect(links.some((l) => l.url.startsWith('mailto:'))).toBe(false);
  });

  // The URLs and icons ride through unchanged; only the label is rewritten.
  it('changes only the label, never the destination', () => {
    const [linkedIn, twitter] = displayConnectLinks(SOCIALS);
    expect(linkedIn).toEqual(SOCIALS[0]);
    expect(twitter.url).toBe(SOCIALS[1].url);
    expect(twitter.icon).toBe('twitter');
  });
});

describe('emailFor', () => {
  // The owner's "sparingly" rule is exactly these six places.
  it('lists exactly the six surfaces in the email rule', () => {
    expect([...EMAIL_SURFACES]).toEqual([
      'footer',
      'contactUs',
      'formingChapter',
      'sponsorInquiry',
      'llms',
      'structuredData',
    ]);
  });

  // Each listed surface gets the resolved address.
  it.each(EMAIL_SURFACES.map((s) => [s]))('returns the address for %s', (surface) => {
    expect(emailFor(surface, ' hello@example.com ')).toBe('hello@example.com');
  });

  // Anything off the list — the chapter Connect row, a support card — gets none.
  it.each([['chapterConnect'], ['supportUs'], ['getInvolved'], ['']])(
    'returns nothing for the unlisted surface %j',
    (surface) => {
      expect(emailFor(surface, 'hello@example.com')).toBeUndefined();
    },
  );

  // A blanked setting silences every surface, listed or not.
  it('returns nothing for every surface when the setting is blank', () => {
    for (const surface of EMAIL_SURFACES) {
      expect(emailFor(surface, '')).toBeUndefined();
      expect(emailFor(surface, undefined)).toBeUndefined();
    }
  });
});

describe('contact destinations', () => {
  // Volunteer calls to action land on the volunteer page, a site path.
  it('points volunteer calls to action at the volunteer page', () => {
    expect(VOLUNTEER_PATH).toBe('/volunteer');
  });

  // The WhatsApp join goes through the verification form, never the group link.
  it('joins WhatsApp through the form and links the criteria doc', () => {
    expect(new URL(WHATSAPP_FORM_URL).hostname).toBe('forms.gle');
    const criteria = new URL(WHATSAPP_CRITERIA_URL);
    expect(criteria.hostname).toBe('docs.google.com');
    expect(criteria.pathname.startsWith('/document/')).toBe(true);
  });
});

describe('sponsorCta', () => {
  const LINKEDIN = 'https://www.linkedin.com/company/harvardintech/';

  // A configured form is the one way in, so no competing button is offered.
  it('offers no button when an inquiry form is configured', () => {
    expect(sponsorCta('https://forms.example/sponsor', 'hello@example.com', LINKEDIN)).toBeUndefined();
  });

  // A whitespace-only form URL is not a form; the next option takes over.
  it('ignores a blank form URL', () => {
    expect(sponsorCta('   ', 'hello@example.com', LINKEDIN)?.href).toContain('mailto:hello@example.com');
  });

  // With no form, the shared inbox takes the inquiry, subject pre-filled.
  it('emails the shared inbox when there is no form', () => {
    const cta = sponsorCta(undefined, 'hello@example.com', LINKEDIN);
    expect(cta?.label).toBe('Email us about sponsorship');
    expect(cta?.href).toBe('mailto:hello@example.com?subject=Sponsoring%20Harvard%20Alumni%20in%20Tech');
  });

  // With the address blanked too, LinkedIn keeps the section from dead-ending.
  it.each([[''], ['   '], [undefined]])('falls back to LinkedIn when the address is %j', (email) => {
    expect(sponsorCta(undefined, email, LINKEDIN)).toEqual({
      href: LINKEDIN,
      label: 'Message us on LinkedIn',
    });
  });

  // Nothing configured at all means no button, never a dead link.
  it('offers no button when there is no form, address or LinkedIn', () => {
    expect(sponsorCta(undefined, '', undefined)).toBeUndefined();
    expect(sponsorCta(undefined, undefined, '  ')).toBeUndefined();
  });
});
