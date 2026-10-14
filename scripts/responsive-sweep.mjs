#!/usr/bin/env node
// Pre-launch responsive sweep: every built page at every width in
// SWEEP_WIDTHS, judged by src/lib/responsiveSweep.ts.
//
// Run after a fresh `npm run build` with DEPLOY_BASE_PATH unset:
//
//   npm run check:responsive                 # every page
//   npm run check:responsive -- --only /events   # one page while fixing it
//
// It serves dist/ through `astro preview`, loads each page at each width in
// Chromium, scrolls the whole page so lazy images load, measures once, and
// writes .codeyam/tmp/responsive-sweep/results.json plus a short table. It exits
// non-zero only on `fail` findings — tap-target and font-size findings are
// advisory, since inline links in body copy are legitimately small.
//
// A manual pre-launch step, deliberately not wired into deploy: deploy.yml runs
// no tests at all, and changing that is a separate decision.

import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { SWEEP_WIDTHS, judgePage, summarise } from '../src/lib/responsiveSweep.ts';

const DIST = 'dist';
const OUT_DIR = path.join('.codeyam', 'tmp', 'responsive-sweep');
const CONCURRENCY = 4;

/** Built paths that are not public pages a visitor reaches. */
const EXCLUDED_PREFIXES = ['/admin', '/previews', '/cutover-runbook', '/isolated-components'];

/** An Astro redirect stub: a page holding only a meta refresh (e.g. dist/nyc/). */
export function isRedirectStub(html) {
  return /<meta\s+http-equiv="refresh"/i.test(html) && !/<main[\s>]/i.test(html);
}

/** True when dist/ was built for the project-site deploy rather than base `/`. */
export function builtWithDeployBase(html) {
  const m = html.match(/(?:href|src)="(\/[^/"]+)\/_astro\//);
  return m ? m[1] : null;
}

/** Every page in dist/ worth sweeping, as URL paths. */
export async function enumeratePages(dir = DIST, rel = '') {
  const pages = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const relPath = path.posix.join(rel, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      pages.push(...(await enumeratePages(dir, relPath)));
    } else if (entry.name === 'index.html' || (rel === '' && entry.name === '404.html')) {
      const urlPath = entry.name === '404.html' ? '/404' : `/${rel}${rel ? '/' : ''}`;
      if (EXCLUDED_PREFIXES.some((p) => urlPath === p || urlPath.startsWith(`${p}/`))) continue;
      const html = await readFile(path.join(dir, relPath), 'utf8');
      if (isRedirectStub(html)) continue;
      pages.push(urlPath);
    }
  }
  return pages.sort();
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startPreview(port) {
  // The astro binary under node directly, not through `npx`: killing an npx
  // wrapper leaves the server it started running, and every sweep leaked one.
  // Output is ignored rather than piped, since nothing reads it and an
  // undrained pipe can stall the server on a long run.
  const astroBin = path.join('node_modules', '.bin', 'astro');
  const child = spawn(process.execPath, [astroBin, 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    stdio: 'ignore',
    env: { ...process.env, DEPLOY_BASE_PATH: '' },
  });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`astro preview exited with code ${child.exitCode}`);
    try {
      const res = await fetch(`${origin}/`);
      if (res.ok) return { child, origin };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error('astro preview did not start within 30s');
}

/**
 * Runs in the page. Measures the document and every element whose box matters,
 * recording the context flags the judge's ignore list needs. Kept free of
 * closures over this module — Playwright serialises it into the browser.
 */
function measureInBrowser() {
  const vw = window.innerWidth;
  const INTERACTIVE = 'a[href], button, input:not([type=hidden]), select, textarea, [role="button"]';
  const MEDIA = new Set(['IMG', 'PICTURE', 'VIDEO', 'SVG', 'svg']);
  const TEXT_PARENTS = new Set(['P', 'LI', 'DD', 'TD', 'BLOCKQUOTE', 'FIGCAPTION', 'SPAN', 'EM', 'STRONG']);

  const shortPath = (el) => {
    const parts = [];
    let node = el;
    for (let depth = 0; node && node.nodeType === 1 && depth < 3; depth++) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${part}#${node.id}`);
        break;
      }
      const classes = [...node.classList].filter((c) => !c.startsWith('astro-')).slice(0, 2);
      if (classes.length) part += `.${classes.join('.')}`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const ancestorFlags = (el) => {
    const flags = { insideScroller: false, clippedByAncestor: false, offCanvasClosed: false };
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') flags.insideScroller = true;
      if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && a !== document.body) {
        flags.clippedByAncestor = true;
      }
      if (a.hasAttribute('inert') || a.getAttribute('aria-hidden') === 'true' || a.hidden) {
        flags.offCanvasClosed = true;
      }
    }
    return flags;
  };

  const ownText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);

  const overflowing = new Set();
  const elements = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BR'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    if (!visible) continue;

    const interactive = el.matches(INTERACTIVE);
    const hasText = ownText(el);
    const isMedia = MEDIA.has(el.tagName);
    const isFrame = el.tagName === 'IFRAME';
    const overflows = r.right > vw + 1 || r.left < -1;
    if (!interactive && !hasText && !isMedia && !isFrame && !overflows) continue;

    let thirdPartyFrame = false;
    if (isFrame) {
      try {
        thirdPartyFrame = new URL(el.src, location.href).origin !== location.origin;
      } catch {
        thirdPartyFrame = true;
      }
    }

    let parentOverflows = false;
    for (let a = el.parentElement; a; a = a.parentElement) {
      if (overflowing.has(a)) {
        parentOverflows = true;
        break;
      }
    }
    if (overflows) overflowing.add(el);

    const visuallyHidden =
      (r.width <= 1 && r.height <= 1) ||
      cs.clip === 'rect(0px, 0px, 0px, 0px)' ||
      cs.clipPath === 'inset(50%)' ||
      el.classList.contains('visually-hidden') ||
      el.classList.contains('sr-only') ||
      el.classList.contains('skip-link');

    elements.push({
      selector: shortPath(el),
      tag: el.tagName.toLowerCase(),
      left: r.left,
      right: r.right,
      width: r.width,
      height: r.height,
      visible: true,
      interactive,
      inlineInText:
        interactive && cs.display === 'inline' && !!el.parentElement && TEXT_PARENTS.has(el.parentElement.tagName),
      fontSize: hasText ? parseFloat(cs.fontSize) : undefined,
      isMedia,
      thirdPartyFrame,
      visuallyHidden,
      parentOverflows,
      ...ancestorFlags(el),
    });
  }

  return {
    innerWidth: vw,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    elements,
  };
}

