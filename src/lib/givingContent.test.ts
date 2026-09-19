import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REDIRECT_TARGETS } from './redirects';

// A content guard, in the shape of `selectOptions.test.ts`: it reads the
// committed markdown and JSON off disk rather than importing anything, because
// what it protects is the CONTENT, and content changes are invisible to test
// attribution — a run that says "inherited base debt" has not looked at these
// files at all.
//
// What it protects: Harvard Alumni in Tech has no donation platform and is not
// yet a non-profit, so until the Givebutter campaign opens the site must not
// ask for money, quote a campaign total nobody has raised, or make a claim
// about tax treatment. Every assertion here is one of those three, pinned so
// that restoring the old copy fails a test instead of shipping.

const CONTENT_ROOT = 'src/content';

// The collections that speak FOR the organization about giving and
// sponsorship. The legal-claim guard below is scoped to these rather than to
// all of `src/content`, because the site also carries a decade of event
// write-ups, and a 2018 talk that discusses "charitable organizations" is
// describing its speaker's work — not asserting anything about Harvard Alumni
// in Tech's own tax status. Sweeping those in would force a choice between
// rewriting history and deleting the guard.
const GIVING_COLLECTIONS = [
  'momentumSections',
  'pillars',
  'pageCopy',
  'sponsorPage',
  'sponsorLevels',
  'sponsors',
];

/** Every committed markdown entry, as `{ file, text }`. */
function contentFiles(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) out.push({ file: full, text: fs.readFileSync(full, 'utf8') });
    }
  };
  walk(CONTENT_ROOT);
  return out;
}

/** The giving and sponsorship entries — see `GIVING_COLLECTIONS`. */
function givingContentFiles(): { file: string; text: string }[] {
  return contentFiles().filter(({ file }) =>
    GIVING_COLLECTIONS.some((c) => file.startsWith(path.join(CONTENT_ROOT, c) + path.sep)),
  );
}

/** A CMS preview entry: built so its token link resolves, never advertised. */
function isPreview(text: string): boolean {
  return /^previewOf:\s*\S/m.test(frontmatter(text));
}

/** The frontmatter block, or '' when a file has none. */
function frontmatter(text: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match ? match[1] : '';
}

/** Drafted entries are dropped from the public build by `publishedEntries`. */
function isDraft(text: string): boolean {
  return /^draft:\s*true\s*$/m.test(frontmatter(text));
}

