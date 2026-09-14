// Preview gate config. Locks a deployed build behind a passphrase + noindex so
// it can be shared privately. See PreviewGate.astro.
//
// This is the REVIEW TRACK's standing gate, not a temporary pre-launch measure.
// Under the two-track publishing model the review site
// (review.harvardintech.com, built from `staging`) stays gated and unindexed
// permanently, while the public site (harvardintech.com, built from `main`) is
// open and indexable. Both tracks build from this one repo, so the gate must be
// set per build:
//   - `astro dev` (codeyam preview + every scenario capture): unset → gate OFF,
//     so screenshots are never overlaid by the passphrase prompt.
//   - Review-track deploy: PREVIEW_GATE=1 → gate ON.
//   - Public-track deploy: unset → gate OFF.
//
// It reads an explicit PREVIEW_GATE var rather than keying off DEPLOY_BASE_PATH
// (the deploy's base-path var) as it once did. That coupling made the two tracks
// mutually exclusive — the site was *either* a gated project-site preview *or* a
// public custom-domain launch — and it also flipped the gate off as a side
// effect of the domain cutover, which is not a decision the base path should be
// making. See .github/workflows/deploy.yml, which sets this per track.
//
// Server-only module — read from `.astro` frontmatter, never a client island.
import { isPreviewUrl } from '@codeyam/cms/lib/previewPages';
import { envFlagEnabled } from './envFlag';

/** True on the gated review-track deploy; false in dev and on the public site. */
export const PREVIEW_GATE_ENABLED = envFlagEnabled(process.env.PREVIEW_GATE);

/**
 * Shared passphrase for the preview gate. A DETERRENT, not real security — it
 * ships in the client bundle of every gated page.
 *
 * It comes ONLY from the `PREVIEW_GATE_PASSPHRASE` secret (GitHub → Settings →
 * Secrets and variables → Actions). There is deliberately no default: the old
 * default sat in plain text in this repo, its docs and its git history, which
 * made it everyone's passphrase. A gated build with the secret unset fails
 * (`assertPassphraseConfigured`) rather than shipping an empty or known one.
 */
export const PREVIEW_GATE_PASSPHRASE = process.env.PREVIEW_GATE_PASSPHRASE ?? '';

/**
 * Stand-in for the passphrase inside the raw `public/` pages that carry their
 * own gate (the status page and the donor deck). The build replaces it in
 * `dist/` with the secret (`substitutePassphrase`). Under `astro dev` the files
 * are served as-is, so there the placeholder itself is the passphrase — which is
 * why scenarios that unlock those pages type it literally.
 */
export const PASSPHRASE_PLACEHOLDER = '__PREVIEW_GATE_PASSPHRASE__';

/** Throw when the gate is on but no passphrase was provided to the build. */
export function assertPassphraseConfigured(
  enabled: boolean = PREVIEW_GATE_ENABLED,
  pass: string = PREVIEW_GATE_PASSPHRASE,
): void {
  if (enabled && pass.trim() === '') {
    throw new Error(
      'PREVIEW_GATE is on but PREVIEW_GATE_PASSPHRASE is empty. Add the ' +
        'PREVIEW_GATE_PASSPHRASE secret in the GitHub repo settings (see ' +
        'DEPLOY_SETUP.md). A gated build with no passphrase would ship a gate ' +
        'anyone can open.',
    );
  }
}

/**
 * Replace every `PASSPHRASE_PLACEHOLDER` in `source` with `pass`, escaped for a
 * single- or double-quoted JavaScript string literal (the placeholder sits
 * inside `var PASSPHRASE = '…'` in both pages).
 */
export function substitutePassphrase(source: string, pass: string): string {
  const escaped = pass
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, '\\x3c')
    .replace(/\r?\n/g, '\\n');
  return source.split(PASSPHRASE_PLACEHOLDER).join(escaped);
}

/**
 * Whether the passphrase gate applies to a given page.
 *
 * Everything is gated on the review track EXCEPT the CMS preview surface — a
 * preview page (`/blog/preview-<token>`) and the shareable preview index
 * (`/previews/<token>`). Those exist to be handed to one outside reviewer who
 * has no account and no reason to hold the site passphrase; gating them would
 * mean sending the link and the passphrase together, which hands that reviewer
 * the whole unreleased site to get at the one page they were asked to read.
 *
 * The URL is the access mechanism instead — 128 bits of token, unguessable, not
 * linked and not indexed. That is the same trade this project already made for
 * `public/design-review-4ece6c14/`, and it is a genuine trade rather than a free
 * win: anyone who is FORWARDED the link can read the page. Content that must
 * stay unreadable takes a password-protected preview, where the bytes are
 * encrypted at rest rather than merely unlinked.
 *
 * `noindex` is unaffected. It used to ride along with the gate, so exempting a
 * page here would once have made it indexable — `SEO.astro` now emits it from
 * the entry's own preview marker, on whichever track the page is built.
 *
 * Pure, and separate from the `.astro` component, so both branches are testable
 * without rendering — the same reason `publishTrack.ts` exists.
 */
export function gateAppliesTo(pathname: string): boolean {
  return !isPreviewUrl(pathname);
}
