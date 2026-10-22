import { describe, it, expect } from 'vitest';
import { isCommittee, splitLeads, titleLine, schoolLine, chapterLeadsHeading } from './leads';

describe('isCommittee', () => {
  // the role is free text, so the word is matched anywhere in it
  it('matches a role that mentions committee', () => {
    expect(isCommittee({ role: 'Committee member' })).toBe(true);
  });

  // editors type roles by hand, so case must not matter
  it('ignores case', () => {
    expect(isCommittee({ role: 'events COMMITTEE' })).toBe(true);
  });

  // a lead or co-lead gets a full profile
  it('does not match a chapter lead or co-lead', () => {
    expect(isCommittee({ role: 'Chapter Lead' })).toBe(false);
    expect(isCommittee({ role: 'Co-Lead' })).toBe(false);
  });

  // an entry with no role at all is a full profile
  it('treats a missing role as not committee', () => {
    expect(isCommittee({})).toBe(false);
  });
});

describe('splitLeads', () => {
  // leads and committee members go to separate lists, keeping their order
  it('separates profiles from committee members in input order', () => {
    const leads = [
      { name: 'A', role: 'Chapter Lead' },
      { name: 'B', role: 'Committee member' },
      { name: 'C', role: 'Co-Lead' },
      { name: 'D', role: 'Committee member' },
    ];
    const { profiles, committee } = splitLeads(leads);

    expect(profiles.map((l) => l.name)).toEqual(['A', 'C']);
    expect(committee.map((l) => l.name)).toEqual(['B', 'D']);
  });

  // no leads means two empty lists, not an error
  it('returns two empty lists for no leads', () => {
    expect(splitLeads([])).toEqual({ profiles: [], committee: [] });
  });
});

describe('titleLine', () => {
  // both halves join with a comma, as on the mockup
  it('joins title and company with a comma', () => {
    expect(titleLine({ title: 'Partner', company: 'Acme Ventures' })).toBe('Partner, Acme Ventures');
  });

  // either half can stand alone without a dangling comma
  it('returns a lone title or company without a comma', () => {
    expect(titleLine({ title: 'Founder' })).toBe('Founder');
    expect(titleLine({ company: 'Acme' })).toBe('Acme');
  });

  // nothing to say renders nothing, so the line drops out
  it('returns an empty string when both are missing', () => {
    expect(titleLine({})).toBe('');
  });
});

describe('schoolLine', () => {
  // the full mockup line: school, then degree and two-digit class year
  it('formats school, degree and class year', () => {
    expect(schoolLine({ school: 'Harvard Business School', degree: 'MBA', gradYear: 2015 })).toBe(
      'Harvard Business School · MBA ’15',
    );
  });

  // a year without a degree still reads as a class year
  it('formats a class year without a degree', () => {
    expect(schoolLine({ school: 'Harvard College', gradYear: 2009 })).toBe('Harvard College · ’09');
  });

  // a school alone has no separator
  it('returns the school alone with no separator', () => {
    expect(schoolLine({ school: 'Harvard Law School' })).toBe('Harvard Law School');
  });

  // degree and year can stand without a school
  it('returns degree and year when the school is missing', () => {
    expect(schoolLine({ degree: 'AB', gradYear: 2012 })).toBe('AB ’12');
  });

  // older entries have none of these fields, so the line drops out
  it('returns an empty string when nothing is set', () => {
    expect(schoolLine({})).toBe('');
  });
});

describe('chapterLeadsHeading', () => {
  // a solo lead gets the singular heading
  it('is singular for one lead', () => {
    expect(chapterLeadsHeading(1)).toBe('Chapter lead');
  });

  // two or more leads get the plural heading
  it('is plural for several leads', () => {
    expect(chapterLeadsHeading(2)).toBe('Chapter leads');
  });

  // zero is plural too, though the block does not render then
  it('is plural for zero', () => {
    expect(chapterLeadsHeading(0)).toBe('Chapter leads');
  });
});
