import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createQuietWaiter,
  createSerialQueue,
  duplicateServerMessage,
  isAlive,
  isErrorPage,
  markServerErrorPages,
  registerDevServer,
  scenarioErrorMarker,
  transitiveImporters,
  viteCacheDir,
  watchedContentPaths,
} from './devContentRefresh';

const tmpDirs: string[] = [];
function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-servers-'));
  tmpDirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('isAlive', () => {
  // The current process exists, so the duplicate check must see it as live.
  it('reports the current process as alive', () => {
    expect(isAlive(process.pid)).toBe(true);
  });

  // A pid far past any real one must read as dead, or a stale registration
  // would refuse every seed forever.
  it('reports a pid with no process as dead', () => {
    expect(isAlive(2 ** 22 + 12345)).toBe(false);
  });
});

describe('registerDevServer', () => {
  // A lone server registers itself and sees no others, so seeds proceed.
  it('returns no others when it is the only server', () => {
    const dir = tmpDir();
    expect(registerDevServer(dir, 100, () => true)).toEqual([]);
    expect(fs.readdirSync(dir)).toEqual(['100']);
  });

  // The 2026-10-23 failure: two servers in one project. Each must see the other.
  it('returns the other live servers', () => {
    const dir = tmpDir();
    registerDevServer(dir, 100, () => true);
    expect(registerDevServer(dir, 200, () => true)).toEqual([100]);
    expect(registerDevServer(dir, 100, () => true)).toEqual([200]);
  });

  // Stopping the duplicate must be enough to clear the refusal.
  it('removes the registration of a dead server', () => {
    const dir = tmpDir();
    registerDevServer(dir, 100, () => true);
    expect(registerDevServer(dir, 200, (pid) => pid !== 100)).toEqual([]);
    expect(fs.readdirSync(dir)).toEqual(['200']);
  });

  // Stray files in the directory are not pids and must not count as servers.
  it('removes entries that are not pids', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'junk'), '');
    fs.writeFileSync(path.join(dir, '-3'), '');
    expect(registerDevServer(dir, 100, () => true)).toEqual([]);
    expect(fs.readdirSync(dir)).toEqual(['100']);
  });

  // The directory is gitignored and may not exist yet on a fresh checkout.
  it('creates the directory when missing', () => {
    const dir = path.join(tmpDir(), 'nested', 'servers');
    expect(registerDevServer(dir, 100, () => true)).toEqual([]);
    expect(fs.existsSync(path.join(dir, '100'))).toBe(true);
  });
});

describe('duplicateServerMessage', () => {
  // The boot log names every other pid so the user knows what to stop.
  it('names the other pids at boot', () => {
    const msg = duplicateServerMessage([11, 22], 'boot');
    expect(msg).toContain('pid 11, 22');
    expect(msg).toMatch(/seeds will be refused/);
  });

  // The 409 body is what the seed adapter prints as its FATAL reason.
  it('tells the seed caller to stop all but one', () => {
    const msg = duplicateServerMessage([11], 'seed');
    expect(msg).toContain('pid 11');
    expect(msg).toMatch(/cannot be trusted\. Stop all but one\.$/);
  });
});

describe('watchedContentPaths', () => {
  // Both sandbox roots and the store file are watched when the sandbox is active.
  it('includes the sandbox roots and the data store file', () => {
    expect(watchedContentPaths('/p', { CODEYAM_CONTENT_ROOT: '/c', CODEYAM_DATA_ROOT: '/d' })).toEqual([
      '/c',
      '/d',
      path.join('/p', '.astro', 'data-store.json'),
    ]);
  });

  // Without a sandbox only the store file is watched — no undefined prefix that
  // would make every event match.
  it('drops unset roots', () => {
    expect(watchedContentPaths('/p', {})).toEqual([path.join('/p', '.astro', 'data-store.json')]);
  });
});

/** A fake clock whose sleep advances time, so waits run instantly. */
function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    sleeps,
  };
}

