// The pure logic behind the chapter and community leads block: which leads get a
// full profile and which a compact committee tile, the one-line summaries a
// profile prints under the name, and the heading over the list.
//
// Kept out of `ChapterLeads.astro` so it carries unit tests rather than only
// screenshots, and so the profile and committee components share one spelling
// of "Title, Company" and "School · Degree 'YY" instead of each formatting it.
import type { Lead } from './leadSchema';

/** A lead whose free-text `role` mentions "committee" gets the compact grid. */
export function isCommittee(lead: Pick<Lead, 'role'>): boolean {
  return /committee/i.test(lead.role ?? '');
}

/** Leads split into full profiles and committee tiles, each in input order. */
export function splitLeads<T extends Pick<Lead, 'role'>>(
  leads: readonly T[],
): { profiles: T[]; committee: T[] } {
  return {
    profiles: leads.filter((l) => !isCommittee(l)),
    committee: leads.filter(isCommittee),
  };
}

/** "Title, Company" — either half alone, or '' when both are missing. */
export function titleLine(lead: Pick<Lead, 'title' | 'company'>): string {
  return [lead.title, lead.company].filter(Boolean).join(', ');
}

/**
 * "School · Degree ’YY" — the class year is shortened to its last two digits
 * behind a typographic apostrophe, as on Nicole's mockup. Every part is
 * optional; '' when there is nothing to say.
 */
export function schoolLine(lead: Pick<Lead, 'school' | 'degree' | 'gradYear'>): string {
  const cls = [lead.degree, lead.gradYear ? `’${String(lead.gradYear).slice(-2)}` : null]
    .filter(Boolean)
    .join(' ');
  return [lead.school, cls].filter(Boolean).join(' · ');
}

/** "Chapter lead" for a chapter with one lead, "Chapter leads" otherwise. */
export function chapterLeadsHeading(count: number): string {
  return count === 1 ? 'Chapter lead' : 'Chapter leads';
}
