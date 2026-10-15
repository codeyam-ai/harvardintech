import { describe, it, expect } from 'vitest';
import {
  MIN_TESTIMONIALS,
  findContentGaps,
  groupGapsByArea,
  type ContentGap,
  type ContentSnapshot,
} from './contentGaps';

/** Everything filled in — the state the site may go public in. */
function filled(): ContentSnapshot {
  return {
    donors: [{ name: 'A. Supporter' }],
    donateUrl: 'https://givebutter.com/hit',
    testimonials: [
      { name: 'One', photo: '/a.webp', eventPhoto: '/b.webp' },
      { name: 'Two', photo: '/c.webp', eventPhoto: '/d.webp' },
      { name: 'Three', photo: '/e.webp', eventPhoto: '/f.webp' },
    ],
    communities: [{ name: 'AI', heroImage: '/ai.webp', leads: [{ name: 'Lead' }] }],
    sponsors: [{ name: 'Real Co' }],
    sponsorLevels: [{ name: 'Chapter Partner' }],
    inquiryFormUrl: 'https://forms.gle/x',
    pillars: [{ title: 'Create meaningful connections' }],
  };
}

/** The content as it stands on 2026-10-15, reduced to the fields the check reads. */
function today(): ContentSnapshot {
  return {
    donors: [],
    donateUrl: '',
    testimonials: [
      { name: 'Jessica Li', photo: '/j.webp', eventPhoto: '/sf.webp' },
      { name: 'Mohammed Ally' },
    ],
    communities: [
      { name: 'AI', leads: [{ name: 'James Nicholson' }] },
      { name: 'Founders', heroImage: '/founders.webp' },
      { name: 'Investors', leads: [{ name: 'Stefan Pagacik' }] },
    ],
    sponsors: [
      { name: 'Example Presenting Partner', placeholder: true, draft: true },
      { name: 'Example Chapter Partner', placeholder: true, draft: true },
      { name: 'Example Event Partner', placeholder: true, draft: true },
    ],
    sponsorLevels: [
      { name: 'Presenting Partner', draft: true },
      { name: 'Chapter Partner' },
      { name: 'Community Partner' },
    ],
    inquiryFormUrl: '',
    pillars: [
      { title: 'Create meaningful connections' },
      { title: 'Establish the organizational foundation', draft: true },
      { title: 'Secure essential annual software', draft: true },
      { title: 'Fund chapter events and programming', draft: true },
    ],
  };
}

const problems = (gaps: ContentGap[]) => gaps.map((g) => g.problem);

