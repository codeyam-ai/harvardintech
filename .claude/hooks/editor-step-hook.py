#!/usr/bin/env python3
"""
PostToolUse + Stop + UserPromptSubmit hook for editor mode step tracking.

Reads .codeyam/editor-step.json and prints a reminder about the current step.
Logs each firing to .codeyam/logs/editor-log.jsonl.
If no state file exists, outputs nothing (not in editor mode or between features).
Only fires when CODEYAM_EDITOR_ACTIVE=1 (set by terminal.rs in editor PTY sessions).

Step labels, descriptions, and restrictions are loaded from
.codeyam/cache/step-metadata.json, which is regenerated from
crates/types/src/step.rs by `codeyam-editor editor verify-build`. The
cache is the single source of truth — do not embed step tables here.
If the cache is missing or unreadable, the hook degrades to a
label-less reminder rather than serving stale literals.
"""

import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

# `_step_metadata` lives next to this file; add the hook directory to
# sys.path so the shared loader is importable regardless of the cwd
# the hook runner launches from.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _step_metadata import (  # noqa: E402
    cli_command,
    load_step_metadata,
    mode_display_prefix,
    mode_is_build,
    resolve_mode_table,
)


def resolve_mode(state, metadata):
    """Return the workflow mode name and the matching mode table.

    Thin wrapper around the shared `resolve_mode_table` so callers in
    this file keep the original two-tuple return shape."""
    return resolve_mode_table(state, metadata)


def label_signals_user_feedback_phase(label):
    """Return True when the current step is one where late user
    feedback ("can you change X?") commonly arrives — and the agent
    should re-register/re-capture rather than refusing.

    Match keys on the label substring so a manifest reorder doesn't
    drift this gate. Today the slugs that produce these labels are
    `present-live` / `ui-present` / `backend-confirm` / `backend-present`
    (presentation phases), `reconcile` (glossary reconcile), and
    `finalize` (last gate before journal/commit)."""
    if not label:
        return False
    needle = label.strip().lower()
    return any(
        marker in needle
        for marker in ("present", "reconcile", "finalize")
    )


def label_signals_pre_commit_warning(label):
    """Return True when an uncommitted-changes warning is appropriate
    at this step. Fires on labels emitted by the presentation slugs
    (`present-live` / `ui-present` / `backend-confirm` / `backend-present`,
    where the user is seeing the work) and `finalize` (last gate before
    journal/commit)."""
    if not label:
        return False
    needle = label.strip().lower()
    return needle in ("present", "demo", "finalize")


def label_signals_sync_gate(label):
    """Return True at the Pre-Commit Sync step — the one step where a stale
    binary costs a 40-minute-to-two-hour run before anyone finds out.

    Matched on the label rather than the step NUMBER on purpose: the backend
    tail has already shifted once (`split-backend-present-approval-gate` moved
    `pre-commit-sync` from 16 to 17), and a hardcoded number would have gone
    quietly wrong at that commit."""
    if not label:
        return False
    return label.strip().lower() == "pre-commit sync"


# `rebuild-self --check` is documented to return in under a second — it never
# builds, swaps, or restarts. The timeout is a fault bound, not a budget.
_REBUILD_CHECK_TIMEOUT_S = 10


