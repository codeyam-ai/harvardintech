import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PASSPHRASE_PLACEHOLDER } from './previewGate';

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
const SELF_GATED_PAGES = ['public/review/index.html', 'public/donor-network.html'];

describe('team docs', () => {
  // A link to the pre-move preview host 404s for whoever clicks it; the staging
  // host is allowed because its hosting repo did not move.
  it.each(DOCS)('%s has no link to the dead pre-move preview', (rel) => {
    expect(read(rel)).not.toMatch(DEAD_PREVIEW_LINK);
  });

  // The retired passphrase is in git history, so it must never be written down
  // again — not in a doc, and not in a page that ships to the preview.
  it.each([...DOCS, ...SELF_GATED_PAGES])('%s does not contain the retired passphrase', (rel) => {
    expect(read(rel)).not.toContain('crimson2026');
  });

  // The content editor commits to the repo named here; the old owner 404s.
  it('points the content editor at the codeyam-ai repo', () => {
    expect(JSON.parse(read('src/data/cms.json')).repo.owner).toBe('codeyam-ai');
  });
});

describe('self-gated public pages', () => {
  // The build fills the secret into this exact placeholder; a page carrying
  // anything else would ship a gate the build never fills in.
  // Checked per page so a regression names the file that lost its placeholder.
  it.each(SELF_GATED_PAGES)('%s carries the passphrase placeholder the build fills in', (rel) => {
    expect(read(rel)).toContain(`var PASSPHRASE = '${PASSPHRASE_PLACEHOLDER}'`);
  });
});