describe('findContentGaps', () => {
  // The bar the site may launch at: real content everywhere means nothing is held.
  it('reports no gaps when every area is filled', () => {
    expect(findContentGaps(filled())).toEqual([]);
  });

  // Today's content, gap for gap — the fifteen the runbook lists.
  it('reports every gap in todays content', () => {
    expect(findContentGaps(today())).toHaveLength(15);
  });

  // An empty supporter wall and a blank donation link are separate asks to separate people.
  it('flags an empty supporter wall and a missing donation link separately', () => {
    const gaps = findContentGaps({ ...filled(), donors: [], donateUrl: '  ' });
    expect(problems(gaps)).toEqual([
      'No supporters are listed, so the wall on /donate is empty.',
      'There is no donation link, so every give button opens an email instead.',
    ]);
  });

  // A drafted donor is not on the public wall, so it does not fill it.
  it('does not count drafted donors as filling the wall', () => {
    const gaps = findContentGaps({ ...filled(), donors: [{ name: 'Hidden', draft: true }] });
    expect(gaps.map((g) => g.area)).toEqual(['Supporter wall']);
  });

  // Too few quotes, and the shortfall reads as a sentence: one more, not "1 more quote(s)".
  it('asks for one more quote when the band is one short', () => {
    const [gap] = findContentGaps({ ...filled(), testimonials: filled().testimonials.slice(0, 2) });
    expect(gap.problem).toBe(`Only 2 member quotes on /donate; at least ${MIN_TESTIMONIALS} are needed.`);
    expect(gap.ask).toMatch(/^One more quote from alumni/);
  });

  // With no quotes at all the count and the plural both change.
  it('asks for several quotes when the band is empty', () => {
    const [gap] = findContentGaps({ ...filled(), testimonials: [] });
    expect(gap.ask).toMatch(new RegExp(`^${MIN_TESTIMONIALS} more quotes from alumni`));
  });

  // Each missing photo is its own gap, named after the person, pointing at the field.
  it('names the person whose portrait or event photo is missing', () => {
    const testimonials = [...filled().testimonials.slice(1), { name: 'Mohammed Ally' }];
    const gaps = findContentGaps({ ...filled(), testimonials });
    expect(gaps.map((g) => g.where)).toEqual([
      'Testimonials → Mohammed Ally → Photo',
      'Testimonials → Mohammed Ally → Event photo',
    ]);
  });

  // A community page needs a banner and a named lead.
  it('flags a community with no banner image or no lead', () => {
    const gaps = findContentGaps({ ...filled(), communities: [{ name: 'Founders', leads: [] }] });
    expect(problems(gaps)).toEqual([
      'The Founders page has no banner image.',
      'The Founders page names no lead.',
    ]);
  });

  // The loader returns communities in no fixed order; the list must not reshuffle between builds.
  it('lists community gaps alphabetically whatever order they arrive in', () => {
    const gaps = findContentGaps({
      ...filled(),
      communities: [{ name: 'Investors', leads: [{}] }, { name: 'AI', leads: [{}] }],
    });
    expect(problems(gaps)).toEqual([
      'The AI page has no banner image.',
      'The Investors page has no banner image.',
    ]);
  });

  // Example partners neither fill the wall nor go unnoticed: both gaps are reported.
  it('treats example partners as no partners and lists them for deletion', () => {
    const gaps = findContentGaps({
      ...filled(),
      sponsors: [{ name: 'Example Partner', placeholder: true }],
    });
    expect(problems(gaps)).toEqual([
      'No real partners are listed, so the wall on /sponsor reads "No partners listed yet."',
      '1 "Example" partner is still in the content as stand-ins.',
    ]);
  });

  // A drafted partnership level is switched off, which the owner ruled out.
  it('flags a switched-off partnership level by name', () => {
    const gaps = findContentGaps({
      ...filled(),
      sponsorLevels: [{ name: 'Presenting Partner', draft: true }],
    });
    expect(problems(gaps)).toEqual(['The Presenting Partner level is switched off.']);
  });

  // No inquiry form means the partner section can only offer an email address.
  it('flags a missing partner inquiry form', () => {
    const gaps = findContentGaps({ ...filled(), inquiryFormUrl: undefined });
    expect(gaps.map((g) => g.where)).toEqual(['Sponsorship page → Inquiry form URL']);
  });

  // Drafted priority cards on /donate are switched-off content too.
  it('flags each drafted priority', () => {
    const gaps = findContentGaps({
      ...filled(),
      pillars: [{ title: 'Secure essential annual software', draft: true }],
    });
    expect(problems(gaps)).toEqual([
      'The priority "Secure essential annual software" is switched off on /donate.',
    ]);
  });
});

describe('groupGapsByArea', () => {
  // The runbook prints one heading per area, in the order the page reads.
  it('groups gaps by area in first-seen order', () => {
    const groups = groupGapsByArea(findContentGaps(today()));
    expect(groups.map((g) => g.area)).toEqual([
      'Supporter wall',
      'Testimonials',
      'Communities',
      'Partners',
      'Priorities',
    ]);
    expect(groups.map((g) => g.gaps.length)).toEqual([2, 3, 3, 4, 3]);
  });

  // No gaps means no headings at all, never an empty one.
  it('returns no groups for no gaps', () => {
    expect(groupGapsByArea([])).toEqual([]);
  });
});
