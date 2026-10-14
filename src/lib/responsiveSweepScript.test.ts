import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Imported straight from the sweep script; its entry-point guard means
// importing it does not start a server or a browser.
import {
  builtWithDeployBase,
  enumeratePages,
  isRedirectStub,
  parseOnly,
  planSweep,
  report,
  sweepJobs,
} from '../../scripts/responsive-sweep.mjs';

// The helpers in the sweep driver that carry logic of their own. The rest of
// the script drives `astro preview` and Chromium, and what it judges is
// covered by responsiveSweep.test.ts.

const PAGE = '<html><body><header></header><main><h1>Hi</h1></main></body></html>';
const STUB = '<!doctype html><title>Redirecting to: /chapters/nyc</title><meta http-equiv="refresh" content="0;url=/chapters/nyc">';

describe('isRedirectStub', () => {
  // Astro writes redirect pages (e.g. dist/nyc/) that have no content to
  // check; sweeping them would only measure an empty document.
  it('recognises an Astro redirect page', () => {
    expect(isRedirectStub(STUB)).toBe(true);
  });

  // A real page must never be skipped as a redirect.
  it('does not mistake a real page for one', () => {
    expect(isRedirectStub(PAGE)).toBe(false);
  });
});

describe('builtWithDeployBase', () => {
  // A project-site build prefixes every asset with the repo name; served at /
  // all of them would 404, so the sweep must detect it and stop.
  it('names the base a project-site build was made with', () => {
    expect(builtWithDeployBase('<link href="/harvardintech/_astro/index.css">')).toBe('/harvardintech');
  });

  // A build at base / is the one the sweep expects and must be accepted.
  it('returns null for a build at base /', () => {
    expect(builtWithDeployBase('<link href="/_astro/index.css"><script src="/_astro/page.js">')).toBeNull();
  });
});

describe('parseOnly', () => {
  // --only narrows the sweep to one page while fixing it.
  it('reads the path after --only', () => {
    expect(parseOnly(['--only', '/events'])).toBe('/events');
  });

  // With no flag, or a flag missing its path, the sweep covers every page.
  it('is null without the flag, or with the flag and no path', () => {
    expect(parseOnly([])).toBeNull();
    expect(parseOnly(['--only'])).toBeNull();
  });
});

describe('planSweep', () => {
  const allPages = ['/', '/events/', '/privacy/'];

  // Without a build there is nothing to serve; the message must say how to
  // make one.
  it('refuses to start without a build', () => {
    expect(planSweep({ indexHtml: null, allPages: [], only: null })).toEqual({
      error: expect.stringContaining('npm run build'),
    });
  });

  // A deploy-base build would report every asset as missing, so the sweep
  // refuses it and names the base it found.
  it('refuses a build made with the project-site deploy base', () => {
    const plan = planSweep({ indexHtml: '<link href="/harvardintech/_astro/a.css">', allPages, only: null });
    expect(plan).toEqual({ error: expect.stringContaining('/harvardintech/') });
  });

  // The default pre-launch run covers every public page.
  it('sweeps every page by default', () => {
    expect(planSweep({ indexHtml: PAGE, allPages, only: null })).toEqual({ pages: allPages });
  });

  // People type paths with or without the trailing slash; both must find the
  // built page, and / must not match everything.
  it('narrows to one page with or without its trailing slash', () => {
    expect(planSweep({ indexHtml: PAGE, allPages, only: '/events' })).toEqual({ pages: ['/events/'] });
    expect(planSweep({ indexHtml: PAGE, allPages, only: '/events/' })).toEqual({ pages: ['/events/'] });
    expect(planSweep({ indexHtml: PAGE, allPages, only: '/' })).toEqual({ pages: ['/'] });
  });

  // A typo in --only must stop with a message, not report a clean sweep of
  // nothing.
  it('says so when --only matches nothing', () => {
    expect(planSweep({ indexHtml: PAGE, allPages, only: '/nope' })).toEqual({ error: 'No built page matches /nope.' });
  });
});

describe('sweepJobs', () => {
  // Every page is checked at every width, grouped by page.
  it('pairs every page with every width, page by page', () => {
    expect(sweepJobs(['/', '/a/'], [320, 768])).toEqual([
      ['/', 320],
      ['/', 768],
      ['/a/', 320],
      ['/a/', 768],
    ]);
  });
});

describe('report', () => {
  const row = (severity: 'fail' | 'advisory') => ({
    page: '/',
    kind: severity === 'fail' ? 'horizontal-scroll' : 'small-text',
    severity,
    selector: 'document',
    widths: [320, 768],
    detail: 'x',
  });

  // Advisories alone are for the owner to decide; they must not fail the run.
  it('exits 0 when only advisories remain', () => {
    const out = report({ rows: [row('advisory')], fails: 0, advisories: 1, pages: 1 }, [], 1);
    expect(out.exitCode).toBe(0);
    expect(out.lines[0]).toBe('     /  small-text  document  @320,768  — x');
  });

  // A real failure exits non-zero and is marked so it stands out in the table.
  it('exits 1 on a failure, marking the row', () => {
    const out = report({ rows: [row('fail')], fails: 1, advisories: 0, pages: 1 }, [], 1);
    expect(out.exitCode).toBe(1);
    expect(out.lines[0]).toMatch(/^FAIL \//);
  });

  // A page that never loaded was not checked at all, so it must fail the run
  // rather than pass silently.
  it('exits 1 when a page would not load, listing it', () => {
    const out = report({ rows: [], fails: 0, advisories: 0, pages: 0 }, [{ page: '/x', width: 390, error: 'timeout' }], 1);
    expect(out.exitCode).toBe(1);
    expect(out.lines).toContain('ERR  /x @390 — timeout');
  });
});

describe('enumeratePages', () => {
  let dist: string;

  beforeAll(async () => {
    dist = await mkdtemp(join(tmpdir(), 'sweep-dist-'));
    const page = async (rel: string, html = PAGE) => {
      await mkdir(join(dist, rel), { recursive: true });
      await writeFile(join(dist, rel, 'index.html'), html);
    };
    await page('');
    await page('events');
    await page('chapters/nyc');
    await page('nyc', STUB);
    await page('admin');
    await page('previews/abc');
    await page('cutover-runbook');
    await page('isolated-components/Stats');
    await page('_astro');
    await writeFile(join(dist, '404.html'), PAGE);
  });

  afterAll(async () => {
    await rm(dist, { recursive: true, force: true });
  });

  // The sweep covers exactly the public pages plus /404, never redirect
  // stubs, the admin, previews, the runbook, isolation routes or asset folders.
  it('lists public pages and 404, skipping stubs, internal routes and asset folders', async () => {
    expect(await enumeratePages(dist)).toEqual(['/', '/404', '/chapters/nyc/', '/events/']);
  });
});
