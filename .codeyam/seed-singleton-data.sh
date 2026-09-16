#!/usr/bin/env bash
# Seed-adapter wrapper for the site's SINGLETON data files (`src/data/*.json`).
#
# `register` validates every seed table as an array of row objects — the
# DB-backed shape — but `settings` (and its `nav` sibling) is a single JSON
# object, not a list of rows. Both facts are correct and they disagree, so this
# is the documented `seed.command` file-override that reconciles them: a
# scenario declares the singleton as a one-row array that passes validation,
# and this unwraps it into the object the adapter writes to `src/data/<key>.json`.
#
# The unwrap lives here rather than in the adapter because the adapter already
# handles object-valued keys correctly; what it cannot do is satisfy a validator
# that runs before it. Same shape as `seed-cutover-progress.sh`, which does the
# same job for the runbook's progress singleton.
#
# Usage (as a scenario `seed.command`; the editor appends the seed file):
#   bash .codeyam/seed-singleton-data.sh settings
#   bash .codeyam/seed-singleton-data.sh settings nav
set -euo pipefail

keys=()
while [ "$#" -gt 1 ]; do
  keys+=("$1")
  shift
done
SEED_FILE="$1"

FOLDED="$(mktemp -t singleton-seed-XXXXXX.json)"
trap 'rm -f "$FOLDED"' EXIT

SINGLETON_KEYS="${keys[*]}" python3 - "$SEED_FILE" "$FOLDED" <<'PY'
import json, os, sys

src, dest = sys.argv[1], sys.argv[2]
payload = json.load(open(src))

# The editor may hand over either the canonical {"seed": {...}} wire shape or the
# legacy flat map; accept both rather than guessing which one this version emits.
tables = payload.get("seed", payload)
singletons = os.environ.get("SINGLETON_KEYS", "").split()

folded = {}
for key, value in tables.items():
    if key in singletons:
        # A one-row array carrying the whole object. Anything else is a scenario
        # authoring mistake, and failing loud beats writing a half-formed file.
        if not isinstance(value, list) or len(value) != 1 or not isinstance(value[0], dict):
            raise SystemExit(
                f"seed-singleton-data: '{key}' must be a one-row array holding the whole object"
            )
        folded[key] = value[0]
    else:
        # Everything else passes through untouched, so a scenario can still seed
        # real collections alongside the singleton.
        folded[key] = value

json.dump({"seed": folded}, open(dest, "w"))
PY

npx tsx .codeyam/seed-adapter.ts "$FOLDED"