def rebuild_check_verdict(project_dir):
    """Return the `rebuild-self --check` verdict, or "" when unanswerable.

    The read-only probe: it never builds, swaps, or restarts, and prints one of
    `current` / `rebuild-in-flight` / `stale` / `aliases-diverged`, so it is
    safe to run on every turn end at the step that needs it.

    Split from the notice below on the same seam as `wedge_check` /
    `emit_wedge_block` in this file: shelling out and deciding what verdict
    means are different concerns, and the verdict parse is worth reading on its
    own line.

    Every failure collapses to "": an absent or older binary (a fleet
    mid-upgrade) predates the `--check` flag and exits non-zero, and a hook that
    raised would interrupt an otherwise-fine turn."""
    import subprocess as _sp

    try:
        result = _sp.run(
            [cli_command(), "editor", "rebuild-self", "--check"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=_REBUILD_CHECK_TIMEOUT_S,
        )
    except Exception:
        return ""
    if result.returncode != 0:
        return ""
    tail = result.stdout.strip().splitlines()[-1:]
    return tail[0].strip() if tail else ""


def stale_binary_notice(project_dir):
    """Surface a stale installed binary BEFORE the agent launches the sync.

    Returns the notice text, or "" when the binary is current or the question
    cannot be answered.

    Only `stale` is reported. `rebuild-in-flight` means a build is already
    converging on its own, and `aliases-diverged` self-heals at the next
    per-role re-exec — neither is a reason to interrupt the agent here.

    The CLI gate in `pre_commit_sync` is the ENFORCING check; this is only the
    earlier, cheaper word, which is why it degrades to silence rather than to a
    guess."""
    if rebuild_check_verdict(project_dir) != "stale":
        return ""
    return (
        "\n\033[1;31m⚠️  The installed editor binary is out of date.\033[0m\n"
        "   `pre-commit-sync` runs 40 minutes to two hours and would spend all of it "
        "producing a verdict from code this branch has already replaced.\n"
        "   Run this FIRST — it rebuilds the CLI without bouncing the editor server, "
        "so this session stays alive:\n"
        "     codeyam-editor editor rebuild-self --defer-restart"
    )


def log_event(project_dir, event, data=None):
    """Append a JSONL entry to .codeyam/logs/editor-log.jsonl."""
    try:
        logs_dir = os.path.join(project_dir, ".codeyam", "logs")
        os.makedirs(logs_dir, exist_ok=True)
        log_path = os.path.join(logs_dir, "editor-log.jsonl")
        entry = {"ts": datetime.now(timezone.utc).isoformat(), "event": event}
        if data:
            entry.update(data)
        with open(log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


# ── Question-copy observer ─────────────────────────────────────────────
#
# Records what the agent ACTUALLY asked the user, so the question of
# "did the plain-language guidance work?" is answered with evidence
# rather than impression. It is the measurement half of a contract whose
# other half is guidance only: there is deliberately no refusal here and
# no blocking path, because blocking a question the agent has already
# composed costs a full round trip and teaches it that asking is risky —
# and an agent that asks less is a worse outcome than one that asks
# clumsily.
#
# Three properties are load-bearing, and all three are about staying out
# of the way: it never blocks, it never writes to the agent's stream, and
# it swallows every error. A logging failure is not worth one interrupted
# turn.

QUESTION_COPY_LOG = "question-copy.jsonl"

# Seconds to wait for the jargon check before giving up on it. The check
# is a nicety; the record of what was asked is the point, so a slow or
# absent binary costs the flagged terms and nothing else.
JARGON_CHECK_TIMEOUT_S = 3


def _flagged_terms(project_dir, text):
    """Return the jargon terms `check-question-copy` flags in `text`.

    Shells out rather than reimplementing the vocabulary, so the term
    table has exactly ONE home (`plain_language.rs`) and a term added
    there protects this log too. Returns [] on any failure — a missing
    binary, a timeout, a parse error — because a hook that raises is a
    hook that interrupts a turn.

    Note the deliberate absence of `stderr=STDOUT`: under `--format json`
    the editor routes every marker line to stderr, so merging the streams
    is exactly what would break the parse.
    """
    try:
        import subprocess

        proc = subprocess.run(
            [
                cli_command(),
                "editor",
                "check-question-copy",
                text,
                "--format",
                "json",
            ],
            cwd=project_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=JARGON_CHECK_TIMEOUT_S,
        )
        doc = json.loads(proc.stdout.decode("utf-8", "replace"))
        return [row.get("term") for row in doc.get("entries", [])]
    except Exception:
        return []


# Seconds to wait for the audience recorder. Like the jargon check it is an
# observer: a slow binary costs the automatic save (the step's explicit
# `audience --set` instruction still stands) and never delays the turn more.
AUDIENCE_RECORD_TIMEOUT_S = 3

# Where a failed automatic save is noted, under .codeyam/logs/. The recorder
# exits 0 even when its write fails (a hook must never interrupt the turn),
# so without this line a save that never lands is indistinguishable from a
# question that was never asked.
AUDIENCE_RECORD_LOG = "audience-record.jsonl"

# The marker `audience --record-answer` prints on stderr when it recognised
# an answer but could not write it.
AUDIENCE_SAVE_FAILED_MARKER = "could not save the answer"


def _log_audience_record_failure(project_dir, reason, stderr_text=""):
    """Append one JSON line naming why an automatic audience save failed.

    Never raises and never prints: it is the failure path of an observer.
    """
    try:
        logs_dir = os.path.join(project_dir, ".codeyam", "logs")
        os.makedirs(logs_dir, exist_ok=True)
        line = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "stderrTail": (stderr_text or "")[-500:],
        }
        with open(os.path.join(logs_dir, AUDIENCE_RECORD_LOG), "a") as f:
            f.write(json.dumps(line) + "\n")
    except Exception:
        pass


def _audience_record_failure_reason(returncode, stderr_text):
    """Why a finished `audience --record-answer` run failed, or None.

    A non-zero exit is a failure; so is a zero exit carrying the recorder's
    own save-failed line, because the recorder deliberately exits 0 on a
    failed write.
    """
    if returncode != 0:
        return "exit-%d" % returncode
    if AUDIENCE_SAVE_FAILED_MARKER in (stderr_text or ""):
        return "save-failed"
    return None


def _record_audience_answer(project_dir, event_data):
    """Save the answer to the one-time "explain or keep it brief?" question.

    Asking and saving used to be two separate agent actions, and the save
    was the one that got dropped — so the preference stayed unset and the
    question came back. This hands every answered question to
    `audience --record-answer`, which decides in Rust whether it was the
    audience question (the label vocabulary lives beside the step copy that
    defines it) and records the choice. It prints nothing and never raises —
    a hook that raises interrupts the turn — but a save that fails (non-zero
    exit, the recorder's own failure line, a timeout, or an exception) is
    noted in `.codeyam/logs/audience-record.jsonl` so it is visible.
    """
    try:
        import subprocess

        payload = json.dumps(
            {
                "tool_input": event_data.get("tool_input", {}) or {},
                "tool_response": event_data.get("tool_response"),
            }
        )
        result = subprocess.run(
            [cli_command(), "editor", "audience", "--record-answer", "-"],
            cwd=project_dir,
            input=payload.encode("utf-8"),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            timeout=AUDIENCE_RECORD_TIMEOUT_S,
        )
        stderr_text = (result.stderr or b"").decode("utf-8", "replace")
        reason = _audience_record_failure_reason(result.returncode, stderr_text)
        if reason:
            _log_audience_record_failure(project_dir, reason, stderr_text)
    except Exception as e:
        # Classified by name, not `except subprocess.TimeoutExpired`: the
        # import is inside the try, so naming the module in an except clause
        # would itself raise if the import were what failed.
        if type(e).__name__ == "TimeoutExpired":
            _log_audience_record_failure(project_dir, "timeout")
        else:
            _log_audience_record_failure(project_dir, "exception: %s" % e)


# Seconds to wait for the step-task sign-in. An observer like the two above:
# a slow binary costs only the sign-in, and the task flag is already written.
STEP_TASK_SIGN_IN_TIMEOUT_S = 3


def _sign_in_step_task(project_dir):
    """Record this session as the workflow's holder when it takes a step task.

    On a harness without the Task tools, `track-step created` both writes the
    task flag and signs the caller in as the workflow holder. The TaskCreate
    path below wrote only the flag, so a build resumed after a context reset —
    which re-creates its step task under a NEW session id — stayed invisible:
    the step file kept naming the retired session, and `push` read that as "no
    running workflow" and gave up the commit-queue head the terminal step still
    needed. Running the same `track-step created` here makes both harnesses
    sign in at the same moment. A one-off push never creates a step task, so it
    still cannot keep the head for an abandoned build. Swallows every failure,
    including a live foreign holder's refusal: a hook that raises interrupts
    the turn.
    """
    try:
        import subprocess

        subprocess.run(
            [cli_command(), "editor", "track-step", "created"],
            cwd=project_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=STEP_TASK_SIGN_IN_TIMEOUT_S,
        )
    except Exception:
        pass


def _consume_question_bounce(project_dir, session_id):
    """Return True once after the pretool hook bounced this session's question.

    The pretool hook scores the real `AskUserQuestion` payload and bounces a
    payload with copy findings once, leaving `pending: true` in
    `.codeyam/run/question-copy-bounce.json` (a file the pretool hook owns;
    its shape is `{session_id: {"hashes": [...], "pending": bool}}`). The
    question that next reaches the user — revised or re-sent unchanged — is
    the one the bounce acted on, so it is logged with `bouncedFirst: true`
    and the flag is cleared. `question-copy-query --flagged` can then show
    whether a bounce changed the copy. Swallows every failure."""
    try:
        path = os.path.join(project_dir, ".codeyam", "run", "question-copy-bounce.json")
        with open(path, "r") as f:
            bounces = json.load(f)
        entry = bounces.get(session_id or "") if isinstance(bounces, dict) else None
        if not isinstance(entry, dict) or not entry.get("pending"):
            return False
        entry["pending"] = False
        with open(path, "w") as f:
            json.dump(bounces, f)
        return True
    except Exception:
        return False


def _log_question_copy(project_dir, event_data, in_cycle=True):
    """Append one line per question asked, to .codeyam/logs/question-copy.jsonl.

    `in_cycle=False` is a question asked outside an editor session. It is
    logged with a null slug and step — the ad-hoc shape — even when a stale
    `editor-step.json` from an earlier cycle is still on disk, because no
    step was in flight when it was asked.

    Written under `.codeyam/logs/` deliberately: that directory is already
    gitignored, so the log needs no new ignore rule and therefore no
    matching entry in `workspace_hygiene`'s LOCAL_ONLY_IGNORES declaration.
    `.codeyam/state/` is NOT ignored wholesale — only its `command-output/`
    subdirectory is — so putting it there would leak the log into commits.
    """
    try:
        tool_input = event_data.get("tool_input", {}) or {}
        questions = tool_input.get("questions", []) or []
        if not questions:
            return

        # Best-effort step context. A question asked outside a cycle (no
        # state file) still gets logged with nulls — those are exactly the
        # ad-hoc questions the contract most needs to see.
        slug = None
        step = None
        try:
            if in_cycle:
                state_path = os.path.join(project_dir, ".codeyam", "editor-step.json")
                with open(state_path, "r") as f:
                    state = json.load(f)
                slug = state.get("slug")
                step = state.get("step")
        except Exception:
            pass

        logs_dir = os.path.join(project_dir, ".codeyam", "logs")
        os.makedirs(logs_dir, exist_ok=True)
        log_path = os.path.join(logs_dir, QUESTION_COPY_LOG)
        now = datetime.now(timezone.utc).isoformat()
        bounced_first = _consume_question_bounce(project_dir, event_data.get("session_id", ""))

        with open(log_path, "a") as f:
            for question in questions:
                text = question.get("question", "") or ""
                options = [
                    option or {} for option in (question.get("options", []) or [])
                ]
                labels = [option.get("label", "") or "" for option in options]
                # Descriptions are recorded index-aligned with the labels:
                # `question-copy-query` judges each option on its label and
                # description together, and descriptions are where
                # identifiers leaked most.
                descriptions = [option.get("description", "") or "" for option in options]
                # Check the labels alongside the question: an option label
                # is a question the user has to answer too, and it is where
                # jargon leaks most.
                f.write(
                    json.dumps(
                        {
                            "ts": now,
                            "slug": slug,
                            "step": step,
                            "header": question.get("header", "") or "",
                            "question": text,
                            "optionLabels": labels,
                            "optionDescriptions": descriptions,
                            "flaggedTerms": _flagged_terms(
                                project_dir,
                                " ".join([text] + labels + descriptions),
                            ),
                            "bouncedFirst": bounced_first,
                        }
                    )
                    + "\n"
                )
    except Exception:
        pass


def _terminal_signal_missing(project_dir, state):
    """Return True if state.step is the terminal step AND the
    completion-signal field is absent from feature-finalized.json.

    Reads `totalSteps` from the marker (written by save_step_state at the
    terminal step). If the marker is absent, this is not a terminal-step
    completion attempt — return False so the hook falls through to the
    normal tracking write. If the marker exists with `featureCompleteSignaledAt`
    set, the gate is satisfied — return False. Otherwise the agent is trying
    to mark the terminal-step task done before `editor feature-complete`
    actually fired — return True so the hook refuses the write.
    """
    try:
        marker_path = os.path.join(project_dir, ".codeyam", "feature-finalized.json")
        if not os.path.exists(marker_path):
            return False
        with open(marker_path, "r") as f:
            marker = json.load(f)
        total = int(marker.get("totalSteps", 0))
        step = int(state.get("step", 0) or 0)
        if total <= 0 or step < total:
            return False
        return not marker.get("featureCompleteSignaledAt")
    except Exception:
        return False


def detect_event():
    """Detect whether this is a PostToolUse, Stop, UserPromptSubmit, or SessionStart hook from stdin."""
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return "unknown", {}
        data = json.loads(raw)
        if data.get("hook_event_name") == "SessionStart":
            return "session_start", data
        if "tool_name" in data:
            return "post_tool_use", data
        elif "stop_hook_active" in data:
            return "stop", data
        elif "prompt" in data:
            return "user_prompt", data
        return "unknown", data
    except Exception:
        return "unknown", {}


# Only genuinely-deferred tools belong here. `AskUserQuestion` is a *resident*
# top-level tool in editor PTY sessions (it is not in the session's deferred
# registry), so a `select:AskUserQuestion` preload was a guaranteed wasted
# round-trip — it either re-fetched an already-available schema or, on harnesses
# where it is not deferred, came back "no matching deferred tools".
#
# The Task* tools are deferred on SOME harnesses and absent from others. This
# comment used to assert they "ARE deferred and must be preloaded", and that
# sentence is what kept the preload unconditional: on the fleet the lookup
# returns nothing every time, so 39 of 39 measured sessions paid a
# guaranteed-empty round-trip and then read ~20 step directives prescribing a
# tool they could not call. Neither answer can be hard-coded — a laptop session
# genuinely needs the preload — so the preload still fires once, and what the
# session OBSERVES is recorded (`taskToolsAvailable` below) and honored from
# then on.
TOOL_LOADING_SELECT_QUERY = "select:TaskCreate,TaskList,TaskUpdate,TaskGet"

# SessionStart preloads one extra tool beyond the gate-step set: `Monitor`,
# for watching a condition the harness will not notify about. Loading its
# schema once up front means the first such call never hits the
# `Monitor`-before-its-schema-is-loaded `InputValidationError` that
# historically triggered a fallback to polling loops. Monitor is NOT how a
# backgrounded long command (refresh-tests, session-finalize, rebuild-self) is
# awaited — that completion notification arrives on its own and
# `editor wait-for` is the same-turn blocking path; see
# `steps/library/fragments/background_wait_block.txt`. It is NOT in the
# per-prompt gate-tool query because it is not a gate-step tool — only the
# session-entry preload needs it.
#
# It is a SEPARATE query from `TOOL_LOADING_SELECT_QUERY`, and that separation
# is load-bearing rather than cosmetic. This was once
# `TOOL_LOADING_SELECT_QUERY + ",Monitor"`, and concatenating them silently
# disabled the capability mechanism above: `Monitor` resolves on every harness,
# so the combined lookup can never come back "no matching deferred tools" and —
# on a harness without the Task* tools — never carries a Task* schema either.
# `_observe_task_tool_capability` saw neither signal, recorded nothing, and
# `task_tools_available()` stayed None for the whole session. Measured across 42
# fleet sessions: the combined query settled the question 0 times out of 42, and
# 12 of those sessions then obeyed a step directive to call `TaskCreate` and hit
# `No such tool available`. Asking the two questions separately is what lets the
# Task* half answer.
SESSION_START_MONITOR_QUERY = "select:Monitor"


# Marker recording the harness session that last received the per-prompt
# tool-loading-protocol injection. Keyed by session_id so the block fires at
# most ONCE per session instead of on every UserPromptSubmit — the wasted
# re-injection the fleet observed on every resumed prompt.
_TOOL_LOADING_MARKER_REL = os.path.join(".codeyam", "state", "tool-loading-injected.json")


def _tool_loading_already_injected(project_dir, session_id):
    """Return True if the tool-loading-protocol was already injected for this
    session. When session_id is absent (older harness payloads that omit it),
    return False so the block still fires — fail-open preserves the pre-one-shot
    behavior rather than silently suppressing the preload for the whole session.
    """
    if not session_id:
        return False
    marker_path = os.path.join(project_dir, _TOOL_LOADING_MARKER_REL)
    try:
        with open(marker_path, "r") as f:
            return json.load(f).get("session_id") == session_id
    except (IOError, json.JSONDecodeError):
        return False


def _mark_tool_loading_injected(project_dir, session_id):
    """Record that this session received the tool-loading-protocol so later
    prompts in the same session skip it. No-op when session_id is absent (the
    fail-open path keeps injecting rather than persisting an unkeyed marker).

    Writes a FRESH document, deliberately dropping any `taskToolsAvailable`
    a previous session recorded. That reset is what lets the editor read the
    field without knowing a session id: whatever value is present always
    belongs to the session currently running."""
    if not session_id:
        return
    marker_path = os.path.join(project_dir, _TOOL_LOADING_MARKER_REL)
    try:
        os.makedirs(os.path.dirname(marker_path), exist_ok=True)
        with open(marker_path, "w") as f:
            json.dump({"session_id": session_id}, f)
    except Exception:
        pass


def _reset_task_tool_marker(project_dir):
    """Forget the previous session's tool-loading marker at SessionStart.

    `_mark_tool_loading_injected` resets `taskToolsAvailable` only when the
    injection fires, and the injection stops firing once the machine record
    says the tools are absent. From then on the marker kept whatever an
    earlier session wrote, and the editor (which reads the field without a
    session id) trusted it: VM 17's marker read `true` for sessions that
    never had the tools, so every hand-off rendered the TaskCreate block.
    Removing the file here makes the field describe only the session that is
    starting; the editor then falls back to the machine record."""
    try:
        os.remove(os.path.join(project_dir, _TOOL_LOADING_MARKER_REL))
    except OSError:
        pass


# Marker recording what the step context last went out for, so the unchanged
# copies stop. UserPromptSubmit used to inline the whole editor-mode-context.md
# (up to ~4,800 characters) on EVERY prompt, and PostToolUse re-printed the
# step restriction after EVERY Bash/Write/Edit call — 3,528 Bash + 1,055 Edit
# copies across 30 measured sessions, all identical until the step changed.
# The step directives and restriction are keyed on (session, feature, step,
# label) and re-fire only when that key moves. The editor-mode-context.md block
# has its own key, (session, digest of the file's content): nothing in it
# depends on the step, so keying it on the step re-sent ~2.4k identical tokens
# at every advance. It now goes out once per session, and again only when the
# file is genuinely rewritten (a provider switch). SessionStart deletes the
# marker, so a compaction (which summarizes the earlier copies away) re-emits
# both on the next event.
#
# Unlike the tool-loading marker this does NOT fail open when session_id is
# absent: the key's session part is simply empty, so a payload without one is
# still deduped by (feature, step, label) rather than re-injecting every time.
_STEP_CONTEXT_MARKER_REL = os.path.join(".codeyam", "state", "step-context-injected.json")

# The restriction is still re-printed every Nth tool call within one step, so
# a long step keeps it in recent view without paying for it on every call.
STEP_REMINDER_EVERY_N_CALLS = 25


def _step_injection_key(session_id, feature, step, label):
    return f"{session_id or ''}|{feature}|{step}|{label}"


def _context_injection_key(session_id, context_text):
    digest = hashlib.sha256(context_text.encode("utf-8")).hexdigest()[:16]
    return f"{session_id or ''}|{digest}"


def _read_step_context_marker(project_dir):
    try:
        with open(os.path.join(project_dir, _STEP_CONTEXT_MARKER_REL), "r") as f:
            marker = json.load(f)
        return marker if isinstance(marker, dict) else {}
    except (IOError, ValueError):
        return {}


def _write_step_context_marker(project_dir, marker):
    marker_path = os.path.join(project_dir, _STEP_CONTEXT_MARKER_REL)
    try:
        os.makedirs(os.path.dirname(marker_path), exist_ok=True)
        with open(marker_path, "w") as f:
            json.dump(marker, f)
    except Exception:
        pass


def _clear_step_context_marker(project_dir):
    try:
        os.remove(os.path.join(project_dir, _STEP_CONTEXT_MARKER_REL))
    except OSError:
        pass


def _step_context_due(project_dir, key):
    """True when the full step context has not yet gone out for `key`, and
    records that it now has. An unwritable marker re-reads as absent, so the
    failure mode is the old every-prompt injection, never silence."""
    marker = _read_step_context_marker(project_dir)
    if marker.get("promptKey") == key:
        return False
    marker["promptKey"] = key
    _write_step_context_marker(project_dir, marker)
    return True


def _editor_context_due(project_dir, key):
    """True when the editor-mode-context block has not yet gone out for `key`
    (session + content digest), and records that it now has. Fails toward
    re-injection the same way `_step_context_due` does."""
    marker = _read_step_context_marker(project_dir)
    if marker.get("contextKey") == key:
        return False
    marker["contextKey"] = key
    _write_step_context_marker(project_dir, marker)
    return True


def _editor_context_lines(project_dir, session_id):
    """The `<editor-mode-context>` block as prompt lines when it is due for this
    session and content, else `[]`. A missing or unreadable file yields `[]`."""
    context_path = os.path.join(project_dir, ".codeyam", "editor-mode-context.md")
    try:
        with open(context_path, "r") as f:
            context_text = f.read().strip()
    except Exception:
        return []
    if not _editor_context_due(
        project_dir, _context_injection_key(session_id, context_text)
    ):
        return []
    return ["\n<editor-mode-context>", context_text, "</editor-mode-context>\n"]


# ── Foreign-prompt detector ────────────────────────────────────────────
#
# A prompt written for an earlier conversation can reach a later one: a
# check-in the pre-`/clear` conversation scheduled for itself fires after a
# phase-boundary reset, and tells the fresh conversation to "continue step
# 11" while the workflow sits at 17, citing the old conversation's
# scratchpad. The harness owns that routing and we cannot cancel it, so the
# hook judges the prompt's CONTENT against the conversation and step it
# lands in. It warns and never blocks: a user who really means "go back to
# step 11" must still be able to say so.

FOREIGN_PROMPT_LOG = "foreign-prompts.jsonl"

_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
# A Claude scratchpad (`/tmp/claude-<uid>/<escaped-cwd>/<uuid>/scratchpad`,
# under `/tmp` or macOS's `/private/tmp`) and a transcript
# (`~/.claude/projects/<escaped-cwd>/<uuid>.jsonl`) are both keyed on the
# conversation that owns them, so the uuid in either is that conversation.
_CONVERSATION_PATH_RES = (
    re.compile(r"/claude-[^/\s]+/[^/\s]+/(" + _UUID + r")/scratchpad", re.I),
    re.compile(r"\.claude/projects/[^/\s]+/(" + _UUID + r")\.jsonl", re.I),
)
# `step 11`, `editor step 11`, `step --show 11`. A `N/M` banner ("Step 4/21")
# is a position readout, not a request, so a trailing `/` disqualifies it.
_STEP_MENTION_RE = re.compile(
    r"\bstep\s+(?:(--[a-z-]+)\s+)?(\d{1,3})\b(?!\s*/)(\s+--[a-z-]+)?", re.I
)
# Flags that already name a read or a deliberate move, so the mention is no
# stray rewind.
_DELIBERATE_STEP_FLAGS = {"--show", "--repair", "--undo-checkpoint", "--back"}


def _foreign_conversation_ids(prompt_text, session_id):
    """Conversation uuids of every scratchpad/transcript `prompt_text` cites
    that is not `session_id`'s own, in first-seen order. Empty when there is
    no `session_id` to compare against."""
    if not session_id:
        return []
    own = str(session_id).lower()
    foreign_ids = []
    for pattern in _CONVERSATION_PATH_RES:
        for match in pattern.finditer(prompt_text):
            uuid = match.group(1).lower()
            if uuid != own and uuid not in foreign_ids:
                foreign_ids.append(uuid)
    return foreign_ids


def _steps_behind(prompt_text, current_step, mode):
    """Steps `prompt_text` asks for that lie below the live build pointer, in
    first-seen order. Step 1 is excepted (the documented new-cycle entry),
    mentions carrying a read/deliberate flag are skipped, and non-build tracks
    are skipped entirely since they do not walk the build's numbering."""
    if not isinstance(current_step, int) or not mode_is_build(mode):
        return []
    named_steps = []
    for match in _STEP_MENTION_RE.finditer(prompt_text):
        flags = {f.strip().lower() for f in (match.group(1), match.group(3)) if f}
        if flags & _DELIBERATE_STEP_FLAGS:
            continue
        named = int(match.group(2))
        if 1 < named < current_step and named not in named_steps:
            named_steps.append(named)
    return named_steps


def _foreign_prompt_findings(prompt_text, session_id, current_step, mode):
    """Why `prompt_text` looks written for another conversation or an earlier
    point in this workflow, as `(findings, foreign_ids, named_steps)`.

    Composes two independent signals: a cited scratchpad/transcript owned by
    another conversation, and a `step <N>` below the live build pointer."""
    if not isinstance(prompt_text, str) or not prompt_text:
        return [], [], []
    foreign_ids = _foreign_conversation_ids(prompt_text, session_id)
    named_steps = _steps_behind(prompt_text, current_step, mode)
    own = str(session_id).lower() if session_id else ""
    findings = [
        f"it cites a scratchpad or transcript belonging to conversation "
        f"{uuid}, not this one ({own})"
        for uuid in foreign_ids
    ] + [
        f"it names step {named}, but the workflow is at step {current_step}"
        for named in named_steps
    ]
    return findings, foreign_ids, named_steps


def _log_foreign_prompt(project_dir, row):
    """Append one row to `.codeyam/logs/foreign-prompts.jsonl`. Best-effort:
    a log failure must never cost the agent the warning itself."""
    try:
        logs_dir = os.path.join(project_dir, ".codeyam", "logs")
        os.makedirs(logs_dir, exist_ok=True)
        with open(os.path.join(logs_dir, FOREIGN_PROMPT_LOG), "a") as f:
            f.write(json.dumps(row) + "\n")
    except Exception:
        pass


def _foreign_prompt_lines(project_dir, event_data, step, mode):
    """The `<foreign-prompt-warning>` block for this prompt, or `[]`.

    Emitted on EVERY matching prompt, not once per session: each leftover is
    its own hazard. Each warning also appends one row to the foreign-prompt
    log — lengths and ids only, never the prompt text."""
    prompt_text = event_data.get("prompt")
    session_id = event_data.get("session_id")
    findings, foreign_ids, named_steps = _foreign_prompt_findings(
        prompt_text, session_id, step, mode
    )
    if not findings:
        return []
    _log_foreign_prompt(
        project_dir,
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "sessionId": session_id,
            "foreignSessionIds": foreign_ids,
            "namedSteps": named_steps,
            "currentStep": step,
            "mode": mode,
            "promptLength": len(prompt_text),
        },
    )
    show_step = named_steps[0] if named_steps else "<N>"
    return [
        "",
        "<foreign-prompt-warning>",
        "This prompt may have been written for an earlier conversation or an "
        "earlier point in this workflow (a check-in scheduled before a context "
        "reset can still arrive afterwards):",
        *[f"  - {finding}" for finding in findings],
        f"Do not act on it yet. To read what it refers to without moving the "
        f"workflow, use `{cli_command()} editor step --show {show_step}`. Ask the "
        "user whether it still applies before following it.",
        "</foreign-prompt-warning>",
    ]


