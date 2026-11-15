# Rated security review — procedure

Follow these phases top to bottom. The goal is a **rated, verified** list of
security findings the user can turn into plans — not a grep dump. Every
phase reuses existing stack-agnostic `codeyam-editor editor` commands and the
project's own tooling; you are grounding judgment in evidence.

The artifact is `.codeyam/analysis/security/<YYYY-MM-DD>.md`. It is
gitignored on purpose: a committed vulnerability report is itself a
disclosure. Never `git add` it, and never paste it into a PR, issue or chat
outside this session.

---

## The severity scale

Use exactly these five levels, every run, on every project, so ratings stay
comparable. Rate each finding on two axes and combine them:

- **Exploitability** — who can reach it: an unauthenticated remote attacker,
  an authenticated (or low-privilege) user, or only someone local / an
  insider with existing access.
- **Impact** — what they get: data exposure, account takeover, code
  execution, integrity loss (tampering), or availability loss.

| Level | Meaning |
|---|---|
| **Critical** | Remotely exploitable with no or trivial preconditions, leading to code execution, auth bypass, or exposure of secrets or user data. **A live credential in git history is always Critical.** |
| **High** | Exploitable by an authenticated or low-privilege attacker with serious impact, or a known-exploited dependency vulnerability on a reachable code path. |
| **Medium** | Real, but needs unusual preconditions, or the impact is limited. |
| **Low** | Defense in depth, hardening, or a best-practice gap with no demonstrated exploit path. |
| **Informational** | An observation with no fix owed. |

Every finding states its level **and the reason for it** in one or two
sentences that name the exploitability and the impact — for example
"High: any signed-in user can read another user's invoices by changing the
id in the URL (authenticated, data exposure)". A bare label is not a rating.

## Rules that hold in every phase

- **Never echo a secret value.** Not in the report, not in the conversation,
  not in a plan, not in a commit message. Refer to a secret by file and line
  (or commit and path), its type ("AWS access key", "Stripe live secret key",
  "database URL with inline password"), and at most its first four
  characters followed by `…`. If a tool prints values, read its output
  yourself and redact before relaying anything.
- **Rotate first.** A credential that has been committed — even once, even
  in a commit that was later reverted — must be treated as leaked. The first
  action is always to **rotate it** (revoke and reissue at the provider).
  Removing it from the tree or rewriting history does not un-leak it, and no
  plan can rotate a credential for the user. Never rewrite history or
  force-push yourself.
- **Read-only.** Do not run exploits, do not send crafted requests to a
  running or deployed system, do not modify application code, and do not
  install anything without asking first.
- **Missing tools are reported, not skipped.** Every check you could not run
  goes in the report's "Not checked" section with the tool that would cover
  it and its install command.

---

## Phase 1 — Scope and threat model

1. Read the project shape:
   ```bash
   codeyam-editor editor project-info --format json
   codeyam-editor editor config-query --format json
   ```
   Note the app type, framework, languages and package managers. These
   decide which tools Phase 2 uses — never assume one stack.
2. List the **entry points** — everything that accepts input from outside
   the process: HTTP routes and API handlers, server actions, GraphQL
   resolvers, webhooks, CLI arguments and environment variables, message or
   queue consumers, file watchers, IPC handlers in a desktop app, deep links
   in a mobile app. Find them from the framework's conventions and the
   glossary (`codeyam-editor editor glossary-list`), not by guessing.
3. Mark the **trust boundaries**: where unauthenticated input becomes
   authenticated, where user input reaches a database, a shell, the
   filesystem, a template, or an outbound request.
4. List the **data stores** and what sensitive data each holds (credentials,
   personal data, payment data, tokens).
5. Read the **deployment and infrastructure config** present in the repo:
   container files, compose files, infrastructure-as-code, platform config
   (for example `fly.toml`, `vercel.json`, `render.yaml`, `Procfile`),
   reverse-proxy config.
6. Check **repository visibility**:
   ```bash
   gh repo view --json visibility -q .visibility 2>/dev/null
   ```
   `PUBLIC` switches on the disclosure rules in Phase 7. If `gh` is missing
   or unauthenticated, record visibility as unknown and treat the repo as
   public — the safe default.
