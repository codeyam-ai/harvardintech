import { describe, it, expect } from 'vitest';
import {
  readRun,
  findOpenAlert,
  ensureLabel,
  openAlert,
  addComment,
  closeAlert,
  githubClient,
  notify,
  main,
} from '../../scripts/notify-site-alert.mjs';
import { PROBLEMS } from './siteAlert.js';

type Call = { method: string; path: string; body?: Record<string, unknown> };
type Answer = { status: number; ok: boolean; data: unknown };

/** A fake GitHub: records every call, answers from `respond`. */
function fakeApi(respond: (call: Call) => Partial<Answer> = () => ({})) {
  const calls: Call[] = [];
  const api = async (method: string, path: string, body?: Record<string, unknown>) => {
    const call = { method, path, body };
    calls.push(call);
    return { status: 200, ok: true, data: null, ...respond(call) };
  };
  return { api, calls };
}

const NOW = new Date('2026-11-10T07:10:00Z');
const BASE_ENV = {
  GITHUB_REPOSITORY: 'o/r',
  GITHUB_RUN_ID: '42',
  BUILD_RESULT: 'success',
  DEPLOY_RESULT: 'success',
  PAGES_OUTCOME: 'success',
  LUMA_OUTCOME: 'success',
};
const OPEN_ISSUE = { number: 9, created_at: '2026-11-06T14:03:00Z' };

describe('readRun', () => {
  // The env names the workflow sets must map onto classifyRun's inputs.
  it('reads the four results from the environment', () => {
    expect(readRun({ BUILD_RESULT: 'a', DEPLOY_RESULT: 'b', PAGES_OUTCOME: 'c', LUMA_OUTCOME: 'd' })).toEqual({
      buildResult: 'a',
      deployResult: 'b',
      pagesOutcome: 'c',
      lumaOutcome: 'd',
    });
  });
});

describe('findOpenAlert', () => {
  // The label is how an open issue is found again; it must be URL-encoded.
  it('asks for open issues with the encoded label and returns the first', async () => {
    const { api, calls } = fakeApi(() => ({ data: [OPEN_ISSUE] }));
    expect(await findOpenAlert(api, 'o/r', 'site-alert: x')).toEqual(OPEN_ISSUE);
    expect(calls[0].path).toBe('/repos/o/r/issues?state=open&per_page=1&labels=site-alert%3A%20x');
  });

  // No open issue is the normal state.
  it('returns undefined when nothing is open', async () => {
    const { api } = fakeApi(() => ({ data: [] }));
    expect(await findOpenAlert(api, 'o/r', 'l')).toBeUndefined();
  });

  // Acting without knowing would duplicate or orphan an issue, so it throws.
  it('throws when GitHub will not list issues', async () => {
    const { api } = fakeApi(() => ({ ok: false, status: 403 }));
    await expect(findOpenAlert(api, 'o/r', 'l')).rejects.toThrow('HTTP 403');
  });
});

describe('ensureLabel', () => {
  // A 422 "already exists" is the common case and must not throw.
  it('creates the label and tolerates it already existing', async () => {
    const { api, calls } = fakeApi(() => ({ ok: false, status: 422 }));
    await ensureLabel(api, 'o/r', PROBLEMS.publishing);
    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/repos/o/r/labels',
        body: expect.objectContaining({ name: PROBLEMS.publishing.label }),
      },
    ]);
  });
});

describe('openAlert', () => {
  // The label must exist before the issue that carries it is created.
  it('makes the label, then opens the issue with title, body and label', async () => {
    const { api, calls } = fakeApi();
    await openAlert(api, 'o/r', PROBLEMS.lumaImport, { now: NOW, runUrl: 'RUN', mentions: ['alice'] });
    expect(calls.map((c) => c.path)).toEqual(['/repos/o/r/labels', '/repos/o/r/issues']);
    expect(calls[1].body).toMatchObject({ title: PROBLEMS.lumaImport.title, labels: [PROBLEMS.lumaImport.label] });
    expect(calls[1].body?.body).toContain('@alice');
  });

  // A failed open must surface — the run's log is the only place it shows.
  it('throws when the issue cannot be opened', async () => {
    const { api } = fakeApi((c) => (c.path.endsWith('/issues') ? { ok: false, status: 410 } : {}));
    await expect(openAlert(api, 'o/r', PROBLEMS.publishing, { now: NOW, runUrl: 'RUN', mentions: [] })).rejects.toThrow(
      'HTTP 410',
    );
  });
});

