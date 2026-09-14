# GitHub Pages Deploy Setup

The build agent will ask which setup applies to your project.

## Today: two gated sites, neither public

Until the Strikingly migration `harvardintech.com` is still Strikingly's and is
untouched. Both sites below are private:

| Branch | Origin | Role | Gate | Drafts | `/admin` | Sitemap |
| --- | --- | --- | --- | --- | --- | --- |
| `main` | codeyam-ai.github.io/harvardintech | **reviewed** | passphrase + `noindex` | **visible** | **served** | none |
| `staging` | nseldeib.github.io/harvardintech-staging | **working** | passphrase + `noindex` | **visible** | **served** | none |

They differ only in **cadence**, not configuration. `staging` takes every commit;
`main` moves only when someone promotes. That is the whole point — the link the
team reviews holds still, so nobody opens it mid-change and finds half-finished
work.

Both builds set `PREVIEW_GATE=1` and `INCLUDE_DRAFTS=1`. **Dropping
`PREVIEW_GATE` is the switch that takes a site public** — do not do it before the
cutover.

The staging site is hosted on the staging repo's own Pages URL rather than
`review.harvardintech.com` on purpose: a custom domain would mean adding a DNS
record to `harvardintech.com`, and that domain stays untouched until the
migration is approved. See "At the cutover" below for the three-line diff.

**Content edits land on `staging` too.** The CMS commits to the branch named in
`src/data/cms.json`, which is `staging`, so an edit from either site's `/admin`
goes through the same promote as a code change. This is what keeps the cutover
safe: `main` becomes the public site, and nothing reaches it except a promote.

The CMS is deliberately not behind the passphrase; it has its own GitHub-token
sign-in and is `noindex, nofollow`. See [docs/nicole-review.md](docs/nicole-review.md).

## Launch day checklist

What it takes to make `main` the public harvardintech.com, in order. None of it
has been done; harvardintech.com stays on Strikingly until the owner says go. The
cutover runbook (`/cutover-runbook/` on the preview) is the step-by-step version.

1. In `.github/workflows/deploy.yml`, `build` job: set `PAGES_SITE` to
   `https://harvardintech.com`. `CANONICAL_ORIGIN` then matches it and can be
   deleted.
2. In the same job, drop `DEPLOY_BASE_PATH`, so the base is `/`.
3. Remove `PREVIEW_GATE` and `INCLUDE_DRAFTS` from the public build — **only in
   the same change that stands up the private editor site (item 5)**, never on
   its own, or nothing is left protected. In that same change, flip the
   `gates both tracks while neither is meant to be public` case in
   `src/lib/deployTracks.test.ts`.
4. In `codeyam-ai/harvardintech` → **Settings → Pages**: confirm **Source** is
   **GitHub Actions** (on 2026-09-14 it was *Deploy from a branch*, which starts a
   failing built-in Jekyll build on every push), add the custom domain
   `harvardintech.com`, wait for GitHub's certificate, then tick **Enforce HTTPS**.
5. Stand up the private editor site: a gated build of `main` with `/admin`, at
   `review.harvardintech.com`, as described in the parked plan
   `.codeyam/plans/one-site-content-edits-publish-straight-to-main.md`.
6. Create a new `PREVIEW_GATE_PASSPHRASE` secret for the private editor site,
   different from the preview's, and share it only through the password manager.
7. DNS — the GoDaddy account owner is Ben. He changes the apex `A` records and the
   `www` `CNAME` (→ `codeyam-ai.github.io`) from Strikingly to GitHub Pages, and
   adds the `review` record. **Leave `MX`, the `mail.` host record and every
   `TXT` alone.**
8. Redirects from old Strikingly URLs live in another plan. Confirm it has shipped
   before the DNS change.
9. After the deploy, verify:
   - `robots.txt` says `Allow: /` and points at
     `https://harvardintech.com/sitemap-index.xml`;
   - the sitemap holds no `/isolated-components`, `/review`, `/design-review-*` or
     `/donor-network.html` URLs, and each of those paths returns 404;
   - `/admin` returns 404;
   - a page's canonical link and `og:url` start with `https://harvardintech.com/`.