7. Write a short **threat model** (five to ten lines) at the top of your
   working notes: who the plausible attackers are (anonymous internet users,
   signed-in users of another tenant, a malicious contributor's PR, someone
   with a stolen laptop) and what each would want.

## Phase 2 — Automated sweep

Use what is installed. For each tool that is not, record a "Not checked"
line with the install hint and move on.

### Secrets — working tree and full history

- Preferred: `gitleaks` (`gitleaks detect --redact --no-banner` scans
  history; `gitleaks dir --redact .` or `gitleaks detect --no-git --redact`
  scans the tree, depending on version). Always pass `--redact`.
- Fallback when no scanner is installed: `git log -p --all` searched for
  high-signal patterns (private key headers, `AKIA` access keys, provider
  key prefixes such as `sk_live_`, `ghp_`, `xox`, connection strings with
  inline passwords). Report that only the fallback ran, and add gitleaks to
  "Not checked".
- For every hit, decide: **tree only** (fixable by a normal commit, plus
  rotation), or **history** (rotation is mandatory; history rewrite is the
  user's decision, never yours). Test fixtures and obviously fake values
  (`sk_test_…` placeholders, `changeme`, documented example keys) are not
  findings, but say which ones you dismissed and why.

### Dependencies — one auditor per manifest

Pick the auditor from the manifests and lockfiles actually present:

| Manifest | Auditor |
|---|---|
| `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb` | `npm audit --omit=dev`, `pnpm audit --prod`, `yarn npm audit`, or `bun audit` |
| `Cargo.lock` | `cargo audit` |
| `requirements*.txt` / `poetry.lock` / `uv.lock` | `pip-audit` |
| `Gemfile.lock` | `bundle audit check --update` |
| `go.sum` | `govulncheck ./...` |
| `composer.lock` | `composer audit` |
| `Podfile.lock`, `Package.resolved`, Gradle lockfiles | no standard local auditor — list under "Not checked" and suggest the platform's dependency scanning |

An advisory only becomes High when the vulnerable function is on a reachable
path in this project. Check that before rating; an unreachable advisory is
Low, with the upgrade as its fix.

### CI/CD configuration

Read every workflow file (for example `.github/workflows/*.yml`,
`.gitlab-ci.yml`, `.circleci/config.yml`, `azure-pipelines.yml`) and check:

- `pull_request_target` or `workflow_run` triggers that check out and run
  the PR's code — a fork can then run code with the repo's secrets.
- Secrets exposed to jobs that run on fork PRs, or echoed into logs.
- Third-party actions or orbs pinned to a mutable tag or branch instead of
  a full commit SHA.
- `permissions:` broader than the job needs (missing block, or
  `write-all`), especially `contents: write` and `id-token: write`.
- Untrusted context interpolated straight into a `run:` script (PR title,
  branch name, issue body) — script injection.
- Deploy jobs that any branch, not just the protected one, can trigger.

## Phase 3 — Manual review

Apply this checklist to the entry points from Phase 1. Read the actual code
path from input to sink; a checklist item with no reachable path is not a
finding. Use only the items that fit the app type — a CLI has no CSRF, a
static site has no SQL.

- **Authentication and sessions** — password storage (a slow, salted hash),
  session token entropy, cookie flags (`HttpOnly`, `Secure`, `SameSite`),
  logout and expiry, password-reset token handling, MFA bypasses.
- **Authorization and object-level access (IDOR)** — every handler that
  loads a record by an id from the request must check the record belongs to
  the caller. Missing tenant scoping on queries is the most common High.
- **Injection** — SQL/NoSQL built by string concatenation, shell commands
  built from input, template injection, path traversal into the filesystem.
  The same bug looks different per stack; for example:
  - Node route: ``db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)``
  - Flask view: `cursor.execute("SELECT * FROM users WHERE id = %s" % request.args["id"])`
  - Rails controller: `User.where("id = #{params[:id]}")`
  The fix is the same in every one: a parameterized query.
- **XSS, CSRF and CORS** — unescaped HTML rendering (`dangerouslySetInnerHTML`,
  `| safe`, `html_safe`, `v-html`, `{@html}`), state-changing requests
  without CSRF protection, `Access-Control-Allow-Origin` reflecting any
  origin together with credentials.
