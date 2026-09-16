// Pure, framework-free helpers for the site's LOCAL PRESENCE model — the rule
// that decides what a place or a group offers a visitor who wants in.
//
// The site used to have exactly one kind of local page: a chapter, which
// assumed a named lead and a calendar. That assumption was wrong for half the
// roster. DC and Seattle have a real concentration of alumni and a WhatsApp
// group but nobody running events yet, and AI and Founders are not places at
// all. Rather than delete the thin ones (which loses the alumni who are there)
// or fake a lead (which loses trust), a chapter carries a `status` and the page
// asks for what it actually needs:
//
//   active   → leads, upcoming events, recent events
//   forming  → "help lead it": volunteer, and join the local WhatsApp
//
// Promoting a chapter is therefore flipping one select in /admin. The URL, the
// nav entry and every event tag stay exactly where they are — which is the
// whole reason `status` is a field on `chapters` rather than a second
// collection.
//
// No DOM, no Astro imports, no `fs` — the same contract as `nav.ts`,
// `events.ts` and `contact.ts`, so every rule here unit-tests directly.
import { NEWSLETTER_URL, VOLUNTEER_PATH, WHATSAPP_FORM_URL } from './contact';

// Re-exported, NOT redeclared. `contact.ts` is the one place the site's fixed
// destinations live, and a second copy of the WhatsApp form URL is exactly the
// kind of drift that leaves half the site pointing at a dead form after an
// edit. Callers may import either name from either module and get one value.
export { NEWSLETTER_URL, VOLUNTEER_PATH, WHATSAPP_FORM_URL };

/** A chapter is either running events or working toward it. */
export type ChapterStatus = 'active' | 'forming';

/**
 * The minimum shape these rules need. Deliberately looser than the content
 * schema: callers pass `{ slug, ...data }` projections, and a community has no
 * `status` at all, so every field here is optional.
 */
export interface PresenceLike {
  status?: string;
  whatsappFormUrl?: string;
  volunteerUrl?: string;
}

/**
 * Read one presence field off a value of any shape.
 *
 * The functions below take `unknown` rather than `PresenceLike` on purpose.
 * `PresenceLike` is all-optional, which makes it a TypeScript "weak type": an
 * argument sharing none of its keys is REJECTED. A chapter carrying no
 * `status`, no `whatsappFormUrl` and no `volunteerUrl` shares none of them —
 * and that is the default case, most of the roster, and precisely what these
 * rules exist to handle. Constraining to the interface would therefore refuse
 * the commonest input while accepting the rare one.
 *
 * Callers also pass whole `{ slug, ...data }` projections rather than trimmed
 * objects, so a narrow parameter type would fight every real call site. The
 * values arrive from markdown frontmatter, which is only as typed as the schema
 * that validated it — reading defensively here is honest about that.
 */
function field(entry: unknown, key: keyof PresenceLike): string | undefined {
  const value = (entry as Record<string, unknown> | null | undefined)?.[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * True when `url` points at a WhatsApp group itself rather than the join form.
 *
 * The site never links a group directly. Membership goes through the Google
 * Form so that alumni status is verified before someone is added — a raw
 * `chat.whatsapp.com` invite in public HTML bypasses that entirely and cannot
 * be revoked once it has been scraped. This predicate is what lets the schema
 * refuse such a URL at edit time and the consistency test refuse it at build
 * time, from one definition.
 *
 * Matching is on the HOST, so a link that merely mentions WhatsApp in a query
 * string or path is not caught by accident.
 */
export function isWhatsAppGroupLink(url?: string | null): boolean {
  if (!url) return false;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  const bare = host.replace(/^www\./, '');
  return bare === 'chat.whatsapp.com' || bare === 'wa.me' || bare === 'api.whatsapp.com';
}

/**
 * A chapter's status, defaulting to `active`.
 *
 * Absent means active on purpose: every chapter that existed before this field
 * did was one with events, so the default preserves their pages exactly. Only
 * an entry that explicitly says `forming` gets the forming treatment, and an
 * unrecognised value falls back to active rather than rendering a page with no
 * leads and no CTAs.
 */
export function chapterStatus(entry: unknown): ChapterStatus {
  return field(entry, 'status') === 'forming' ? 'forming' : 'active';
}

/** True when this chapter has no lead yet and should ask for one. */
export function isForming(entry: unknown): boolean {
  return chapterStatus(entry) === 'forming';
}

/**
 * The roster split by status, preserving each input's relative order.
 *
 * The counts are what the stat strip, the hero lede and the sponsor copy are
 * checked against — "4 cities · 2 forming" is derived here once rather than
 * counted by hand in four places that then drift apart.
 */
export function presenceSummary<T>(
  chapters: readonly T[],
): { active: T[]; forming: T[]; activeCount: number; formingCount: number } {
  const active = chapters.filter((c) => chapterStatus(c) === 'active');
  const forming = chapters.filter((c) => chapterStatus(c) === 'forming');
  return {
    active,
    forming,
    activeCount: active.length,
    formingCount: forming.length,
  };
}

/**
 * Chapters ordered the way every roster surface orders them: active first, then
 * forming, and within each group by the `order` pin with the display name
 * breaking ties.
 *
 * This is `chapterNavItems`' sort with a status tier in front of it. The nav
 * and the "Our chapters" row both call it so a visitor meets the four cities
 * with events before the two that are forming, in the menu and on the page
 * alike.
 */
export function byPresence<T>(chapters: readonly T[]): T[] {
  // Unconstrained in T so the caller gets its OWN element type back — a
  // constraint here would widen `city` to `string | undefined` and break
  // `chapterNavItems`, whose labels are non-optional.
  const tier = (c: T) => (chapterStatus(c) === 'active' ? 0 : 1);
  const order = (c: T) => (c as { order?: number } | null)?.order ?? 99;
  const city = (c: T) => (c as { city?: string } | null)?.city ?? '';
  return [...chapters].sort(
    (a, b) => tier(a) - tier(b) || order(a) - order(b) || city(a).localeCompare(city(b)),
  );
}

/** Where a join / volunteer / subscribe block should point for one entry. */
export interface JoinCtas {
  /** The Google Form. Never a group invite. */
  whatsappFormUrl: string;
  /** The volunteer page, or an entry's own override. */
  volunteerUrl: string;
  /** The LinkedIn newsletter. */
  newsletterUrl: string;
}

/**
 * The three destinations a join block offers, resolved for one chapter or
 * community.
 *
 * Each falls back to the site-wide default when the entry carries nothing, so a
 * chapter needs no URLs at all to render a complete set of CTAs. The WhatsApp
 * slot additionally REFUSES a group link: an editor who pastes a
 * `chat.whatsapp.com` invite into the box gets the shared form instead of
 * publishing an un-revocable public invite. The schema rejects the same value
 * at edit time; this is the render-time backstop, because content can also
 * arrive from a seed, a migration, or a hand-edited file that never passed
 * through /admin.
 */
export function joinCtas(entry?: unknown): JoinCtas {
  const candidate = field(entry, 'whatsappFormUrl')?.trim();
  return {
    whatsappFormUrl:
      candidate && !isWhatsAppGroupLink(candidate) ? candidate : WHATSAPP_FORM_URL,
    volunteerUrl: field(entry, 'volunteerUrl')?.trim() || VOLUNTEER_PATH,
    newsletterUrl: NEWSLETTER_URL,
  };
}
