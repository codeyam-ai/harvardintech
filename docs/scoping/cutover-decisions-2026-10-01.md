# Cutover decisions — answered 2026-10-01

The domain cutover runbook (`/cutover-runbook` on the gated site, defined in
`src/lib/cutoverProgress.ts`) asks five questions, D1–D5, and nothing can be
ticked off until they are answered. This records the owner's answers from the
2026-10-01 working session, including the two that are **not** what the runbook
recommended.

The runbook's own tick state lives in `src/data/cutoverProgress.json`. Only D3
and D4 are marked answered there, because `answered` controls whether a step
reads as unblocked — and the answer to D2 is "wait", which must not unblock
anything.

---

## D1 — Who holds the GoDaddy login? **Named, not yet confirmed**

**Ben Wei.** Open since the 2026-07-02 discovery; it blocks S1, S2 and S7, which
is every step that touches the domain.

Still to do before this counts as answered: **confirm Ben can actually sign in**,
and give a second person access at the same time. Naming someone is not the same
as having access — a domain one unavailable person away from unreachable is the
problem this question exists to close, and it is not closed by a name.

Left unticked in `cutoverProgress.json` for exactly that reason.

## D2 — Is the content ready to be public? **No**

Against the runbook's recommendation, which was "yes, go, and use the coming-soon
toggle for anything unfinished."

**Nicole, Ben, Nadia, Jessica and Laura need to review the content first.** This
blocks S5 (taking the passphrase off), which is the right place for it to bite:
the gated site is exactly where that review happens.

Left unticked: marking it answered would show S5 as ready to run, and it is not.

## D3 — The board design gallery: keep, gate, or remove? **Removed** ✅

Also against the runbook's recommendation, which was to put it behind the site
passphrase.

`public/design-review-4ece6c14/` — 20 MB, thirteen redesign concepts published
for the board in June at a deliberately obscure path, `noindex` but with no gate
at all. **Deleted.** The concepts stay in git history, including
`01-atlas-mockup.html`, which is where the design system shipped on 2026-09-29
got its name.

## D4 — The status page: where should it live? **Retired, with the files kept** ✅

The question turned out to cover three files, not the two the runbook named:

| File | What it was | How it was protected |
| --- | --- | --- |
| `public/review/index.html` | Project status & decisions, 16 Sep | own passphrase gate + `noindex` |
| `public/donor-network.html` | Supporter recognition design review, 14 Sep | own passphrase gate + `noindex` |
| `public/design-review-4ece6c14/` | The board gallery above (D3) | **nothing but its address** |

Both documents were **moved to `docs/archive/`, not deleted.** Out of `public/`
they are served on no track, which is what retiring them meant. They were kept
because the status page is the only written record of five questions put to the
board — one of them, member login, still genuinely open (see
[harvard-key-sso.md](./harvard-key-sso.md)) — and the donor review was built to
collect written feedback on Nicole's "not a wall, a network" note.

Deleting them outright is one `git rm` away if that is wanted.

**S6 is therefore complete** and is ticked done.

## D5 — When do we cut over? **Weekday morning, with two more preconditions**

The runbook's recommendation stands — a weekday morning, at least a week after
D1 is answered, not near anything the team is running. The owner added two
preconditions it did not have:

1. **D1 and D2 must land first.** Already true in the runbook's own dependency
   graph for D1; D2 now carries real weight because the answer is "not yet".
2. **The fundraising campaign has to be ready, with a live Givebutter link.**

On the second: that is one CMS field, not an engineering task. `donateUrl` in
the donate page copy is deliberately blank, and `src/lib/giving.ts` treats blank
as GIVING IS CLOSED — every campaign button is replaced by a coming-soon message
so the site never asks for money the organization cannot yet accept. Filling that
field in `/admin` switches every giving surface on at once with no code change
and no deploy, which means the campaign can be timed independently of the domain
move if that is ever useful.

---

## Where this leaves the runbook

- **Answered and done:** D3, D4 → S6 complete.
- **Answered, blocking by design:** D2 (no) holds S5.
- **Open:** D1 (confirm Ben's access), D5 (a date, once D1, D2 and the campaign
  are settled).
- Every other step is waiting on D1, which remains the single thing worth
  chasing.
