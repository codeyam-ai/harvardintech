// Where a "give" button points — and whether there is a button at all.
//
// Harvard Alumni in Tech has no donation platform yet. Until the Givebutter
// campaign opens, the site must not ask anyone for money, so a blank `donateUrl`
// means GIVING IS CLOSED: every campaign CTA is replaced by a plain message
// saying the campaign is coming. A blank URL used to mean "open an inquiry
// email" instead, which asked for a gift the organization could not yet accept.
//
// Setting `donateUrl` in the CMS switches every button back on and points it
// straight at the platform, with no code change — which is the whole reason this
// is one function rather than an inline ternary repeated in each giving
// component.
import { buildMailto } from './mailto';

export interface GiveHrefOptions {
  /** Real donation platform URL. Empty/absent → the mailto fallback. */
  donateUrl?: string;
  /** Address the giving inquiry goes to. */
  email: string;
  /** Names the campaign in the email subject, e.g. "The Momentum Fund". */
  campaignName?: string;
}

/**
 * Resolve the href for a giving CTA: the donation platform when one is
 * configured, otherwise a `mailto:` with a campaign-specific subject.
 */
export function resolveGiveHref({ donateUrl, email, campaignName }: GiveHrefOptions): string {
  const url = donateUrl?.trim();
  if (url) return url;
  const subject = campaignName
    ? `Supporting ${campaignName}`
    : 'Supporting Harvard Alumni in Tech';
  return buildMailto({ to: email, subject });
}

/**
 * Is the site currently able to accept a gift?
 *
 * True only when a real donation platform URL is configured. This single
 * predicate is what every giving surface asks before rendering a button, so
 * "the campaign has not opened yet" stays one CMS field rather than a state each
 * component decides for itself.
 */
export function isGivingOpen(donateUrl?: string): boolean {
  return Boolean(donateUrl?.trim());
}

/**
 * What the site says in place of a giving button while giving is closed.
 *
 * It lives here, beside `isGivingOpen`, so the message and the condition that
 * shows it cannot drift apart.
 */
export const GIVING_SOON_MESSAGE =
  'Our first fundraising campaign opens soon — our 2026 goal is $10,000.';

/**
 * Where a giving CTA on a CAMPAIGN page points, or `undefined` when giving is
 * closed and the caller should render `GIVING_SOON_MESSAGE` instead of a link.
 *
 * This used to fall back to the site's own `/give` page. It no longer does.
 * `/give` held a checkout that could not take a payment, so pointing at it
 * before the campaign opens walked a reader toward an ask nobody could
 * complete. A configured `donateUrl` goes straight to the platform, which is a
 * better destination than our own page ever was.
 */
export function resolveGiveCtaHref({
  donateUrl,
}: Pick<GiveHrefOptions, 'donateUrl'>): string | undefined {
  return donateUrl?.trim() || undefined;
}
