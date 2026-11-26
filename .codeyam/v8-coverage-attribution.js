// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: a40c1ed5f1265d6fc1da2fd9dd1b291285b9cd9e7abe9cbe0c3f324ee4c2dd7c
// Rendered-source attribution for browser stacks, from V8 precise coverage.
//
// Declared as `capture.renderedSourcesAttribution: "v8-coverage"` in
// `.codeyam/stack.json`. Before navigation the capture starts precise coverage
// (`Profiler.startPreciseCoverage`, call counts, function granularity); after
// the scenario settles it takes it. V8 then names every function of every
// script the page compiled, with how often it ran. Each function is mapped
// through its script's source map to a project source file, and the record
// beside the screenshot says, per file, which function names ran
// (`functions`) out of the ones V8 reported (`functionUniverse`) — the same
// shape the wasm hub-function record has, so `render_set_hub_digest_js.rs`
// can elide the bodies that never ran.
//
// Every doubt fails wide, never narrow. A script with no usable source map
// (and no byte-identical project file at its URL) makes no claim. A function
// that RAN but cannot be placed — its start is unmapped, its two ends map to
// different files, or its V8 name does not appear in the original source
// where the map puts it (a bundler renamed it) — leaves every file it could
// belong to out of `functions`, so the editor digests those files whole.
//
// File-level attribution is deliberately neutral: a module's top level runs
// when it loads, so every mapped file is both watched and reported, and no
// file is pruned on this record alone.

const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");
const { hubFunctionRecord } = require("./scenario-check-hub-functions");
const {
  originalPositionFor,
  lineStarts,
  offsetToPosition,
  decodeDataUrl,
  readSourceMap,
} = require("./source-map-decode");

