import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// The docs the team actually sends and follows. When the repo moved from
// `nseldeib` to `codeyam-ai`, every preview link in them went dead at once,
// and nothing noticed until a reviewer clicked one. The old passphrase was
// written in several of them too, which is what made it everyone's.
const REPO_ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

const scopingDocs = fs
  .readdirSync(path.join(REPO_ROOT, 'docs/scoping'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => `docs/scoping/${f}`);

const DOCS = [
  'docs/nicole-review.md',
  'DEPLOY_SETUP.md',
  'CMS_SETUP.md',
  'README.md',
  'src/data/cms.json',
  ...scopingDocs,
];

// The staging site's hosting repo did not move, so its address stays valid.
const DEAD_PREVIEW_LINK = /nseldeib\.github\.io\/harvardintech(?!-staging)/;
// The two pages that used to self-gate were retired to `docs/archive/` on
// 2026-10-01 and are no longer served on any track. They stay in this list for
// the retired-passphrase check below ONLY: the point of that check is that the
// old passphrase is in git history and must not be written down again anywhere
// in the repo, which an archived file is still part of. The placeholder check
// went with them — an archived file is not built, so nothing fills it in.
const ARCHIVED_GATED_PAGES = [
  'docs/archive/project-status-2026-09-16.html',
  'docs/archive/supporter-recognition-review-2026-09-14.html',
];

describe('team docs', () => {
  // A link to the pre-move preview host 404s for whoever clicks it; the staging
  // host is allowed because its hosting repo did not move.
  it.each(DOCS)('%s has no link to the dead pre-move preview', (rel) => {
    expect(read(rel)).not.toMatch(DEAD_PREVIEW_LINK);
  });

  // The retired passphrase is in git history, so it must never be written down
  // again — not in a doc, and not in a page that ships to the preview.
  it.each([...DOCS, ...ARCHIVED_GATED_PAGES])('%s does not contain the retired passphrase', (rel) => {
    expect(read(rel)).not.toContain('crimson2026');
  });

  // The content editor commits to the repo named here; the old owner 404s.
  it('points the content editor at the codeyam-ai repo', () => {
    expect(JSON.parse(read('src/data/cms.json')).repo.owner).toBe('codeyam-ai');
  });
});

describe('retired internal pages', () => {
  // `public/` holds only assets now. A document that reappears there is served
  // on every track with no gate in front of it, because the site's passphrase is
  // an Astro component and never runs for a file Astro copies verbatim — which
  // is exactly how the board's design gallery sat open at a guessable moment.
  it('keeps documents out of public/', () => {
    const offenders = fs
      .readdirSync(path.join(REPO_ROOT, 'public'), { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && /\.(html?|md)$/i.test(e.name))
      .map((e) => e.name);
    expect(offenders).toEqual([]);
  });
});