# ── Stale-wakeup detector ──────────────────────────────────────────────
#
# A fallback wakeup armed through `wakeup-arm` carries its token in its own
# prompt (`cyw1|<mode>|<step>|<feature epoch>`). The harness cannot cancel a
# scheduled wakeup, so it fires whether or not the work it hedged finished —
# hours later, after a `/clear`, into another feature, where it once drove
# `track-step` and `advance` on the wrong workflow. Agents did not reliably
# run `wakeup-check` themselves, so the hook judges the token before the
# agent reads the prompt.

# The epoch is `-` or an RFC 3339 stamp, spelled out so trailing prose
# punctuation ("…32Z.") is never read into it — a token whose epoch gained a
# character would compare as another feature's and judge a live wakeup STALE.
_WAKEUP_TOKEN_RE = re.compile(
    r"\bcyw1\|[A-Za-z-]+\|\d{1,3}\|"
    r"(?:-(?![\w:])|\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-]\d{2}:\d{2}))"
)
_WAKEUP_CHECK_TIMEOUT_S = 10


def _wakeup_tokens(prompt_text):
    """Every distinct wakeup token in `prompt_text`, in first-seen order."""
    if not isinstance(prompt_text, str):
        return []
    tokens = []
    for match in _WAKEUP_TOKEN_RE.finditer(prompt_text):
        if match.group(0) not in tokens:
            tokens.append(match.group(0))
    return tokens


