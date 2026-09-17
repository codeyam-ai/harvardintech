// The site's own version of `@codeyam/cms`'s `previewFields`, widened to accept
// what the CMS actually writes.
//
// THE BUG THIS EXISTS FOR. When an editor mints a preview link, the CMS clones
// the entry to `preview-<token>.md` and writes the timestamp UNQUOTED:
//
//     previewCreatedAt: 2026-08-20T17:24:30.165Z
//
// YAML reads that as a date, not a string. Upstream declares
// `previewCreatedAt: z.string().optional()`, so the entry fails validation and
// the whole build stops with:
//
//     InvalidContentEntryDataError: projects → preview-… →
//       previewCreatedAt: Expected type "string", received "date"
//
// The serializer's `needsQuoting` does not quote ISO timestamps. That is still
// true in 0.14.0, which this site runs, and the local 0.14.0 patch does not
// touch it. So the first preview link minted on a branch breaks that branch's
// build — every `staging` deploy since 2026-08-20 failed exactly this way, and
// `main` only escaped because it happened to hold no preview files.
//
// That last part is why this matters NOW rather than eventually: the editor is
// moving to commit on `main`. Without this, the first draft anyone previews
// takes the live site's build down with it.
//
// WHEN TO DELETE THIS. The moment `@codeyam/cms` quotes the timestamp (its
// `needsQuoting` learns about ISO dates, or `previewCreatedAt` is declared as a
// coercible date upstream), this shim stops earning its place: drop the file and
// put `...previewFields` back in `src/content/config.ts`. The accompanying test
// pins the behaviour either way, so a regression is visible rather than silent.
// `astro/zod` rather than `astro:content`: it is the same Zod instance Astro
// re-exports, but it is a real module path, so this file — and the schema rule
// below — can be unit-tested without booting the content layer. Importing the
// virtual `astro:content` here would make the shim testable only through a full
// build, which is precisely how the bug it guards reached production unnoticed.
import { z } from 'astro/zod';
import { previewFields } from '@codeyam/cms/content';

/**
 * `previewFields` with `previewCreatedAt` widened to accept a string OR a Date,
 * normalising both to an ISO string.
 *
 * Normalising rather than merely accepting is the point: everything downstream
 * (`isPreview`, the preview index, the staleness copy) was written against a
 * string, so a Date reaching them would move the failure from the build to the
 * page. The value that leaves this schema is always the same shape the CMS
 * intended to write.
 *
 * Deliberately NOT `z.coerce.date()`: that would flip the stored type to Date
 * and push the same mismatch onto every reader. The string is the contract.
 */
export const sitePreviewFields = {
  ...previewFields,
  previewCreatedAt: z
    .union([z.string(), z.date()])
    .transform((value) => (value instanceof Date ? value.toISOString() : value))
    .optional(),
};