- **SSRF and open redirects** — outbound requests to a user-supplied URL;
  redirects to a user-supplied destination.
- **Unsafe deserialization** — `pickle`, YAML `load` without a safe loader,
  Java/PHP native deserialization, `eval` of input.
- **File upload** — type and size limits, storage outside the web root,
  generated file names, no execution of uploaded content.
- **Crypto misuse** — homemade crypto, ECB mode, static IVs, MD5/SHA-1 for
  passwords, `Math.random()` (or equivalent) for tokens, disabled TLS
  verification.
- **Secrets in config and env defaults** — real values as fallbacks in
  config files or code (`process.env.KEY || "<real key>"`,
  `os.getenv("KEY", "<real key>")`), example env files holding real values.
- **Sensitive data in logs** — tokens, passwords, full request bodies or
  personal data written to logs or error trackers.
- **Rate limiting and abuse** — login, signup, password reset, OTP and
  expensive endpoints with no throttling.
- **Security headers** (web apps only) — Content-Security-Policy,
  `Strict-Transport-Security`, `X-Content-Type-Options`, frame protection.

## Phase 4 — Codeyam surfaces

A codeyam project carries extra state that can leak. Check each:

1. **Scenario seeds and mocks.** Scenario data under `.codeyam/scenarios/`
   is committed. Search it for real-looking tokens (bearer tokens, JWTs,
   provider key prefixes), real email addresses, phone numbers, and other
   personal data. `codeyam-editor editor scenarios` lists them; a scenario
   mock carrying a real credential is a secret leak like any other (and
   Critical if it is live).
2. **Committed screenshots.** Captured screenshots under
   `.codeyam/scenarios/` can show an API key in a settings page, a real
   customer's name, or a token in a URL bar. Look at the screenshots of
   settings, account, admin and integration screens.
3. **Connection secrets file.** `.codeyam/setup-connections.json` holds
   pasted credentials and must be ignored by git. Check it with
   `git check-ignore -q .codeyam/setup-connections.json` and
   `git log --all --oneline -- .codeyam/setup-connections.json` (any output
   from the second command means it was committed at some point: Critical,
   rotate everything it held). **Never read that file.** To learn which
   services it covers, use `codeyam-editor editor setup-services`, which
   reports env-var names and presence only. Apply the same two checks to
   `.codeyam/secrets.json` and `.codeyam/session-token`.
4. **Editor access mode and preview exposure.** Run
   `codeyam-editor editor server-identity` and
   `codeyam-editor editor config-show`. An editor that binds beyond
   localhost with no access control lets anyone who can reach it write files
   and run commands as the user — rate by who can reach the address.
5. **Hook scripts.** Scripts under `.codeyam/hooks/` run with the user's
   privileges on every lifecycle event. Check they do not pipe remote
   content to a shell, interpolate untrusted input into commands, or write
   secrets to logs.

## Phase 5 — Verify, then rate

For every candidate from Phases 2–4, argue against it before you keep it:

1. **Is the input actually attacker-controlled?** Trace it back to an entry
   point. A value that only comes from the app's own config is not an
   injection.
2. **Is there an upstream check?** Middleware, a framework default, an ORM
   that parameterizes, a schema validator, a gateway in front.
3. **Is the code reachable?** Dead code, a test-only path, or a feature
   flag that is off in production lowers the rating or removes the finding.
4. **Is it live?** For a credential: is it a test key, revoked, or a
   documented placeholder? You cannot test it against the provider (that
   would be using it) — if you cannot tell, treat it as live.

Outcomes:

- **Confirmed** — rate it on the scale, with the reason.
- **Dismissed** — note it in one line under "Dismissed" with why, so the
  next run does not re-raise it.
- **Unverified** — you could not settle it from the code alone. It goes in
  "Needs a human look" with what a person should check. It is **never**
  given a rating and never mixed into the rated list.

## Phase 6 — Report

Write `.codeyam/analysis/security/<YYYY-MM-DD>.md` (create the directory if
needed; confirm it is ignored with
`git check-ignore -q .codeyam/analysis/security/` before writing — if it is
not, stop and tell the user, because the report must never be committable).
Sections, in this order:

