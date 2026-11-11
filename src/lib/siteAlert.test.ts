import { describe, it, expect } from 'vitest';
import {
  PROBLEMS,
  alertRunUrl,
  classifyRun,
  planAlertAction,
  formatWhen,
  parseMentions,
  alertBody,
  repeatComment,
  recoveredComment,
} from './siteAlert.js';

const RUN = 'https://github.com/o/r/actions/runs/42';
const SINCE = '2026-11-06T14:03:00Z';
const NOW = '2026-11-10T07:10:00Z';

describe('classifyRun', () => {
  // A run cancelled by a newer push says nothing about either problem, so it
  // must neither open nor close an issue.
  it('treats a cancelled build as unknown for both problems', () => {
    expect(
      classifyRun({ buildResult: 'cancelled', deployResult: 'skipped', pagesOutcome: '', lumaOutcome: 'success' }),
    ).toEqual({ publishing: 'unknown', lumaImport: 'unknown' });
  });

  // Same for a deploy cancelled mid-flight, even when the build looked fine.
  it('treats a cancelled deploy as unknown for both problems', () => {
    expect(
      classifyRun({ buildResult: 'success', deployResult: 'cancelled', pagesOutcome: '', lumaOutcome: 'failure' }),
    ).toEqual({ publishing: 'unknown', lumaImport: 'unknown' });
  });

  // A broken build means nothing published — the 2026-11-06 outage.
  it('marks publishing failing when the build fails', () => {
    expect(classifyRun({ buildResult: 'failure', deployResult: 'skipped', pagesOutcome: '', lumaOutcome: '' }))
      .toEqual({ publishing: 'failing', lumaImport: 'unknown' });
  });

  // The build can pass and the Pages upload still fail.
  it('marks publishing failing when the Pages step fails after a good build', () => {
    expect(
      classifyRun({ buildResult: 'success', deployResult: 'failure', pagesOutcome: 'failure', lumaOutcome: 'success' }),
    ).toEqual({ publishing: 'failing', lumaImport: 'ok' });
  });

  // The deploy job also fails when only Luma refused — after publishing. That
  // must report the import, NOT claim the site stopped publishing.
  it('does not blame publishing when only the Luma import failed the deploy job', () => {
    expect(
      classifyRun({ buildResult: 'success', deployResult: 'failure', pagesOutcome: 'success', lumaOutcome: 'failure' }),
    ).toEqual({ publishing: 'ok', lumaImport: 'failing' });
  });

  // A clean run is what closes open alerts.
  it('marks both ok on a clean run', () => {
    expect(
      classifyRun({ buildResult: 'success', deployResult: 'success', pagesOutcome: 'success', lumaOutcome: 'success' }),
    ).toEqual({ publishing: 'ok', lumaImport: 'ok' });
  });

  // An import step that never ran (empty or skipped) must not close the
  // import issue.
  it('leaves the import unknown when the Luma step never ran or was skipped', () => {
    expect(classifyRun({ buildResult: 'success', pagesOutcome: 'success', lumaOutcome: '' }).lumaImport).toBe('unknown');
    expect(classifyRun({ buildResult: 'success', pagesOutcome: 'success', lumaOutcome: 'skipped' }).lumaImport).toBe(
      'unknown',
    );
  });

  // Missing inputs entirely — e.g. a malformed workflow — are unknown, not ok.
  it('treats missing inputs as unknown', () => {
    expect(classifyRun({})).toEqual({ publishing: 'unknown', lumaImport: 'unknown' });
  });
});

describe('planAlertAction', () => {
  // The whole state table: one issue per problem, repeats comment, recovery closes.
  it.each([
    ['failing', false, 'open'],
    ['failing', true, 'comment'],
    ['ok', true, 'close'],
    ['ok', false, 'none'],
    ['unknown', true, 'none'],
    ['unknown', false, 'none'],
  ] as const)('verdict %s with open issue %s plans %s', (verdict, hasOpen, expected) => {
    expect(planAlertAction(verdict, hasOpen)).toBe(expected);
  });
});

describe('alertRunUrl', () => {
  // The link organizers forward to whoever fixes the code.
  it('builds the run link from the server, repo and run id', () => {
    expect(alertRunUrl({ serverUrl: 'https://ghe.example', repo: 'o/r', runId: 7 })).toBe(
      'https://ghe.example/o/r/actions/runs/7',
    );
  });

  // GITHUB_SERVER_URL is optional; github.com is the default.
  it('defaults to github.com when no server is given', () => {
    expect(alertRunUrl({ serverUrl: undefined, repo: 'o/r', runId: '42' })).toBe(RUN);
  });
});

