import { describe, it, expect } from 'vitest';
import {
  byPresence,
  chapterStatus,
  isForming,
  isWhatsAppGroupLink,
  joinCtas,
  presenceSummary,
  NEWSLETTER_URL,
  VOLUNTEER_PATH,
  WHATSAPP_FORM_URL,
} from './localPresence';

// The local-presence rules: which chapters are running events, which are asking
// for a lead, and where a "join us" button is allowed to point.
//
// The WhatsApp cases carry the most weight here. Every other rule in this file
// is cosmetic if it breaks — a chapter sorts in the wrong place, a badge is
// missing. `joinCtas` returning a group invite would publish an un-revocable
// link that skips alumni verification, and nothing downstream would catch it.

describe('chapterStatus', () => {
  // Absent means active because every chapter that existed before this field
  // did was one with events. A different default would have silently converted
  // the whole roster to "forming" the moment the field shipped.
  it('defaults to active when no status is set', () => {
    expect(chapterStatus({})).toBe('active');
    expect(chapterStatus(undefined)).toBe('active');
    expect(chapterStatus(null)).toBe('active');
  });

  // The field is read straight through when it says one of the two things it
  // is allowed to say.
  it('reads an explicit status', () => {
    expect(chapterStatus({ status: 'forming' })).toBe('forming');
    expect(chapterStatus({ status: 'active' })).toBe('active');
  });

  // An unrecognised value falls back to active rather than forming: a typo in
  // /admin should not turn a working chapter's page into a volunteer appeal.
  it('falls back to active on an unrecognised value', () => {
    expect(chapterStatus({ status: 'Forming' })).toBe('active');
    expect(chapterStatus({ status: 'paused' })).toBe('active');
    expect(chapterStatus({ status: '' })).toBe('active');
  });

  // `isForming` exists so call sites read as a question rather than a string
  // comparison; it must never disagree with `chapterStatus`, which is the rule.
  it('isForming is the forming half of the same rule', () => {
    expect(isForming({ status: 'forming' })).toBe(true);
    expect(isForming({})).toBe(false);
  });
});

describe('presenceSummary', () => {
  // The real roster shape at launch: four cities running events, two forming.
  // These counts are what the stat strip, the hero lede and the sponsor copy
  // are checked against, so this is the fixture the consistency test agrees with.
  const roster = [
    { slug: 'sf-bay-area', city: 'SF & Bay Area', status: 'active' },
    { slug: 'nyc', city: 'New York City', status: 'active' },
    { slug: 'london', city: 'London', status: 'active' },
    { slug: 'boston-cambridge', city: 'Boston & Cambridge', status: 'active' },
    { slug: 'dc-dmv', city: 'DC and DMV Area', status: 'forming' },
    { slug: 'seattle', city: 'Seattle / Pacific Northwest', status: 'forming' },
  ];

  // The headline numbers. "4" is what the stat strip, the donate page and the
  // sponsor intro all claim in prose; if this count moves, that copy is wrong.
  it('counts 4 active and 2 forming for the real roster', () => {
    const summary = presenceSummary(roster);
    expect({ active: summary.activeCount, forming: summary.formingCount }).toEqual({
      active: 4,
      forming: 2,
    });
  });

  // Callers need the split lists, not only the tallies — the "Our chapters" row
  // renders from them — and each list must keep its input order.
  it('returns the entries themselves, not just counts', () => {
    const { active, forming } = presenceSummary(roster);
    expect(active.map((c) => c.slug)).toEqual(['sf-bay-area', 'nyc', 'london', 'boston-cambridge']);
    expect(forming.map((c) => c.slug)).toEqual(['dc-dmv', 'seattle']);
  });

  // A chapter with no status counts as active — the same default as
  // `chapterStatus`, proven here because this is where the count comes from.
  it('counts a status-less chapter as active', () => {
    // Bound to a const rather than passed inline: TypeScript's excess-property
    // check fires on a literal argument, and these projections legitimately
    // carry the rest of a chapter's fields alongside the ones the rule reads.
    const legacy = [{ slug: 'x', city: 'X' }];

    expect(presenceSummary(legacy).activeCount).toBe(1);
  });

  // Production started with no chapters at all, and the homepage still renders
  // that state — so zero must be a shape, not a crash.
  it('handles an empty roster', () => {
    expect(presenceSummary([])).toEqual({
      active: [],
      forming: [],
      activeCount: 0,
      formingCount: 0,
    });
  });
});

describe('byPresence', () => {
  // Status tiers FIRST, then the `order` pin, then the city name. A visitor
  // opening the menu meets the cities that hold events before the ones that do
  // not, which is what the menu is mostly used to find.
  it('puts active chapters before forming ones', () => {
    const sorted = byPresence([
      { city: 'DC', status: 'forming' },
      { city: 'NYC', status: 'active' },
      { city: 'Seattle', status: 'forming' },
      { city: 'London' },
    ]);
    expect(sorted.map((c) => c.city)).toEqual(['London', 'NYC', 'DC', 'Seattle']);
  });

  // The `order` pin still works — WITHIN a tier. An editor who pinned an order
  // keeps it; they just cannot pin a forming chapter above an active one.
  it('honours the order pin within a tier', () => {
    const sorted = byPresence([
      { city: 'Boston', status: 'active', order: 2 },
      { city: 'Atlanta', status: 'active', order: 1 },
      { city: 'DC', status: 'forming', order: 1 },
    ]);
    expect(sorted.map((c) => c.city)).toEqual(['Atlanta', 'Boston', 'DC']);
  });

  // The nav and the homepage row sort the SAME array. A sort in place would
  // make the second caller's result depend on whether the first one ran.
  it('does not mutate its input', () => {
    const input = [{ city: 'DC', status: 'forming' }, { city: 'NYC', status: 'active' }];
    byPresence(input);
    expect(input.map((c) => c.city)).toEqual(['DC', 'NYC']);
  });
});

