import { describe, it, expect } from 'vitest';
import {
  openProjects,
  projectPath,
  projectCta,
  formatProjectDates,
  projectCardData,
  relatedProjects,
  projectBackdrop,
  withProjectBackdrops,
  chapterPhotos,
  DEFAULT_PROJECT_BACKDROP,
} from './projects';

describe('openProjects', () => {
  // Absent `closed` means open (see filterActiveBoardMembers) — the CMS writes
  // nothing for an unticked box, so a project nobody closed must stay visible.
  it('keeps a project whose closed flag is absent', () => {
    expect(openProjects([{ title: 'Newsletter editor' }]).map((p) => p.title)).toEqual([
      'Newsletter editor',
    ]);
  });

  // An explicit closed: false is kept, same as the absent case.
  it('keeps a project explicitly marked not closed', () => {
    expect(openProjects([{ title: 'Speaker outreach', closed: false }])).toHaveLength(1);
  });

  // closed: true is the one value that retires a project from the page.
  it('removes a project ticked as closed', () => {
    expect(openProjects([{ title: 'Retired project', closed: true }])).toEqual([]);
  });

  // A leftover legacy `active: false` line no longer retires anything — the
  // ticked Closed box is the only signal, so stale data cannot hide a role.
  it('ignores a legacy active flag', () => {
    const legacy = [{ title: 'Legacy', active: false }] as unknown as { title: string }[];
    expect(openProjects(legacy)).toHaveLength(1);
  });

  // Open projects come back in the editor-chosen order.
  it('orders open projects by their order field', () => {
    const result = openProjects([
      { title: 'third', order: 3 },
      { title: 'first', order: 1 },
      { title: 'second', order: 2 },
    ]);
    expect(result.map((p) => p.title)).toEqual(['first', 'second', 'third']);
  });

  // An un-numbered project sorts after the numbered ones, never ahead of #1.
  it('places unordered projects after ordered ones', () => {
    const result = openProjects([
      { title: 'unordered' },
      { title: 'ordered', order: 1 },
    ]);
    expect(result.map((p) => p.title)).toEqual(['ordered', 'unordered']);
  });

  // The closed-filter and the ordering compose in one pass.
  it('filters and orders together', () => {
    const result = openProjects([
      { title: 'closed', order: 1, closed: true },
      { title: 'open-b', order: 3 },
      { title: 'open-a', order: 2 },
    ]);
    expect(result.map((p) => p.title)).toEqual(['open-a', 'open-b']);
  });

  // All-closed yields [] — the production default that drives /volunteer's
  // empty state, which must be an empty array rather than a crash.
  it('returns an empty array when every project is closed', () => {
    expect(
      openProjects([
        { title: 'a', closed: true },
        { title: 'b', closed: true },
      ]),
    ).toEqual([]);
  });

  // No projects at all also yields [], the day-one production state.
  it('returns an empty array for no projects', () => {
    expect(openProjects([])).toEqual([]);
  });

  // Selection is non-mutating, so the caller's collection is untouched.
  it('does not mutate the input array', () => {
    const source = [
      { title: 'b', order: 2 },
      { title: 'a', order: 1 },
    ];
    openProjects(source);
    expect(source.map((p) => p.title)).toEqual(['b', 'a']);
  });
});

describe('projectPath', () => {
  // The route file is `src/pages/volunteer/projects/[slug].astro`, so this shape
  // is the contract between it and every card that links to it. If they drift,
  // the card points at a 404 — the failure this helper exists to prevent.
  it('builds the detail path for a slug', () => {
    expect(projectPath('social-media-marketing-specialist-events')).toBe(
      '/volunteer/projects/social-media-marketing-specialist-events',
    );
  });

  // Site-root-relative, NOT base-prefixed: callers wrap it in `withBase`, which
  // would double the prefix if this helper applied it too.
  it('returns a site-root-relative path for the caller to base-prefix', () => {
    expect(projectPath('newsletter-editor').startsWith('/volunteer/projects/')).toBe(true);
  });
});