def _wakeup_check(project_dir, token):
    """The `wakeup-check --format json` verdict for `token`, or None when it
    cannot be had (an older binary, a timeout, unparseable output). Every
    failure collapses to None: a hook that raised would cost the agent its
    prompt."""
    import subprocess as _sp

    try:
        result = _sp.run(
            [cli_command(), "editor", "wakeup-check", "--token", token, "--format", "json"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=_WAKEUP_CHECK_TIMEOUT_S,
        )
    except Exception:
        return None
    if result.returncode != 0:
        return None
    try:
        verdict = json.loads(result.stdout)
    except ValueError:
        return None
    return verdict if isinstance(verdict, dict) else None


def _wakeup_checker(project_dir):
    """A memoized `token -> verdict` reader. Each verdict is a subprocess AND
    prunes its token's record, so every reader of one prompt must share the
    same checker rather than asking twice."""
    verdicts = {}

    def check(token):
        if token not in verdicts:
            verdicts[token] = _wakeup_check(project_dir, token)
        return verdicts[token]

    return check


# The fallback wakeup's own prompt (`wakeup.rs::wakeup_prompt_line`) once its
# token is removed. Matched loosely on the binary name inside the backticks, so
# a `codeyam-editor-dev` arm is recognised too.
_WAKEUP_TEMPLATE_RE = re.compile(
    r"Before doing anything else, run `[^`]*wakeup-check --token\s*`\.\s*"
    r"If it reports STALE, .*? also\s+without re-fetching\.",
    re.S,
)


def _is_wakeup_template_only(prompt_text, tokens):
    """Whether `prompt_text` is nothing but the wakeup's template around its
    `tokens` — no text a user typed alongside it."""
    rest = prompt_text
    for token in tokens:
        rest = rest.replace(token, "")
    return not _WAKEUP_TEMPLATE_RE.sub("", rest).strip()


_STALE_WAKEUP_BLOCK_REASON = (
    "Dropped a leftover CodeYam check-in reminder: it was set for work that has "
    "already finished, so the agent was not woken for it."
)


def _question_open(project_dir):
    """Whether a question to the user is open (the awaiting-user marker). Must
    be read before the prompt hook removes that marker."""
    return os.path.exists(
        os.path.join(project_dir, ".codeyam", "run", "awaiting-user.json")
    )


def _stale_wakeup_refusal(project_dir, event_data, check):
    """The `{"decision": "block"}` document refusing a fully-stale wakeup
    prompt, or None to let the prompt through. A refusal is logged to the
    foreign-prompt log, since the agent never sees the prompt it erased.

    A question open when the wakeup fired is never refused: the agent must
    re-ask it, which needs the turn a block erases."""
    prompt_text = event_data.get("prompt")
    reason = _stale_wakeup_decision(prompt_text, check, _question_open(project_dir))
    if not reason:
        return None
    _log_foreign_prompt(
        project_dir,
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "sessionId": event_data.get("session_id"),
            "kind": "stale-wakeup-blocked",
            "tokens": _wakeup_tokens(prompt_text),
        },
    )
    return json.dumps({"decision": "block", "reason": reason})


def _stale_wakeup_decision(prompt_text, check, question_open):
    """The reason to refuse this prompt outright, or None to let it through.

    Refused only when every token in it is STALE, no question to the user was
    open when it fired (the agent must re-ask that, which needs a turn), and
    the prompt is only the wakeup's template (a user may have typed alongside
    it). Anything else keeps today's `<stale-wakeup>` advisory path."""
    if not isinstance(prompt_text, str) or question_open:
        return None
    tokens = _wakeup_tokens(prompt_text)
    if not tokens:
        return None
    for token in tokens:
        verdict = check(token)
        if not (verdict and verdict.get("stale") is True):
            return None
    if not _is_wakeup_template_only(prompt_text, tokens):
        return None
    return _STALE_WAKEUP_BLOCK_REASON


def _stale_wakeup_lines(project_dir, event_data, check=None):
    """The `<stale-wakeup>` block for this prompt, or `[]`.

    Only a token the editor itself judges STALE produces one; a LIVE or
    WAITING wakeup, or one the editor could not judge, passes through
    untouched."""
    if check is None:
        check = _wakeup_checker(project_dir)

    prompt_text = event_data.get("prompt")
    return _stale_wakeup_block(
        _stale_wakeup_reasons(prompt_text, check),
        end_loop=_stale_wakeup_ends_loop(prompt_text, check),
    )


def _stale_wakeup_ends_loop(prompt_text, check):
    """True when any STALE verdict for a token in `prompt_text` says nothing is
    left waiting (`endLoop`), so the whole check-in loop should be stopped."""
    for token in _wakeup_tokens(prompt_text):
        verdict = check(token)
        if verdict and verdict.get("stale") is True and verdict.get("endLoop") is True:
            return True
    return False


def _stale_wakeup_reasons(prompt_text, check):
    """One reason per token in `prompt_text` that `check` judges STALE.

    `check` maps a token to its `wakeup-check` verdict dict, or None when no
    verdict could be had — which, like LIVE and WAITING, yields no reason."""
    reasons = []
    for token in _wakeup_tokens(prompt_text):
        verdict = check(token)
        if verdict and verdict.get("stale") is True:
            reasons.append(verdict.get("reason") or "the workflow has moved on")
    return reasons


def _stale_wakeup_block(reasons, end_loop=False):
    """The `<stale-wakeup>` lines naming each reason, or `[]` for none.

    `end_loop` adds the one action a stale wakeup still owes: stopping the
    check-in loop, which otherwise re-fires every ~20 minutes after the
    feature is done."""
    if not reasons:
        return []
    loop_line = (
        ["Nothing is waiting. End the check-in loop now: call `ScheduleWakeup` with "
         "`stop: true`, so no more of these fire."]
        if end_loop
        else []
    )
    return [
        "",
        "<stale-wakeup>",
        "STALE: dismiss without acting. This prompt is a fallback wakeup armed for "
        "work that has already finished or belongs to another feature:",
        *[f"  - {reason}" for reason in reasons],
        "Run nothing it asks for — no `track-step`, no `advance`, no step command — "
        "and do not re-fetch step context. Tell the user in one line that a leftover "
        "wakeup fired and was dismissed. Ask the user nothing new on this turn; if a "
        "question to the user was open when it arrived, ask that question again.",
        *loop_line,
        "</stale-wakeup>",
    ]


# ── Arrived-during-reset detector ──────────────────────────────────────
#
# The backstop for a prompt with no wakeup token to judge. A phase-boundary
# reset types `/clear` and then a resume prompt; anything the PREVIOUS
# conversation scheduled can land between the two, and the fresh
# conversation then reads it as its first instruction (VM 13: a freehand
# "resume step 9" wakeup arrived 52s ahead of the resume, at step 15). While
# the server's own records say a reset is in flight, any prompt that is not
# the resume is marked possibly stale. The windows mirror the server's
# (`PENDING_STALE_SECS` in context_reset.rs, `DELIVERY_STALE_SECS` in
# context_reset_delivery.rs), so a record the server has abandoned holds
# nothing here either.