### The build variables, per track

There is no per-track code — the difference is environment variables read by
`astro.config.mjs`, `src/lib/canonicalUrl.ts`, `src/lib/previewGate.ts` and
`src/lib/draftVisibility.ts`:

| Variable | `main` today | `staging` today | `main` public |
| --- | --- | --- | --- |
| `DEPLOY_BASE_PATH` | `/harvardintech` | `/harvardintech-staging` | unset — base `/` |
| `PAGES_SITE` | `https://codeyam-ai.github.io` | `https://nseldeib.github.io` | `https://harvardintech.com` |
| `CANONICAL_ORIGIN` | `https://harvardintech.com` | `https://harvardintech.com` | unset — falls back to `PAGES_SITE` |
| `PREVIEW_GATE` | `1` | `1` | unset |
| `PREVIEW_GATE_PASSPHRASE` | the secret | the secret | unused |
| `INCLUDE_DRAFTS` | `1` | `1` | unset |

`PAGES_SITE` is where a build is really hosted. `CANONICAL_ORIGIN` is what its
pages advertise — canonical links, share cards, structured data, `llms.txt` and
the `robots.txt` sitemap line — so the gated preview never names itself.

Internal files never reach the public build: `INTERNAL_PATHS` in
`src/lib/publishTrack.ts` (the component screenshot pages, the redesign gallery,
the status page and the donor deck) are removed from `dist/` after the build and
kept out of the sitemap.

`@codeyam/cms` **0.2.1** added base-path support, so the dashboard runs correctly
under a subpath — which is what makes both gated sites above possible.
Before 0.2.1 the admin pages built to the right place but every link inside them
pointed at the origin root, so the CMS was unreachable on a project site. If you
ever see admin links 404 while the pages themselves load, that is the symptom of
an older version; check the installed one before debugging anything else.

Promotion is a merge `staging` → `main`, run from the Actions tab via the
**Promote review → live** workflow (`.github/workflows/promote.yml`).

## Two Base Modes (Chosen at Setup)

Depending on whether your site uses a custom domain or a default subpath, select the correct branch in `astro.config.mjs`:

### Path A: Custom Domain (e.g., harvardintech.com)

1. Set `site` and `base` in `astro.config.mjs`:
   ```javascript
   site: 'https://harvardintech.com', // Your custom domain
   base: '/',
   ```
2. Create a file named `public/CNAME` in your project and write your custom domain name there (e.g., `harvardintech.com` without any protocol).
3. Update your DNS provider with the following records pointing to GitHub's servers:
   - A records:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - CNAME record pointing to `<your-username>.github.io`

### Path B: Default GitHub Pages Subpath (e.g., user.github.io/repo)

1. Set `site` and `base` in `astro.config.mjs`:
   ```javascript
   site: 'https://<username>.github.io',
   base: '/<repo-name>/', // Must end with a trailing slash!
   ```

---

## Configuring GitHub Pages

**It's automatic.** Pushing to the default branch runs `.github/workflows/deploy.yml`,
whose build job enables GitHub Pages for you (Source: **GitHub Actions**) via
`actions/configure-pages` with `enablement: true`. There is no manual
Settings → Pages toggle in the common case — the first deploy creates the site
and publishes it.

### If the first deploy 404s

Some org/permission policies block token-based enablement, so the first run can
still fail with `HttpError: Not Found (404) ... Ensure GitHub Pages has been
enabled`. To recover, do **either**:

- Run the helper once (requires the authenticated `gh` CLI):
  ```bash
  ./scripts/enable-pages.sh
  ```
- **Or** toggle it in the UI: repo **Settings** > **Pages** > **Build and
  deployment** > **Source** → **GitHub Actions**.

Then re-run the workflow:
```bash
gh workflow run "Deploy to GitHub Pages" --ref <default-branch>
```

---

## Staging-track setup (one-time, manual)

The `main` track works as-is. The staging track needs four things that cannot be
done from inside this repo. Until they exist, pushes to `staging` fail at the
"Publish to staging repo" step and **`main` is unaffected** — so this is safe to
leave half-done.

