# Harvard Alumni in Tech — Review Handoff (for Nicole)

Internal reference for the external review. Keep the links and the password
internal.

Nothing here is public. `harvardintech.com` is still served by Strikingly and is
untouched by any of this — the preview below is a separate, password-protected
site that only people with the link and passphrase can see. It stays that way
until the Strikingly migration.

## Links + password

| Surface | Link | Password |
|---|---|---|
| **Website** | https://codeyam-ai.github.io/harvardintech/ | site passphrase |
| **Todos / project status** | https://codeyam-ai.github.io/harvardintech/review | site passphrase |
| **Supporter recognition review** | https://codeyam-ai.github.io/harvardintech/donor-network.html | site passphrase |
| **Domain cutover runbook** | https://codeyam-ai.github.io/harvardintech/cutover-runbook/ | site passphrase |
| **CMS / admin dashboard** | https://codeyam-ai.github.io/harvardintech/admin | *(GitHub token — see below)* |

**The site passphrase is shared privately** — through the password manager, never
in this file, chat or email. It lives in the `PREVIEW_GATE_PASSPHRASE` secret (see
[DEPLOY_SETUP.md](../DEPLOY_SETUP.md#the-preview-passphrase)). The old one was
retired in September 2026 because it had been written down here in plain text.

The GitHub repo moved from `nseldeib` to `codeyam-ai` in September 2026, which is
why the address changed.

The trailing slash on the runbook link matters — it is a directory route, and
without it the link 404s.

**There is one site now.** Until September 2026 there was a second, "working"
address where her edits landed first, and someone had to run a Promote to move
them across. That is gone: her saves commit straight to `main` and appear on the
one link above in about two minutes. Nothing to promote, nothing to keep in sync,
and no second address to explain.

The site, the todos page and the runbook share one passphrase. It is a
**deterrent, not authentication** — it ships in the client bundle — so it keeps
the preview out of search results and away from casual visitors, and that is
all. Every page also carries `noindex`.

The runbook is additionally **never built for the public site**: it is excluded
from the public track in code rather than merely gated, so it cannot appear on
`harvardintech.com` even by a configuration mistake at cutover. That matters
because it names where the domain's records live.

**CMS preview links are deliberately NOT behind the passphrase.** A preview link
exists to be handed to one outside reviewer, and gating it would mean sending
them the link and the site passphrase together — which hands them the whole unreleased
site to read one page. The unguessable URL is the access mechanism instead, the
same trade already made for `public/design-review-4ece6c14/`.

So a preview link is the one surface here that anyone holding the URL can read.
The editor offers a per-preview password for exactly that gap — it encrypts the
title and body at rest rather than prompting, so the bytes are unreadable without
it. That option is not mentioned in the note to Nicole (kept deliberately short);
point her at it if she ever needs to share something sensitive.

The **CMS is not behind the passphrase.** It is behind a GitHub token sign-in
instead, and the dashboard is `noindex, nofollow`. Treat its URL as
semi-private: the sign-in overlay hides the content visually, but the underlying
HTML is fetchable by anyone who has the address.

## Ready-to-send note

> Hi Nicole — here's the Harvard Alumni in Tech site preview to review. The
> address has changed since last time. Everything except the content editor uses
> one password, which I'm sending you separately:
>
> • **Website:** https://codeyam-ai.github.io/harvardintech/
> • **What's done / what's open (todos):** https://codeyam-ai.github.io/harvardintech/review
> • **Supporter recognition:** https://codeyam-ai.github.io/harvardintech/donor-network.html
> • **Moving the domain over:** https://codeyam-ai.github.io/harvardintech/cutover-runbook/
> • **Content editor (CMS):** https://codeyam-ai.github.io/harvardintech/admin
>
> The todos page walks through what's built and the decisions we need from you.
>
> The domain link is the one with something we need back from you. The site is
> finished — moving harvardintech.com onto it is just a handful of settings at
> the registrar, and that page lays out every step in the order it has to happen,
> including how we keep your email working throughout. Nothing has been done yet;
> it's written so the move can be reviewed before it's run.
>
> Five questions on that page are yours rather than ours, and the first one
> blocks all the others: **who has the GoDaddy login?** We've never had access,
> and until that's answered nothing can start — not even the first step, which
> only reads the current settings and changes nothing. Each question has what
> we'd suggest, so there's something to react to rather than a blank page.
>
> The supporter recognition link is the one I'd most like your reaction to. It
> shows the donor wall as it's built today, then nine directions for replacing
> it, then what actually happens when the bi-weekly spreadsheet meets either —
> which turns out to be the interesting problem. Nothing on that page records
> anything; at the bottom there's an outline to paste into a doc. Everything is
> numbered (W1–W5, 01–09, I1–I4, Q1–Q4) so a one-line reaction lands exactly
> where you meant it.
>
> Please keep the links and password internal for now. The editor needs a
> separate access token, which I'll send you privately if you'd like to make
> edits directly.
>
> If you do edit: your change appears on that same link about two minutes after
> you save, and the editor tells you when it has landed. There is nothing to
> promote and no second address to check.
>
> If you want to work on something without it going live, mark it a **draft** in
> the editor. Drafts stay off the site until you publish them, and you can send
> anyone a preview link to a single draft page.
>
> (The real harvardintech.com is unchanged — this is a private preview.)

## Editor access (no GitHub account needed)

The CMS commits through a GitHub token, and **the token is the credential** —
Nicole does not need a GitHub login of her own.

### Generating the token

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access
   tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Resource owner** → `codeyam-ai`, then **Repository access** → *Only select
   repositories* → `codeyam-ai/harvardintech`.
3. **Repository permissions** → **Contents: Read and write**. That is the only
   one to set; *Metadata: Read* is added automatically and is required.
4. **Expiration** → short. The review does not need 90 days.
5. Generate, copy the value, and share it **privately** — a password manager,
   not chat or email. Never paste it into this file.

Those permissions are exactly what the dashboard uses: it reads and writes
repository contents via `api.github.com/repos/.../contents/...`, and calls
`api.github.com/user` once to show who is signed in. Nothing else.

### Using it

She opens the CMS link, chooses **Sign in with Token**, and pastes the value.
It is stored in her browser's local storage, so she signs in once per browser.

### Reusing an older token

Functionally yes — the permissions are identical to the ones the previous
editor setup used, so a token that is still valid will work. Two caveats:

- Check whether it still exists at **Settings → Developer settings →
  Fine-grained tokens**. The earlier round of this doc said to revoke it after
  the review and to keep the expiry short, so it has most likely lapsed.
- Even a valid one must be **pasted in again**. This is a different editor from
  the one used before, and it stores the token under its own key, so nothing
  carries over from the old sign-in.
- **Any token made before the repo moved to `codeyam-ai` will not work.** A
  fine-grained token belongs to one resource owner, and it was `nseldeib`. Make a
  new one under `codeyam-ai`.

Issuing a fresh token per person is the better habit anyway: it lets you revoke
one person's access without disturbing anyone else's.

### Afterwards

**Revoke the token** at Settings → Developer settings → Fine-grained tokens.

## What she can edit herself

[editing-the-site.md](./editing-the-site.md) is written for her, not for us — send
it alongside the links. It answers the two questions from her review directly:
how to edit the Momentum Fund page (its middle is now a **Momentum Fund sections**
collection in the CMS) and how to move sections up or down (the **Order** field;
lower appears higher). It also names what is still code-only — the hero, the
closing CTA, the card figures, and the GA id — so those come to us rather than
sending her hunting through /admin for a screen that does not exist.

## What happens when she edits

Her edits commit to the `main` branch of `codeyam-ai/harvardintech` (configured in
`src/data/cms.json`). That triggers a rebuild, and the site updates a minute or
two later. There is no promote step.

There is no path by which an edit reaches the real harvardintech.com — that only
happens at the Strikingly migration, deliberately.

**What changes at the cutover, and why it is not a problem.** At the migration
`main` becomes the public site, so from that day a save would publish straight to
the world. That is what the promote step used to guard against. Two things replace
it: the CMS moves to the private editor build (the public build ships no `/admin`
at all — see `includeCmsIntegration`), and the **Draft** toggle is how anything
is held back. Drafts are per-entry, which is finer than a whole branch was, and
they were always the mechanism Nicole actually used.

Her commits are attributed to the token owner's GitHub identity, not her name.
That is expected for a review.

## Answering her two reports (volunteer project)

Both of the things she flagged on the volunteer project she created — "uploaded
photo not visible" and "thumbnail appears but does not link to full description"
— reproduced, and both were our bugs, not mistakes she made.

### "Thumbnail does not link to the full description"

Correct, and there was nowhere for it to link *to*. The long description she
wrote lives in the markdown body of her entry, and **nothing in the site rendered
a project's body anywhere** — the grid card only ever showed title, commitment,
and blurb. Her description was on the site but invisible.

Each project now has its own page at `/volunteer/projects/<slug>`. The card's
thumbnail and title link to it, and there is a "Read the full description →"
link in the card footer. Projects still marked **Draft** get a page on this
preview but not on the public site, so she can read hers before it goes live.

If a project has no sign-up link of its own, its page falls back to the general
"Volunteer with us" CTA — a project posted before its form exists still gives a
reader somewhere to go.

### "Uploaded photo not visible"

Her photo genuinely did not make it. The CMS records an upload in two places —
the image file itself, and a library entry in `src/data/media.json` — and it
published the library entries **without the image files**. Her publish recorded
three uploads and committed one file, so two of them pointed at files that were
never there. Her project ended up with no photo set at all.

Two things changed:

- The orphaned library entries were removed, so the media picker no longer
  offers photos that do not exist.
- **The CMS now refuses to publish** an upload whose image data went missing,
  and names the files instead of committing a broken image. She will see an
  error asking her to re-upload rather than a silently broken photo.

**Her project still has no photo — she should pick one herself.** In /admin →
**Projects** → her entry → the **Image** field, either choose an existing library
image or upload a new one. Uploading is now safe to retry: if the upload does not
survive, publishing will tell her instead of failing quietly.

One thing worth knowing: an upload has to be **published from the media library**
before it appears on the site. Selecting a file stages it; it is not live until
the publish commits.

The underlying upload bug was in the `@codeyam/cms` package, not this site. The
guard shipped here as a local patch at first; it is now **fixed upstream and
released in `@codeyam/cms` 0.4.0**, which this site depends on, so the patch has
been deleted. Every site using the package gets the fix, not just this one.

`src/lib/mediaCommitGuard.test.ts` stays as a check on that dependency: if a
future release reworks or drops the guard, it fails in CI rather than at an
editor's next upload. That matters because the bug is invisible at publish time
— the CMS truthfully says the upload succeeded — so nothing else would catch it.

## Still open (team todos, not code)

- Real **board bios** — **all 5 are still blank**. Ben Wei and Nadia Eldeib have
  an empty `bio` field rather than no field at all, which is what an earlier
  version of this document read as "written"; the other three have no bio field.
  *Optional, and not a launch blocker* — a member without one renders as photo +
  name + role, which is exactly what harvardintech.com shows today. Add them in
  /admin whenever they are written, one at a time if that is easier; a
  half-filled board is a supported state, not a broken one.
- A **donation-platform URL** (the Donate button currently opens an email).
- **Chapter + event content** for the 6 chapters (Boston/Cambridge, DC-DMV,
  London, NYC, Seattle, SF Bay Area). 8 events are in. The 11 blog posts are in
  too but **hidden for launch** — the blog has no entry point until there are
  real articles written for it, so nothing links to them (see
  `src/lib/blogVisibility.ts`).

## One site

There is one gated site: `codeyam-ai.github.io/harvardintech`. Her edits, and any
preview link she mints, appear there about two minutes after she saves. It is not
public — `harvardintech.com` is still Strikingly's.

**What this replaced, and why.** There used to be two: a "working" site taking
every commit, and this "reviewed" one that moved only when someone ran a Promote.
The idea was that a site changing under you is no good to review against. In
practice it failed on both counts. Every working-site build had been broken since
20 August — an unquoted timestamp in a preview file that the schema rejected — so
her saves reached nothing at all. Promote was blocked besides, because the two
branches had diverged. She was reviewing one site, editing into another, and the
note she had been sent pointed at a link where her changes never appeared.

The separation the second site was meant to provide now comes from **drafts**,
which is where it belonged: per-entry, controlled by her in the editor, and
finer-grained than a whole branch ever was.

## Known rough edges

- The **production split is not set up yet** — both sites are gated and neither
  is public. That is the domain cutover, not this; see
  [DEPLOY_SETUP.md](../DEPLOY_SETUP.md).
