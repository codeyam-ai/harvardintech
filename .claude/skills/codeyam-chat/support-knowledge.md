# CodeYam support knowledge

Read this when the question is about **CodeYam itself** — something not
working, how to do something, costs, privacy — rather than about the project.
It is drawn from real support conversations. Most people asking are not
developers.

Some answers describe older versions. Before stating anything as definitive,
check it against the editor's own commands (`codeyam-editor editor --help`,
`world-explain`, `server-identity`) and the docs in this repo. If you cannot
confirm it, say so.

## How to answer

- **One step at a time.** Never ask several questions at once.
- **Define a technical term the first time it appears**, with an analogy. The
  terminal is "the text-based way to talk to your computer — not a secret or
  dangerous place". A commit is "saving a snapshot of your work"; a push is
  "copying that snapshot to GitHub".
- **Say why**, not just what.
- **Don't sound like sales.** Be honest about limits. If another tool fits
  better (a simple static site → a site builder), say so. When recommending a
  tool, say whether it is free or paid.
- **Give a ready-to-copy prompt** when someone is stuck.
- **Never ask for passwords or API keys in the chat.** Keys go through the
  form CodeYam shows for them.
- For strange errors, a good first move is to investigate it yourself — read
  `.codeyam/logs/`, run `codeyam-editor editor server-identity` — before
  answering.

## What CodeYam is

- It wraps an AI agent (Claude, Codex or Gemini) in a step-by-step workflow —
  plan, prototype, harden, finalize — so software built with AI stays
  maintainable as it grows. Framing that works with developers: "a harness for
  Claude". With non-developers: "I can finally build real software myself,
  without losing control of what gets built".
- Compared with Claude alone: Claude alone tends to leave "a folder of stuff";
  CodeYam adds structure, checks, visual scenarios and shared context.
- Compared with site builders and "vibe coding" tools: those are easier but
  limited or generic on complex projects. CodeYam fits projects that grow or
  must be maintained.
- **Scenarios** show the app in specific states (full, empty, loading, error,
  admin) with sample data. Only the data is simulated, not the code. Sample
  data is invented from the project description — it is never taken from the
  user's accounts.
- It builds web apps, mobile apps (iOS/Android), desktop apps, Chrome
  extensions, backends, automations and agents (the last is most experimental).
- It runs locally. It is not open source. The code belongs to the user, lives
  on their machine or GitHub, and stays theirs if they stop using CodeYam. A
  developer can take it over without a rewrite.
- It can be used in other languages (e.g. entirely in Spanish).

## Getting started

- Needs: a Mac or PC, an agent subscription (Claude Pro ≈ USD 20/month is
  enough to start), Chrome, about an hour for first setup. No coding needed.
- Ways to run it: the terminal (most powerful), the Claude Desktop extension
  (easiest for non-developers), GitHub Codespaces (in the browser), or a cloud
  machine managed by the CodeYam team.
- iPad / phone only: not locally. Use Codespaces or a team-managed cloud
  machine.
- Node or npm missing: ask Claude to install Node.js (Homebrew on Mac), then
  retry. Windows: if a message says a folder is not in PATH, paste it into the
  chat and follow the commands.
- Browser: Chrome. Safari and Edge have blocked localhost or frozen. On a cloud
  machine, Chrome must be signed into the Google account with access.
- Desktop extension "Unable to connect to extension server": restart Claude
  Desktop; if that fails, remove and re-add the extension. Check it under
  Customize → Connectors → "CodeYam Editor".
- Getting back to a project: in a terminal, `cd` into the project folder and
  start the editor again. A renamed or moved folder must be started from its
  new place.
- "Resume previous session? Continue / Start Over": this is about the
  conversation with the agent, not the project. Start Over keeps every file.
- More than one project: yes, but switch between them; don't run two at once
  (the preview can show the wrong one).

## Chat and agent problems

- **Chat blank / frozen / stopped answering**: Interrupt (or Ctrl+C in the
  terminal), then type "continue". Usually the agent service, not CodeYam.
- **"API Error: 529 Overloaded"**: Claude's servers are busy; temporary. Retry;
  check status.claude.com.
- **Spinner forever**: the agent may be waiting on a question in the terminal.
  Switch to Terminal; choose with the arrow keys and Enter.
- **In-browser terminal**: arrow keys and Enter, not the mouse. "Yes, I trust
  this folder": down arrow, Enter.
- **Logged out of Claude**: Home tab sign-in button, or `/login` in Build;
  locally `claude auth login`.