async function sweepOne(context, origin, pagePath, width) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}${pagePath}`, { waitUntil: 'load', timeout: 30000 });
    // The webfont race already causes capture churn; measure after fonts land.
    await page.evaluate(() => document.fonts.ready);
    // Scroll the whole page in steps so lazy images load before measuring.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const measured = await page.evaluate(measureInBrowser);
    return judgePage({ page: pagePath, width, ...measured });
  } finally {
    await page.close();
  }
}

/** The `--only <path>` argument, or null to sweep every page. */
export function parseOnly(argv) {
  const i = argv.indexOf('--only');
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
}

/**
 * Which pages to sweep, or why the sweep cannot start. `indexHtml` is null when
 * dist/ has not been built.
 */
export function planSweep({ indexHtml, allPages, only }) {
  if (indexHtml === null) {
    return { error: 'No dist/index.html — run `npm run build` (with DEPLOY_BASE_PATH unset) first.' };
  }
  const deployBase = builtWithDeployBase(indexHtml);
  if (deployBase) {
    return {
      error:
        `dist/ was built with the deploy base ${deployBase}/, so every asset would 404 here. ` +
        'Rebuild with DEPLOY_BASE_PATH unset, then re-run.',
    };
  }
  const trimmed = only ? only.replace(/\/$/, '') : null;
  const pages = only ? allPages.filter((p) => p === only || p === `${trimmed}/`) : allPages;
  if (pages.length === 0) return { error: only ? `No built page matches ${only}.` : 'No pages found in dist/.' };
  return { pages };
}

/**
 * Every page × width pair, page-major.
 * @param {string[]} pages
 * @param {readonly number[]} [widths]
 */
export function sweepJobs(pages, widths = SWEEP_WIDTHS) {
  return pages.flatMap((p) => widths.map((w) => [p, w]));
}

/** The printed table and the process exit code: non-zero only on a fail or a page that would not load. */
export function report(summary, errors, pageCount) {
  const lines = [
    ...summary.rows.map(
      (r) => `${r.severity === 'fail' ? 'FAIL' : '    '} ${r.page}  ${r.kind}  ${r.selector}  @${r.widths.join(',')}  — ${r.detail}`,
    ),
    ...errors.map((e) => `ERR  ${e.page} @${e.width} — ${e.error}`),
    `\n${pageCount} pages × ${SWEEP_WIDTHS.length} widths: ${summary.fails} failing, ` +
      `${summary.advisories} advisory, ${errors.length} load error(s). Results in ${OUT_DIR}/`,
  ];
  return { lines, exitCode: summary.fails > 0 || errors.length > 0 ? 1 : 0 };
}

async function readDist() {
  try {
    return { indexHtml: await readFile(path.join(DIST, 'index.html'), 'utf8'), allPages: await enumeratePages() };
  } catch {
    return { indexHtml: null, allPages: [] };
  }
}

/** Sweeps every job across CONCURRENCY browser contexts against one preview server. */
async function runSweep(pages) {
  const { child, origin } = await startPreview(await freePort());
  const browser = await chromium.launch();
  const findings = [];
  const errors = [];
  const jobs = sweepJobs(pages);
  let next = 0;
  const worker = async () => {
    const context = await browser.newContext();
    while (next < jobs.length) {
      const [p, w] = jobs[next++];
      try {
        findings.push(...(await sweepOne(context, origin, p, w)));
      } catch (err) {
        errors.push({ page: p, width: w, error: String(err.message || err) });
      }
    }
    await context.close();
  };
  try {
    console.error(`Sweeping ${pages.length} page(s) at ${SWEEP_WIDTHS.length} widths…`);
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    await browser.close();
    child.kill();
  }
  return { findings, errors };
}

async function main() {
  const only = parseOnly(process.argv.slice(2));
  const plan = planSweep({ ...(await readDist()), only });
  if ('error' in plan) {
    console.error(plan.error);
    process.exit(2);
  }

  const { findings, errors } = await runSweep(plan.pages);
  const summary = summarise(findings);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, only ? 'results-only.json' : 'results.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), widths: SWEEP_WIDTHS, pages: plan.pages, errors, ...summary }, null, 2)}\n`,
  );

  const { lines, exitCode } = report(summary, errors, plan.pages.length);
  console.log(lines.join('\n'));
  process.exit(exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
