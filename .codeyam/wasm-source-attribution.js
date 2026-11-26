// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: 9ba3ac2b00a5213b1fe3d55c78b78e8eaf2f67584dba6426accfdbe79b2a7cad
// Map a wasm function back to the workspace source file that declares it, and
// decide which function-entry breakpoints still have something to learn.
//
// Stack assumption: Rust workspace crates compiled to wasm with rustc's
// demangled paths kept in the name section (a trunk dev build keeps them), and
// crate roots discovered through `cargo metadata`. Other stacks attribute
// through their own source (see docs/rendered-source-attribution.md).

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// Workspace crates as `crate_ident → { srcDir, roots }`, project-relative.
// `roots` holds every target root (lib.rs AND main.rs share a crate name), so
// a path that names no module file is attributed to all of them — reporting
// more files is the safe direction.
function workspaceCrates(projectDir, exec = execFileSync) {
  const raw = exec("cargo", ["metadata", "--no-deps", "--format-version", "1", "--offline"], {
    cwd: projectDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const crates = new Map();
  for (const pkg of JSON.parse(raw).packages) {
    for (const target of pkg.targets) {
      if (!target.kind.some((k) => k === "lib" || k === "bin" || k === "cdylib")) continue;
      const ident = target.name.replace(/-/g, "_");
      const root = path.relative(projectDir, target.src_path).split(path.sep).join("/");
      const entry = crates.get(ident) || { srcDir: path.posix.dirname(root), roots: [] };
      if (!entry.roots.includes(root)) entry.roots.push(root);
      crates.set(ident, entry);
    }
  }
  return crates;
}

// The file a module path's segments resolve to, descending `<seg>.rs` or
// `<seg>/mod.rs` from the crate's source dir while such a file exists. Segments
// past the last file are items or inline modules inside it. `null` when not
// even the first segment names a module file — the caller then reports every
// root. A crate root is never a submodule: `app::main` is the item `main`,
// not a module backed by the bin root `main.rs`.
function resolveModuleFile(projectDir, crate, segments, exists = fs.existsSync) {
  return resolveModulePrefix(projectDir, crate, segments, exists).file;
}

// `resolveModuleFile` plus how many segments the file consumed:
// `{ file, consumed }`. The segments past `consumed` name the item inside the
// file (`Panel::show`, `inner::helper`).
function resolveModulePrefix(projectDir, crate, segments, exists = fs.existsSync) {
  let dir = crate.srcDir;
  let file = null;
  let consumed = 0;
  for (const seg of segments) {
    const flat = `${dir}/${seg}.rs`;
    const nested = `${dir}/${seg}/mod.rs`;
    if (crate.roots.includes(flat)) {
      break;
    } else if (exists(path.join(projectDir, flat))) {
      file = flat;
    } else if (exists(path.join(projectDir, nested))) {
      file = nested;
    } else {
      break;
    }
    consumed++;
    dir = `${dir}/${seg}`;
  }
  return { file, consumed };
}

const PATH_PATTERN = /[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)+/g;
const LEGACY_HASH_SEGMENT = /^h[0-9a-f]{16}$/;

// Every workspace source file a demangled function name points into. A name
// can mention several paths (`<app::a::T as app::b::Tr>::f`, or a generic
// instantiated with an app closure); all of them are reported, since the code
// may live in either module. Names outside the workspace map to nothing.
function filesForFunctionName(name, crates, projectDir, exists = fs.existsSync) {
  const files = new Set();
  // v0-mangled names carry a crate disambiguator: `app[3429bd42a6f35fe9]::…`.
  const plain = name.replace(/\[[0-9a-f]+\]/g, "");
  for (const match of plain.matchAll(PATH_PATTERN)) {
    const [head, ...rest] = match[0].split("::");
    const crate = crates.get(head);
    if (!crate) continue;
    const segments = rest.filter((s) => !LEGACY_HASH_SEGMENT.test(s));
    const file = resolveModuleFile(projectDir, crate, segments, exists);
    if (file) files.add(file);
    else crate.roots.forEach((r) => files.add(r));
  }
  return files;
}

// A trait-impl method name: `<Self as Trait>::method`. Its body lives in the
// Self type's impl block, so it is attributed as `Self::method`.
const TRAIT_IMPL = /^<(.+?) as .+?>::([A-Za-z_][A-Za-z0-9_]*)/;

// The file a workspace path points into plus the item path inside it:
// `{ file, item }`, `item` null when the path names no item below the module
// file (a crate root, or a path that ends at the module). Null when the path is
// outside the workspace.
function itemForPath(pathText, crates, projectDir, exists) {
  const [head, ...rest] = pathText.split("::");
  const crate = crates.get(head);
  if (!crate) return null;
  const segments = rest.filter((s) => !LEGACY_HASH_SEGMENT.test(s));
  const { file, consumed } = resolveModulePrefix(projectDir, crate, segments, exists);
  const itemSegments = file ? segments.slice(consumed) : segments;
  const item = itemSegments.length > 0 ? itemSegments.join("::") : null;
  if (file) return [{ file, item }];
  return crate.roots.map((root) => ({ file: root, item }));
}

// For each hub file a demangled function name points into, the item path
// inside that file whose body the function is: `Map<file, item | null>`.
// `null` means the name could not be pinned to one item there — the consumer
// then treats the whole file as having run. Closures and generic arguments
// truncate to the enclosing named fn, because the path pattern stops at
// `{{closure}}` / `<`. Only `hubFiles` are reported.
function hubItemsForFunctionName(name, crates, projectDir, hubFiles, exists = fs.existsSync) {
  const out = new Map();
  if (!hubFiles || hubFiles.size === 0) return out;
  const plain = name.replace(/\[[0-9a-f]+\]/g, "");
  const located =
    traitImplItems(plain, crates, projectDir, exists) ||
    pathPatternItems(plain, crates, projectDir, exists);
  for (const { file, item } of located) {
    if (!hubFiles.has(file)) continue;
    // Two different items in one file from one name: keep it ambiguous.
    if (out.has(file) && out.get(file) !== item) out.set(file, null);
    else out.set(file, item);
  }
  return out;
}

// The `{ file, item }` locations a trait-impl method name (`<app::ui::Panel as
// Trait>::show`) points at — `item` is `Panel::show`, or null when the Self
// path names no item below its module file. Null when the name is no trait
// impl or its Self type is outside the workspace.
function traitImplItems(plain, crates, projectDir, exists) {
  const traitImpl = plain.match(TRAIT_IMPL);
  if (!traitImpl) return null;
  const selfPath = traitImpl[1].replace(/<.*$/, "");
  const located = itemForPath(selfPath, crates, projectDir, exists);
  if (!located) return null;
  return located.map(({ file, item }) => ({
    file,
    item: item ? `${item}::${traitImpl[2]}` : null,
  }));
}

// The `{ file, item }` locations of every workspace path in a demangled name
// whose code ran: the leading path, and a later path only when it is a closure
// argument or the leading path is itself in the workspace.
function pathPatternItems(plain, crates, projectDir, exists) {
  const out = [];
  const matches = [...plain.matchAll(PATH_PATTERN)];
  const firstInWorkspace = matches.length > 0 && crates.has(matches[0][0].split("::")[0]);
  for (const [i, m] of matches.entries()) {
    const located = itemForPath(m[0], crates, projectDir, exists);
    if (!located) continue;
    // A workspace TYPE argument of a std generic (`drop_in_place<app::ui::
    // Panel>`) names no code of the hub file: std's code ran, over a type whose
    // layout the skeleton digest already keeps. A workspace CLOSURE argument
    // (`core::iter::map::<app::ui::draw::{{closure}}>`) is its enclosing fn's
    // code.
    const isClosure = plain.slice(m.index + m[0].length).startsWith("::{");
    if (i > 0 && !firstInWorkspace && !isClosure) continue;
    out.push(...located);
  }
  return out;
}

// The watched function whose body holds byte offset `column`, or undefined.
function functionRangeAt(ranges, column) {
  return ranges.find((r) => column >= r.start && column < r.end);
}

// The ranges whose breakpoint can go: every live one whose files are all
// already reported, since a hit there would teach nothing. This caps pauses at
// about one per FILE — on egui, one pause per function stalled the app's WebGL
// startup and it never signalled ready. `"function"` granularity keeps every
// breakpoint until its own function runs (a measurement mode).
//
// `hubFiles` mixes the two: a range touching any hub file keeps its breakpoint
// until its own function runs (the hit itself removes it), so the record can
// say which hub functions ran; every other range retires by file.
function retirableBreakpoints(ranges, sources, granularity, hubFiles = new Set()) {
  if (granularity === "function") return [];
  return ranges.filter(
    (r) =>
      r.breakpointId &&
      [...r.files].every((f) => sources.has(f) && !hubFiles.has(f)),
  );
}

module.exports = {
  workspaceCrates,
  resolveModuleFile,
  resolveModulePrefix,
  hubItemsForFunctionName,
  filesForFunctionName,
  functionRangeAt,
  retirableBreakpoints,
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