**No DNS step.** The staging site is served from the staging repo's own Pages URL,
so `harvardintech.com` is never touched. Moving it onto
`review.harvardintech.com` is a later, separate change — see "At the cutover".

One GitHub repo hosts exactly one Pages site, so a second origin genuinely
requires a second repo. It holds only generated output; there is no source in it.

1. ✅ **Create the staging repo** — `nseldeib/harvardintech-staging`. **Done, and
   it is PUBLIC.** It has to be: Pages on a private repo requires a paid plan, and
   this account is on the free tier — the API rejects it with *"Your current plan
   does not support GitHub Pages for this repository."* Public costs no privacy
   here, because the repo holds only **generated output** built from
   `codeyam-ai/harvardintech`, which is itself already public. (The source repo
   moved from `nseldeib` to `codeyam-ai`; this hosting repo did not.) The privacy is
   carried by the passphrase gate and `noindex`, not by repo visibility (see the
   note below).

2. ✅ **Generate a deploy key** and install both halves. **Done** — a write-access
   deploy key titled *github-actions staging deploy* on the staging repo, with the
   private half stored here as the **`REVIEW_DEPLOY_KEY`** secret. To rotate it:
   ```bash
   ssh-keygen -t ed25519 -C 'harvardintech-staging deploy' -f review_deploy_key -N ''
   gh repo deploy-key add review_deploy_key.pub -R nseldeib/harvardintech-staging -w
   gh secret set REVIEW_DEPLOY_KEY -R codeyam-ai/harvardintech < review_deploy_key
   rm -f review_deploy_key review_deploy_key.pub
   ```
   A deploy key rather than a personal access token: it is scoped to exactly one
   repo and carries no person's identity, so it survives staff changes.

3. ✅ **Create the `staging` branch** off `main` and push it. **Done** — the branch
   exists on origin and its builds are green.
   ```bash
   git checkout -b staging main && git push -u origin staging
   ```

4. ✅ **Enable Pages on the staging repo** — **Done.** **Settings → Pages →
   Source: Deploy from a branch**, branch **`gh-pages`**, folder `/ (root)`, or:
   ```bash
   gh api -X POST repos/nseldeib/harvardintech-staging/pages \
     -f 'source[branch]=gh-pages' -f 'source[path]=/'
   ```
   **This must come after step 3** — the API refuses with *"The gh-pages branch
   must exist before GitHub Pages can be built"* until the first build has pushed
   it.

Then visit `https://nseldeib.github.io/harvardintech-staging/` — the passphrase
overlay should appear. The passphrase is the `PREVIEW_GATE_PASSPHRASE` secret
(see *The preview passphrase* below).

> **How private is this, really?** The passphrase is a **deterrent, not
> authentication** — it ships in the client bundle, and the admin pages embed
> draft markdown in fetchable HTML. It keeps both gated sites out of search
> results and away from casual visitors. If the content is genuinely sensitive,
> host the gated track on **Cloudflare Pages behind Cloudflare Access** instead
> (free for up to 50 users): per-person email one-time-PIN, individually
> revocable, and the raw-markdown exposure stops mattering. Only the publish step
> of the deploy workflow changes; everything else in this repo is identical.

---

## The preview passphrase

The passphrase lives in exactly one place: the **`PREVIEW_GATE_PASSPHRASE`**
Actions secret on `codeyam-ai/harvardintech`. It is shared privately — through the
password manager, never in this repo, its docs, chat or email.

```bash
gh secret set PREVIEW_GATE_PASSPHRASE -R codeyam-ai/harvardintech
```

- **There is no default.** A gated build without the secret fails with a message
  naming it, rather than shipping a gate anyone can open. Create the secret
  before the first deploy that carries this rule.
- The site's gate reads it at build time. The two raw `public/` pages with their
  own gate (`review/index.html` and `donor-network.html`) carry a
  `__PREVIEW_GATE_PASSPHRASE__` placeholder that the build fills in.
- Under `astro dev` those two pages are served unfilled, so locally the
  placeholder itself unlocks them. The site's own gate is off in dev.
- **Rotating** = set a new secret value, re-run the deploy, send the new value to
  reviewers. The passphrase used until September 2026 is in git history, so it
  must never come back.