describe('createQuietWaiter', () => {
  // A seed's rewrite fires events; the refresh must wait until they stop.
  it('waits until no watched event has arrived for quietMs', async () => {
    const clock = fakeClock();
    const w = createQuietWaiter({ watched: ['/c'], quietMs: 750, capMs: 8000, ...clock });
    w.touch('/c/events/a.md');
    await w.waitForQuiet();
    expect(clock.now()).toBe(800);
  });

  // Once quiet, there is nothing to wait for.
  it('returns at once when already quiet', async () => {
    const clock = fakeClock();
    const w = createQuietWaiter({ watched: ['/c'], quietMs: 750, capMs: 8000, ...clock });
    clock.advance(1000);
    await w.waitForQuiet();
    expect(clock.sleeps).toEqual([]);
  });

  // Edits elsewhere in the project must not hold a seed.
  it('ignores events outside the watched paths', async () => {
    const clock = fakeClock();
    const w = createQuietWaiter({ watched: ['/c'], quietMs: 750, capMs: 8000, ...clock });
    clock.advance(1000);
    w.touch('/src/pages/index.astro');
    await w.waitForQuiet();
    expect(clock.sleeps).toEqual([]);
  });

  // A tree that never settles must not hang the seed past the cap.
  it('gives up at capMs', async () => {
    const clock = fakeClock();
    // An event lands on every tick, so the tree never goes quiet.
    const w = createQuietWaiter({
      watched: ['/c'],
      quietMs: 750,
      capMs: 1000,
      now: clock.now,
      sleep: async (ms) => {
        await clock.sleep(ms);
        w.touch('/c/x.md');
      },
    });
    w.touch('/c/x.md');
    await w.waitForQuiet();
    expect(clock.now()).toBe(1000);
  });
});

describe('createSerialQueue', () => {
  // Two seeds arriving together must refresh one after the other, never interleaved.
  it('runs jobs one at a time in order', async () => {
    const enqueue = createSerialQueue();
    const log: string[] = [];
    const job = (name: string) => async () => {
      log.push(`${name} start`);
      await new Promise((r) => setTimeout(r, 5));
      log.push(`${name} end`);
    };
    enqueue(job('a'), () => {});
    await enqueue(job('b'), () => {});
    expect(log).toEqual(['a start', 'a end', 'b start', 'b end']);
  });

  // A failed refresh answers 500 but must not wedge every later seed.
  it('hands a failure to onError and keeps running later jobs', async () => {
    const enqueue = createSerialQueue();
    const errors: unknown[] = [];
    let ran = false;
    enqueue(async () => {
      throw new Error('boom');
    }, (e) => errors.push(e));
    await enqueue(async () => {
      ran = true;
    }, (e) => errors.push(e));
    expect(errors).toHaveLength(1);
    expect(ran).toBe(true);
  });
});

describe('isErrorPage', () => {
  // Astro's dev error page is a 500 HTML response.
  it('is true for a 5xx HTML response', () => {
    expect(isErrorPage(500, 'text/html; charset=utf-8')).toBe(true);
    expect(isErrorPage(503, 'text/html')).toBe(true);
  });

  // Normal pages and a 404 page are legitimate captures.
  it('is false below 500', () => {
    expect(isErrorPage(200, 'text/html')).toBe(false);
    expect(isErrorPage(404, 'text/html')).toBe(false);
  });

  // A JSON 500 (an API route) is not a page anyone captures.
  it('is false for non-HTML responses', () => {
    expect(isErrorPage(500, 'application/json')).toBe(false);
    expect(isErrorPage(500, '')).toBe(false);
  });
});

describe('scenarioErrorMarker', () => {
  // The capture fails on this exact attribute, so it must be present and hidden.
  it('carries the hidden data-codeyam-scenario-error attribute with the status', () => {
    const marker = scenarioErrorMarker(500);
    expect(marker).toMatch(/^<div hidden data-codeyam-scenario-error="[^"]*HTTP 500[^"]*">/);
    expect(marker).toContain('Scenario Error');
  });
});

/** A minimal stand-in for ServerResponse that records what was sent. */
function fakeResponse(initialHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...initialHeaders };
  const res: any = {
    body: '',
    status: 0,
    sentHeaders: undefined as Record<string, string> | undefined,
    getHeader: (k: string) => headers[k.toLowerCase()],
    removeHeader: (k: string) => {
      delete headers[k.toLowerCase()];
    },
    headers,
    writeHead(status: number, h?: Record<string, string>) {
      res.status = status;
      res.sentHeaders = h;
      return res;
    },
    write(chunk: string) {
      res.body += chunk;
    },
    end(chunk?: string) {
      if (chunk) res.body += chunk;
    },
  };
  return res;
}