1. **Act now** — one line per leaked credential: what it is, where, and
   "Rotate it at <provider> now; no plan can do this." Also any Critical
   finding on a public repo with the private-handling note. If none, write
   "Nothing to act on immediately."
2. **Summary** — repo visibility, the threat model, and a table of counts
   by severity.
3. **Findings**, Critical first. Each one:
   - **Title** and **Severity** with the one-to-two-sentence rationale
   - **Location** — file and line, or commit and path (values redacted)
   - **Exploit scenario** — who does what and what they get. On a public
     repo, describe it at the level of "an authenticated user can read other
     users' records", not a request-by-request recipe.
   - **Fix** — the concrete change
   - **Effort** — small / medium / large
4. **Needs a human look** — unverified candidates and what to check.
5. **Not checked** — every check that did not run, with the install command
   that would cover it.
6. **Dismissed** — one line each.

Then give the user a short summary in the conversation: the Act-now items,
the counts by severity, and the report path. Values stay redacted here too.

A clean run is a valid result: "No rated findings" plus the Low and
Informational items and the Not-checked list.

## Phase 7 — Plans the user chooses

1. If there are no Critical, High or Medium findings, say so and offer
   plans for the Low items only if the user wants them. Otherwise continue.
2. Ask which findings become plans, using your harness's structured-question
   tool (on Claude, `AskUserQuestion`, multi-select), or a plain numbered
   list if it has none. Rank Critical first. Each option names the finding
   and its consequence; a Critical option's description says plainly that it
   should be fixed before the next deploy. Before asking, check the copy:
   ```bash
   codeyam-editor editor check-question-copy --structured '<the question JSON>'
   ```
   With more findings than the tool allows options, ask about the Critical
   and High ones first, then offer the rest in a second question.
3. For each chosen finding, write the plan body to a scratch file and
   create it:
   ```bash
   codeyam-editor editor plan-create \
     --title "<fix, phrased as the outcome>" \
     --prefix security \
     --source codeyam-audit-security \
     --mode backend \
     --body-file <scratch file>
   ```
   Use `--mode ui` only when the fix changes what a user sees. The body
   follows the usual plan shape (Summary, Key Decisions, Implementation,
   Reused existing code, Scenarios to Demonstrate) and carries the severity
   and its rationale in the Summary. **Disclosure rules for the body:**
   - Never include a secret value, even redacted to more than four
     characters.
   - On a public (or unknown-visibility) repo, describe the **fix**, not the
     exploit: the affected handler, the missing check and the change — no
     step-by-step reproduction an outsider could follow. Plans are committed
     and pushed, so they are public there.
   - For a leaked credential, the plan covers removing it from the tree and
     moving it to the secret store; the body states that rotation is a
     manual step the user must do first.
   - For a Critical finding on a public repo, tell the user before creating
     the plan that they may prefer to fix it privately (a private fork or a
     security advisory) instead of queuing a public plan, and create it only
     if they still want it.
4. Commit and push the plans as plan-only commits, one per plan, staging
   only the plan file:
   ```bash
   git add .codeyam/plans/<slug>.md
   git commit -m "plan: <short description>" -- .codeyam/plans/<slug>.md
   git show --stat --name-only HEAD   # only the plan file
   codeyam-editor editor push
   ```
   Append ` [skip ci]` to the message only when committing directly on the
   primary branch. Never commit the report.
5. Finish with one line per created plan (slug and severity) and the report
   path.

## Phase 8 — Record the run

Every finished review records itself, including one whose user chose no
plans: the record resets the security review's clock for everyone on the
project, so it is not offered again until it is due. `<n>` is the count of
confirmed findings in the report; `<p>` is the count of plans created in
Phase 7 (`0` is fine).

```bash
codeyam-editor editor periodic-review record --kind security --findings <n> --plans <p>
git add .codeyam/periodic-reviews.jsonl
git commit -m "chore: record security review" -- .codeyam/periodic-reviews.jsonl
codeyam-editor editor push
```

Append ` [skip ci]` to the message only when committing directly on the
primary branch.
