/**
 * Pure rules for telling organizers, in plain words, that the site has stopped
 * updating itself — and for telling them when it has started again.
 *
 * The site updates on its own in two ways: a save in /admin commits to `main`
 * and the deploy workflow publishes it, and the nightly run imports new events
 * from Luma. The people who rely on that are volunteer organizers who never
 * open the Actions tab. Twice that mattered: on 2026-11-06 one ordinary CMS save
 * stopped every deploy until a developer changed code, and from 2026-10-23 Luma
 * refused every import request for two weeks while the run stayed green, found
 * only when an organizer compared the site with Luma by hand.
 *
 * So the deploy workflow's `notify` job runs `scripts/notify-site-alert.mjs`
 * after every run on `main`, and that script asks this module what to do: open
 * a GitHub issue (one per problem, found again by its label), add a "still
 * stopped" comment to the one already open, or close it with a "working again"
 * comment. Everyone watching the repository is emailed by GitHub; anyone named
 * in the `SITE_ALERT_MENTIONS` repository variable is mentioned directly.
 *
 * Nothing here touches the network — the script does that — so every judgement
 * and every sentence an organizer reads is testable. Plain JavaScript for the
 * same reason as `lumaFeed.js`: a bare-`node` `.mjs` script imports it.
 */

/** Where the site the team looks at lives today (pre-launch, gated). */
export const SITE_URL = 'https://codeyam-ai.github.io/harvardintech/';

/**
 * The two ways the site can stop updating itself. `label` is how the script
 * finds an open issue again, so changing one strands its open issue.
 */
export const PROBLEMS = {
  publishing: {
    key: /** @type {const} */ ('publishing'),
    label: 'site-alert: publishing stopped',
    title: 'The site has stopped publishing changes',
    what:
      'Changes saved in the content editor (/admin), and events imported from Luma, are not reaching the site.',
    stillWorks:
      'The site is still up. It shows the last version that published successfully, so nothing has disappeared — it just is not changing.',
    meanwhile:
      'Saves made in the content editor are kept and will appear on their own once publishing works again. There is no need to make them twice.',
    backAgain: 'The site is publishing again. Anything saved while it was stopped is now live.',
  },
  lumaImport: {
    key: /** @type {const} */ ('lumaImport'),
    label: 'site-alert: event import refused',
    title: 'New events from Luma are not reaching the site',
    what:
      'Luma refused to send the event calendar, so no new events were imported. An event created on Luma will not appear on the site by itself.',
    stillWorks:
      'Everything else is fine: the site still publishes, with the events it already had, and saves in the content editor still go out.',
    meanwhile:
      'If an event must be on the site before this is fixed, add it by hand in the content editor. The import never overwrites an event that is already there.',
    backAgain:
      'Events from Luma are being imported again. Any event created on Luma while it was stopped is now on the site.',
  },
};

/**
 * The link to one run of the workflow, for the "open the run that failed" line.
 * @param {{ serverUrl?: string, repo: string, runId: string | number }} run
 */
export function alertRunUrl({ serverUrl = 'https://github.com', repo, runId }) {
  return `${serverUrl}/${repo}/actions/runs/${runId}`;
}

/**
 * @typedef {'failing' | 'ok' | 'unknown'} Verdict
 * @typedef {{ publishing: Verdict, lumaImport: Verdict }} RunVerdicts
 */

/**
 * What one run of the deploy workflow says about each problem.
 *
 * `unknown` means the run cannot tell, and leads to no action either way: a run
 * cancelled by a newer push says nothing, and an import that never ran (because
 * the tests failed first) must not close the import issue.
 *
 * @param {{
 *   buildResult?: string,   // needs.build.result: success | failure | cancelled | skipped
 *   deployResult?: string,  // needs.deploy.result
 *   pagesOutcome?: string,  // the Pages deploy step's outcome, '' when it never ran
 *   lumaOutcome?: string,   // the Luma import step's outcome, '' when it never ran
 * }} run
 * @returns {RunVerdicts}
 */
