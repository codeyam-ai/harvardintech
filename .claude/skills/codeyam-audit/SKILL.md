---
name: codeyam-audit
user-invocable: true
disable-model-invocation: false
description: |
  Align the current branch with codeyam, finalize it whole-repo, and drive
  it to merge-ready, deciding judgment calls by rule and asking one ship
  question at the end. Resumable; has a report-only mode. Use after
  deferred or out-of-workflow commits, or to align + finalize HEAD.
---

# Align, finalize, present, and drive the current branch to merge-ready

This skill is a thin, stable entry point. Its full operating procedure —
the supported-stack gate, the ORIENT → align → finalize → presentability →
merge-ready sequence, and the inlined gotchas — lives in the
version-controlled sibling procedure so it can evolve through normal review
instead of silent self-edits:

**Read `.claude/skills/codeyam-audit/finalize-procedure.md` now and follow
it.** Everything below is the contract; the procedure is the body.

## Contract

- **Operate on the current branch** by default (the procedure's ORIENT step
  reads `git branch --show-current`). The user need not name it.
- **Aggressive on deterministic drift; decides judgment by rule.** Apply the
  mechanical alignment fixes autonomously (reconcile registry, refresh
  tests / evidence / descriptions, sync capture scripts, refresh
  screenshots, refresh the import graph). Settle every judgment call — an
  unregistered-entity wall, an ambiguous classification, a stale-looking
  doc, a CI fork — by the procedure's written rules, never by a mid-run
  question. Anything uncertain is left in place, never deleted.
- **Too big to fix now → plan, findings stay visible.** A fix over the
  procedure's "too big" bar gets a `/codeyam-plan` plan, written without
  asking. Its findings are **not** baselined: they keep failing the audit,
  so the branch does not merge until the plan lands or the user decides
  otherwise. The ship question names the open findings and the plan that
  owns them.
- **Supported-stack gate — sync or bail loud, never half-sync.** Read
  `.codeyam/stack.json` first. For a supported stack, drive to full sync.
  For one the engine does not yet support, fail loud and actionable
  (`/codeyam-audit does not yet fully support stack 'X'. Supported: ...`)
  rather than reporting a partially-aligned repo as clean.
- **Idempotent and resumable — relentless toward done.** Every run makes
  progress and ends merge-ready, with a report of the decisions made and
  the plans written, so the user can still disagree after the fact. It
  never bails-and-abandons mid-way and never leaves the repo half-aligned.
- **Never rebase, amend, or force-push.** Assume the branch may be shared;
  integrate a moved primary branch by **merging** it in. This is the one
  unrecoverable rule.
- **A green Fast-Commit session is NOT merge-ready.** The per-step gate is
  diff-scoped; `session-finalize` is whole-repo-scoped. Trust
  `verify-full-finalize`, not the session's green steps.
- **One ship question.** Push, open/update the PR, and merge once CI is
  green are gated by a single plain-language question at the end of the
  run; a yes covers all of them, including the CI-fix loop. Red CI is
  never waved off — root-cause it from its failing-job log before any
  "flake/infra" label (procedure step 8a).
- **Client projects never touch the editor binary.** Preflight reads
  `rebuild-self --check` once: `not-applicable` means a client project, where
  the run never rebuilds, reinstalls, upgrades, or restarts `codeyam-editor`.
  A capability the installed editor lacks goes in the report under
  CodeYam improvements, never into a step for the user.
- **Report-only mode** is the explicit cheap path: list what's misaligned +
  the deferred-commit attribution and stop, touching nothing (procedure's
  "Report-only mode" section).

## Preflight

Confirm the project is initialized for codeyam-editor:

```bash
codeyam-editor editor config-show >/dev/null 2>&1 || {
  echo "Project is not initialized for codeyam-editor. Run /codeyam-onboard first."
  exit 1
}
```

If it fails, tell the user to run `/codeyam-onboard` and stop.

## Run

Work through `.claude/skills/codeyam-audit/finalize-procedure.md` top to
bottom. Then run its final **Reflect & self-improve** step: route durable
lessons to a `memory/` file and structural gaps to a queued plan against
the procedure file — never a silent edit to this `SKILL.md`. If the
run was clean, say "nothing new learned" and write nothing.
