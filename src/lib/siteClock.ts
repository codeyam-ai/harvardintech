// The one "now" the site renders against.
//
// Which events are upcoming and which are past is decided server-side when a
// page renders (build time on the static site, every request in dev). A
// scenario's `clock` only freezes `Date` in the capture browser, so on its own it
// cannot reach that decision — the server kept reading the real clock and every
// events screenshot drifted from one day to the next with no code change.
//
// A scenario pins the server's date with a one-row seed table,
// `"siteClock": [{ "slug": "now", "now": "<ISO date>" }]`, which the seed
// adapter writes as `siteClock/now.md` (frontmatter `now: "<ISO date>"`) under
// the sandbox content root. The committed `src/content` never carries that
// folder, so a production build falls through to the real clock.
//
// Read on every call, never cached: the dev server stays up across scenario
// switches, and a cached value would pin the previous scenario's date.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { contentRoot } from './contentRoot';

/** Where a scenario's pinned date lands, relative to the content root. */
export const SITE_CLOCK_FILE = path.join('siteClock', 'now.md');

/**
 * The pinned date in a `siteClock/now.md` file's text, or `undefined` when its
 * frontmatter has no `now:` line or that line is not a date.
 */
export function pinnedNow(text: string): Date | undefined {
  const match = /^now:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(text);
  if (!match) return undefined;
  const date = new Date(match[1]);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

/**
 * The date pages should treat as "now": the scenario-pinned one when the active
 * content root carries a usable `siteClock/now.md`, otherwise the real time.
 */
export function siteNow(
  read: () => string = () =>
    fs.readFileSync(path.resolve(contentRoot(), SITE_CLOCK_FILE), 'utf-8'),
): Date {
  let text: string;
  try {
    text = read();
  } catch {
    return new Date();
  }
  return pinnedNow(text) ?? new Date();
}
