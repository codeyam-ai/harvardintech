import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUDIT_SIZES, PUBLIC_AUDIT_ROUTES } from './publicRoutes';
import {
  missingSizes,
  routeCoverage,
  uncoveredRoutes,
  type ScenarioLike,
} from './responsiveCoverage';

// Two suites in one file, deliberately. The first drives the rules with
// fixtures; the second turns those same rules on the real committed scenarios.
// Keeping them together is what `collections.test.ts` does for the CMS registry:
// the fixture cases explain what the rule means, and the file-reading case is
// the one that actually fails when the repo drifts.

const ROUTES = [
  { key: 'home', route: '/', pageFilePath: 'src/pages/index.astro', auditUrl: '/' },
  { key: 'events', route: '/events', pageFilePath: 'src/pages/events.astro', auditUrl: '/events' },
];
const REQUIRED = ['Mobile', 'Tablet', 'Laptop', 'Desktop'];

function scenario(slug: string, pageFilePath: string, dimensions?: string[]): ScenarioLike {
  return { slug, pageFilePath, dimensions };
}

describe('missingSizes', () => {
  // The ordinary case: a scenario captured at one width owes the other three.
  it('names the required sizes a scenario lacks', () => {
    expect(missingSizes(scenario('a', 'src/pages/index.astro', ['Desktop']), REQUIRED)).toEqual([
      'Mobile',
      'Tablet',
      'Laptop',
    ]);
  });

  // A fully covered scenario owes nothing — this is what the audit is driving
  // every representative surface toward.
  it('returns nothing when every required size is present', () => {
    expect(missingSizes(scenario('a', 'src/pages/index.astro', REQUIRED), REQUIRED)).toEqual([]);
  });

  // Absent is not a pass. A scenario with no dimensions at all is the shape a
  // hand-written JSON file takes before anyone thinks about sizes, and it must
  // read as missing all of them rather than as satisfying the rule vacuously.
  it('treats a scenario with no dimensions as missing every size', () => {
    expect(missingSizes(scenario('a', 'src/pages/index.astro'), REQUIRED)).toEqual(REQUIRED);
  });

  // Extra sizes are not an error — a scenario may carry a width the audit does
  // not require, and that is coverage, not drift.
  it('ignores sizes beyond the required set', () => {
    const s = scenario('a', 'src/pages/index.astro', [...REQUIRED, 'UltraWide']);
    expect(missingSizes(s, REQUIRED)).toEqual([]);
  });
});

describe('routeCoverage', () => {
  // The rule that matches how this corpus is really shaped: a page's coverage
  // is the UNION across its scenarios. Neither of these two covers the route on
  // its own; together they do, and splitting them is legitimate authoring.
  it('unions dimensions across several scenarios sharing one page', () => {
    const scenarios = [
      scenario('home-a', 'src/pages/index.astro', ['Mobile', 'Tablet']),
      scenario('home-b', 'src/pages/index.astro', ['Laptop', 'Desktop']),
    ];
    const home = routeCoverage(scenarios, ROUTES, REQUIRED).find((c) => c.key === 'home')!;
    expect(home.missing).toEqual([]);
    expect(home.scenarioSlugs).toEqual(['home-a', 'home-b']);
  });

  // A route nothing renders is uncovered rather than absent from the report —
  // the audit has to be able to say "this page has no saved view at all".
  it('reports a route with no scenarios as missing every size', () => {
    const events = routeCoverage([], ROUTES, REQUIRED).find((c) => c.key === 'events')!;
    expect(events.scenarioSlugs).toEqual([]);
    expect(events.missing).toEqual(REQUIRED);
  });

  // Most of the corpus is isolated components and state variants that the audit
  // deliberately leaves Desktop-only. They must be skipped silently: a rule that
  // threw on an unrecognised page could not be run against the real directory.
  it('ignores a scenario whose page matches no declared route', () => {
    const scenarios = [scenario('stray', 'src/components/donate/GiveButton.astro', ['Desktop'])];
    const coverage = routeCoverage(scenarios, ROUTES, REQUIRED);
    expect(coverage.every((c) => c.scenarioSlugs.length === 0)).toBe(true);
  });

  // Partial coverage is reported as exactly what is missing, so the report can
  // say which widths a page still needs rather than just that it is incomplete.
  it('separates the sizes covered from the ones still missing', () => {
    const scenarios = [scenario('home-a', 'src/pages/index.astro', ['Desktop', 'Mobile'])];
    const home = routeCoverage(scenarios, ROUTES, REQUIRED).find((c) => c.key === 'home')!;
    expect(home.covered).toEqual(['Mobile', 'Desktop']);
    expect(home.missing).toEqual(['Tablet', 'Laptop']);
  });
});

describe('uncoveredRoutes', () => {
  // The failure message names the page a human must open, not the file that
  // renders it — 'not-found' is actionable where src/pages/404.astro is a lookup.
  it('names the route key rather than the file path', () => {
    const scenarios = [scenario('home-a', 'src/pages/index.astro', REQUIRED)];
    expect(uncoveredRoutes(routeCoverage(scenarios, ROUTES, REQUIRED))).toEqual(['events']);
  });

  // The state the audit is driving toward, and what the committed assertion
  // below checks for real.
  it('is empty when every route is fully covered', () => {
    const scenarios = ROUTES.map((r, i) => scenario(`s${i}`, r.pageFilePath, REQUIRED));
    expect(uncoveredRoutes(routeCoverage(scenarios, ROUTES, REQUIRED))).toEqual([]);
  });
});

// The guard that actually protects the audit. Everything above proves the rules
// behave; this one reads the committed scenarios and fails when a public page
// loses its multi-size coverage — which is how a Desktop-only page ships again
// without anyone noticing.
describe('every public page has a saved view at all four sizes', () => {
  const SCENARIO_DIR = '.codeyam/scenarios';

  function committedScenarios(): ScenarioLike[] {
    return fs
      .readdirSync(SCENARIO_DIR)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        const parsed = JSON.parse(
          fs.readFileSync(path.join(SCENARIO_DIR, name), 'utf8'),
        ) as ScenarioLike;
        return { ...parsed, slug: parsed.slug ?? name.replace(/\.json$/, '') };
      });
  }

  // Non-vacuity: if the directory ever stops being read, every assertion below
  // would pass against an empty list while proving nothing.
  it('reads the committed scenario directory', () => {
    expect(committedScenarios().length).toBeGreaterThan(100);
  });

  // THE RED-FIRST ASSERTION. Before the audit gives them their sizes, every
  // route but home and donate is missing three widths and not-found has no
  // scenario at all, so this fails naming them. It passes only once each public
  // surface is captured at all four.
  it('leaves no public route short of a required size', () => {
    const coverage = routeCoverage(committedScenarios(), PUBLIC_AUDIT_ROUTES, AUDIT_SIZES);
    const shortfall = coverage
      .filter((c) => c.missing.length > 0)
      .map((c) => `${c.key} missing ${c.missing.join(', ')}`);
    expect(shortfall).toEqual([]);
  });

  // Names alone, for a failure that reads at a glance above the detail.
  it('reports no uncovered route keys', () => {
    const coverage = routeCoverage(committedScenarios(), PUBLIC_AUDIT_ROUTES, AUDIT_SIZES);
    expect(uncoveredRoutes(coverage)).toEqual([]);
  });
});