describe('isWhatsAppGroupLink', () => {
  // The three shapes a group invite actually arrives in. Each one published on
  // the site would be a public join link nobody can revoke.
  it('is true for a WhatsApp group invite', () => {
    expect(isWhatsAppGroupLink('https://chat.whatsapp.com/HrX9aBcDeFg')).toBe(true);
    expect(isWhatsAppGroupLink('https://wa.me/12025550147')).toBe(true);
    expect(isWhatsAppGroupLink('https://api.whatsapp.com/send?phone=1')).toBe(true);
  });

  // A paste from a browser bar can carry either. Case or a `www.` must not be
  // enough to slip an invite past the rule.
  it('is true regardless of a www. prefix or capitalisation', () => {
    expect(isWhatsAppGroupLink('https://WWW.Chat.WhatsApp.com/abc')).toBe(true);
  });

  // The Google Form is the ALLOWED destination — the whole point of the rule.
  it('is false for the Google Form', () => {
    expect(isWhatsAppGroupLink('https://forms.gle/GqgaCDDWhWAgpJC68')).toBe(false);
    expect(isWhatsAppGroupLink(WHATSAPP_FORM_URL)).toBe(false);
  });

  // Matching is on the HOST, so a link that merely mentions WhatsApp in its
  // path or query is not caught by accident.
  it('is false for a link that only mentions whatsapp elsewhere in the url', () => {
    expect(isWhatsAppGroupLink('https://example.com/chat.whatsapp.com')).toBe(false);
    expect(isWhatsAppGroupLink('https://example.com/?to=chat.whatsapp.com')).toBe(false);
  });

  // The predicate also guards the Zod refine, which runs against every entry
  // including the ones with no URL — so absent and malformed must be quiet
  // `false`, never a throw that would fail the whole content build.
  it('is false for blank, relative and unparseable values', () => {
    expect(isWhatsAppGroupLink(undefined)).toBe(false);
    expect(isWhatsAppGroupLink(null)).toBe(false);
    expect(isWhatsAppGroupLink('')).toBe(false);
    expect(isWhatsAppGroupLink('/volunteer')).toBe(false);
    expect(isWhatsAppGroupLink('not a url')).toBe(false);
  });
});

describe('joinCtas', () => {
  // A chapter needs no URLs of its own to render a complete set of CTAs, which
  // is what lets an editor publish a new city without filling in three boxes.
  it('falls back to the shared form, the volunteer page and the newsletter', () => {
    expect(joinCtas()).toEqual({
      whatsappFormUrl: WHATSAPP_FORM_URL,
      volunteerUrl: VOLUNTEER_PATH,
      newsletterUrl: NEWSLETTER_URL,
    });
    expect(joinCtas({})).toEqual(joinCtas());
    expect(joinCtas(null)).toEqual(joinCtas());
  });

  // The override is the reason the fields exist — a chapter that runs its own
  // form or volunteer page must not be silently redirected to the shared one.
  it('uses an entry-specific form and volunteer url when given', () => {
    const ctas = joinCtas({
      whatsappFormUrl: 'https://forms.gle/nyc-only',
      volunteerUrl: '/volunteer/nyc',
    });
    expect(ctas.whatsappFormUrl).toBe('https://forms.gle/nyc-only');
    expect(ctas.volunteerUrl).toBe('/volunteer/nyc');
  });

  // THE load-bearing case. Content can reach this function without passing
  // through /admin — a seed, a migration, a hand-edited markdown file — so the
  // schema's refine is not the only thing standing between an editor's mistake
  // and a public, un-revocable group invite. This is the render-time backstop.
  it('NEVER returns a group invite, even when content supplies one', () => {
    expect(joinCtas({ whatsappFormUrl: 'https://chat.whatsapp.com/HrX9aBcDeFg' }).whatsappFormUrl)
      .toBe(WHATSAPP_FORM_URL);
    expect(joinCtas({ whatsappFormUrl: 'https://wa.me/12025550147' }).whatsappFormUrl)
      .toBe(WHATSAPP_FORM_URL);
  });

  // The CMS writes an empty string where an editor cleared a box. Treating that
  // as a real value would render `href=""`, which reloads the current page.
  it('treats a blank or whitespace-only override as absent', () => {
    expect(joinCtas({ whatsappFormUrl: '   ' }).whatsappFormUrl).toBe(WHATSAPP_FORM_URL);
    expect(joinCtas({ volunteerUrl: '' }).volunteerUrl).toBe(VOLUNTEER_PATH);
  });

  // A pasted URL routinely carries trailing whitespace, and a space inside an
  // href is not trimmed by the browser — the link 404s.
  it('trims a padded override rather than emitting a broken url', () => {
    expect(joinCtas({ volunteerUrl: '  /volunteer/nyc  ' }).volunteerUrl).toBe('/volunteer/nyc');
  });
});
