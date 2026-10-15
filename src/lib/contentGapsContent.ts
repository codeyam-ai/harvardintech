// Reads today's content into the snapshot `findContentGaps` judges.
//
// Every collection is read WHOLE, drafts included — deliberately unlike the
// public pages, which drop drafts through `publishedEntries`. A drafted entry is
// exactly what the gap check is looking for, so filtering here would hide the
// gaps it exists to report.
import { getCollection } from 'astro:content';
import { donatePage } from './site';
import { loadDonateUrl } from './donatePageContent';
import { findContentGaps, type ContentGap } from './contentGaps';

export async function loadContentGaps(): Promise<ContentGap[]> {
  const [donors, testimonials, communities, sponsors, sponsorLevels, sponsorPages, pillars] =
    await Promise.all([
      getCollection('donors'),
      getCollection('testimonials'),
      getCollection('communities'),
      getCollection('sponsors'),
      getCollection('sponsorLevels'),
      getCollection('sponsorPage'),
      getCollection('pillars'),
    ]);

  return findContentGaps({
    donors: donors.map((e) => e.data),
    donateUrl: await loadDonateUrl(donatePage.donateUrl),
    testimonials: testimonials.map((e) => e.data),
    communities: communities.map((e) => e.data),
    sponsors: sponsors.map((e) => e.data),
    sponsorLevels: sponsorLevels.map((e) => e.data),
    inquiryFormUrl: sponsorPages[0]?.data.inquiryFormUrl,
    pillars: pillars.map((e) => e.data),
  });
}
