---
name: codeyam-audit-speed
user-invocable: true
disable-model-invocation: false
description: |
  Explain why working sessions on this project take as long as they do and
  what would make them faster: how codeyam develops and tests this project,
  where the time actually went, the blast radius of the most-edited files,
  and ranked recommendations. The user picks which become plans. Read-only.
---

# Explain and speed up working sessions on this project

This skill is a thin, stable entry point. Its full operating procedure
lives in the version-controlled sibling file, so it can change through
normal review:

**Read `.claude/skills/codeyam-audit-speed/speed-procedure.md` now and
follow it.** Everything below is the contract; the procedure is the body.

## Contract

- **Read-only on source.** Never edit application code, tests or config
  during this skill. The only files it writes are its local report
  (`.codeyam/analysis/speed/<date>.md`, gitignored) and the plans the user
  chose.
- **Measure through the editor's query commands.** Every number comes from
  a `codeyam-editor editor …` query, `git log`, or the project's config read
  through `project-info` / `config-query`. Never parse `.codeyam/*.json` or
  a log file by hand. A question no command answers is itself a finding.
- **Grounded, not generic.** Every claim about how this project is developed
  and tested cites the config value, command output or measurement it came
  from. Label every estimate as an estimate and show its arithmetic.
- **Split every finding by who owns the fix.** App-owned findings become plan
  candidates. CodeYam-owned findings (editor overhead, a gate that over-owes
  regardless of code structure) are not plans on a client project: they go
  in a "CodeYam improvements" section for the user to send to the CodeYam
  team.
- **The user picks which recommendations become plans.** Show every
  recommendation first, then ask once with a structured question. No plan is
  written without their choice.
- **Never rebuild, reinstall or restart the editor** on a client project.

## Preflight

Run `codeyam-editor editor config-show`. If it fails because the project has
no codeyam configuration, stop and tell the user to run `/codeyam-onboard`
first; there is nothing to measure yet.