describe('projectCta', () => {
  // A project with its own sign-up link uses it, and says so plainly.
  it('uses the project own apply link when it has one', () => {
    expect(projectCta('https://apply.example/toronto', 'Volunteer with us', 'https://hi.switchy.io/wEYK')).toEqual({
      href: 'https://apply.example/toronto',
      label: 'Get involved',
    });
  });

  // The fallback that matters: Nicole's project has no applyUrl, so without this
  // her page would end after the description with no way to sign up.
  it('falls back to the page-level volunteer CTA when the project has no apply link', () => {
    expect(projectCta(undefined, 'Volunteer with us', 'https://hi.switchy.io/wEYK')).toEqual({
      href: 'https://hi.switchy.io/wEYK',
      label: 'Volunteer with us',
    });
  });

  // No link anywhere means NO button — a dead CTA is worse than none.
  it('returns null when neither the project nor the page has a link', () => {
    expect(projectCta(undefined, 'Volunteer with us', undefined)).toBeNull();
  });

  // The project link wins even when the page-level CTA is absent.
  it('uses the project apply link even with no page-level fallback configured', () => {
    expect(projectCta('https://apply.example/toronto')).toEqual({
      href: 'https://apply.example/toronto',
      label: 'Get involved',
    });
  });

  // An unset label on the fallback still renders a sensible button rather than
  // an empty one — `volunteerPage.ctaLabel` is editable copy and can be blank.
  it('names the fallback button when the page-level label is missing', () => {
    expect(projectCta(undefined, undefined, 'https://hi.switchy.io/wEYK')).toEqual({
      href: 'https://hi.switchy.io/wEYK',
      label: 'Volunteer with us',
    });
  });

  // Empty strings are absent, not links: an editor who cleared the field must
  // not produce href="" pointing at the current page.
  it('treats an empty apply link as absent', () => {
    expect(projectCta('', 'Volunteer with us', 'https://hi.switchy.io/wEYK')).toEqual({
      href: 'https://hi.switchy.io/wEYK',
      label: 'Volunteer with us',
    });
  });

  // Both cleared → nothing, same as both absent.
  it('returns null when both links are empty strings', () => {
    expect(projectCta('', 'Volunteer with us', '')).toBeNull();
  });
});

describe('formatProjectDates', () => {
  // The common case: a project that starts and ends inside one year writes that
  // year once, so the row reads as one span rather than two full dates.
  it('collapses the repeated year when both dates share one', () => {
    expect(formatProjectDates('2026-09-01', '2026-12-15')).toBe('September 1 – December 15, 2026');
  });

  // Across a year boundary both years are needed, or the range is ambiguous.
  it('keeps both years when the range crosses a year boundary', () => {
    expect(formatProjectDates('2026-12-01', '2027-03-03')).toBe('December 1, 2026 – March 3, 2027');
  });

  // An organizer who knows when the work starts but not when it ends.
  it('reads as a start when only the start date is set', () => {
    expect(formatProjectDates('2026-09-01')).toBe('Starts September 1, 2026');
  });

  // The mirror case: a deadline with no announced start.
  it('reads as a deadline when only the end date is set', () => {
    expect(formatProjectDates(undefined, '2026-12-15')).toBe('Through December 15, 2026');
  });

  // Null, not an empty string — the callers render nothing at all rather than an
  // empty chip, which is the state every project was in before this feature.
  it('returns null when the project has neither date', () => {
    expect(formatProjectDates()).toBeNull();
  });

  // An end before a start formats in the order authored rather than being
  // silently swapped: a visibly wrong range gets reported, a reordered one does
  // not. It must not throw.
  it('formats an inverted range as authored instead of reordering it', () => {
    expect(formatProjectDates('2026-12-15', '2026-09-01')).toBe('December 15 – September 1, 2026');
  });

  // Frontmatter reaches a component as a Date once `z.coerce.date` has run,
  // while scenarios and tests hand in ISO strings — both must format the same.
  it('accepts Date objects as well as ISO strings', () => {
    expect(formatProjectDates(new Date('2026-09-01T00:00:00Z'), new Date('2026-12-15T00:00:00Z'))).toBe(
      'September 1 – December 15, 2026',
    );
  });
});

