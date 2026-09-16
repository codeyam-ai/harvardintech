import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Guards the page copy that is stored in TWO places at once.
//
// Each of these pages keeps its text both as a JSON singleton under `src/data/`
// and as a markdown entry under `src/content/`. `pageCopyMerge.ts` merges the
// collection entry OVER the JSON file, so the collection always wins and the
// JSON is a fallback that, in practice, never renders.
//
// That makes the JSON a trap. An editor — or an agent — who finds the headline
// in `src/data/volunteerPage.json`, changes it, and reloads the page sees
// nothing happen, with no error to explain why. The two copies had already
// drifted before this test existed: `volunteerPage.json` said "Projects open for
// volunteers" while the collection said "Marketing projects open for
// volunteers", and the site had been showing the second one for as long as both
// existed.
//
// Deleting the JSON fallbacks would remove the trap outright, but that reaches
// into `readSingleton` typing and the scenario seeds in `src/lib/site.ts` — too
// broad a change to make days before launch. So instead: keep both, and fail
// here the moment a key present in both holds different values.
//
// SCOPE — this compares top-level SCALAR keys only. Frontmatter is read
// line-by-line rather than through astro:content, which is awkward to load under
// vitest (the same tradeoff `presenceConsistency.test.ts` and
// `chapter.photos.test.ts` make). A block value — a list like `benefits:` or a
// folded string like `ctaBody: |-` — cannot be read that way, so it is skipped
// rather than compared wrongly. Scalars are where the realistic editing mistake
// lands: headlines, intros, section titles and empty-state messages.
const ROOT = process.cwd();

/** Top-level scalar frontmatter keys, unquoted. Block values are omitted. */
function frontmatterScalars(relPath: string): Record<string, string> {
  const text = readFileSync(join(ROOT, relPath), 'utf-8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`${relPath} has no frontmatter block`);

  const out: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    // Column 0 only: an indented line belongs to a nested block, not the top level.
    const keyed = line.match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
    if (!keyed) continue;
    const raw = keyed[2].trim();
    // `key:` alone opens a list or map; `|` / `>` open a folded string. Neither
    // is readable line-by-line, so neither is compared.
    if (raw === '' || raw.startsWith('|') || raw.startsWith('>')) continue;
    out[keyed[1]] = raw.replace(/^['"]|['"]$/g, '');
  }
  return out;
}

function jsonScalars(relPath: string): Record<string, string> {
  const parsed = JSON.parse(readFileSync(join(ROOT, relPath), 'utf-8')) as Record<
    string,
    unknown
  >;
  return Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => typeof v === 'string'),
  ) as Record<string, string>;
}

/** The JSON fallback and the collection entry that overrides it. */
const PAIRS: Array<{ label: string; json: string; md: string }> = [
  {
    label: 'volunteer page',
    json: 'src/data/volunteerPage.json',
    md: 'src/content/volunteerPage/volunteer.md',
  },
  {
    label: 'sponsorship page',
    json: 'src/data/sponsorPage.json',
    md: 'src/content/sponsorPage/sponsor.md',
  },
  {
    label: 'Momentum Fund page',
    json: 'src/data/donatePage.json',
    md: 'src/content/pageCopy/donate.md',
  },
  {
    // Not page copy, but the same shape of trap and the more expensive one: the
    // analytics and donation IDs are CONFIGURATION. A stale ID in the JSON
    // fallback means analytics silently reporting to the wrong property, or the
    // donate widget pointing at the wrong account.
    label: 'analytics and embeds',
    json: 'src/data/settings.json',
    md: 'src/content/siteIntegrations/site.md',
  },
];

describe('page copy drift between the JSON fallback and the collection entry', () => {
  for (const { label, json, md } of PAIRS) {
    it(`keeps the ${label} copy identical in both places`, () => {
      const fromJson = jsonScalars(json);
      const fromMd = frontmatterScalars(md);

      const shared = Object.keys(fromJson).filter((k) => k in fromMd);
      const drifted = shared.filter((k) => fromJson[k] !== fromMd[k]);

      // Named in the failure so the fix is obvious: keep the COLLECTION's value,
      // because that is the one the site renders.
      expect(
        drifted.map((k) => `${k}: ${json} has ${JSON.stringify(fromJson[k])}, ${md} has ${JSON.stringify(fromMd[k])}`),
      ).toEqual([]);
    });

    // A pair sharing nothing would pass the drift check vacuously — the guard
    // would be dead without anyone noticing, which is exactly how the drift it
    // exists to catch got in.
    it(`actually compares something for the ${label}`, () => {
      const shared = Object.keys(jsonScalars(json)).filter(
        (k) => k in frontmatterScalars(md),
      );
      expect(shared.length).toBeGreaterThan(0);
    });
  }

  // The specific drift that was live when this guard was written, pinned so a
  // regression is legible rather than just "some key differs".
  it('keeps the volunteer projects heading the collection actually renders', () => {
    const heading = 'Marketing projects open for volunteers';
    expect(frontmatterScalars('src/content/volunteerPage/volunteer.md').projectsTitle).toBe(
      heading,
    );
    expect(jsonScalars('src/data/volunteerPage.json').projectsTitle).toBe(heading);
  });

  // The analytics pair is the one worth naming explicitly: a wrong ID here is
  // invisible on the page and only shows up as missing data weeks later.
  it('keeps the analytics and donation IDs identical in both places', () => {
    const settings = jsonScalars('src/data/settings.json');
    const integrations = frontmatterScalars('src/content/siteIntegrations/site.md');

    expect(settings.googleAnalyticsId).toBe(integrations.googleAnalyticsId);
    expect(settings.givebutterAccountId).toBe(integrations.givebutterAccountId);
  });
});
