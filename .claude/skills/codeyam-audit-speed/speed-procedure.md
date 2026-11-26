# `/codeyam-audit-speed` procedure

You are answering one question for the user: **"why do my working sessions
on this project take as long as they do, and what would make them faster?"**

Seven phases, in order: Orient → Explain → Measure → Diagnose → Recommend →
Report → Plan. Every phase reads; only Report and Plan write, and Plan
writes only what the user picks.

## Ground rules (they hold in every phase)

1. **Never parse `.codeyam` files by hand.** No `python3` / `jq` / `cat` over
   `.codeyam/*.json`, `.codeyam/logs/*` or a test cache. Every store has a
   read-only query command; the table in Phase 3 names them. If you need an
   answer no command gives, do not write a parser: record the missing query
   as a CodeYam improvement and move on.
2. **Every claim is grounded.** A sentence about how this project is developed
   or tested names where it came from: a config value (`config-query`), a
   command's output, or a measurement. "Your `vitest` runner has 6 partitions"
   is grounded; "codeyam runs your tests efficiently" is not, and generic
   prose like it is a failure of this skill.
3. **Estimates are labelled and show their arithmetic.** "≈ 14 min/session
   (estimate: 7 edits/session × 2.0 min owed per edit)". Never present an
   estimate as a measurement.
4. **Owner split.** Every finding is either *app-owned* (the project's code,
   tests, partition layout, static checks, dev server, scenarios) or
   *CodeYam-owned* (editor overhead, or a targeting rule that over-owes
   whatever the code looks like). **CodeYam-owned findings are not plans on a
   client project.** They go in the report's "CodeYam improvements" section
   for the user to send to the CodeYam team. Only when Phase 1 finds this is
   the editor's own repository do they become plan candidates.
5. **No invented numbers.** A stack with too little history gets "not enough
   history yet: run this again after a few working sessions", not a guess.
6. **Mention a mechanism only where it applies.** Phase 1 reads the stack.
   Explain a stack-specific mechanism only when that stack is present (see
   the notes in Phase 2), and skip it everywhere else.

## Phase 1: Orient

Run, bare (no pipes):

- `codeyam-editor editor project-info --format json`: the project
  description, title and `stack` block.
- `codeyam-editor editor config-query --format json`: the test runners, their
  partitions, and the static checks, with local overrides merged.
- `codeyam-editor editor rebuild-self --check`: `not-applicable` means a
  **client project** (the usual case). Any other verdict means this is the
  editor's own repository (**self-host**); only then do rebuild / restart
  costs and the self-host owner rule apply.
- `git branch --show-current` and `codeyam-editor editor finalize-debt show --format json`:
  whether Fast Commit has postponed checks on this branch, and how many
  commits are waiting on them.

Write down: the languages and runners present, the partition count per
runner, the static-check names, and client vs self-host. Every later phase
reads from this list.

## Phase 2: Explain how a working session spends time on this project

This is the teaching section. The user should finish it able to predict why
a given edit cost what it did. Ground every paragraph in the Phase 1 list.

### 2a. The shape of a session

Explain, using this project's real names:

- **The workflow steps** a change goes through (plan, prototype, demo,
  deconstruct, tests, reconcile, finalize, commit, push), and which of them
  pay for tests and checks.