describe('addComment and closeAlert', () => {
  // Shared by the repeat and recovery paths.
  it('posts a comment on the issue', async () => {
    const { api, calls } = fakeApi();
    await addComment(api, 'o/r', 9, 'hi');
    expect(calls).toEqual([{ method: 'POST', path: '/repos/o/r/issues/9/comments', body: { body: 'hi' } }]);
  });

  // Recovery leaves its note BEFORE closing, so watchers see why it closed.
  it('comments, then closes the issue as completed', async () => {
    const { api, calls } = fakeApi();
    await closeAlert(api, 'o/r', 9, 'back');
    expect(calls).toEqual([
      { method: 'POST', path: '/repos/o/r/issues/9/comments', body: { body: 'back' } },
      { method: 'PATCH', path: '/repos/o/r/issues/9', body: { state: 'closed', state_reason: 'completed' } },
    ]);
  });
});

describe('notify', () => {
  // A cancelled run must not touch GitHub at all.
  it('makes no calls when the run says nothing', async () => {
    const { api, calls } = fakeApi();
    const done = await notify({ env: { ...BASE_ENV, BUILD_RESULT: 'cancelled' }, api, now: NOW });
    expect(done).toEqual({ publishing: 'none', lumaImport: 'none' });
    expect(calls).toEqual([]);
  });

  // First failure opens an issue; the run link comes from the env.
  it('opens an issue for a new failure', async () => {
    const { api, calls } = fakeApi((c) => (c.method === 'GET' ? { data: [] } : {}));
    const done = await notify({ env: { ...BASE_ENV, LUMA_OUTCOME: 'failure' }, api, now: NOW });
    expect(done).toEqual({ publishing: 'none', lumaImport: 'open' });
    const created = calls.find((c) => c.path === '/repos/o/r/issues');
    expect(created?.body?.body).toContain('(https://github.com/o/r/actions/runs/42)');
  });

  // A repeat comments on the open issue and keeps its original start date.
  it('comments on the issue already open for a repeat failure', async () => {
    const { api, calls } = fakeApi((c) => (c.method === 'GET' ? { data: [OPEN_ISSUE] } : {}));
    const done = await notify({ env: { ...BASE_ENV, BUILD_RESULT: 'failure', LUMA_OUTCOME: '' }, api, now: NOW });
    expect(done).toEqual({ publishing: 'comment', lumaImport: 'none' });
    const comment = calls.find((c) => c.path === '/repos/o/r/issues/9/comments');
    expect(comment?.body?.body).toContain('first noticed Friday 6 November 2026');
  });

  // A good run closes whatever is open.
  it('closes open issues on a good run', async () => {
    const { api, calls } = fakeApi((c) => (c.method === 'GET' ? { data: [OPEN_ISSUE] } : {}));
    const done = await notify({ env: BASE_ENV, api, now: NOW });
    expect(done).toEqual({ publishing: 'close', lumaImport: 'close' });
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(2);
  });
});

describe('main', () => {
  // The notifier must never fail the run: errors become an Actions warning.
  it('turns any error into a warning instead of throwing', async () => {
    const { api } = fakeApi(() => ({ ok: false, status: 500 }));
    const lines: string[] = [];
    await expect(
      main({ env: { ...BASE_ENV, BUILD_RESULT: 'failure' }, api, log: (l: string) => lines.push(l), now: NOW }),
    ).resolves.toBeUndefined();
    expect(lines).toEqual(['::warning::could not update the site-alert issues: listing issues answered HTTP 500']);
  });

  // On success it logs one line per problem for the run's log.
  it('logs what it did for each problem', async () => {
    const { api } = fakeApi();
    const lines: string[] = [];
    await main({ env: { ...BASE_ENV, BUILD_RESULT: 'cancelled' }, api, log: (l: string) => lines.push(l), now: NOW });
    expect(lines).toEqual(['publishing: none', 'lumaImport: none']);
  });
});

describe('githubClient', () => {
  // The request must carry the token and API headers GitHub requires.
  it('sends authenticated JSON requests and parses the answer', async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ id: 1 }), { status: 201 });
    }) as unknown as typeof fetch;
    const api = githubClient({ token: 't', fetchImpl, apiUrl: 'https://api.test' });
    expect(await api('POST', '/x', { a: 1 })).toEqual({ status: 201, ok: true, data: { id: 1 } });
    expect(seen[0].url).toBe('https://api.test/x');
    expect(seen[0].init.headers).toMatchObject({ authorization: 'Bearer t', 'content-type': 'application/json' });
    expect(seen[0].init.body).toBe('{"a":1}');
  });

  // 204 No Content has no body to parse.
  it('returns null data for 204', async () => {
    const fetchImpl = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    const api = githubClient({ token: 't', fetchImpl });
    expect(await api('PATCH', '/x')).toEqual({ status: 204, ok: true, data: null });
  });
});