_RESET_PENDING_REL = os.path.join(".codeyam", "state", "context-reset-pending.json")
_RESET_DELIVERY_REL = os.path.join(".codeyam", "state", "context-reset-delivering.json")
_RESET_PENDING_WINDOW_S = 600
_RESET_DELIVERY_WINDOW_S = 120
# A sentence of `resume_prompt_keystrokes` (context_reset.rs) that nothing
# else the server types carries.
_RESUME_PROMPT_MARK = "The previous conversation was reset at a workflow phase boundary"


def _read_json_dict(path):
    """The JSON object at `path`, or None when it is absent, unreadable, or
    not an object."""
    try:
        with open(path, "r") as f:
            doc = json.load(f)
    except (OSError, ValueError):
        return None
    return doc if isinstance(doc, dict) else None


def _record_is_for(record_session, own_session):
    """Whether a reset record keyed on `record_session` concerns this agent.
    Unknown on either side counts as ours: a missed warning is the failure
    this exists to prevent, and a spurious one only asks for a dismissal."""
    return not record_session or not own_session or record_session == own_session


def _parse_rfc3339_unix(stamp):
    """Unix seconds for an RFC 3339 `stamp`, or None when it does not parse.

    chrono's `to_rfc3339` writes nanoseconds; `fromisoformat` before Python
    3.11 accepts at most six fraction digits, so the excess is trimmed."""
    if not isinstance(stamp, str) or not stamp:
        return None
    trimmed = re.sub(r"(\.\d{6})\d+", r"\1", stamp).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(trimmed)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.timestamp()


def _within_window(since_unix, now_unix, window_s):
    """True when `since_unix` is no later than `now_unix` and less than
    `window_s` seconds before it."""
    return since_unix is not None and 0 <= now_unix - since_unix < window_s


def _pending_reset_active(pending, own_session, now_unix):
    """Whether a `context-reset-pending.json` record is this agent's and
    still inside the server's pending window."""
    if not pending or not _record_is_for(pending.get("editorSessionId"), own_session):
        return False
    created = _parse_rfc3339_unix(pending.get("createdAt"))
    return _within_window(created, now_unix, _RESET_PENDING_WINDOW_S)


def _delivery_reset_active(delivery, own_session, now_unix):
    """Whether a `context-reset-delivering.json` record is this agent's and
    still inside the server's delivery window."""
    if not delivery:
        return False
    record = delivery.get("pending") if isinstance(delivery.get("pending"), dict) else {}
    at_unix = delivery.get("atUnix")
    if isinstance(at_unix, bool) or not isinstance(at_unix, (int, float)):
        return False
    return _record_is_for(record.get("editorSessionId"), own_session) and _within_window(
        at_unix, now_unix, _RESET_DELIVERY_WINDOW_S
    )


def _reset_in_flight(project_dir, own_session, now_unix):
    """True while a phase-boundary reset for this agent is pending or being
    delivered and its resume prompt has not landed."""
    pending = _read_json_dict(os.path.join(project_dir, _RESET_PENDING_REL))
    delivery = _read_json_dict(os.path.join(project_dir, _RESET_DELIVERY_REL))
    return _pending_reset_active(pending, own_session, now_unix) or _delivery_reset_active(
        delivery, own_session, now_unix
    )


def _reset_exempt_prompt(stripped):
    """Whether a prompt is one the reset detector must never mark: the resume
    prompt itself, a slash command (the reset's own `/clear`), or a tokened
    prompt (the stale-wakeup detector judges those exactly)."""
    return (
        _RESUME_PROMPT_MARK in stripped
        or stripped.startswith("/")
        or bool(_wakeup_tokens(stripped))
    )


def _reset_arrival_lines(project_dir, prompt_text, own_session, now_unix):
    """The `<arrived-during-reset>` block for this prompt, or `[]`.

    Fires only for a prompt `_reset_exempt_prompt` does not exempt, and only
    while a reset is in flight."""
    if not isinstance(prompt_text, str) or not prompt_text.strip():
        return []
    if _reset_exempt_prompt(prompt_text.strip()):
        return []
    if not _reset_in_flight(project_dir, own_session, now_unix):
        return []
    return [
        "",
        "<arrived-during-reset>",
        "POSSIBLY STALE: this prompt arrived while a phase-boundary context reset is "
        "in flight, before its resume prompt. It is most likely a check-in or "
        "notification the previous conversation scheduled for itself, not an "
        "instruction for this one.",
        "Do not act on it: run nothing it asks for and ask the user nothing about it. "
        "Say in one line that a leftover prompt arrived during the reset and was set "
        "aside, then end the turn — the resume prompt carries the workflow forward.",
        "</arrived-during-reset>",
    ]


def _step_reminder_due(project_dir, key):
    """True on the first reminder-bearing tool call for `key` and on every
    STEP_REMINDER_EVERY_N_CALLS-th call after it; counts this call either way."""
    marker = _read_step_context_marker(project_dir)
    calls = marker.get("toolCalls", 0) if marker.get("toolKey") == key else 0
    if not isinstance(calls, int):
        calls = 0
    marker["toolKey"] = key
    marker["toolCalls"] = calls + 1
    _write_step_context_marker(project_dir, marker)
    return calls % STEP_REMINDER_EVERY_N_CALLS == 0


def _task_tools_available(project_dir):
    """Return what this session observed about the Task* tools: True, False,
    or None for not-yet-known.

    Read unkeyed on purpose. A recorded `True` is cleared by the next
    session's first prompt (`_mark_tool_loading_injected` rewrites the
    document); a recorded `False` deliberately persists, which is what stops
    the fleet paying the empty lookup in every subsequent session. A `False`
    that has gone WRONG — the same project on a harness that does have the
    tools — self-corrects on that session's first ToolSearch, because the
    SessionStart preload is unconditional. Until it does, the session renders
    the `track-step` procedure, which works on every harness.

    Anything unreadable is None, and None behaves exactly as the hook behaved
    before the field existed."""
    marker_path = os.path.join(project_dir, _TOOL_LOADING_MARKER_REL)
    try:
        with open(marker_path, "r") as f:
            value = json.load(f).get("taskToolsAvailable")
    except (IOError, json.JSONDecodeError):
        return None
    return value if isinstance(value, bool) else None


def _record_task_tools_available(project_dir, available):
    """Persist an observation about Task* availability beside the session
    marker. Merges into the existing document so the session id survives; a
    missing or corrupt document is replaced rather than left to poison every
    later read."""
    marker_path = os.path.join(project_dir, _TOOL_LOADING_MARKER_REL)
    try:
        doc = {}
        try:
            with open(marker_path, "r") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                doc = loaded
        except (IOError, json.JSONDecodeError):
            pass
        if doc.get("taskToolsAvailable") is available:
            return
        doc["taskToolsAvailable"] = available
        os.makedirs(os.path.dirname(marker_path), exist_ok=True)
        with open(marker_path, "w") as f:
            json.dump(doc, f)
    except Exception:
        pass


# Substrings that identify a ToolSearch that found nothing, and a Task* call
# the harness refused. Both are the SAME observation — this session has no
# task tool — arriving by two routes, because a harness that hides the tools
# from `ToolSearch` may still surface a call to them as a hard error.
_NO_MATCHING_TOOLS_MARKERS = ("no matching deferred tools",)
_TOOL_UNAVAILABLE_MARKERS = ("no such tool available", "is disabled for this session")

# The step-tracking tools, lowercased for substring matching. ONE tuple feeds
# both the query side (`_looks_like_task_tool_query`) and the response side
# (`_observe_task_tool_capability`), so the set of names a query is recognized
# by can never drift from the set its answer is judged against.
_TASK_TOOL_NAMES = ("taskcreate", "tasklist", "taskupdate", "taskget")


def _looks_like_task_tool_query(query):
    """True when a ToolSearch query is the Task* preload this hook prescribes.

    Matched on the tool NAMES rather than the exact query string so a caller
    that reorders them, or searches for a subset, still settles the question."""
    lowered = (query or "").lower()
    return "select:" in lowered and any(
        name in lowered for name in _TASK_TOOL_NAMES
    )


def _task_tools_in_search_result(tool_response, query=""):
    """True when a Task*-preload response carries a Task* schema, else False.

    Only ever called for a query `_looks_like_task_tool_query` accepted, so the
    question is already narrowed to "did the tools we asked for come back?" —
    which makes the no-Task*-name case an ANSWER (they are absent), not silence.
    Deciding on the names present rather than on the harness's "nothing matched"
    wording is what lets a PARTIAL result settle it: a query that resolved only
    its non-Task* names returns False here instead of going unrecorded.

    Claude Code hands PostToolUse a STRUCTURED response —
    `{"matches": [], "query": "select:TaskCreate,…", "total_deferred_tools": N}`
    — not the "No matching deferred tools found" text the model is shown. The
    echoed `query` carries every Task* name that was asked for, so a name scan
    over the whole document read every empty answer as a hit and recorded
    `True` on the fleet, where the tools never exist. So the `matches` list is
    the answer when there is one; only an unstructured response falls back to
    scanning the text, with the query echo removed first."""
    if isinstance(tool_response, dict) and isinstance(tool_response.get("matches"), list):
        names = json.dumps(tool_response["matches"], default=str).lower()
        return any(name in names for name in _TASK_TOOL_NAMES)
    blob = json.dumps(tool_response, default=str).lower() if tool_response else ""
    if any(marker in blob for marker in _NO_MATCHING_TOOLS_MARKERS):
        return False
    lowered_query = (query or "").lower()
    if lowered_query:
        blob = blob.replace(lowered_query, "")
    return any(name in blob for name in _TASK_TOOL_NAMES)