// `abs` relative to `projectDir`, `/`-joined, or null when it lies outside.
function relativeInside(abs, projectDir) {
  const rel = path.relative(projectDir, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

// The project-relative path a source-map `source` names, or null when it names
// nothing in the project (a dependency, a bundler-virtual module, a file
// outside the project). Resolved against `sourceRoot`, then `base` (the map's
// own URL). A path the dev server serves from an app subdirectory comes back
// as served (`src/App.tsx`); the editor matches it to its node by path suffix.
function projectRelativeSource(source, { base, sourceRoot = "", projectDir }) {
  if (typeof source !== "string" || source === "") return null;
  const webpack = /^webpack:\/\/[^/]*\/(.*)$/.exec(source);
  let served;
  if (webpack) {
    served = webpack[1];
  } else if (path.isAbsolute(source) && !source.startsWith("/@")) {
    return relativeInside(source, projectDir) || servedPath(source, projectDir);
  } else {
    const rooted = sourceRoot ? `${sourceRoot.replace(/\/?$/, "/")}${source}` : source;
    let url;
    try {
      url = new URL(rooted, base);
    } catch (_) {
      return null;
    }
    if (url.protocol === "file:") return relativeInside(fileURLToPath(url), projectDir);
    try {
      served = decodeURIComponent(url.pathname);
    } catch (_) {
      return null;
    }
  }
  return servedPath(served, projectDir);
}

// A served URL path as a project path: Vite's `/@fs/<abs>` and an absolute
// path inside the project are made relative; anything that names a
// dependency or a bundler-virtual module is null.
function servedPath(served, projectDir) {
  if (served.startsWith("/@fs/")) return relativeInside(served.slice(4), projectDir);
  if (served.startsWith(`${projectDir}/`)) return relativeInside(served, projectDir);
  const rel = served.replace(/^\/+/, "").replace(/^(\.\/)+/, "");
  if (!rel || rel.startsWith("@") || rel.startsWith(".vite/") || rel.includes("node_modules/")) {
    return null;
  }
  return rel;
}

// Whether `name` (V8's function name; its last `.`- or space-separated part,
// so `get size` checks `size`) appears as a whole identifier on `line` or the
// line above it in `content` — where the source map puts the function's start.
function nameNearLine(content, line, name) {
  if (typeof content !== "string") return false;
  const bare = name.split(/[ .]/).pop();
  if (!bare) return false;
  const lines = content.split("\n");
  const escaped = bare.replace(/[$]/g, "\\$");
  const pattern = new RegExp(`(^|[^A-Za-z0-9_$])${escaped}($|[^A-Za-z0-9_$])`);
  return [line - 1, line].some((l) => l >= 0 && l < lines.length && pattern.test(lines[l]));
}

// One script's source map with each source resolved to its project path
// (null when outside the project), or null when the map is unusable.
function readProjectSourceMap(mapText, { base, projectDir }) {
  return readSourceMap(mapText, (source, sourceRoot) =>
    projectRelativeSource(source, { base, sourceRoot, projectDir }),
  );
}

// An identity "map" for a script served verbatim from a project file: the
// file at the URL's path whose bytes equal the script's. Null otherwise.
function identityMap(url, source, { projectDir, readFile }) {
  let rel;
  try {
    rel = servedPath(decodeURIComponent(new URL(url).pathname), projectDir);
  } catch (_) {
    return null;
  }
  if (!rel) return null;
  let onDisk;
  try {
    onDisk = readFile(path.join(projectDir, rel), "utf8");
  } catch (_) {
    return null;
  }
  return onDisk === source ? { identity: true, files: [rel], contents: [source] } : null;
}

// What one script's coverage says: the project files it maps to (`files`), and
// per file the function names V8 reported (`watched`) and those that ran
// (`ran`). `unmapped` holds files whose per-function claim is void because a
// function that ran could not be placed. `{ source, map, functions }`: the
// script text, its map (`readSourceMap` / `identityMap`), and the coverage
// entry's `functions`.
function attributeScript({ source, map, functions }) {
  const out = {
    files: new Set(),
    ranFiles: new Set(),
    watched: new Map(),
    ran: new Map(),
    unmapped: new Set(),
  };
  map.files.forEach((f) => f && out.files.add(f));
  const starts = lineStarts(source);
  const place = (offset) => {
    const at = offsetToPosition(starts, offset);
    if (map.identity) return { sourceIndex: 0, line: at.line, column: at.column };
    return originalPositionFor(map.lines, at.line, at.column);
  };
  let voidScript = false;
  for (const fn of functions || []) {
    const range = fn.ranges && fn.ranges[0];
    if (!range) continue;
    // The script's own top level: it ran when the script loaded.
    if (range.startOffset === 0 && range.endOffset >= source.length - 1 && !fn.functionName) {
      continue;
    }
    const ran = range.count > 0;
    const at = placeFunction(range, place, map.files);
    if (!at) {
      if (ran) voidScript = true;
      continue;
    }
    const { file } = at;
    if (file && ran) out.ranFiles.add(file);
    if (!file || !fn.functionName) continue;
    if (!nameNearLine(map.contents[at.sourceIndex], at.line, fn.functionName)) {
      if (ran) out.unmapped.add(file);
      continue;
    }
    addName(out.watched, file, fn.functionName);
    if (ran) addName(out.ran, file, fn.functionName);
  }
  if (voidScript) out.files.forEach((f) => out.unmapped.add(f));
  return out;
}

// Where one covered function lives: `{ file, sourceIndex, line }` of its start
// (`file` null for a source outside the project), or null when it cannot be
// placed — its start maps to nothing, or its last byte maps to another file.
// `place(offset)` is the script's generated-offset → original-position lookup.
function placeFunction(range, place, files) {
  const start = place(range.startOffset);
  if (!start) return null;
  const end = place(Math.max(range.startOffset, range.endOffset - 1));
  const file = files[start.sourceIndex];
  const endFile = end ? files[end.sourceIndex] : file;
  if (endFile !== file) return null;
  return { file, sourceIndex: start.sourceIndex, line: start.line };
}

// Add `name` to `file`'s set in `byFile` (a Map of file → Set of names).
function addName(byFile, file, name) {
  if (!byFile.has(file)) byFile.set(file, new Set());
  byFile.get(file).add(name);
}

// The record beside the screenshot from every script's `attributeScript`
// result. The per-function half is `hubFunctionRecord`'s, and carries the
// whole claim. File-level `sources` and `universe` are the files in which
// some function ran, so the record makes no file-level silence claim (every
// universe file is reported) and stays small: an app scenario compiles
// ~1,700 files and runs functions in ~230. A file two scripts both map (a
// bundle and a lazily loaded chunk) merges: names union, and a void claim in
// either voids it.
function v8CoverageRecord(attributed) {
  const files = new Set();
  const watched = new Map();
  const ran = new Map();
  const unmapped = new Set();
  const into = (target, source) => {
    for (const [file, names] of source) names.forEach((n) => addName(target, file, n));
  };
  for (const a of attributed) {
    a.ranFiles.forEach((f) => files.add(f));
    into(watched, a.watched);
    into(ran, a.ran);
    a.unmapped.forEach((f) => unmapped.add(f));
  }
  // A mapped file with no named function V8 reported is absent from
  // `functionUniverse`, so it makes no per-function claim and digests whole.
  const sorted = [...files].sort();
  return {
    // Names the record's producer, so the editor can trim it to the
    // scenario's render set at stamp time (`rendered_record_trim.rs`).
    strategy: "v8-coverage",
    sources: sorted,
    attribution: "complete",
    universe: sorted,
    ...hubFunctionRecord({ watched, ran, unmapped, hubSet: null }),
  };
}

// The map text for a script: decoded inline, else fetched through `fetchText`
// (relative to the script URL). Null when there is none or it cannot be read.
async function sourceMapText(script, fetchText) {
  if (!script.sourceMapURL) return null;
  const inline = decodeDataUrl(script.sourceMapURL);
  if (inline !== null) return inline;
  try {
    const abs = new URL(script.sourceMapURL, script.url).href;
    return { text: await fetchText(abs), base: abs };
  } catch (_) {
    return null;
  }
}

// Whether a script URL serves a dependency rather than project code.
function isDependencyUrl(url) {
  try {
    return decodeURIComponent(new URL(url).pathname).includes("/node_modules/");
  } catch (_) {
    return true;
  }
}

// One covered script's `attributeScript` result, or null when it has no
// usable map. `getSource` returns the script text.
async function attributeCoveredScript(entry, script, { projectDir, readFile, fetchText, getSource }) {
  if (!script || !script.url || !/^https?:/.test(script.url)) return null;
  // A dependency bundle (Vite's `/node_modules/.vite/deps/…`, a served
  // package) carries maps whose relative sources resolve to look like project
  // paths (`src/index.ts`); it is never project code.
  if (isDependencyUrl(script.url)) return null;
  const source = await getSource(entry.scriptId);
  if (typeof source !== "string") return null;
  const mapped = await sourceMapText(script, fetchText);
  let map = null;
  if (mapped !== null) {
    const { text, base } = typeof mapped === "string" ? { text: mapped, base: script.url } : mapped;
    map = text ? readProjectSourceMap(text, { base, projectDir }) : null;
  } else {
    map = identityMap(script.url, source, { projectDir, readFile });
  }
  if (!map) return null;
  return attributeScript({ source, map, functions: entry.functions });
}

// Start precise coverage on `page` before navigation. Returns `{ finish }`:
// `finish()` takes the coverage and returns `{ record, stats }`.
//
// Stack assumption: a Chromium page (CDP) whose app scripts run in the page's
// own renderer process — the capture's harness and app share an origin's
// site. Scripts in an out-of-process frame are not seen; the record then
// watches nothing and is reported as no information.
async function watchV8Coverage(
  context,
  page,
  { projectDir, readFile = fs.readFileSync, fetchText = null } = {},
) {
  const armedAt = Date.now();
  const cdp = await context.newCDPSession(page);
  const scripts = new Map(); // scriptId → { url, sourceMapURL }
  cdp.on("Debugger.scriptParsed", (e) => {
    scripts.set(e.scriptId, { url: e.url, sourceMapURL: e.sourceMapURL });
  });
  await cdp.send("Debugger.enable");
  // A `debugger;` statement in the app must never stall the capture.
  await cdp.send("Debugger.setSkipAllPauses", { skip: true });
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.startPreciseCoverage", { callCount: true, detailed: false });
  const setupMs = Date.now() - armedAt;
  const fetcher = fetchText || requestFetcher(context);

  async function finish() {
    const finishStartedAt = Date.now();
    const { result } = await cdp.send("Profiler.takePreciseCoverage");
    const getSource = (scriptId) =>
      cdp
        .send("Debugger.getScriptSource", { scriptId })
        .then((r) => r.scriptSource)
        .catch(() => null);
    const attributed = (
      await Promise.all(
        result.map((entry) =>
          attributeCoveredScript(entry, scripts.get(entry.scriptId), {
            projectDir,
            readFile,
            fetchText: fetcher,
            getSource,
          }).catch(() => null),
        ),
      )
    ).filter(Boolean);
    await detachCoverageSession(cdp);
    const record = v8CoverageRecord(attributed);
    return {
      record,
      stats: {
        setupMs,
        finishMs: Date.now() - finishStartedAt,
        scripts: result.length,
        mappedScripts: attributed.length,
        files: record.universe.length,
      },
    };
  }

  return { finish };
}

// The default source-map fetcher: GET through the browser context, so a map
// the dev server serves only to the page's cookies still loads.
function requestFetcher(context) {
  return async (url) => {
    const response = await context.request.get(url);
    if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
    return response.text();
  };
}

// Stop coverage and detach the CDP session. Best effort: the record is already
// read, so a teardown failure must never fail the capture.
async function detachCoverageSession(cdp) {
  await cdp.send("Profiler.stopPreciseCoverage").catch(() => {});
  await cdp.send("Profiler.disable").catch(() => {});
  await cdp.send("Debugger.disable").catch(() => {});
  if (typeof cdp.detach === "function") await cdp.detach().catch(() => {});
}

// Arm `v8-coverage` attribution: precise coverage from before navigation,
// taken when the shot is. Same contract as the wasm arm — a coverage session
// that cannot start is a warning and null, never a failed capture. It records
// every mapped file per function, so it watches no hub list (`hubFiles: 0`),
// and a ready-signal timeout retries straight to unarmed.
async function armV8Coverage(
  context,
  page,
  { projectDir, warnings = [], watchCoverage = watchV8Coverage } = {},
) {
  let watch;
  try {
    watch = await watchCoverage(context, page, { projectDir });
  } catch (e) {
    warnings.push(
      `rendered-sources: v8-coverage attribution could not start (${(e && e.message) || e}); no attribution record was written, so staleness keeps this scenario's full static render set.`,
    );
    return null;
  }
  return {
    strategy: "v8-coverage",
    hubFiles: 0,
    async finish() {
      let outcome;
      try {
        outcome = await watch.finish();
      } catch (e) {
        return {
          warning: `rendered-sources: v8-coverage attribution could not read coverage (${(e && e.message) || e}); no attribution record was written.`,
        };
      }
      const { record, stats } = outcome;
      if (record.universe.length === 0) {
        return {
          warning:
            "rendered-sources: v8-coverage attribution saw no project function run (no script mapped to a project file — no source maps, or the app runs in an out-of-process frame); no attribution record was written.",
          stats,
        };
      }
      return { record, stats };
    },
  };
}

module.exports = {
  projectRelativeSource,
  nameNearLine,
  readProjectSourceMap,
  identityMap,
  isDependencyUrl,
  attributeScript,
  placeFunction,
  v8CoverageRecord,
  detachCoverageSession,
  watchV8Coverage,
  armV8Coverage,
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