describe('formatWhen', () => {
  // UTC so every organizer reads the same line regardless of where the runner is.
  it('writes a moment in plain words in UTC', () => {
    expect(formatWhen(NOW)).toBe('Tuesday 10 November 2026, 07:10 UTC');
  });

  // Dates and strings must give the same answer; minutes and hours are padded.
  it('accepts a Date and pads hours and minutes', () => {
    expect(formatWhen(new Date('2026-01-04T03:05:00Z'))).toBe('Sunday 4 January 2026, 03:05 UTC');
  });

  // A time just before midnight UTC must not slip to the next local day.
  it('does not shift the day near midnight UTC', () => {
    expect(formatWhen('2026-11-10T23:59:00Z')).toBe('Tuesday 10 November 2026, 23:59 UTC');
  });
});

describe('parseMentions', () => {
  // The variable is optional; unset means nobody is mentioned.
  it('returns nothing for an unset or empty variable', () => {
    expect(parseMentions(undefined)).toEqual([]);
    expect(parseMentions('')).toEqual([]);
    expect(parseMentions('  ,  ')).toEqual([]);
  });

  // Organizers will type it any of these ways.
  it('accepts commas or spaces and an optional leading @', () => {
    expect(parseMentions('@alice, bob  carol-d')).toEqual(['alice', 'bob', 'carol-d']);
  });

  // Naming someone twice must not mention them twice.
  it('drops duplicates', () => {
    expect(parseMentions('alice @alice')).toEqual(['alice']);
  });

  // Anything that is not a GitHub username is dropped, never mentioned.
  it('drops names that are not valid GitHub usernames', () => {
    expect(parseMentions('-bad ok bad_name a'.concat('x'.repeat(39)) + ' team/x')).toEqual(['ok']);
  });
});

describe('alertBody', () => {
  // The issue an organizer reads must say what broke, since when, what still
  // works, and where the evidence is.
  it('says what stopped, since when, what still works and links the run', () => {
    const body = alertBody('publishing', { since: SINCE, runUrl: RUN });
    expect(body).toContain(PROBLEMS.publishing.what);
    expect(body).toContain('**Since:** Friday 6 November 2026, 14:03 UTC');
    expect(body).toContain(PROBLEMS.publishing.stillWorks);
    expect(body).toContain(PROBLEMS.publishing.meanwhile);
    expect(body).toContain(`(${RUN})`);
    expect(body).not.toContain('Notifying');
  });

  // Mentions are how named people get emailed directly.
  it('mentions the configured people', () => {
    expect(alertBody('lumaImport', { since: SINCE, runUrl: RUN, mentions: ['alice', 'bob'] })).toContain(
      'Notifying: @alice @bob',
    );
  });
});

describe('repeatComment', () => {
  // A repeat says it is still happening and keeps the original start date.
  it('says it is still happening and when it started', () => {
    const c = repeatComment('lumaImport', { now: NOW, since: SINCE, runUrl: RUN });
    expect(c).toContain('Still happening as of Tuesday 10 November 2026, 07:10 UTC');
    expect(c).toContain(`(${RUN})`);
    expect(c).toContain(`${PROBLEMS.lumaImport.title} — first noticed Friday 6 November 2026, 14:03 UTC`);
  });
});

describe('recoveredComment', () => {
  // Each problem gets its own "working again" sentence, from PROBLEMS.
  it.each(['publishing', 'lumaImport'] as const)('uses the %s recovery sentence', (key) => {
    const c = recoveredComment(key, { now: NOW, since: SINCE, runUrl: RUN });
    expect(c).toContain('**Working again** as of Tuesday 10 November 2026, 07:10 UTC');
    expect(c).toContain(PROBLEMS[key].backAgain);
    expect(c).toContain('stopped since Friday 6 November 2026, 14:03 UTC');
  });

  // The two sentences must differ — the import one must not claim publishing recovered.
  it('keeps the two recovery sentences distinct', () => {
    expect(PROBLEMS.publishing.backAgain).toMatch(/publishing again/);
    expect(PROBLEMS.lumaImport.backAgain).toMatch(/imported again/);
  });
});