describe('projectCardData', () => {
  // The entry id becomes the slug, which is what projectPath and the
  // relatedProjects wrap-around both key on.
  it('promotes the entry id to a slug', () => {
    const [card] = projectCardData([{ id: 'newsletter-editor', data: { title: 'Newsletter editor' } }]);
    expect(card.slug).toBe('newsletter-editor');
  });

  // Every field the card renders has to survive the projection — a field dropped
  // here silently never reaches a suggestion card, with no type error to catch it.
  it('carries every card field through from the entry frontmatter', () => {
    expect(
      projectCardData([
        {
          id: 'chapter-launch-team-toronto',
          data: {
            title: 'Chapter launch team — Toronto',
            blurb: 'Help stand up our next city chapter.',
            image: '/images/volunteers.webp',
            applyUrl: 'https://apply.example/toronto',
            commitment: '~3 hrs / week',
            startDate: '2026-12-01',
            endDate: '2027-03-03',
            order: 2,
            closed: false,
          },
        },
      ]),
    ).toEqual([
      {
        slug: 'chapter-launch-team-toronto',
        title: 'Chapter launch team — Toronto',
        blurb: 'Help stand up our next city chapter.',
        image: '/images/volunteers.webp',
        applyUrl: 'https://apply.example/toronto',
        commitment: '~3 hrs / week',
        startDate: '2026-12-01',
        endDate: '2027-03-03',
        order: 2,
        closed: false,
      },
    ]);
  });

  // A sparse entry stays sparse: absent optional fields come out undefined, not
  // as empty strings that would render as holes on the card.
  it('leaves absent optional fields undefined', () => {
    const [card] = projectCardData([{ id: 'speaker-outreach', data: { title: 'Speaker outreach' } }]);
    expect(card.commitment).toBeUndefined();
    expect(card.startDate).toBeUndefined();
    expect(card.closed).toBeUndefined();
  });

  // Order is preserved so the caller — not this projection — decides sorting.
  it('preserves the order the entries arrived in', () => {
    const cards = projectCardData([
      { id: 'third', data: { title: 'third' } },
      { id: 'first', data: { title: 'first' } },
    ]);
    expect(cards.map((c) => c.slug)).toEqual(['third', 'first']);
  });

  // The real state of the collection today: one entry, and soon after, none.
  it('returns an empty list for no entries', () => {
    expect(projectCardData([])).toEqual([]);
  });
});

