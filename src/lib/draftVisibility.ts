// Draft visibility config for the two-track publishing model. Decides whether a
// given build renders entries flagged `draft: true`.
//
// Two builds come from this one branch, and the difference between them is
// entirely environmental:
//   - Public build (`main` → harvardintech.com): a production build with
//     INCLUDE_DRAFTS unset → drafts hidden, exactly as before.
//   - Review build (`main` → review.harvardintech.com, published to the kept
//     second repository): also a production build, but with INCLUDE_DRAFTS=1 →
//     drafts visible, so the Harvard Alumni in Tech team can read in-flight work
//     before it is published. A draft is now the ONLY way to hold content back —
//     there is no second branch to stage it on.
//   - `astro dev` (codeyam preview + every scenario capture): not a production
//     build → drafts visible, so an author previewing their work sees it.
//
// This replaces the bare `!import.meta.env.PROD` that every `publishedEntries`
// call site used to inline. That inference cannot express the review track,
// which IS a production build that must show drafts.
//
// The rule lives in a pure helper so both halves are unit-testable without
// faking the environment — the same rationale `drafts.ts` gives for
// `includeDrafts` being a parameter rather than an ambient read. Server-only:
// read from `.astro` frontmatter, never a client island.
import { envFlagEnabled } from './envFlag';

/**
 * The draft-visibility rule. Drafts are shown when this is not a production
 * build (authoring in `astro dev`), or when the build explicitly opts in via
 * `INCLUDE_DRAFTS=1` (the review track). Every other value of the env var leaves
 * the production default of hiding drafts — see `envFlagEnabled` for why that
 * rule is strict.
 */
export function resolveIncludeDrafts(isProdBuild: boolean, includeDraftsEnv?: string): boolean {
  if (envFlagEnabled(includeDraftsEnv)) return true;
  return !isProdBuild;
}

/** Resolved for this build. Pass to `publishedEntries` at every call site. */
export const INCLUDE_DRAFTS = resolveIncludeDrafts(
  import.meta.env.PROD,
  process.env.INCLUDE_DRAFTS,
);
