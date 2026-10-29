import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Helpers for the dev-only `/__codeyam_refresh_content` integration in
// `astro.config.mjs`. They keep a seed from being reported as captured while the
// content store is still moving, while a second dev server shares that store, or
// while the page is Astro's error page. See `codeyamContentRefresh` for why.

/** Longer than Astro's 500ms data-store save debounce, so "quiet" includes the save. */
export const QUIET_MS = 750;
/** Never hold a seed longer than this waiting for quiet. */
export const QUIET_CAP_MS = 8_000;

/**
 * Vite's dependency cache for this Astro command. `astro check` / `astro build`
 * run with NODE_ENV=production yet their content sync still runs the dep
 * optimizer; sharing the dev server's cache let a build overwrite the served
 * `react_jsx-dev-runtime.js` with the production one under the dev server's
 * unchanged `?v=` hash, and every island then died with "jsxDEV is not a
 * function" until the dev server restarted. Builds get their own.
 *
 * @param argv The command line (`process.argv`).
 */
export function viteCacheDir(argv: readonly string[]): string {
  return argv.includes('dev') ? 'node_modules/.vite' : 'node_modules/.vite-build';
}

/** @returns whether a process with this pid exists. */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: it exists, it just isn't ours to signal.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * Register this process as a dev server for the project (one empty file per
 * pid in `dir`) and return the pids of the OTHER live ones. Both sides of a
 * duplicate see each other, so whichever one the editor proxies to refuses the
 * seed. A dead server's file is removed, so stopping the duplicate is enough to
 * clear the refusal.
 */
export function registerDevServer(
  dir: string,
  pid: number = process.pid,
  alive: (pid: number) => boolean = isAlive,
): number[] {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, String(pid)), '');
  const others: number[] = [];
  for (const name of fs.readdirSync(dir)) {
    const other = Number(name);
    if (other === pid) continue;
    if (Number.isInteger(other) && other > 0 && alive(other)) others.push(other);
    else fs.rmSync(path.join(dir, name), { force: true });
  }
  return others;
}

/**
 * What to say about duplicate dev servers: `boot` is logged when a server
 * starts next to another, `seed` is the 409 body the seed adapter fails on.
 */
export function duplicateServerMessage(pids: number[], context: 'boot' | 'seed'): string {
  const list = pids.join(', ');
  if (context === 'boot') {
    return (
      `another astro dev server (pid ${list}) is already running in this project and writes ` +
      `the same content store — scenario seeds will be refused until only one is left`
    );
  }
  return (
    `another astro dev server (pid ${list}) is running in this project and writes the same ` +
    `content store, so this seed cannot be trusted. Stop all but one.`
  );
}

/** The paths whose watcher events mean the content store is still moving. */
export function watchedContentPaths(
  root: string,
  env: Record<string, string | undefined> = process.env,
): string[] {
  return [env.CODEYAM_CONTENT_ROOT, env.CODEYAM_DATA_ROOT, path.join(root, '.astro', 'data-store.json')].filter(
    (p): p is string => Boolean(p),
  );
}

/**
 * Tracks watcher events under `watched` and waits until none has arrived for
 * `quietMs`, giving up after `capMs` so a busy tree cannot hang a seed.
 */
export function createQuietWaiter(opts: {
  watched: string[];
  quietMs?: number;
  capMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}) {
  const {
    watched,
    quietMs = QUIET_MS,
    capMs = QUIET_CAP_MS,
    now = Date.now,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
  } = opts;
  let lastEventAt = now();
  return {
    /** Record a watcher event; ignored unless it is under a watched path. */
    touch(file: string) {
      if (watched.some((w) => file.startsWith(w))) lastEventAt = now();
    },
    async waitForQuiet() {
      const deadline = now() + capMs;
      while (now() - lastEventAt < quietMs && now() < deadline) await sleep(100);
    },
  };
}

/**
 * Runs queued jobs one at a time, in order. A job that throws is handed to
 * `onError` and does not stop the ones after it.
 */
export function createSerialQueue() {
  let tail: Promise<void> = Promise.resolve();
  return (job: () => Promise<void>, onError: (err: unknown) => void): Promise<void> => {
    tail = tail.then(job).catch(onError);
    return tail;
  };
}

/** Whether a response is a server-error HTML page (Astro's dev error page). */
export function isErrorPage(status: number, contentType: string): boolean {
  return status >= 500 && contentType.includes('text/html');
}

/** The element the capture's `scenarioErrorMarkerIssue` check fails on. */
export function scenarioErrorMarker(status: number): string {
  return (
    `<div hidden data-codeyam-scenario-error="Astro dev server error page (HTTP ${status})">` +
    `Scenario Error: the dev server answered ${status}</div>`
  );
}

/**
 * Connect middleware stamping every 5xx HTML response with the scenario-error
 * marker. Astro's dev error page is a bare `<title>` plus the Vite client, which
 * draws the overlay afterwards, so a capture of it passed every check and was
 * saved as the scenario's frame.
 */
export function markServerErrorPages(_req: IncomingMessage, response: ServerResponse, next: () => void): void {
  // Wrapped loosely: Node's overloads for these two can't be restated usefully.
  const res = response as any;
  const writeHead = res.writeHead;
  res.writeHead = function (status: number, ...rest: any[]) {
    const headers = rest.find((r) => r && typeof r === 'object');
    const type = String(headers?.['Content-Type'] ?? res.getHeader('content-type') ?? '');
    if (isErrorPage(status, type)) {
      // The marker makes the body longer than any declared length.
      if (headers) delete headers['Content-Length'];
      res.removeHeader('content-length');
      const end = res.end;
      res.end = function (...args: any[]) {
        res.write(scenarioErrorMarker(status));
        return end.apply(this, args);
      };
    }
    return writeHead.call(this, status, ...rest);
  };
  next();
}

/**
 * Every module that imports one of `roots`, directly or through other modules,
 * plus the roots themselves. The content refresh invalidates this set for
 * `contentRoot.ts`, because its importers read JSON singletons once at module
 * load and would otherwise keep serving the pre-seed values.
 */
export function transitiveImporters<T extends { importers: Set<T> }>(roots: Iterable<T>): Set<T> {
  const seen = new Set<T>();
  const stack = [...roots];
  while (stack.length > 0) {
    const mod = stack.pop()!;
    if (seen.has(mod)) continue;
    seen.add(mod);
    for (const importer of mod.importers) stack.push(importer);
  }
  return seen;
}