describe('relatedProjects', () => {
  const all = [
    { slug: 'a', title: 'A', order: 1 },
    { slug: 'b', title: 'B', order: 2 },
    { slug: 'c', title: 'C', order: 3 },
    { slug: 'd', title: 'D', order: 4 },
  ];

  // The straightforward case: the three that follow in editor order.
  it('suggests the projects that follow the current one in editor order', () => {
    expect(relatedProjects(all, 'a').map((p) => p.slug)).toEqual(['b', 'c', 'd']);
  });

  // The reason the rule wraps: without it the last project in the list would end
  // its page with no suggestions at all.
  it('wraps past the end of the list rather than coming up empty', () => {
    expect(relatedProjects(all, 'd').map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });

  // A page never advertises itself, wrap-around included.
  it('never suggests the project the reader is already on', () => {
    expect(relatedProjects(all, 'c').map((p) => p.slug)).not.toContain('c');
  });

  // The route generates a page for every published entry regardless of `closed`,
  // so without this filter a retired project would be advertised on an open one.
  it('never suggests a retired project', () => {
    const withRetired = [...all, { slug: 'retired', title: 'Retired', order: 5, closed: true }];
    expect(relatedProjects(withRetired, 'd').map((p) => p.slug)).not.toContain('retired');
  });

  // Fewer than three others available — show what there is, not padding.
  it('returns only what is available when fewer than the limit exist', () => {
    expect(relatedProjects(all.slice(0, 2), 'a').map((p) => p.slug)).toEqual(['b']);
  });

  // Today's real state: one project in the collection, so every detail page ends
  // at the CTA with no section at all.
  it('returns an empty list when there is no other open project', () => {
    expect(relatedProjects([{ slug: 'only', title: 'Only', order: 1 }], 'only')).toEqual([]);
  });

  // A slug that matches nothing open cannot be positioned in the list.
  it('returns an empty list when the current slug matches nothing open', () => {
    expect(relatedProjects(all, 'no-such-project')).toEqual([]);
  });

  // The default is three; a caller can ask for fewer.
  it('honours a lower limit', () => {
    expect(relatedProjects(all, 'a', 2).map((p) => p.slug)).toEqual(['b', 'c']);
  });

  // Non-mutating, like openProjects — the caller's array is untouched.
  it('does not mutate the list it was given', () => {
    const input = [...all];
    relatedProjects(input, 'b');
    expect(input.map((p) => p.slug)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('projectBackdrop', () => {
  const chapters = [
    { id: 'london', heroImage: '/images/chapters/london.jpg' },
    { id: 'nyc', heroImage: '/images/chapters/nyc.jpg' },
    { id: 'no-photo' },
  ];

  // A city role borrows its chapter's photo by slug.
  it('returns the matching chapter photo', () => {
    expect(projectBackdrop({ chapter: 'london' }, chapters)).toBe('/images/chapters/london.jpg');
  });

  // A role with no chapter falls back to the shared site photo.
  it('falls back to the shared photo when no chapter is set', () => {
    expect(projectBackdrop({}, chapters)).toBe(DEFAULT_PROJECT_BACKDROP);
  });

  // A mistyped or retired chapter slug degrades to the default instead of throwing.
  it('falls back to the shared photo for an unknown chapter slug', () => {
    expect(projectBackdrop({ chapter: 'atlantis' }, chapters)).toBe(DEFAULT_PROJECT_BACKDROP);
  });

  // A chapter that exists but has no photo also gets the default.
  it('falls back to the shared photo for a chapter without a photo', () => {
    expect(projectBackdrop({ chapter: 'no-photo' }, chapters)).toBe(DEFAULT_PROJECT_BACKDROP);
  });

  // The CMS can leave stray whitespace around a typed slug.
  it('trims whitespace around the chapter slug', () => {
    expect(projectBackdrop({ chapter: '  nyc ' }, chapters)).toBe('/images/chapters/nyc.jpg');
  });

  // A blank chapter field counts as no chapter.
  it('treats a blank chapter as unset', () => {
    expect(projectBackdrop({ chapter: '   ' }, chapters)).toBe(DEFAULT_PROJECT_BACKDROP);
  });

  // With no chapters loaded at all, every role gets the default.
  it('returns the shared photo when the chapter list is empty', () => {
    expect(projectBackdrop({ chapter: 'london' }, [])).toBe(DEFAULT_PROJECT_BACKDROP);
  });
});

describe('withProjectBackdrops', () => {
  const chapters = [{ id: 'london', heroImage: '/images/chapters/london.jpg' }];

  // Each project gains a backdrop and keeps its other fields.
  it('attaches a backdrop to each project', () => {
    const out = withProjectBackdrops([{ slug: 'a', chapter: 'london' }, { slug: 'b' }], chapters);
    expect(out).toEqual([
      { slug: 'a', chapter: 'london', backdrop: '/images/chapters/london.jpg' },
      { slug: 'b', backdrop: DEFAULT_PROJECT_BACKDROP },
    ]);
  });

  // The input array and its objects are left untouched.
  it('does not mutate the input', () => {
    const input = [{ slug: 'a', chapter: 'london' }];
    withProjectBackdrops(input, chapters);
    expect(input).toEqual([{ slug: 'a', chapter: 'london' }]);
  });

  // An empty project list stays empty.
  it('returns an empty list for no projects', () => {
    expect(withProjectBackdrops([], chapters)).toEqual([]);
  });
});

describe('chapterPhotos', () => {
  // Flattens chapter collection entries to the id and photo the backdrop needs.
  it('maps entries to id and heroImage', () => {
    // Real entries carry more fields than the photo; they must be dropped.
    const entries = [
      { id: 'london', data: { heroImage: '/images/chapters/london.jpg', name: 'London' } },
      { id: 'nyc', data: { heroImage: '/images/chapters/nyc.jpg', name: 'New York' } },
    ];
    expect(chapterPhotos(entries)).toEqual([
      { id: 'london', heroImage: '/images/chapters/london.jpg' },
      { id: 'nyc', heroImage: '/images/chapters/nyc.jpg' },
    ]);
  });

  // A chapter with no photo is kept, with heroImage left undefined.
  it('keeps a chapter without a photo', () => {
    expect(chapterPhotos([{ id: 'boston', data: {} }])).toEqual([
      { id: 'boston', heroImage: undefined },
    ]);
  });

  // No chapters in, no chapters out.
  it('returns an empty list for no entries', () => {
    expect(chapterPhotos([])).toEqual([]);
  });
});
