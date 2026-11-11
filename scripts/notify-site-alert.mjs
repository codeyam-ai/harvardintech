/**
 * Open, update or close the "the site has stopped updating itself" issues.
 *
 * Run by the `notify` job of .github/workflows/deploy.yml after every run on
 * `main`. The judgements and every sentence an organizer reads live in
 * src/lib/siteAlert.js; this file only reads the run's results from the
 * environment and talks to GitHub's REST API.
 *
 * Environment (all set by the workflow):
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SERVER_URL, GITHUB_RUN_ID
 *   BUILD_RESULT, DEPLOY_RESULT, PAGES_OUTCOME, LUMA_OUTCOME
 *   SITE_ALERT_MENTIONS  optional: GitHub usernames to mention on a new alert
 *
 * IT NEVER FAILS THE RUN. A broken notifier must not turn a green deploy red,
 * or hide the real failure behind its own. Any error is printed as a warning
 * and the script exits 0.
 */
import { pathToFileURL } from 'node:url';
import {
  PROBLEMS,
  alertRunUrl,
  classifyRun,
  planAlertAction,
  parseMentions,
  alertBody,
  repeatComment,
  recoveredComment,
} from '../src/lib/siteAlert.js';

/**
 * A tiny GitHub REST client over `fetch`.
 * @param {{ token: string, fetchImpl?: typeof fetch, apiUrl?: string }} opts
 */
export function githubClient({ token, fetchImpl = fetch, apiUrl = 'https://api.github.com' }) {
  return async function api(method, path, body) {
    const response = await fetchImpl(`${apiUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, data };
  };
}

/**
 * The run's results, as the workflow passed them in, in the shape
 * `classifyRun` reads.
 * @param {Record<string, string | undefined>} env
 */
export function readRun(env) {
  return {
    buildResult: env.BUILD_RESULT,
    deployResult: env.DEPLOY_RESULT,
    pagesOutcome: env.PAGES_OUTCOME,
    lumaOutcome: env.LUMA_OUTCOME,
  };
}

/**
 * The open alert issue carrying `label`, or undefined when there is none.
 * Throws when GitHub will not answer: acting without knowing would open a
 * duplicate issue, or fail to close the real one.
 * @param {Api} api
 * @param {string} repo
 * @param {string} label
 */
export async function findOpenAlert(api, repo, label) {
  const found = await api(
    'GET',
    `/repos/${repo}/issues?state=open&per_page=1&labels=${encodeURIComponent(label)}`,
  );
  if (!found.ok) throw new Error(`listing issues answered HTTP ${found.status}`);
  return Array.isArray(found.data) ? found.data[0] : undefined;
}

/**
 * Make sure the problem's label exists. Creating a label that already exists
 * answers 422 — the common case — so the answer is deliberately not checked:
 * if the label truly could not be made, opening the issue fails loudly next.
 * @param {Api} api
 * @param {string} repo
 * @param {{ label: string }} problem
 */
export async function ensureLabel(api, repo, problem) {
  await api('POST', `/repos/${repo}/labels`, {
    name: problem.label,
    color: 'd73a4a',
    description: 'Opened and closed automatically by the deploy workflow',
  });
}

/**
 * Open a new alert issue for `problem`.
 * @param {Api} api
 * @param {string} repo
 * @param {(typeof PROBLEMS)[keyof typeof PROBLEMS]} problem
 * @param {{ now: Date, runUrl: string, mentions: string[] }} ctx
 */
export async function openAlert(api, repo, problem, { now, runUrl, mentions }) {
  await ensureLabel(api, repo, problem);
  const created = await api('POST', `/repos/${repo}/issues`, {
    title: problem.title,
    body: alertBody(problem.key, { since: now, runUrl, mentions }),
    labels: [problem.label],
  });
  if (!created.ok) throw new Error(`opening the issue answered HTTP ${created.status}`);
}

/**
 * @param {Api} api
 * @param {string} repo
 * @param {number} number
 * @param {string} body
 */
export async function addComment(api, repo, number, body) {
  await api('POST', `/repos/${repo}/issues/${number}/comments`, { body });
}

/**
 * Leave the "working again" comment, then close the issue.
 * @param {Api} api
 * @param {string} repo
 * @param {number} number
 * @param {string} body
 */
export async function closeAlert(api, repo, number, body) {
  await addComment(api, repo, number, body);
  await api('PATCH', `/repos/${repo}/issues/${number}`, {
    state: 'closed',
    state_reason: 'completed',
  });
}

/** @typedef {ReturnType<typeof githubClient>} Api */

/**
 * Act on one run's results. Returns what was done per problem, for the log and
 * for tests.
 * @param {{ env: Record<string, string | undefined>, api: Api, now?: Date }} opts
 */
export async function notify({ env, api, now = new Date() }) {
  const repo = env.GITHUB_REPOSITORY ?? '';
  const runUrl = alertRunUrl({ serverUrl: env.GITHUB_SERVER_URL, repo, runId: env.GITHUB_RUN_ID ?? '' });
  const verdicts = classifyRun(readRun(env));
  const mentions = parseMentions(env.SITE_ALERT_MENTIONS);

  /** @type {Record<string, string>} */
  const done = {};
  for (const problem of Object.values(PROBLEMS)) {
    const verdict = verdicts[problem.key];
    if (verdict === 'unknown') {
      done[problem.key] = 'none';
      continue;
    }

    const open = await findOpenAlert(api, repo, problem.label);
    const action = planAlertAction(verdict, Boolean(open));
    const since = open?.created_at ?? now;

    if (action === 'open') {
      await openAlert(api, repo, problem, { now, runUrl, mentions });
    } else if (action === 'comment') {
      await addComment(api, repo, open.number, repeatComment(problem.key, { now, since, runUrl }));
    } else if (action === 'close') {
      await closeAlert(api, repo, open.number, recoveredComment(problem.key, { now, since, runUrl }));
    }
    done[problem.key] = action;
  }
  return done;
}

/**
 * The direct-run entry point. IT NEVER THROWS: any error becomes an Actions
 * warning, so the notifier can neither turn a green run red nor bury the real
 * failure under its own.
 * @param {{ env: Record<string, string | undefined>, api: Api, log?: (line: string) => void, now?: Date }} opts
 */
export async function main({ env, api, log = console.log, now }) {
  try {
    const done = await notify({ env, api, now });
    for (const [key, action] of Object.entries(done)) log(`${key}: ${action}`);
  } catch (error) {
    log(`::warning::could not update the site-alert issues: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({ env: process.env, api: githubClient({ token: process.env.GITHUB_TOKEN ?? '' }) });
}