describe('markServerErrorPages', () => {
  // The bug: a 500 error page was saved as a good frame. It must now carry the marker.
  it('appends the marker to a 500 HTML page', () => {
    const res = fakeResponse();
    let nexted = false;
    markServerErrorPages({} as any, res, () => {
      nexted = true;
    });
    res.writeHead(500, { 'Content-Type': 'text/html', 'Content-Length': '10' });
    res.end('<title>Error</title>');
    expect(nexted).toBe(true);
    expect(res.body).toContain('data-codeyam-scenario-error');
    // A stale Content-Length would truncate the marker off the page.
    expect(res.sentHeaders).not.toHaveProperty('Content-Length');
  });

  // Astro may set the type with setHeader before writeHead(500) with no headers.
  it('reads the content type set earlier with setHeader', () => {
    const res = fakeResponse({ 'content-type': 'text/html', 'content-length': '10' });
    markServerErrorPages({} as any, res, () => {});
    res.writeHead(500);
    res.end('x');
    expect(res.body).toContain('data-codeyam-scenario-error');
    expect(res.headers).not.toHaveProperty('content-length');
  });

  // Ordinary pages must render untouched.
  it('leaves a 200 page untouched', () => {
    const res = fakeResponse();
    markServerErrorPages({} as any, res, () => {});
    res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': '5' });
    res.end('hello');
    expect(res.body).toBe('hello');
    expect(res.sentHeaders).toHaveProperty('Content-Length', '5');
  });

  // A JSON 500 from the refresh endpoint itself is not a page and stays as-is.
  it('leaves a non-HTML 500 untouched', () => {
    const res = fakeResponse();
    markServerErrorPages({} as any, res, () => {});
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{}');
    expect(res.body).toBe('{}');
  });
});

describe('viteCacheDir', () => {
  // A build sharing the dev server's dep cache replaced its React dev runtime
  // with the production one ("jsxDEV is not a function" on every island).
  it('keeps the dev server on the default cache', () => {
    expect(viteCacheDir(['node', 'astro', 'dev', '--host', '127.0.0.1'])).toBe('node_modules/.vite');
  });

  // `astro build` runs under NODE_ENV=production, so its optimizer output must not land in the dev cache.
  it('gives a build its own cache', () => {
    expect(viteCacheDir(['node', 'astro', 'build'])).toBe('node_modules/.vite-build');
  });

  // `astro check` is the half of verify-build that poisoned the cache on 2026-10-23.
  it('gives astro check its own cache', () => {
    expect(viteCacheDir(['node', 'astro', 'check'])).toBe('node_modules/.vite-build');
  });
});

describe('transitiveImporters', () => {
  type Mod = { id: string; importers: Set<Mod> };
  const mod = (id: string): Mod => ({ id, importers: new Set() });
  const ids = (mods: Set<Mod>) => [...mods].map((m) => m.id).sort();

  // The root itself must be invalidated, or contentRoot.ts keeps its old reads.
  it('includes the roots', () => {
    expect(ids(transitiveImporters([mod('root')]))).toEqual(['root']);
  });

  // A page imports a helper that imports contentRoot.ts; the page held the stale settings.
  it('follows importers through intermediate modules', () => {
    const root = mod('root');
    const helper = mod('helper');
    const page = mod('page');
    root.importers.add(helper);
    helper.importers.add(page);
    expect(ids(transitiveImporters([root]))).toEqual(['helper', 'page', 'root']);
  });

  // Modules that do not import the root must keep their cached instances.
  it('leaves out modules that do not import the root', () => {
    const root = mod('root');
    const unrelated = mod('unrelated');
    unrelated.importers.add(mod('other'));
    expect(ids(transitiveImporters([root]))).toEqual(['root']);
  });

  // Vite module graphs contain import cycles; the walk must still end.
  it('terminates on an import cycle', () => {
    const a = mod('a');
    const b = mod('b');
    a.importers.add(b);
    b.importers.add(a);
    expect(ids(transitiveImporters([a]))).toEqual(['a', 'b']);
  });

  // getModulesByFile returns nothing before the file is first loaded.
  it('returns an empty set for no roots', () => {
    expect(transitiveImporters([]).size).toBe(0);
  });
});
