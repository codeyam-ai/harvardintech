// Does every public page have a saved view at every size the audit requires?
//
// The responsive audit's value decays the moment a new page ships Desktop-only:
// the next change is reviewed at one width again and the audit becomes a
// document about how the site used to look. These rules are what a test asserts
// against the committed scenarios so that decay fails a build instead of going
// unnoticed.
//
// A route is satisfied by its scenarios TOGETHER, not by any one of them. Two
// scenarios on the same page — one carrying Mobile, one carrying Desktop —
// between them cover both, which is how the existing corpus is actually shaped.
//
// Pure rules over plain objects: no `fs`, no JSON reads, no Astro imports. The
// caller supplies the scenarios, so every rule here unit-tests directly against
// fixtures. The assertion against the REAL `.codeyam/scenarios/` directory lives
// in the sibling test, which reads the files and calls these. That split is the
// one `collectionRegistryDrift.ts` uses, for the same reason: a rule with its
// own filesystem access cannot be tested without one.

import type { PublicRoute } from './publicRoutes';

/** The fields of a scenario these rules read. Anything else is ignored. */
export interface ScenarioLike {
  slug?: string;
  /** The source file the scenario renders — how it maps back to a route. */
  pageFilePath?: string;
  /** The sizes this scenario is captured at, by name. */
  dimensions?: string[];
}

/** What one route's scenarios cover between them. */
export interface RouteCoverage {
  /** The route's stable key, so a failure names a page rather than a path. */
  key: string;
  route: string;
  /** Every scenario whose `pageFilePath` matches this route. */
  scenarioSlugs: string[];
  /** Required sizes at least one of those scenarios carries. */
  covered: string[];
  /** Required sizes none of them carries. */
  missing: string[];
}

/**
 * The required sizes a single scenario does NOT carry.
 *
 * Returns `[]` when it carries all of them. A scenario with no `dimensions` at
 * all is missing every one — absent is not a pass.
 */
export function missingSizes(scenario: ScenarioLike, required: readonly string[]): string[] {
  const have = new Set(scenario.dimensions ?? []);
  return required.filter((size) => !have.has(size));
}

/**
 * Per route, which scenarios render it and which required sizes they cover
 * between them.
 *
 * Scenarios whose `pageFilePath` matches no declared route are IGNORED rather
 * than an error: the corpus is mostly isolated components and state variants
 * that the audit deliberately leaves Desktop-only, and a rule that threw on
 * them could not be run against the real directory at all.
 */
export function routeCoverage(
  scenarios: readonly ScenarioLike[],
  routes: readonly PublicRoute[],
  required: readonly string[],
): RouteCoverage[] {
  return routes.map((route) => {
    const matching = scenarios.filter((s) => s.pageFilePath === route.pageFilePath);
    const have = new Set<string>();
    for (const scenario of matching) {
      for (const dimension of scenario.dimensions ?? []) have.add(dimension);
    }
    return {
      key: route.key,
      route: route.route,
      scenarioSlugs: matching.map((s) => s.slug ?? '(unnamed)'),
      covered: required.filter((size) => have.has(size)),
      missing: required.filter((size) => !have.has(size)),
    };
  });
}

/**
 * The route KEYS still short of full coverage.
 *
 * Keys rather than file paths on purpose: the failure message a developer reads
 * should name the page they have to go and look at, and `not-found` says that
 * where `src/pages/404.astro` makes them work it out.
 */
export function uncoveredRoutes(coverage: readonly RouteCoverage[]): string[] {
  return coverage.filter((c) => c.missing.length > 0).map((c) => c.key);
}
