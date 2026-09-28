import * as fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AUDIT_SIZES, PUBLIC_AUDIT_ROUTES } from './publicRoutes';

// The inventory is only worth anything if it matches the repo. A route pointing
// at a file that no longer exists would silently drop a page out of the audit —
// coverage would read as complete because the page stopped being counted.

describe('the public audit route inventory', () => {
  // The failure this catches is a page being renamed or deleted while the
  // inventory still lists it, which quietly shrinks the audit's scope.
  it.each(PUBLIC_AUDIT_ROUTES.map((r) => [r.key, r.pageFilePath] as const))(
    '%s renders from a file that exists',
    (_key, pageFilePath) => {
      expect(fs.existsSync(pageFilePath)).toBe(true);
    },
  );

  // Keys are how findings are addressed in the report and in failure messages;
  // two routes sharing one would make a finding ambiguous.
  it('gives every route a distinct key', () => {
    const keys = PUBLIC_AUDIT_ROUTES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // Same for the rendering file: two entries on one page would double-count it.
  it('lists each page file once', () => {
    const paths = PUBLIC_AUDIT_ROUTES.map((r) => r.pageFilePath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  // /give was retired by the giving plan — the route is gone and its address
  // redirects to /donate. Auditing it would mean capturing a page no visitor can
  // reach. If someone re-adds it here, that decision is being reversed by
  // accident rather than on purpose.
  it('excludes the retired giving page', () => {
    expect(PUBLIC_AUDIT_ROUTES.some((r) => r.route === '/give')).toBe(false);
    expect(fs.existsSync('src/pages/give.astro')).toBe(false);
  });

  // /404 is absent for a tooling reason, not a judgement about the page: every
  // capture entry point refuses an HTTP 404 response, and Astro serves that page
  // with a 404 status at every URL that reaches it, so listing it would leave
  // the coverage guard permanently red with no way to clear it. Re-adding it
  // here would reintroduce that, so the exclusion is pinned.
  it('excludes the 404 page, which the capture harness cannot photograph', () => {
    expect(PUBLIC_AUDIT_ROUTES.some((r) => r.pageFilePath === 'src/pages/404.astro')).toBe(false);
    // The page itself still exists — this is not a claim that it was deleted.
    expect(fs.existsSync('src/pages/404.astro')).toBe(true);
  });

  // The audit's own premise: four widths, the ones already configured. A size
  // dropped from here silently narrows every coverage assertion that uses it.
  it('requires the four configured sizes', () => {
    expect([...AUDIT_SIZES].sort()).toEqual(['Desktop', 'Laptop', 'Mobile', 'Tablet']);
  });

  // Every size named here must actually exist in the editor config, or captures
  // at that name would fail rather than produce a frame.
  it('names only sizes the editor has configured', () => {
    const configured = Object.keys(
      (JSON.parse(fs.readFileSync('.codeyam/editor.json', 'utf8')) as {
        screenSizes?: Record<string, unknown>;
      }).screenSizes ?? {},
    );
    for (const size of AUDIT_SIZES) expect(configured).toContain(size);
  });

  // A relative URL is what the capture navigates to; an absolute one would
  // leave the site under test.
  it('audits only same-site URLs', () => {
    for (const route of PUBLIC_AUDIT_ROUTES) expect(route.auditUrl.startsWith('/')).toBe(true);
  });
});