def _observe_task_tool_capability(project_dir, tool_name, tool_input, tool_response):
    """Record what a just-finished tool call proves about Task* availability.

    Three signals, in the order they arrive in a real session: a Task* preload
    whose answer carried no Task* schema (False), a Task* call the harness
    refused (False), and a Task* call that worked (True).

    A tool call this function was not asked about — an unrelated `ToolSearch`,
    any non-Task* tool — is not evidence and is ignored; silence must never be
    read as an absence. A Task* preload that came back WITHOUT them is the
    opposite case and must not be mistaken for silence: it is the absence."""
    # Name-check BEFORE serializing: this runs on every PostToolUse, and a
    # `Read` of a large file would otherwise pay a full stringify to learn it
    # is not a tool this function cares about. Matched on the step-tracking
    # NAMES, not a `Task` prefix: `TaskStop` / `TaskOutput` manage background
    # shells, exist on harnesses with no step-tracking tools, and a working one
    # is no evidence that `TaskCreate` exists.
    if tool_name != "ToolSearch" and tool_name.lower() not in _TASK_TOOL_NAMES:
        return
    if tool_name == "ToolSearch":
        query = (tool_input or {}).get("query")
        if not _looks_like_task_tool_query(query):
            return
        # Either way this is a recorded answer. Recording the positive matters
        # as much as the negative: the SessionStart preload fires on a machine
        # with nothing recorded, so a harness that GAINS the tools re-settles
        # here rather than staying on `track-step` forever.
        _settle_task_tools(project_dir, _task_tools_in_search_result(tool_response, query))
        return
    blob = json.dumps(tool_response, default=str).lower() if tool_response else ""
    _settle_task_tools(
        project_dir, not any(marker in blob for marker in _TOOL_UNAVAILABLE_MARKERS)
    )


# What THIS MACHINE has learned about the Task* tools, beyond the current
# session. Shared with `machine_task_tools::MACHINE_TASK_TOOLS_REL` in the
# control-api crate, which reads it for the resume prompt and the step
# hand-off, and which `editor track-step` also writes.
_MACHINE_TASK_TOOLS_REL = os.path.join(".codeyam", "state", "harness-capabilities.json")

# Told to a fresh conversation while the machine record says the tools are
# absent. Kept word-for-word with `TASK_TOOLS_ABSENT_SENTENCE` in
# `crates/control-api/src/machine_task_tools.rs`.
_TASK_TOOLS_ABSENT_SENTENCE = (
    "Task tools are not available in this harness (already observed on this "
    "machine) — record step tasks with `codeyam-editor editor track-step "
    "created|completed`; do not search for them."
)


def _machine_task_tools_absent(project_dir):
    """True when this machine has recorded that its harness has no Task*
    tools. Anything unreadable is False, which keeps the preload."""
    try:
        with open(os.path.join(project_dir, _MACHINE_TASK_TOOLS_REL), "r") as f:
            return json.load(f).get("taskTools") == "absent"
    except (IOError, ValueError, AttributeError):
        return False


def _settle_task_tools(project_dir, available):
    """Record an observation for the session AND for the machine.

    An absence is written to the machine record so the next conversation is
    told up front; a presence removes it, so a machine whose harness gains the
    tools stops being told to skip them."""
    _record_task_tools_available(project_dir, available)
    _record_machine_task_tools(project_dir, available)


