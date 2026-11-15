---
name: codeyam-audit-security
user-invocable: true
disable-model-invocation: false
description: |
  Run a thorough, read-only security review of this project: app code,
  dependencies, secrets in the tree and in git history, CI/CD and deploy
  config, and codeyam's own surfaces. Every confirmed finding is rated on a
  fixed scale with an exploit scenario and a fix; you pick which become plans.
---

# Rated security review that feeds plans

This skill produces a **security review you can act on**: each confirmed
finding names where it is, how it could be exploited, how serious it is and
why, and how to fix it. You then choose which findings become queued plans.

It is a thin, stable entry point. The full phased procedure lives in the
version-controlled sibling so it can evolve through normal review instead of
silent self-edits:

**Read `.claude/skills/codeyam-audit-security/security-procedure.md` now and
follow it.** Everything below is the contract; the procedure is the body.

## Contract

- **Read-only and non-destructive.** Never attempt an exploit against a
  running or deployed system, never change application code, and never
  install a scanner without asking. The only writes are the local report
  under `.codeyam/analysis/security/` and the plans the user chooses.
- **Verify before reporting.** Every candidate gets an adversarial
  false-positive pass (is the input attacker-controlled, is there an upstream
  check, is the code reachable?). Only verified findings are rated. Anything
  unverified goes in a separate "needs a human look" list — never mixed in.
- **One fixed severity scale.** Critical / High / Medium / Low /
  Informational, defined in the procedure. Every finding states its rating
  *and the reason for it*.
- **Never echo a secret value.** Name the file, line (or commit) and secret
  type; redact the value in the report, the conversation and every plan.
- **Rotate first.** A leaked credential's first action is always to rotate
  it — no plan and no commit can un-leak it. The report says so at the top.
- **Disclosure-aware.** On a public repository, plan bodies describe the fix
  without step-by-step exploit instructions, and Critical findings are
  flagged to the user to handle privately first.
- **The user picks which findings become plans.** Nothing is queued without
  that choice.
- **Report stays local.** The report is gitignored; a committed
  vulnerability report is itself a disclosure.
- **Stack-agnostic.** Tools are chosen from the project's declared stack. A
  tool that is not installed is reported as "not checked: install X to cover
  this", never silently skipped.

## Preflight

Confirm the project is initialized for codeyam-editor:

```bash
codeyam-editor editor config-show >/dev/null 2>&1 || {
  echo "Project is not initialized for codeyam-editor. Run /codeyam-onboard first."
  exit 1
}
```

If it fails, tell the user to run `/codeyam-onboard` and stop. Then confirm
this is a git repository (`git rev-parse --show-toplevel`); the history scan
needs it.

## Run

Work through `.claude/skills/codeyam-audit-security/security-procedure.md`
top to bottom. The report lands at
`.codeyam/analysis/security/<YYYY-MM-DD>.md`; a second run on the same day
overwrites it.
