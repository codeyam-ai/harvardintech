// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: 1daf00e6eba84c2127677a6cbbb4542b2b4730f1a0b99dfb35599cb678449a4b
// The per-function half of rendered-source attribution: which functions of the
// HUB files each screenshot ran. A hub file is one most scenarios' render sets
// hold (an app shell, a dispatch module); file-level attribution cannot narrow
// it, so the editor names a few of them (`render_hub_files.rs`) and the capture
// watches just those per function. The record then carries, per hub file, the
// item paths that ran (`functions`) out of the ones watched
// (`functionUniverse`), which `render_set_hub_digest.rs` turns into a digest
// that ignores edits to the bodies that did not run.
//
// Every helper here is pure bookkeeping over plain Maps and Sets, so the
// watcher in scenario-check-attribution.js composes them without a browser in
// the tests.

const fs = require("fs");
const path = require("path");

// The hub-file list the editor writes before a recapture
// (`render_hub_files.rs::HUB_FILES_PATH`): files watched per function.
const HUB_FILES_PATH = path.join(".codeyam", "state", "render-hub-files.json");

// The hub files to watch per function: `{ files: Set, hubSet }`. A list
// injected through `config.renderHubFiles` wins (an empty one turns hub
// watching off — the file-level retry uses that); otherwise the editor's list
// on disk. Never throws: no list means every file is watched by file.
function resolveRenderHubFiles(config, readList = readRenderHubFileList) {
  const injected =
    config && Object.prototype.hasOwnProperty.call(config, "renderHubFiles")
      ? config.renderHubFiles
      : undefined;
  const list = injected === undefined ? readList() : { files: injected || [], hubSet: null };
  const files = Array.isArray(list && list.files)
    ? list.files.filter((f) => typeof f === "string" && f.length > 0)
    : [];
  return { files: new Set(files), hubSet: (list && list.hubSet) || null };
}

// The editor's hub list from disk, or null when it is missing or unreadable.
function readRenderHubFileList(readFile = fs.readFileSync) {
  try {
    return JSON.parse(readFile(HUB_FILES_PATH, "utf8"));
  } catch (_) {
    return null;
  }
}

// Add each watched range's hub items to `watched` (hub file → Set of item
// paths). A hub file a range touches but cannot pin to one item is still
// listed, with nothing added, so the file counts as watched.
function noteHubWatched(ranges, watched) {
  for (const range of ranges) {
    for (const [file, item] of range.hubItems || []) {
      if (!watched.has(file)) watched.set(file, new Set());
      if (item !== null) watched.get(file).add(item);
    }
  }
}

// Note what a hit on `range` says about the hub files: its item ran in each
// hub file it pins, and a hub file it cannot pin is unmapped.
function recordHubHit(range, ran, unmapped) {
  for (const [file, item] of range.hubItems || []) {
    if (item === null) {
      unmapped.add(file);
      continue;
    }
    if (!ran.has(file)) ran.set(file, new Set());
    ran.get(file).add(item);
  }
}

// The per-function half of the record: which hub functions ran, out of the
// ones the capture watched. A hub file where a function that ran could not be
// pinned to one item is left out of `functions`, so the editor digests it
// whole. `functionUniverse` lists every item watched per hub file.
function hubFunctionRecord({ watched, ran, unmapped, hubSet }) {
  const functions = {};
  const functionUniverse = {};
  for (const [file, items] of [...watched.entries()].sort()) {
    functionUniverse[file] = [...items].sort();
    if (!unmapped.has(file)) functions[file] = [...(ran.get(file) || [])].sort();
  }
  return {
    functions,
    functionUniverse,
    functionAttribution: "complete",
    ...(hubSet ? { hubSet } : {}),
  };
}

module.exports = {
  HUB_FILES_PATH,
  resolveRenderHubFiles,
  readRenderHubFileList,
  noteHubWatched,
  recordHubHit,
  hubFunctionRecord,
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