def _record_machine_task_tools(project_dir, available):
    """Write (absent) or remove (available) the machine record. A no-op when
    an absence is already recorded, so the first observation time survives.
    Never raises: a hook failure must not break the tool call it observes."""
    path = os.path.join(project_dir, _MACHINE_TASK_TOOLS_REL)
    try:
        if available:
            if os.path.exists(path):
                os.remove(path)
        elif not _machine_task_tools_absent(project_dir):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w") as f:
                json.dump(
                    {
                        "taskTools": "absent",
                        "observedBy": "step-hook",
                        "observedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    },
                    f,
                )
                f.write("\n")
    except Exception:
        pass


def _session_start_tool_preload(project_dir):
    """The SessionStart tool-preload instructions, ending in a newline.

    With the machine record present the Task* question is already answered, so
    the fresh conversation is told that instead of being sent on the empty
    search (and the reasoning turn spent narrating it). Monitor still needs its
    schema loaded either way."""
    if _machine_task_tools_absent(project_dir):
        return (
            f"{_TASK_TOOLS_ABSENT_SENTENCE}\n"
            f"Before your first Monitor call, run `ToolSearch` with "
            f"`{SESSION_START_MONITOR_QUERY}` — a Monitor invoked without its "
            "schema fails with `InputValidationError`.\n"
        )
    return (
        "Before your first turn, make TWO SEPARATE `ToolSearch` calls — they ask "
        "two different questions and a combined query answers neither:\n"
        f"  1. `{TOOL_LOADING_SELECT_QUERY}` — the editor workflow's step-tracking "
        "tools. If this returns `no matching deferred tools`, this harness does not "
        "have them; that is a normal answer, it is recorded, and the workflow will "
        "stop asking you for them and use `codeyam-editor editor track-step` instead. "
        "Do NOT widen this query with other tool names — a name that resolves "
        "everywhere masks the very absence this call exists to detect.\n"
        f"  2. `{SESSION_START_MONITOR_QUERY}` — loads `Monitor`'s schema before any "
        "call that needs it; a Monitor invoked without its schema fails with "
        "`InputValidationError`.\n"
    )


# The pretool hook's refusal log (`_REFUSAL_LOG` there). Its `rules` map is the
# durable per-rule count that renders that hook's RECURRING GUARDRAIL line.
_REFUSAL_LOG_REL = os.path.join(".codeyam", "state", "refusal-fingerprints.json")


def _scripted_rewrite_refusal_count(project_dir):
    """How many calls this project's scripted-rewrite guard has refused, read
    from the pretool hook's per-rule count. 0 when the log is missing,
    unreadable, or carries no usable count (a bool or a non-int is not one)."""
    try:
        with open(os.path.join(project_dir, _REFUSAL_LOG_REL)) as f:
            count = json.load(f)["rules"]["scripted-rewrite"]["count"]
    except Exception:
        return 0
    if isinstance(count, bool) or not isinstance(count, int):
        return 0
    return max(count, 0)


def _scripted_edit_reminder_text(count):
    """The SessionStart "editing tracked source" block for a project whose
    scripted-rewrite guard has refused `count` calls, or "" when it has refused
    none. Pure.

    The rule otherwise reaches the agent only as a refusal, and every reset
    (startup, `/clear`, compaction) wipes it — so agents met it fresh 3–4 times
    per plan, and after the refusal reached for a whole-file Write or a
    line-slicing split script instead of Edit. SessionStart is the one place
    that runs after every reset, before the first edit. Gated on the project
    having tripped the rule, so a project that never has pays no context for
    it. Names no language, extension or toolchain: client projects carry none
    of codeyam's docs."""
    if count < 1:
        return ""
    return (
        f"Editing tracked source (this project's scripted-rewrite guard has refused "
        f"{count} call(s) here):\n"
        "  1. Change tracked source with Edit, never a scripted rewrite (a heredoc "
        "`replace`, `sed -i`, `perl -pi`). Several Edits in one message run in "
        "parallel, and `replace_all` covers a true replace-everywhere.\n"
        "  2. Split a file with Write for the new file (the moved code verbatim) plus "
        "Edit to delete it from the original — never a script that slices lines.\n"
        "  3. A whole-file Write over an existing tracked file is not a substitute for "
        "Edit: the reviewer sees no old/new text.\n"
    )


def _should_inject_tool_loading_protocol(project_dir, session_id):
    """Whether this prompt carries the per-prompt `<tool-loading-protocol>`.

    Once per session (the session_id marker), and never once the Task*
    question is answered as absent — by this session's observation or by the
    machine record. The second clause matters because the marker fails open
    when the harness omits session_id, re-injecting on every prompt."""
    return (
        not _tool_loading_already_injected(project_dir, session_id)
        and _task_tools_available(project_dir) is not False
        and not _machine_task_tools_absent(project_dir)
    )


# How long `wedge-check` is allowed to take. It is a directory listing and a
# handful of small reads, plus — only when a command was launched seconds ago —
# a wait of at most 6s for it to get past its pre-flight (the editor's
# `EARLY_BAIL_WAIT_BUDGET`, which must stay below this). Anything approaching
# this is itself a malfunction — and a hook that hung would freeze the very
# turn-end it is instrumenting.
_WEDGE_CHECK_TIMEOUT_SECS = 10


def _wedge_notice(project_dir, transcript_path=None):
    """Ask the editor whether this turn is ending on something worth saying.

    `wedge-check` composes five verdicts and this call is blind to which one
    came back, deliberately — the hook's job is to put the text in front of the
    agent, and the editor owns what the text says:
      * a background command already FAILED moments ago — typically a
        precondition refusal seconds after launch — so the long wait the turn
        is ending on is not happening;
      * a background task is demonstrably STRANDED — its result is not coming;
      * a background task is HEALTHY but has been running past the reporting
        threshold — waiting is correct, and the user should be told rather than
        left to ask;
      * the turn is ending mid-workflow with NOTHING pending and no question
        outstanding, so nothing will re-invoke the agent;
      * a cycle just CLOSED and no closing question has been asked since, so
        the user was never alerted that the session finished.

    Returns the notice text, or "" for the overwhelmingly common case of
    nothing being wrong. Every failure mode collapses to "" on purpose: the
    binary being absent or old (a fleet mid-upgrade), the command timing out,
    a non-zero exit. This runs on EVERY turn end, so a fault here must cost
    nothing — a backstop that broke ordinary turns would be worse than the
    stall it looks for.

    `wedge-check` exits 0 whether or not it found something, so emptiness is
    the signal and the return code is only a fault check.
    """
    import subprocess as _sp

    def _run(extra):
        try:
            return _sp.run(
                [cli_command(), "editor", "wedge-check", *extra],
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=_WEDGE_CHECK_TIMEOUT_SECS,
            )
        except Exception:
            return None

    # `transcript_path` lets the editor drop a failed launch the agent was
    # already delivered and has answered. A binary older than `--transcript`
    # rejects the flag as a usage error, so a fleet mid-upgrade retries once
    # without it rather than being silenced.
    extra = ["--transcript", transcript_path] if transcript_path else []
    result = _run(extra)
    if (
        extra
        and result is not None
        and result.returncode != 0
        and "--transcript" in (result.stderr or "")
    ):
        result = _run([])
    if result is None or result.returncode != 0:
        return ""
    return result.stdout.strip()


def emit_wedge_block(project_dir, event_data):
    """Reopen the turn when `wedge-check` has something to say about its ending.

    Returns True when it emitted a block decision (and the caller must print
    nothing else, because a Stop hook's stdout is parsed as one JSON document).

    Blocking rather than printing is the whole point. Stop-hook stdout on a
    plain exit is transcript decoration the agent never reads, and the agent is
    exactly who has to act: a stranded result means every plan that depends on
    it is void, a healthy long-running task means the USER needs a status line
    only the agent can write, and an idle stop means nothing will re-invoke the
    agent at all. A `block` decision puts the notice in front of the agent and
    reopens the turn, which is the one thing that distinguishes this from the
    launch trigger that could not reach it.

    Four separate guards keep that from becoming a loop, because reopening a
    turn is the one failure mode a Stop hook can inflict that nothing else can:
      * `stop_hook_active` is set by the harness on a turn that a Stop hook
        already reopened, so we never block twice in a row;
      * a task notice is one-shot per task — `claim_unreported` drops a
        `.wedge-reported` marker beside the task output, shared across the two
        task verdicts and the launch trigger, so the same task is announced
        exactly once by any of them;
      * the idle-stop notice is one-shot per workflow step, and stays silent
        entirely whenever a question is outstanding to the user — ending a turn
        on a gate is correct, and talking over the question would be worse than
        the silence this closes;
      * any failure at all is silent, and silence means "do not block".

    Note what is NOT a guard: the wording. Every one of the three notices asks
    the agent to do something — relay, continue, or say what it is blocked on —
    and none of them refuses the stop. A turn-end hook that told an agent it may
    not stop would inflict exactly the failure the guards above exist to avoid.
    """
    if event_data.get("stop_hook_active"):
        return False
    notice = _wedge_notice(project_dir, event_data.get("transcript_path"))
    if not notice:
        return False
    print(json.dumps({"decision": "block", "reason": notice}))
    return True


def main():
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    # Only run in editor Build sessions — except for the question-copy
    # observer. A question asked in a plain session on a codeyam project
    # (plan authoring through a skill, say) reaches a user exactly as one
    # asked mid-cycle does, and returning here first left the log blind to
    # it: no reviewed VM had a log, because the ad-hoc path never set the
    # flag. `.codeyam/` must exist so a non-codeyam checkout never grows one.
    if not os.environ.get("CODEYAM_EDITOR_ACTIVE"):
        if os.path.isdir(os.path.join(project_dir, ".codeyam")):
            event_type, event_data = detect_event()
            if (
                event_type == "post_tool_use"
                and event_data.get("tool_name") == "AskUserQuestion"
            ):
                _log_question_copy(project_dir, event_data, in_cycle=False)
                _record_audience_answer(project_dir, event_data)
        return

    state_path = os.path.join(project_dir, ".codeyam", "editor-step.json")
    prompt_path = os.path.join(project_dir, ".codeyam", "editor-user-prompt.txt")

    metadata = load_step_metadata(project_dir)
    event_type, event_data = detect_event()

    # ── SessionStart: fires before any state file may exist. Remind Claude
    # to preload the tools every editor step depends on. Silent when
    # CODEYAM_EDITOR_ACTIVE is unset (handled by the early return above).
    if event_type == "session_start":
        # A new, cleared or compacted context holds none of the hand-off text
        # earlier advances printed, so forget what `advance` withholds as
        # already shown (handoff_said_once.rs::said_once_path).
        try:
            os.remove(os.path.join(project_dir, ".codeyam", "state", "handoff-said-once.json"))
        except OSError:
            pass
        _reset_task_tool_marker(project_dir)
        # A new session, a resume, a /clear and a compaction all leave the
        # agent without the step context it was last given, so the next
        # prompt and the next tool call re-emit it.
        _clear_step_context_marker(project_dir)
        print("<session-start-hook>")
        print(
            _session_start_tool_preload(project_dir)
            + "Monitor is for watching a CONDITION the harness will "
            "not notify you about; a backgrounded long command (refresh-tests, "
            "session-finalize) is not that — its completion notification arrives on its "
            "own, and `codeyam-editor editor wait-for` is the same-turn blocking path. "
            "(AskUserQuestion is already resident in editor sessions, so it needs no "
            "preload.)"
        )
        reminder = _scripted_edit_reminder_text(_scripted_rewrite_refusal_count(project_dir))
        if reminder:
            print(reminder, end="")
        print("</session-start-hook>")
        return

    # Judged once, before anything else reads the prompt: a stale wakeup is
    # neither a feature request to capture nor a request to route.
    wakeup_check = _wakeup_checker(project_dir)
    if event_type == "user_prompt":
        # Judged BEFORE the awaiting-user marker is removed below.
        refusal = _stale_wakeup_refusal(project_dir, event_data, wakeup_check)
        if refusal:
            print(refusal)
            return
    stale_wakeup_lines = (
        _stale_wakeup_lines(project_dir, event_data, wakeup_check)
        if event_type == "user_prompt"
        else []
    )

    # ── Capture user's feature request prompt ──────────────────────────
    if event_type == "user_prompt" and not stale_wakeup_lines:
        prompt_text = event_data.get("prompt", "").strip()
        if prompt_text and not prompt_text.startswith("/"):
            should_capture = not os.path.exists(prompt_path)
            if not should_capture:
                if not os.path.exists(state_path):
                    should_capture = True
                else:
                    try:
                        with open(state_path, "r") as f:
                            prev = json.load(f)
                        _, prev_table = resolve_mode(prev, metadata)
                        if prev.get("step", 0) >= prev_table["total"]:
                            should_capture = True
                    except Exception:
                        pass
            if should_capture:
                try:
                    os.makedirs(os.path.dirname(prompt_path), exist_ok=True)
                    with open(prompt_path, "w") as f:
                        f.write(prompt_text)
                except Exception:
                    pass

    # ── Record what was actually asked ─────────────────────────────────
    # Placed BEFORE the state-file early return on purpose: a question
    # asked outside a cycle is still a question a user had to answer, and
    # returning first would blind the log to exactly the ad-hoc questions
    # the contract most needs to see. Falls through afterwards — this
    # observer prints nothing and changes no control flow.
    if event_type == "post_tool_use" and event_data.get("tool_name") == "AskUserQuestion":
        _log_question_copy(project_dir, event_data)
        _record_audience_answer(project_dir, event_data)

    # The user answered (or typed a new prompt, which also means they are
    # back): the session is no longer parked on them. Removes the marker the
    # pretool hook wrote when the question was raised.
    if event_type == "user_prompt" or (
        event_type == "post_tool_use" and event_data.get("tool_name") == "AskUserQuestion"
    ):
        try:
            os.remove(os.path.join(project_dir, ".codeyam", "run", "awaiting-user.json"))
        except OSError:
            pass

    if not os.path.exists(state_path):
        # No editor-step.json — a stateless session entry. This is the exact
        # moment the routing decision gets made AND the request is in hand, so
        # name triage as the entry rather than leaving it to a self-judged
        # build-vs-not call made before the request has been read. Advisory,
        # like every other directive this hook emits, and scoped to a real
        # user prompt: slash commands carry their own routing.
        if stale_wakeup_lines:
            print("<user-prompt-submit-hook>")
            print("\n".join(stale_wakeup_lines).strip("\n"))
            print("</user-prompt-submit-hook>")
        elif event_type == "user_prompt":
            entry_prompt = event_data.get("prompt", "").strip()
            if entry_prompt and not entry_prompt.startswith("/"):
                print("<user-prompt-submit-hook>")
                print(
                    "Editor Mode — no cycle in flight. Enter this request at triage, not "
                    "at the build flow: run "
                    f"`{cli_command()} editor step --slug assist-triage --mode assist`. "
                    "Triage classifies the request against a written rubric (and defaults "
                    "to `build` when ambiguous), then hands off to the build flow itself "
                    "when it really is one — so do not judge build-vs-not yourself here."
                )
                print("</user-prompt-submit-hook>")
        # A cycle that just closed has already wiped its step state, but its
        # closing question may still be owed. Gated on the editor's owed
        # marker so an ordinary stateless turn end pays no subprocess.
        if event_type == "stop" and os.path.exists(
            os.path.join(project_dir, ".codeyam", "run", "closing-question-owed.json")
        ):
            emit_wedge_block(project_dir, event_data)
        return

    try:
        with open(state_path, "r") as f:
            state = json.load(f)
    except (json.JSONDecodeError, IOError):
        return

    step = state.get("step")
    feature = state.get("feature", "")
    mode, mode_table = resolve_mode(state, metadata)
    total_steps = mode_table["total"]
    step_labels = mode_table["labels"]
    step_restrictions = mode_table["restrictions"]
    label = step_labels.get(step, "Unknown")
    mode_prefix = mode_display_prefix(mode)

    if not step:
        return

    # ── Task tracking ──────────────────────────────────────────────────
    task_tracking_path = os.path.join(project_dir, ".codeyam", "editor-task-tracking.json")

    if event_type == "post_tool_use":
        tool_name = event_data.get("tool_name", "")
        tool_input = event_data.get("tool_input", {}) or {}
        # Settle, once per session, whether this harness has the Task* tools
        # at all. Separate from the step-tracking flags below and deliberately
        # unconditional: a Task* call that FAILED still answers this question,
        # even though the flags treat it the same as one that worked.
        _observe_task_tool_capability(
            project_dir, tool_name, tool_input, event_data.get("tool_response")
        )
        # TaskCreate → mark the current step's task as created, provided
        # the subject references this step. If no subject is provided, trust
        # the agent and flip the flag anyway.
        if tool_name == "TaskCreate":
            subject = tool_input.get("subject", "") or ""
            expected_prefix = f"Complete codeyam editor step {step}"
            subject_ok = (not subject) or subject.startswith(expected_prefix)
            if subject_ok:
                try:
                    tracking = {}
                    if os.path.exists(task_tracking_path):
                        with open(task_tracking_path, "r") as f:
                            tracking = json.load(f)
                    tracking["step"] = step
                    tracking["taskCreated"] = True
                    tracking.setdefault("taskCompleted", False)
                    with open(task_tracking_path, "w") as f:
                        json.dump(tracking, f)
                except Exception:
                    pass
                _sign_in_step_task(project_dir)
        # TaskUpdate with status=completed → mark the current step's task
        # as completed. Only flips the flag if tracking is already on this
        # step (avoids treating unrelated task updates as step check-offs).
        # At the terminal step, the flip is gated on the
        # `featureCompleteSignaledAt` field in feature-finalized.json — the
        # cycle cannot be marked done without `editor feature-complete`
        # having actually fired the modal.
        elif tool_name == "TaskUpdate":
            if tool_input.get("status") == "completed":
                if _terminal_signal_missing(project_dir, state):
                    print(
                        "Cannot mark the feature-complete step task as done — "
                        f"`{cli_command()} editor feature-complete` has not run yet. "
                        "Run that command first; it writes the "
                        "`featureCompleteSignaledAt` marker that closes the cycle.",
                        file=sys.stderr,
                    )
                else:
                    try:
                        if os.path.exists(task_tracking_path):
                            with open(task_tracking_path, "r") as f:
                                tracking = json.load(f)
                            if tracking.get("step") == step and tracking.get("taskCreated"):
                                tracking["taskCompleted"] = True
                                with open(task_tracking_path, "w") as f:
                                    json.dump(tracking, f)
                    except Exception:
                        pass

    # Log the hook firing
    log_data = {"step": step, "label": label, "feature": feature, "hook": event_type}
    if event_type == "post_tool_use":
        log_data["tool"] = event_data.get("tool_name", "")
    log_event(project_dir, "hook", log_data)

    restriction = step_restrictions.get(step, "")
    _cli = cli_command()
    # In-cycle, the next step is simply the next step. At the END of a cycle
    # the next USER REQUEST is not necessarily a build, so route it through
    # triage rather than booting the build flow: "deploy it and give me the
    # live URL" is a config/hosting request that a `step 1` fallback drags
    # through the whole 28-step UI workflow. `assist-triage` classifies it and
    # hands off to the build flow itself when it really is one.
    next_cmd = (
        f"{_cli} editor step {step + 1}"
        if total_steps and step < total_steps
        else f"{_cli} editor step --slug assist-triage --mode assist"
    )

    # ── UserPromptSubmit: inject step context ──────────────────────────
    if event_type == "user_prompt":
        lines = [
            '<user-prompt-submit-hook>',
            f'Editor Mode — {mode_prefix} Step {step}/{total_steps} ({label}): "{feature}"',
        ]

        # Up front, so the agent reads it before anything telling it to act.
        lines.extend(stale_wakeup_lines)
        if not stale_wakeup_lines:
            lines.extend(
                _reset_arrival_lines(
                    project_dir,
                    event_data.get("prompt"),
                    os.environ.get("CODEYAM_EDITOR_SESSION_ID"),
                    time.time(),
                )
            )
        lines.extend(_foreign_prompt_lines(project_dir, event_data, step, mode))

        # One-shot per session: the tool-loading-protocol is a session-entry
        # concern, not a per-prompt one. Injecting it on every UserPromptSubmit
        # re-fired the wasted preload round-trip on every resumed prompt, so gate
        # it behind a session_id-keyed marker and emit it at most once per session.
        # A session that already looked and found nothing must not be told to
        # look again. This is the belt to the one-shot marker's braces: when
        # the harness payload omits session_id the marker fails open and
        # re-injects on EVERY prompt, which is the shape the fleet measured.
        session_id = event_data.get("session_id")
        if _should_inject_tool_loading_protocol(project_dir, session_id):
            lines.extend([
                '',
                '<tool-loading-protocol>',
                f"If the Task tools (`TaskCreate`, `TaskList`, `TaskUpdate`, `TaskGet`) "
                f"are not loaded yet, call `ToolSearch` with `{TOOL_LOADING_SELECT_QUERY}` "
                "before your first tool call. The editor workflow routes every step "
                "hand-off through these Task tools; skipping this preload stalls the step. "
                "(AskUserQuestion is already resident, so it needs no preload.)",
                '</tool-loading-protocol>',
            ])
            _mark_tool_loading_injected(project_dir, session_id)

        # The step directives only change when the step does, so a later
        # prompt in the same step gets the header line alone.
        directive_due = _step_context_due(
            project_dir, _step_injection_key(session_id, feature, step, label)
        )

        # Inject editor-mode-context.md directly so Gemini doesn't have to read it
        # blindly. Its content never depends on the step, so it is keyed on the
        # content itself and goes out once per session, not once per step.
        lines.extend(_editor_context_lines(project_dir, session_id))

        # Include active scenario context
        active_scenario_path = os.path.join(project_dir, ".codeyam", "active-scenario.json")
        try:
            with open(active_scenario_path, "r") as f:
                active = json.load(f)
            scenario_name = (
                active.get("scenarioName")
                or active.get("scenarioSlug", "").replace("_", " ")
            )
            if scenario_name:
                lines.append(
                    f'The user is currently viewing scenario: "{scenario_name}". '
                    "Assume any feedback refers to this scenario unless they say otherwise."
                )
        except (IOError, json.JSONDecodeError):
            pass

        if label_signals_user_feedback_phase(label):
            lines.append(
                "If the user is requesting changes (even indirectly), "
                "make the changes, re-register affected scenarios, and update the journal. "
                "Then continue from the current step."
            )
        elif not directive_due:
            pass
        elif mode_is_build(mode):
            lines.append(
                f"You are on step {step}. Follow the `{_cli} editor` workflow. "
                f"Do NOT skip ahead or make changes outside the current step."
            )
        else:
            # A non-build track (assist, design) is not walking a build to
            # completion, so "do not skip ahead" asserts something untrue
            # about the session on every single prompt — the exact framing
            # these tracks exist to avoid. Point at the current step without
            # claiming the session is mid-build.
            lines.append(
                f"You are on step {step} of the `{mode}` track. "
                f"Follow the `{_cli} editor` steps for this track."
            )
        if restriction and directive_due:
            lines.append(restriction)
        lines.append('</user-prompt-submit-hook>')
        print("\n".join(lines))
        return

    # ── Stop: the turn-end backstop, now covering three verdicts ───────
    # The detector itself has always been correct; its only trigger was the
    # launch of a wrapped command, which an agent parked on a result it cannot
    # get never performs. So the backstop could only rescue an agent that did
    # not need rescuing. This is the reachable trigger: the end of the turn IS
    # the moment parking happens, and it needs no suspicion and no agent action.
    #
    # Reachability was necessary and not sufficient. The scan behind it reported
    # only demonstrably-STRANDED tasks, so a task that was merely slow kept its
    # heartbeat ticking and the turn ended in the identical silence — 11 parked
    # turns and 14.9 h of dead time across six VMs, every one ended by a human
    # asking rather than by the system saying. A third shape sat beside it: nine
    # turns that ended right after announcing the next step with nothing pending
    # at all. Same channel, same subprocess, same "empty means nothing wrong";
    # what changed is that healthy-but-slow and idle-stop now have a verdict too.
    if event_type == "stop" and emit_wedge_block(project_dir, event_data):
        return

    # ── Stop: show progress tracker ────────────────────────────────────
    lines = [
        f'Editor Mode — {mode_prefix} Step {step}/{total_steps} ({label}): "{feature}"',
    ]
    if restriction:
        lines.append(restriction)

    if event_type == "stop":
        GREEN = "\033[32m"
        BOLD_CYAN = "\033[1;36m"
        DIM = "\033[2m"
        RESET = "\033[0m"

        tracker = [f"{DIM}  ┌──────────────────────────────────────┐{RESET}"]
        for i in range(1, total_steps + 1):
            lbl = step_labels.get(i, f"Step {i}").ljust(28)
            num = f" {i}" if i < 10 else f"{i}"
            content = f"{num}. {lbl}"
            if i < step:
                tracker.append(f"{DIM}  │{RESET}{GREEN}  ✓  {content}{RESET}{DIM}│{RESET}")
            elif i == step:
                tracker.append(f"{DIM}  │{RESET}{BOLD_CYAN}  →  {content}{RESET}{DIM}│{RESET}")
            else:
                tracker.append(f"{DIM}  │  ○  {content}│{RESET}")
        tracker.append(f"{DIM}  └──────────────────────────────────────┘{RESET}")

        lines.append("Present this progress tracker to the user (copy verbatim):")
        lines.extend(tracker)
        lines.append(
            "For the CURRENT step (→), show each checklist item with "
            "✓ (done) or ✗ (skipped + reason)."
        )

    if event_type == "stop" and label_signals_pre_commit_warning(label):
        import subprocess as _sp
        try:
            _result = _sp.run(
                ["git", "status", "--porcelain"],
                cwd=project_dir,
                capture_output=True, text=True, timeout=5
            )
            has_uncommitted = bool(_result.stdout.strip())
        except Exception:
            has_uncommitted = False

        if has_uncommitted:
            lines.append(
                "\n\033[1;31m⚠️  You have uncommitted changes.\033[0m"
            )

    # Stale-binary pre-flight for the sync gate. Deliberately here, at the turn
    # end that lands the agent ON the step, rather than after it has launched a
    # multi-hour run: one session saw the drift 60 seconds in and recorded that
    # it had no way to act on it. The CLI gate refuses too, but a refusal costs
    # a round trip this notice does not.
    if event_type == "stop" and label_signals_sync_gate(label):
        _stale = stale_binary_notice(project_dir)
        if _stale:
            lines.append(_stale)

    if event_type == "stop":
        lines.append(
            f"\n\033[2mReminder: Follow `{_cli} editor step` workflow.\033[0m"
        )

    lines.append(f"When this step is complete, run: {next_cmd}")

    # PostToolUse: only print for significant tools
    if event_type == "post_tool_use":
        tool_name = event_data.get("tool_name", "")
        if tool_name in ("Bash", "Write", "Edit"):
            if restriction and _step_reminder_due(
                project_dir,
                _step_injection_key(event_data.get("session_id"), feature, step, label),
            ):
                print(f"[Step {step}: {label}] {restriction}")
            return

    if event_type == "stop":
        print("\n".join(lines))


if __name__ == "__main__":
    main()
