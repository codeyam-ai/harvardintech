---
title: "Pre-existing, not caused by this change: the 'Contact With No Email Set' homepage scenario never applies its seed, so its screenshot still shows the e-mail disc it is meant to hide."
mode: backend
createdAt: "2026-10-22T13:53:28Z"
source: proposed-plan
---

## Summary

The `harvard-in-tech-contact-with-no-email-set` scenario seeds site settings with a blank `contactEmail`, and should show the homepage Contact section with socials only, no E-mail disc, and no mail link in the footer. Its committed screenshot (captured 2026-10-22) still shows the E-mail disc and `INFO@HARVARDINTECH.COM` in the footer. The real site is unaffected. Only the demo of this state is wrong.

## Diagnosis (verified 2026-10-23)

- **The seed writes correctly.** Running `bash .codeyam/seed-singleton-data.sh settings <seed>` by hand exits 0, and `.codeyam/tmp/content-sandbox/data/settings.json` (the file the dev server reads via `CODEYAM_DATA_ROOT`) ends up with `"contactEmail": ""`.
- **The page doesn't pick it up.** With that sandbox file in place, `curl http://localhost:4321/` still returns `mailto:info@harvardintech.com` twice (Contact section and footer).
- **Likely cause: singletons are read once, at module load.** `src/lib/site.ts:255` is `export const settings = readSingleton<SiteSettings>('settings.json')`, a top-level constant evaluated when Vite first loads the module. The seed adapter's refresh endpoint (`codeyamContentRefresh` in `astro.config.mjs`) calls `refreshContent()` and invalidates only the content-layer data-store module (`\0astro:data-layer-content`). Nothing invalidates `site.ts`, so `settings` keeps its boot-time value until the dev server restarts.
- **Why only this scenario shows it:** it's the only scenario that seeds a JSON singleton (it's the only user of `seed-singleton-data.sh`). Every other scenario seeds markdown collections, which `refreshContent()` does reload. The same trap applies to every other `readSingleton` constant: `nav`, `volunteerPage`, `donatePage`, `sponsorPage` (also in `site.ts`), and the readers in `src/lib/givePageContent.ts` and `src/lib/cutoverProgress.ts`.

Not yet proven: that invalidating the module fixes it. Confirm the cause red-first (step 1) before writing the fix.

## Implementation

### 1. Reproduce

Load the scenario (`codeyam-editor editor preview '{"dimension":"Desktop","scenarioSlug":"harvard-in-tech-contact-with-no-email-set"}'`), then confirm `curl -s http://localhost:4321/ | grep -c mailto:` is non-zero while the sandbox `settings.json` holds `"contactEmail": ""`. Restart the dev server once and confirm the count drops to 0. That isolates module caching as the cause.

### 2. Fix the refresh, not the app

**File**: `astro.config.mjs` (`codeyamContentRefresh`)

After `refreshContent()`, also invalidate every SSR module that reads singletons, so the next render re-reads them. The simplest robust option is to invalidate the importers of `src/lib/contentRoot.ts` (walk `server.moduleGraph.getModulesByFile(<abs path to contentRoot.ts>)` → `importers`, transitively), or to call `server.moduleGraph.invalidateAll()` before the `full-reload`. Prefer the targeted walk if it's reliable, since `invalidateAll` slows the first render after every seed. This is dev-only code, and production builds are untouched.

Do NOT turn `settings` into a function call across the app. That's a wide refactor of a production read path to fix a dev-only refresh gap.

### 3. Recapture and verify

- `codeyam-editor editor recapture-stale --target harvard-in-tech-contact-with-no-email-set`. The new frame must show three social discs (LinkedIn, X, Facebook), no E-mail disc, an invitation without "drop us a note", and no mail link in the footer.
- Compare with the isolated component scenario `contactus-no-email-set`, which renders this state without the seed path and should match.
- Load a scenario that does NOT seed settings (e.g. `momentum-fund-public-visitor`) right after, and confirm the homepage email comes back, so the fix doesn't leak seeded settings into the next scenario.

## Scenarios to Demonstrate

- `harvard-in-tech-contact-with-no-email-set`: Contact section and footer with no email (recaptured)
- `contactus-no-email-set`: unchanged reference
