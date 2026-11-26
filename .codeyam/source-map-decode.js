// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: da9e4e4ecc2f9568bac3a8c2e5a612b1fc125148f2dc9fc162c79c08f4d20f35
// Source-map v3 decoding for the capture, with no knowledge of coverage, CDP,
// or the project layout: base64-VLQ `mappings` into segments, a generated
// position back to its original one, offsets into line/column positions, an
// inline `data:` map URL into its JSON, and a whole map into the shape
// `v8-coverage-attribution.js` reads.
//
// Every malformed input is null, never a throw: a map the capture cannot read
// makes no claim, so the editor falls back to digesting the files whole.

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_VALUE = new Map([...BASE64].map((c, i) => [c, i]));

// The source-map `mappings` string decoded into one array per generated line,
// each holding `[generatedColumn, sourceIndex, sourceLine, sourceColumn]`
// segments (absolute values, columns sorted), or `[generatedColumn]` for a
// segment that maps to nothing. Null when the string is malformed.
function parseMappings(mappings) {
  const lines = [];
  // Source index, line and column are deltas across the whole string; the
  // generated column resets on every line.
  let sourceIndex = 0;
  let sourceLine = 0;
  let sourceColumn = 0;
  for (const lineText of mappings.split(";")) {
    const segments = [];
    let column = 0;
    for (const segmentText of lineText.split(",")) {
      if (segmentText === "") continue;
      const fields = decodeVlqSegment(segmentText);
      if (!fields || (fields.length !== 1 && fields.length < 4)) return null;
      column += fields[0];
      if (fields.length === 1) {
        segments.push([column]);
        continue;
      }
      sourceIndex += fields[1];
      sourceLine += fields[2];
      sourceColumn += fields[3];
      segments.push([column, sourceIndex, sourceLine, sourceColumn]);
    }
    lines.push(segments.sort((a, b) => a[0] - b[0]));
  }
  return lines;
}

// The signed integers one base64-VLQ segment encodes, or null when it holds a
// character outside base64 or ends mid-number.
function decodeVlqSegment(text) {
  const fields = [];
  let value = 0;
  let shift = 0;
  for (const ch of text) {
    const digit = BASE64_VALUE.get(ch);
    if (digit === undefined) return null;
    value += (digit & 31) * 2 ** shift;
    if (digit & 32) {
      shift += 5;
      continue;
    }
    fields.push(value % 2 === 1 ? -Math.floor(value / 2) : Math.floor(value / 2));
    value = 0;
    shift = 0;
  }
  return shift === 0 ? fields : null;
}

// The original `{ sourceIndex, line, column }` for generated `(line, column)`
// (both zero-based): the last segment at or before the column on that line.
// Null when the line has no such segment or it maps to nothing.
function originalPositionFor(lines, line, column) {
  const segments = lines[line];
  if (!segments || segments.length === 0) return null;
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid][0] <= column) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found < 0 || segments[found].length < 4) return null;
  const [, sourceIndex, sourceLine, sourceColumn] = segments[found];
  return { sourceIndex, line: sourceLine, column: sourceColumn };
}

// The offset each line of `text` starts at.
function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

// The zero-based `{ line, column }` of `offset` given `starts` from lineStarts.
function offsetToPosition(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo, column: offset - starts[lo] };
}

// The JSON text of a `data:` URL source map, or null for any other URL or an
// undecodable one.
function decodeDataUrl(url) {
  const match = /^data:([^,]*),(.*)$/s.exec(url || "");
  if (!match) return null;
  try {
    return /;base64$/i.test(match[1])
      ? Buffer.from(match[2], "base64").toString("utf8")
      : decodeURIComponent(match[2]);
  } catch (_) {
    return null;
  }
}

// The source map of one script as `{ lines, files, contents }` — decoded
// mappings, each source's path as `resolveSource(source, sourceRoot)` names it
// (null when it names nothing the caller cares about), and each source's
// original text (null when the map carries none) — or null when the map is
// missing, malformed, or an index map (`sections`), which this does not read.
function readSourceMap(mapText, resolveSource) {
  let map;
  try {
    map = JSON.parse(mapText);
  } catch (_) {
    return null;
  }
  if (!map || map.sections || typeof map.mappings !== "string" || !Array.isArray(map.sources)) {
    return null;
  }
  const lines = parseMappings(map.mappings);
  if (!lines) return null;
  const files = map.sources.map((s) => resolveSource(s, map.sourceRoot || ""));
  const contents = map.sources.map((_, i) =>
    Array.isArray(map.sourcesContent) && typeof map.sourcesContent[i] === "string"
      ? map.sourcesContent[i]
      : null,
  );
  return { lines, files, contents };
}

module.exports = {
  parseMappings,
  decodeVlqSegment,
  originalPositionFor,
  lineStarts,
  offsetToPosition,
  decodeDataUrl,
  readSourceMap,
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
