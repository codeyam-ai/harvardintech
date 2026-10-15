// What is still missing before the site can go public.
//
// The owner ruled on 2026-10-02 that nothing ships empty or switched off. Most of
// what stands between today's content and that bar is material only the team can
// supply — donor names, partner logos, quotes, portraits — so the code's job is
// not to fill the gaps but to make every one of them visible, countable and
// blocking. This is the single place that decides what counts as a gap; the
// cutover runbook lists the result and holds the go-public steps on it.
//
// Pure: the loader in `contentGapsContent.ts` reads the collections and hands
// plain data in, so every rule here is testable against fixtures. Entries arrive
// INCLUDING drafts, because a drafted entry standing in for a real one is itself
// a gap — the Presenting Partner level is switched off precisely by `draft: true`.

/** Fewer quotes than this reads as a placeholder band (owner: "add other quotes"). */
export const MIN_TESTIMONIALS = 3;

/** Which part of the site a gap is on, in the team's words. */
export type GapArea = 'Supporter wall' | 'Testimonials' | 'Communities' | 'Partners' | 'Priorities';

export interface ContentGap {
  area: GapArea;
  /** What is missing, read as a plain sentence. */
  problem: string;
  /** What someone has to send or decide to close it. */
  ask: string;
  /** Where in /admin the fix goes, named as the content editor names it. */
  where: string;
}

interface Drafted {
  draft?: boolean;
}

export interface ContentSnapshot {
  donors: Array<Drafted & { name?: string }>;
  donateUrl?: string;
  testimonials: Array<Drafted & { name: string; photo?: string; eventPhoto?: string }>;
  communities: Array<Drafted & { name: string; heroImage?: string; leads?: unknown[] }>;
  sponsors: Array<Drafted & { name: string; placeholder?: boolean }>;
  sponsorLevels: Array<Drafted & { name: string }>;
  inquiryFormUrl?: string;
  pillars: Array<Drafted & { title: string }>;
}

const blank = (value?: string) => !value?.trim();
const live = <T extends Drafted>(entries: T[]) => entries.filter((e) => e.draft !== true);

/** Every launch gap in the snapshot, grouped by area in page order. */
export function findContentGaps(content: ContentSnapshot): ContentGap[] {
  const gaps: ContentGap[] = [];

  if (live(content.donors).length === 0) {
    gaps.push({
      area: 'Supporter wall',
      problem: 'No supporters are listed, so the wall on /donate is empty.',
      ask: 'The names of supporters who have agreed to be listed (or listed anonymously).',
      where: 'Donors',
    });
  }
  if (blank(content.donateUrl)) {
    gaps.push({
      area: 'Supporter wall',
      problem: 'There is no donation link, so every give button opens an email instead.',
      ask: 'The donation page address (Givebutter or similar) once the campaign opens.',
      where: 'Page settings → Donate → Donation platform URL',
    });
  }

  const quotes = live(content.testimonials);
  if (quotes.length < MIN_TESTIMONIALS) {
    const short = MIN_TESTIMONIALS - quotes.length;
    gaps.push({
      area: 'Testimonials',
      problem: `Only ${quotes.length} member ${quotes.length === 1 ? 'quote' : 'quotes'} on /donate; at least ${MIN_TESTIMONIALS} are needed.`,
      ask: `${short === 1 ? 'One more quote' : `${short} more quotes`} from alumni, each with their permission, a portrait and a real event photo.`,
      where: 'Testimonials',
    });
  }
  for (const quote of quotes) {
    if (blank(quote.photo)) {
      gaps.push({
        area: 'Testimonials',
        problem: `${quote.name}'s quote has no portrait.`,
        ask: `A photo of ${quote.name} they are happy to have used.`,
        where: `Testimonials → ${quote.name} → Photo`,
      });
    }
    if (blank(quote.eventPhoto)) {
      gaps.push({
        area: 'Testimonials',
        problem: `${quote.name}'s quote has no event photo.`,
        ask: `A real photo from the event ${quote.name} describes.`,
        where: `Testimonials → ${quote.name} → Event photo`,
      });
    }
  }

  // By name: the content loader returns entries in no fixed order, and an
  // unstable list would reshuffle the runbook between builds.
  const communities = live(content.communities).sort((a, b) => a.name.localeCompare(b.name));
  for (const community of communities) {
    if (blank(community.heroImage)) {
      gaps.push({
        area: 'Communities',
        problem: `The ${community.name} page has no banner image.`,
        ask: `A photo for the top of the ${community.name} page.`,
        where: `Communities → ${community.name} → Hero image`,
      });
    }
    if (!community.leads?.length) {
      gaps.push({
        area: 'Communities',
        problem: `The ${community.name} page names no lead.`,
        ask: `Who leads ${community.name}, and how they'd like to be listed.`,
        where: `Communities → ${community.name} → Community leads`,
      });
    }
  }

  const realSponsors = live(content.sponsors).filter((s) => s.placeholder !== true);
  if (realSponsors.length === 0) {
    gaps.push({
      area: 'Partners',
      problem: 'No real partners are listed, so the wall on /sponsor reads "No partners listed yet."',
      ask: 'Each confirmed partner: name, level, website and a logo they have approved.',
      where: 'Sponsors',
    });
  }
  const placeholders = content.sponsors.filter((s) => s.placeholder === true);
  if (placeholders.length > 0) {
    gaps.push({
      area: 'Partners',
      problem: `${placeholders.length} "Example" ${placeholders.length === 1 ? 'partner is' : 'partners are'} still in the content as stand-ins.`,
      ask: 'Delete them once real partners are in.',
      where: 'Sponsors',
    });
  }
  for (const level of content.sponsorLevels.filter((l) => l.draft === true)) {
    gaps.push({
      area: 'Partners',
      problem: `The ${level.name} level is switched off.`,
      ask: `Decide whether to offer ${level.name}; switch it on with its final wording, or delete it.`,
      where: `Sponsorship levels → ${level.name} → Draft`,
    });
  }
  if (blank(content.inquiryFormUrl)) {
    gaps.push({
      area: 'Partners',
      problem: 'The "become a partner" section has no form, only an email address.',
      ask: 'A partner inquiry form address (a Google Form is enough).',
      where: 'Sponsorship page → Inquiry form URL',
    });
  }

  for (const pillar of content.pillars.filter((p) => p.draft === true)) {
    gaps.push({
      area: 'Priorities',
      problem: `The priority "${pillar.title}" is switched off on /donate.`,
      ask: 'Finish its wording and switch it on, or delete it.',
      where: `Momentum Fund gift pillars → ${pillar.title} → Draft`,
    });
  }

  return gaps;
}

export interface GapGroup {
  area: GapArea;
  gaps: ContentGap[];
}

/**
 * Gaps grouped by area, areas in the order they first appear — which is page
 * order, because `findContentGaps` emits them that way. An area with no gaps
 * gets no group, so the runbook never prints an empty heading.
 */
export function groupGapsByArea(gaps: ContentGap[]): GapGroup[] {
  const groups: GapGroup[] = [];
  for (const gap of gaps) {
    const group = groups.find((g) => g.area === gap.area);
    if (group) group.gaps.push(gap);
    else groups.push({ area: gap.area, gaps: [gap] });
  }
  return groups;
}
