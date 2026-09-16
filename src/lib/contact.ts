// The one source for how the public site offers contact: the shared inbox, the
// social links, and the few fixed destinations the calls to action use.
//
// The owner's rule (2026-09-15): use the shared inbox "sparingly" — in the
// handful of places named in `EMAIL_SURFACES`, and nowhere else. Every other
// surface offers the socials or a form. Blank the setting and every surface,
// listed or not, falls back to socials, so no page ever renders a dead
// `mailto:`.
//
// Pure and framework-free (like `drafts.ts` and `publishTrack.ts`), so the rule
// is unit-testable without Astro.
import { buildMailto } from './mailto';
import { socialDisplayLabel } from './socialLabel';
import type { SocialLink } from './site';

/** Where "volunteer" calls to action land. The volunteer form itself keeps its
 *  one home, the volunteer page's `ctaUrl` — this is the page, not the form. */
export const VOLUNTEER_PATH = '/volunteer';

/** The WhatsApp join form. The group itself is never linked directly. */
export const WHATSAPP_FORM_URL = 'https://forms.gle/GqgaCDDWhWAgpJC68';

/**
 * The newsletter signup — the Mailchimp hosted form, which is what "Subscribe"
 * has always meant on this site.
 *
 * Named here because it was previously a bare literal repeated in five
 * components (`BaseLayout`, `ChapterSignUp`, `Hero`, `HeroCarousel`,
 * `UpcomingEvents`) plus one content file. That is one list the team can move,
 * and six places that would have to be found and changed together when they
 * do. New call sites use this constant; the existing literals are left alone
 * rather than swept up in an unrelated change.
 *
 * Not to be confused with the LinkedIn NEWSLETTER in `nav.json`, which is a
 * feed to follow rather than a list to join.
 */
export const NEWSLETTER_URL = 'https://mailchi.mp/0222623e1169/fbrj32e9wb';

/** The WhatsApp admissions criteria doc, from the original site's copy. */
export const WHATSAPP_CRITERIA_URL =
  'https://docs.google.com/document/d/1IvWhYTdFqOzMYg6ySXx7pmMOfwhDwDHfXHdDkZRbkyE/edit?tab=t.0#heading=h.2l2z5vqeznos';

/**
 * The only surfaces that may show the shared inbox. Adding one is a deliberate,
 * reviewable one-line change — which is the point of keeping the list here
 * rather than letting each component decide.
 */
export const EMAIL_SURFACES = [
  'footer',
  'contactUs',
  'formingChapter',
  'sponsorInquiry',
  'llms',
  'structuredData',
] as const;
export type EmailSurface = (typeof EMAIL_SURFACES)[number];

/** The trimmed address, or `undefined` when blank or absent. */
export function resolveContactEmail(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The address for one surface: the resolved setting when `surface` is on the
 * list, otherwise `undefined`. Every consumer goes through this, so a surface
 * that is not on the list cannot show the inbox by accident.
 */
export function emailFor(surface: string, value?: string | null): string | undefined {
  return (EMAIL_SURFACES as readonly string[]).includes(surface)
    ? resolveContactEmail(value)
    : undefined;
}

export interface SponsorCta {
  href: string;
  label: string;
}

/**
 * The one way into a sponsorship conversation, in priority order: an inquiry
 * form when one is configured (a sponsor's details then arrive structured, and
 * the shared inbox stays out of the way), otherwise the shared inbox, otherwise
 * the site's LinkedIn. `undefined` means the section offers no button at all,
 * which is only reachable with no form, no address and no LinkedIn.
 *
 * A form wins by returning `undefined` here: the section renders the embedded
 * form instead, so a second "email us" button beside it would compete with it.
 */
export function sponsorCta(
  formUrl?: string | null,
  email?: string | null,
  linkedInUrl?: string | null,
): SponsorCta | undefined {
  if (formUrl?.trim()) return undefined;
  const address = resolveContactEmail(email);
  if (address) {
    return {
      href: buildMailto({ to: address, subject: 'Sponsoring Harvard Alumni in Tech' }),
      label: 'Email us about sponsorship',
    };
  }
  const linkedIn = linkedInUrl?.trim();
  return linkedIn ? { href: linkedIn, label: 'Message us on LinkedIn' } : undefined;
}

export interface ConnectLink {
  label: string;
  url: string;
  icon?: string;
}

/**
 * Every social link in its settings order, plus a synthesized "E-mail" entry
 * only when an address is given. An editor who already added a mail link as a
 * social keeps that one, rather than getting two envelopes under two spellings.
 */
export function displayConnectLinks(
  socials: readonly SocialLink[],
  email?: string,
): ConnectLink[] {
  return connectLinks(socials, email).map((link) => ({
    ...link,
    label: socialDisplayLabel(link.label),
  }));
}

export function connectLinks(socials: readonly SocialLink[], email?: string): ConnectLink[] {
  const links: ConnectLink[] = socials.map((s) => ({ label: s.label, url: s.url, icon: s.icon }));
  const address = resolveContactEmail(email);
  const hasEmailSocial = socials.some(
    (s) => s.icon?.toLowerCase() === 'email' || s.url.trim().toLowerCase().startsWith('mailto:'),
  );
  if (address && !hasEmailSocial) {
    links.push({
      label: 'E-mail',
      url: buildMailto({ to: address, subject: 'Hello from the website' }),
      icon: 'email',
    });
  }
  return links;
}