describe('no public giving copy makes a legal or tax claim', () => {
  // The audit's L1-L4 and L12: tax-deductibility, 501(c)(6) status, and
  // charitable framing. Givebutter's own checkout carries whatever legal text a
  // gift needs; this site says none of it. Drafted and preview entries are
  // exempt because the public build never renders them — the 501(c)(6)
  // priority is drafted rather than deleted, so it can come back when the
  // filing is real.
  const LEGAL_CLAIM = /501\(c\)|tax[- ]deductib|tax adviser|charitable/i;

  // The assertion that actually protects a reader: nothing the public build
  // renders on a giving or sponsorship surface may claim a tax treatment or a
  // charitable status the organization does not have. /give carried both and is
  // gone; this keeps them gone.
  it('is absent from every PUBLISHED giving entry', () => {
    const offenders = givingContentFiles()
      .filter(({ text }) => !isDraft(text) && !isPreview(text) && LEGAL_CLAIM.test(text))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  // Where the old wording does survive, it must be held back by one of the two
  // mechanisms that keep it off the public build — never merely by nobody
  // having linked to it. Publishing such an entry unedited fails the assertion
  // above, which is the point of keeping both.
  it('survives only in drafted or preview entries', () => {
    const carriers = givingContentFiles().filter(({ text }) => LEGAL_CLAIM.test(text));
    for (const { file, text } of carriers) {
      expect(
        isDraft(text) || isPreview(text),
        `${file} carries a legal claim and must stay drafted or preview-only`,
      ).toBe(true);
    }
  });

  // The committed JSON fallbacks, checked separately from the CMS content above:
  // each one supplies the copy when its markdown field is blank, so a claim left
  // here would return the moment an editor cleared the field — a route back in
  // that fixing only the markdown would miss.
  it.each(['src/data/donatePage.json', 'src/data/sponsorPage.json', 'src/data/settings.json'])(
    'is absent from %s',
    (file) => {
      expect(LEGAL_CLAIM.test(fs.readFileSync(file, 'utf8'))).toBe(false);
    },
  );
});

describe('the goal meter states the real pre-launch figures', () => {
  const meter = fs.readFileSync('src/content/momentumSections/goal-meter.md', 'utf8');

  // The campaign has not opened, so nothing has been raised. The page used to
  // claim $20 of $100,000, which was invented.
  it('shows nothing raised', () => {
    expect(meter).toMatch(/^raised:\s*'\$0'\s*$/m);
  });

  // The 2026 goal the owner set, replacing a $100,000 figure nobody had agreed.
  it('shows the 2026 goal of 10,000 dollars', () => {
    expect(meter).toMatch(/^goal:\s*'\$10,000'\s*$/m);
  });

  // The bar is drawn to `percent` directly — it is NOT derived from the two
  // figures above, so a non-zero value here would draw progress against $0.
  it('draws the bar at zero', () => {
    expect(meter).toMatch(/^percent:\s*0\s*$/m);
  });
});

describe('the donate page shows one 2026 priority', () => {
  // What the $10,000 pays for has not been agreed, so the three old priorities
  // — the 501(c)(6) filing, annual software, chapter programming — are drafted
  // and one goal-shaped priority stands in their place. More than one published
  // here means someone republished a priority the organization has not
  // committed to.
  it('publishes exactly one priorities pillar', () => {
    const published = contentFiles().filter(
      ({ file, text }) =>
        file.startsWith(path.join(CONTENT_ROOT, 'pillars') + path.sep) &&
        /^group:\s*priorities\s*$/m.test(frontmatter(text)) &&
        !isDraft(text) &&
        !isPreview(text),
    );
    expect(published.map(({ file }) => file)).toEqual([
      path.join(CONTENT_ROOT, 'pillars', 'launch-the-2026-fundraising-campaign.md'),
    ]);
  });
});

describe('the sponsor page shows no partnership it cannot honour', () => {
  // "Ways to partner" is not rendered for launch and the Presenting level is
  // not fleshed out, so the level stays in the CMS as a draft rather than being
  // deleted — it comes back by publishing it.
  it('keeps the Presenting Partner level drafted', () => {
    expect(isDraft(fs.readFileSync('src/content/sponsorLevels/presenting.md', 'utf8'))).toBe(true);
  });

  // Shipping sample logos asserts partnerships that do not exist. The wall's
  // own empty state is honest and is itself an invitation.
  it('keeps every example sponsor drafted', () => {
    const examples = fs
      .readdirSync('src/content/sponsors')
      .filter((name) => name.startsWith('example-') && name.endsWith('.md'));
    expect(examples.length).toBeGreaterThan(0);
    for (const name of examples) {
      const text = fs.readFileSync(path.join('src/content/sponsors', name), 'utf8');
      expect(isDraft(text), `${name} must stay drafted until a real sponsor replaces it`).toBe(true);
    }
  });
});

describe('the retired giving page', () => {
  // /give held a checkout that could not take a payment. The route is gone.
  it('no longer has a route', () => {
    expect(fs.existsSync('src/pages/give.astro')).toBe(false);
  });

  // ...and its address still resolves, so a bookmark or an old link lands on
  // /donate rather than a 404. The redirect lives in the map (not inline in
  // astro.config.mjs) because `redirectsForBase` is what applies the deploy's
  // base path to the target — an unprefixed target 404s on the subpath build.
  it('redirects to the donate page', () => {
    expect(REDIRECT_TARGETS['/give']).toBe('/donate/');
  });
});