export function classifyRun({ buildResult, deployResult, pagesOutcome, lumaOutcome }) {
  if (buildResult === 'cancelled' || deployResult === 'cancelled') {
    return { publishing: 'unknown', lumaImport: 'unknown' };
  }

  /** @type {Verdict} */
  let publishing = 'unknown';
  if (buildResult === 'failure' || pagesOutcome === 'failure') publishing = 'failing';
  else if (buildResult === 'success' && pagesOutcome === 'success') publishing = 'ok';

  /** @type {Verdict} */
  let lumaImport = 'unknown';
  if (lumaOutcome === 'failure') lumaImport = 'failing';
  else if (lumaOutcome === 'success') lumaImport = 'ok';

  return { publishing, lumaImport };
}

/**
 * @param {Verdict} verdict
 * @param {boolean} hasOpenIssue
 * @returns {'open' | 'comment' | 'close' | 'none'}
 */
export function planAlertAction(verdict, hasOpenIssue) {
  if (verdict === 'failing') return hasOpenIssue ? 'comment' : 'open';
  if (verdict === 'ok' && hasOpenIssue) return 'close';
  return 'none';
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * A moment as an organizer would write it, always in UTC so New York and
 * London read the same line: `Tuesday 10 November 2026, 07:10 UTC`.
 * @param {Date | string} when
 */
export function formatWhen(when) {
  const d = when instanceof Date ? when : new Date(when);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

/**
 * GitHub usernames from the `SITE_ALERT_MENTIONS` variable — commas or spaces
 * between them, a leading `@` optional. Anything that is not a valid username
 * is dropped rather than mentioned.
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function parseMentions(raw) {
  if (!raw) return [];
  const names = raw
    .split(/[\s,]+/)
    .map((name) => name.replace(/^@/, ''))
    .filter((name) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(name));
  return [...new Set(names)];
}

/**
 * The body of a newly opened alert issue.
 * @param {keyof typeof PROBLEMS} key
 * @param {{ since: Date | string, runUrl: string, mentions?: string[] }} ctx
 */
export function alertBody(key, { since, runUrl, mentions = [] }) {
  const p = PROBLEMS[key];
  const lines = [
    `**${p.what}**`,
    '',
    `**Since:** ${formatWhen(since)}`,
    '',
    `**What still works:** ${p.stillWorks}`,
    '',
    `**In the meantime:** ${p.meanwhile}`,
    '',
    `**What to do:** ask whoever looks after the site's code to open [the run that failed](${runUrl}). It names the step that stopped.`,
    '',
    'This issue was opened automatically. It gets a short note each time the problem happens again, and closes itself the next time things work.',
  ];
  if (mentions.length > 0) {
    lines.push('', `Notifying: ${mentions.map((name) => `@${name}`).join(' ')}`);
  }
  return lines.join('\n');
}

/**
 * The comment added to an alert that is already open.
 * @param {keyof typeof PROBLEMS} key
 * @param {{ now: Date | string, since: Date | string, runUrl: string }} ctx
 */
export function repeatComment(key, { now, since, runUrl }) {
  return [
    `Still happening as of ${formatWhen(now)} ([this run](${runUrl})).`,
    '',
    `${PROBLEMS[key].title} — first noticed ${formatWhen(since)}.`,
  ].join('\n');
}

/**
 * The comment that closes an alert.
 * @param {keyof typeof PROBLEMS} key
 * @param {{ now: Date | string, since: Date | string, runUrl: string }} ctx
 */
export function recoveredComment(key, { now, since, runUrl }) {
  return [
    `**Working again** as of ${formatWhen(now)} ([this run](${runUrl})).`,
    '',
    PROBLEMS[key].backAgain,
    '',
    `It had been stopped since ${formatWhen(since)}. Closing this issue.`,
  ].join('\n');
}
