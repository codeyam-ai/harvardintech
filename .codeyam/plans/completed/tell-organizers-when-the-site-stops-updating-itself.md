---
title: "Tell organizers when the site stops updating itself"
mode: backend
createdAt: "2026-11-09T22:28:21Z"
source: proposed-plan
---

## Who benefits
Volunteer organizers and editors who are not developers. They rely on the site updating on its own (CMS saves deploy, the nightly Luma import adds events) and do not read GitHub Actions logs.

## Evidence
- obs-1797287eaa3b (2026-11-06): one ordinary CMS save silently stopped every deploy until a developer changed code.
- obs-f05b342faa7c (2026-11-09): an organizer noticed missing London events only by checking the site against Luma by hand, because the import had been importing nothing for two weeks.

## Smallest useful version
When the deploy workflow fails, or the Luma import ends with a refused feed, send one notification (an email or a GitHub issue opened by the workflow) to a configured organizer address. It should say in plain words what stopped and since when.

## Case against
GitHub already emails the person whose push triggered a failed workflow. The two root causes seen so far have each been fixed in code. A notification channel needs an owner to watch it, and for a small volunteer site it may be noise between incidents. Making the import fail loudly (see the app theme) might cover most of the need for free.
## Decisions (Plan step, 2026-11-10)
- Channel: a **GitHub issue** opened by the deploy workflow itself (user's choice). No mail account or new secret.
- Repeats: **one open issue per problem**. A repeat adds a short comment; the first successful run closes it with a "working again" comment. (Agent's call, easy to change.)

## Implementation
Two problems, each with its own issue, found by a fixed label:
- `site-alert: publishing stopped` — the build job (tests, build, upload) or the Pages deploy step failed, so CMS saves and imports are not reaching the site.
- `site-alert: event import refused` — `scripts/import-luma.mjs` exited 1 because Luma answered with an HTTP error, so no new events are coming in.

Files:
1. `src/lib/siteAlert.js` (new, pure, importable by the workflow script and by vitest):
   - `classifyRun({ buildResult, deployOutcome, lumaOutcome })` → per-problem verdict `failing | ok | unknown`. A cancelled run (concurrency cancel-in-progress) is `unknown` for everything — never alerts, never closes. Luma is `unknown` when its step did not run (e.g. tests failed first), so a publishing failure does not falsely close the import issue.
   - `planAlertAction({ verdict, openIssue })` → `open | comment | close | none`.
   - `alertTitle` / `alertBody` / `repeatComment` / `recoveredComment` — plain words for a non-developer: what stopped, what still works (e.g. "the site is still up with the events already on it"), since when (first failed run's date, from the open issue's creation date on repeats), a link to the run, and who to ask. Optional @mentions from a repo variable so named organizers are notified directly.
2. `scripts/notify-site-alert.mjs` (new): reads run results from env, calls GitHub's REST API with `fetch` + `GITHUB_TOKEN` (list open issues by label, create label if missing, open/comment/close). Never fails the run itself — a broken notifier must not turn a green deploy red.
3. `.github/workflows/deploy.yml`: deploy job exposes the Pages deploy step's outcome; new `notify` job, `needs: [build, deploy]`, `if: always() && github.ref_name == 'main'`, `permissions: issues: write`, runs the script.
4. `DEPLOY_SETUP.md`: short "When the site stops updating itself" section — who gets told (people watching the repo, plus anyone in the `SITE_ALERT_MENTIONS` repo variable), what the issue means, that it closes itself. Notes the one gap left: if GitHub disables the nightly schedule after 60 days idle, no run happens, so nothing can alert.

## Tests
`src/lib/siteAlert.test.ts`: classification of every result combination (incl. cancelled and skipped Luma), the open/comment/close/none table, and that the copy names what stopped, the start date and the run link. The API script is exercised against a stubbed `fetch`.