- **Working vs stuck**: tests and screenshots can take minutes. No change for
  10+ minutes and no question waiting → Interrupt and "continue".
- **The agent ran `/clear`**: intentional, it keeps the conversation small.
- **"It wants to create 100+ scenarios"**: it is reporting how many exist, not
  creating them all.

## Live Preview

- Frozen / blank / "upstream connect error" / "localhost refused to connect":
  the app's development server stopped. Ask the agent to restart it and find
  why it crashed — no need to delete anything by hand. Don't click around the
  preview while the agent is mid-change.
- Diagnose with `codeyam-editor editor server-identity`: its `preview:` line
  says `serving`, `dev-server-down`, `app-error` or `unreachable`. A 200 does
  not mean the app is up.
- Shows another project: two editors are open; close one and reload.
- Every page 500s: usually the database connection (e.g. after switching
  databases). Find the root cause before fixing.

## Designs

- Pick with "Let's use N". Iterate needs a note first.
- Jumped to Build before choosing: the mockups are still saved — tell Build
  "use mockup N", or rerun the design step.
- "They all look alike": ask for structural variety, say what you like and
  don't, name reference apps, upload a brand guide or logo.

## Building and speed

- Chat = questions, nothing changes. Plan = write changes down for later.
  Build = make the change, with tests and screenshots. While a build runs,
  queue new ideas in Plan instead of typing into the build.
- Good request size: a few bullets or a couple of paragraphs — who it's for,
  what they see, what they tap, what they get.
- Slow changes: every change is verified; touching something shared (a
  header, a button) retakes screenshots across many screens. To go faster,
  batch changes: create a branch, choose "don't ask me until it's done" and
  "save the full check for later" on each, then run the full check (or
  `/codeyam-audit`) at the end. Several machines (e.g. Codespaces) can work in
  parallel.
- Features disappeared: work is kept when it is saved (committed and pushed);
  say yes when asked.
- Something broke: ask for the root cause before fixing; if needed, go back to
  the last working version.

## Data

- Build with test data so the AI can never change real data. Ask the agent to
  generate test data shaped like the real data. Keep a backup if using real
  data.
- A hosted database (Supabase, Neon — free plans) is needed when other people
  use the app or you need logins and saved data.
- Spreadsheets: export to CSV and hand it to the agent.
- Images/files: drop them on the chat box, or ask the agent to copy a named
  file from the computer into the project.
- The agent may claim it is connected to a data source when it is not — verify.

## Publishing

- Typical path: GitHub → Vercel (free plan for shareable links). Static sites:
  GitHub Pages, free. Mental model: local folder → agent session → scenarios →
  commit → GitHub → deploy.
- Own domain: yes, a manual step the agent can walk through.
- On a phone outside the home Wi-Fi: the app must be hosted. Suggested prompt:
  "I want to get the changes we've made onto my phone. Do we already have a
  way set up? If not, can we set it up?"
- Native vs web: start with a phone-friendly web app; go native after
  validating. Apple USD 99/year, Google Play USD 25 once. TestFlight ≈ 2 days;
  App Store review 1.5–2.5 weeks. First submission: keep it simple, no
  payments/ads, account deletion if there are accounts, a privacy policy.

## Costs, privacy, security

- CodeYam is free during early access (may change). The agent is paid
  (Claude Pro ≈ USD 20/month; heavy use USD 100–200). Hosting + database are
  often free or under USD 20/month to start. Codespaces includes ~60 free
  hours/month on the basic machine.
- CodeYam does not access the user's data; it runs locally. It is not a SaaS
  platform — think of it as a development consultant building custom software.
- Permission prompts: the agent asks before touching files in the project
  folder. "1 = yes" once, "2 = always yes" for that kind of action.
- Payments, logins, databases: use established services, never hand-built.
  Finance or health: get an expert review before launch.

## Hand off to a person (the CodeYam team)

Say plainly that this needs the team, and help the user write the message:

- A cloud machine is down, returns 403 / "no healthy upstream", or needs a reset.
- Pricing, services, quotes, partnerships.
- Legal, security, privacy or compliance questions from an organization;
  contracts, NDAs, insurance.
- Moving a project from a team cloud machine to the user's GitHub.
- TestFlight or store issues that depend on the team's developer account.
- A reproducible bug that blocks the user — first collect: what they did, what
  they expected, what happened, a screenshot, and the version
  (`codeyam-editor --version`).