- **Diff-scoped vs whole-repo checks.** The per-step audit gate and
  `session-checkpoint` judge only what this change touched. `session-finalize`
  judges the whole repository and runs the whole test suite. Name this
  project's static checks and say which run on every change and which only
  when certain paths change (each check's `filePatterns` in `config-query`).
- **Fast Commit.** What it postpones (tests, the full audit, registry
  reconcile, recapture), and that the postponed work is paid once, at
  `session-finalize`, before the branch merges. Use the Phase 1
  `finalize-debt` count.
- **Captures.** Scenario screenshots are recaptured when the code they show
  changes. Give this project's scenario count (`codeyam-editor editor scenarios`).
  Skip this point for a project with no visual output.
- **Self-host only:** the rebuild / restart loop after editing the editor
  itself.

### 2b. How targeted testing works (the core section)

The biggest lever on in-session speed is how many tests an ordinary edit
**owes**. Teach the chain **edit → reach → owed tests** as it works today:

1. **The dependency graph.** The editor keeps an import graph of the project
   (refreshed by `analyze-imports`). An edit's *reach* is everything that uses
   the changed code, followed transitively through that graph.
2. **Per-thing vs whole-file reach.** When a file imports one named thing from
   another file, the dependency is tracked per thing: editing a *different*
   thing in that file does not reach it. When a file pulls in a whole module
   (a wildcard import, or a re-export file that forwards everything), every
   edit to that module reaches it. So a file that re-exports everything makes
   every importer depend on all of it.
3. **Owed tests.** The tests an edit owes are the tests declared in the
   changed file and in every file its reach lands on. A test that already ran
   green since its file's last edit is credited and not re-run.
4. **Partitions.** Each runner's tests are split into partitions (this
   project's are in the Phase 1 list). A partition is *stale* when a file it
   covers changed since its last recorded run. A partition owing many files is
   run whole instead of file by file.
5. **How targeted runs differ.** `refresh-tests --test <name>` and
   `--file <path>` run exactly what they name. `--changed` runs what the
   current diff owes. `--partition <name>` runs a whole partition. A flag-free
   `refresh-tests` (which `session-finalize` runs) runs everything.

Stack notes. Include each one only when Phase 1 shows the stack:

- **Rust:** module roots (`mod.rs`, `lib.rs`, `main.rs`) declare their child
  modules. Declaring a module does not run its code, so reach follows *use*,
  not declaration. Files pulled in at compile time by `include_str!` /
  `include_bytes!` count as part of the file that embeds them, so editing an
  embedded asset owes that file's tests.
- **Re-export files** take a different form in each language: an `index.ts`
  barrel that re-exports a folder, a Python `__init__.py` that imports its
  submodules, a Rust `pub use` prelude. Name the form this project uses, and
  only that one.

**Worked examples.** Explain the chain with 2–3 of this project's own most-edited
files (Phase 3 finds them): "editing `<file>` reaches N files through `<hub>`,
which owes partitions A and B, about M minutes (estimate)". Never use example
files from another project.

### 2c. The inner loop vs the gates

Say what to run while iterating (`refresh-tests --file <path>` or
`--test <name>` for the test being worked on) and what the gates will run
anyway, so the user never pays for the same thing twice.

## Phase 3: Measure

Default window: 14 days. The user may name another; pass it as `--days N`
where a command takes it.

| Question | Command |
|---|---|
| Which editor commands cost the most time? | `codeyam-editor editor cost-summary --days 14` (add `--cmd <name>` to narrow; `--by caller` shows who launched them) |
| Is it getting slower over time? | `codeyam-editor editor cost-trend --days 14 --format json` |
| How long do audits take, and how wide are they? | `codeyam-editor editor audit-history --since 14d --format json` |
| Which audit stage owns the time? | the most recent `audit --timings` output, only if one is already on disk; do not run a full audit just for this |
| Which partitions re-run, and how fresh are they? | `codeyam-editor editor test-status --format json` and `codeyam-editor editor test-cache-query --format json` |
| What would editing one file owe? | `codeyam-editor editor edit-reach <file>... --format json` |
| What does the current change owe? | `codeyam-editor editor refresh-tests --owed --dry-run` |
| Duplicate or redundant scenarios? | `codeyam-editor editor scenario-review --format json` (slow: run it once) |

Rank time by **p95 × how often it runs**, not p95 alone. A 40-second command
run 200 times costs more than a 10-minute one run once.

### Blast radius

1. Find the 15–25 most-edited source files in the window:
   `git log --since="14 days ago" --name-only --format=` and count per file.
   Leave out test files, generated files and lockfiles.
2. Ask what an edit to each one would owe:
   `codeyam-editor editor edit-reach <file> <file> … --format json`. Each entry
   gives `testsOwed`, `testFiles` and `partitions[]`. The counts are an
   **upper bound**: the walk starts from the whole file, so an edit touching
   only part of it can owe less, never more.
3. An entry with `verdict: "unsupported"` is a file this stack's owed-test
   projection does not cover yet. Report it as "not measurable on this stack
   yet". Do not estimate it. Record the gap as a CodeYam improvement, once,
   not per file. `verdict: "unresolved"` means the import graph has no entry
   for the file: say so, and suggest `codeyam-editor editor analyze-imports`.
4. Turn counts into time with the partition run times from
   `test-cache-query` (a partition's last recorded duration):
   minutes owed per edit ≈ Σ over owed partitions of that partition's run
   time, or a file-proportional share of it when only a few of its files are
   owed. Label it an estimate.
5. Rank files by **minutes owed per edit × edits per week**.

### Test-suite shape

From `test-cache-query` and `test-status`: the slowest partitions and
tests; tests that only pass in a particular order or with shared state (they
cannot be run alone, which defeats targeting); and test fixtures or setup
files that a large share of tests import.

### Slow tests that hold a run's tail

One test that runs for half an hour holds its whole partition open, however
fast the rest of the suite is. Rank them across every session and machine:
`codeyam-editor editor speed-history --kind slow-tests --since 14d --format json`.
Each entry is one test, with `totalMs` (every recorded run's time summed — the
minutes it has held), `maxMs`, `runs`, `unfinished` (runs that ended with it
still going) and `hosts`. Rank by `totalMs`. A test that appears on several
hosts is a property of the test, not of one machine. A test with `unfinished`
above zero has been killed at a timeout, so its `maxMs` is a minimum. A test
is recorded once it passes 60 seconds, and only for runners that can time
their tests (cargo today). An empty answer on a project with other runners
means "not measured", not "no slow tests". Say which it is.

## Phase 4: Diagnose

Map each hotspot to a cause and an owner.

**Structural, app-owned.** These shrink what each edit owes:

- A hot file with wide reach. Split it along the seams per-thing reach
  honors (separate files for things that change for different reasons).
  Recommend a split only if the reach rules in 2b would actually narrow
  after it: a split the walk sees through anyway saves nothing.
- A fan-in hub that makes many files look dependent on each other: a
  re-export file (in this stack's form) or a grab-bag `utils` / `helpers` /
  `common` module.
- Tests far from their code, or importing through a hub, so their reach
  resolves wide.
- App-wide fixtures or test setup that pull in the whole app, for example a
  `conftest.py` that imports every module, or a global `setupTests.ts` that
  renders the full provider tree.
- Partitions that do not match how code changes together, for example a
  single partition holding every test, so every edit owes all of them.
- Tests that cannot run alone.

**Config and hygiene, app-owned:** partition granularity; slow or unisolated
tests (network calls, sleeps); a static check that runs on every change but
only needs some paths (narrow its `filePatterns`); scenario sprawl (the
`scenario-review` duplicate candidates); a dev server with no warm start.

**CodeYam-owned:** a targeting rule or gate that over-owes whatever the code
looks like, or editor overhead that dominates a session. Before reporting
one, run `codeyam-editor editor plans` and cite a queued plan that already
covers it, instead of reporting it again.

## Phase 5: Recommend

One ranked table, largest estimated saving first:

| # | Recommendation | Owner | Kind | Tests owed per edit (before → after) | Est. minutes saved / session (arithmetic) | Effort | Evidence |
|---|---|---|---|---|---|---|---|

*Kind* is `structural`, `config` or `habit`. Leave the before → after
column as "—" when it does not apply.

Then a short **"In your next session"** list: habits that need no code
change (run `--file` while iterating; let the gate run the rest; batch edits
to a hot file).

## Phase 6: Report

Write the report to `.codeyam/analysis/speed/<YYYY-MM-DD>.md`. This path is
local working output and is not committed. It contains the Phase 2
explanation, the Phase 3 measurements, the blast-radius table, the Phase 5
recommendations, and, on a client project, a **CodeYam improvements**
section. Then show the user a summary of five lines or fewer: the top three
recommendations with their estimated savings, and the report's full path.

## Phase 7: Plan

Ask once, with the harness's structured-question tool (on Claude,
`AskUserQuestion`): write plans for all of the plan-eligible
recommendations, choose which ones, or write none. Run the question copy
through `codeyam-editor editor check-question-copy --structured` first.
Plan-eligible means app-owned, plus CodeYam-owned on self-host only.

For each chosen recommendation:

1. Write the body in the format `.claude/skills/codeyam-plan/SKILL.md`
   Step 5 defines. Read that step; do not restate it from memory. Carry the
   evidence and the before → after numbers into the plan's Summary.
2. `codeyam-editor editor plan-create --title "<title>" --prefix perf --source codeyam-audit-speed --body-file <path>`
3. Commit and push the plans the way `/codeyam-plan` Step 7 does (a
   plan-only commit, then `codeyam-editor editor push`).

Finish by telling the user how many plans were written and their titles.
On a client project, remind them that the CodeYam improvements section is
for the CodeYam team, not their backlog.

## Phase 8: Record the run

Every finished review records itself, including one whose user chose no
plans: the record resets the speed review's clock for everyone on the
project, so it is not offered again until it is due. `<n>` is the number of
recommendations in the Phase 5 table; `<p>` is the number of plans written
in Phase 7 (`0` is fine).

```bash
codeyam-editor editor periodic-review record --kind speed --findings <n> --plans <p>
git add .codeyam/periodic-reviews.jsonl
git commit -m "chore: record speed review" -- .codeyam/periodic-reviews.jsonl
codeyam-editor editor push
```

Append ` [skip ci]` to the message only when committing directly on the
primary branch.
