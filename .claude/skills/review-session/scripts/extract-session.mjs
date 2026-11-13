#!/usr/bin/env node
// Extracts a compressed, readable summary from a Claude Code OR Gemini CLI session .jsonl file.
//
// The two formats differ on disk but produce the same internal message shape, so all
// sections (full / user-only / decisions / errors) work identically across sources.
//
// Format detection: prefers the file path (`.gemini/` or `/chats/session-`), then falls
// back to a content scan over a window of the first parseable records — picking `claude`
// on the first Claude message/summary shape and `gemini` on the first unambiguous Gemini
// shape (`obj.kind: "main"`, or `obj.type` of "gemini"/"info"). A top-level `sessionId`
// is present on BOTH formats (current Claude transcripts lead with a `last-prompt` record
// carrying it) and is NOT a Gemini signal — see detectFormat in extract-session-helpers.mjs.
//
// Usage: node extract-session.mjs <path-to-session.jsonl> [--section=<section>] [--format=<format>]
//
// Sections:
//   full         - Full conversation flow (default)
//   user-only    - Only user messages (prompts/instructions)
//   decisions    - Tool calls + user messages (shows what was done)
//   errors       - Only error results and corrections
//   conversation - Human prompts + agent responses, verbatim, with the
//                  mechanical layer (tool calls, tool results, thinking,
//                  injected system-reminder / slash-command / hook records)
//                  collapsed to one-line beats. Subtractive only: a surviving
//                  turn is reproduced exactly, never paraphrased.
//   tokens       - Where the session's tokens went (Claude transcripts only):
//                  per-turn context, cost split, compactions, carried context
//                  per source, cost per workflow step, subagents separately.
//                  `--attribution=last|even` (default last) picks how a
//                  chained `codeyam-editor editor` call's output is split.
//                  A sibling `<uuid>/subagents/*.jsonl` dir is read too.
//
// Formats:
//   markdown - human-readable (default; every existing caller relies on it)
//   json     - a single structured document, `conversation` and `tokens`
//              sections only. For `conversation` this is the input contract
//              for the `editor session-summarize` HTML renderer, which
//              consumes structured turns rather than re-parsing markdown.

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import {
  appendClaudeMessage,
  appendGeminiMessage,
  buildConversationTurns,
  detectFormat,
  detectFormatFromPath,
  formatTs,
  queuedLabel,
} from './extract-session-helpers.mjs';
import { profileSession } from './session-tokens.mjs';
import { renderTokensMarkdown } from './session-tokens-report.mjs';
import { readSubagentLines } from './session-tokens-subagents.mjs';

const USAGE =
  'Usage: node extract-session.mjs <session.jsonl> ' +
  '[--section=full|user-only|decisions|errors|conversation|tokens] [--format=markdown|json] ' +
  '[--attribution=last|even]\n';

const inputFile = process.argv[2];
if (!inputFile) {
  process.stderr.write(USAGE);
  process.exit(1);
}

let section = 'full';
let format = 'markdown';
let attribution = 'last';
for (const arg of process.argv.slice(3)) {
  if (arg.startsWith('--section=')) section = arg.slice('--section='.length);
  else if (arg.startsWith('--format=')) format = arg.slice('--format='.length);
  else if (arg.startsWith('--attribution=')) attribution = arg.slice('--attribution='.length);
}

if (format !== 'markdown' && format !== 'json') {
  process.stderr.write(`Unrecognized --format '${format}'. Accepted: markdown, json\n`);
  process.exit(1);
}
if (attribution !== 'last' && attribution !== 'even') {
  process.stderr.write(`Unrecognized --attribution '${attribution}'. Accepted: last, even\n`);
  process.exit(1);
}
// JSON is defined for the conversation and tokens sections only — the other
// sections are hand-shaped markdown reports with no structured equivalent, and
// silently emitting markdown under --format=json would hand a caller piping to
// a JSON parser an unexplained parse error.
if (format === 'json' && section !== 'conversation' && section !== 'tokens') {
  process.stderr.write(
    `--format=json is supported only with --section=conversation or --section=tokens (got '${section}')\n`
  );
  process.exit(1);
}

try {
  const st = await stat(inputFile);
  process.stderr.write(`Reading ${basename(inputFile)} (${Math.round(st.size / 1024)}KB)...\n`);
} catch {
  process.stderr.write(`File not found: ${inputFile}\n`);
  process.exit(1);
}

// ── Tokens section ────────────────────────────────────────────────────────
// Needs the raw records (usage blocks, attachments, compaction markers), not
// the compressed message list every other section builds, so it branches here.
if (section === 'tokens') {
  const lines = (await readFile(inputFile, 'utf8')).split('\n');
  const subagentLines = await readSubagentLines(inputFile);
  const profile = profileSession(lines, { attribution, subagentLines });
  process.stdout.write(
    format === 'json'
      ? JSON.stringify({ source: basename(inputFile), ...profile }, null, 2) + '\n'
      : `# Session Token Report\nSource: ${basename(inputFile)}\n\n${renderTokensMarkdown(profile)}`
  );
  process.exit(0);
}

// ── Format detection ──────────────────────────────────────────────────────
// Prefer the path; when it's inconclusive, buffer a window of the first
// parseable records and scan them for a content-bearing shape. The window is
// large enough to skip a leading `last-prompt` / `bridge-session` preamble
// (which carries `sessionId` but no message body) while staying O(1) memory.
const DETECTION_WINDOW = 50;

let detectedFormat = detectFormatFromPath(inputFile);

const messages = [];
let lineCount = 0;

// Gemini streams the same event multiple times as it updates (e.g. an initial response
// then a second emission with toolCalls populated). We dedupe by event id and keep the
// last-seen version, then convert to messages in insertion order.
const geminiEvents = new Map();

// Records parsed before the format is resolved, replayed once it is.
const pending = [];

function processRecord(obj) {
  if (detectedFormat === 'claude') {
    appendClaudeMessage(obj, messages);
  } else {
    if (obj.kind || obj.$set) return; // session metadata / metadata-update lines
    if (!obj.type) return;
    if (obj.id) {
      geminiEvents.set(obj.id, obj);
    } else {
      appendGeminiMessage(obj, messages);
    }
  }
}

const rl = createInterface({ input: createReadStream(inputFile) });
for await (const line of rl) {
  lineCount++;
  let obj;
  try { obj = JSON.parse(line); } catch { continue; }

  if (detectedFormat === null) {
    pending.push(obj);
    if (pending.length < DETECTION_WINDOW) continue;
    // Window full — decide from the sample (falling back to the default only
    // now that it's exhausted), then replay the buffered records.
    detectedFormat = detectFormat(inputFile, pending);
    for (const rec of pending) processRecord(rec);
    pending.length = 0;
    continue;
  }

  processRecord(obj);
}

// Stream ended before the window filled (short transcript) — decide from
// whatever we buffered, then replay it.
if (detectedFormat === null) detectedFormat = detectFormat(inputFile, pending);
for (const rec of pending) processRecord(rec);

if (detectedFormat === 'gemini') {
  for (const obj of geminiEvents.values()) appendGeminiMessage(obj, messages);
}

process.stderr.write(`Format: ${detectedFormat}. Parsed ${messages.length} messages from ${lineCount} lines.\n`);

// ── Output formatter ─────────────────────────────────────────────────────
const output = [];

// Populated only by the `conversation` section; also the JSON document's body.
let conversationTurns = [];

output.push(`# Session Transcript Review`);
output.push(`Source: ${basename(inputFile)} (${detectedFormat})`);
output.push(`Messages: ${messages.length}`);
output.push('');

if (section === 'user-only') {
  output.push('## User Messages Only\n');
  for (const msg of messages) {
    if (msg.role === 'user') {
      output.push(`### User${queuedLabel(msg)} [${formatTs(msg.ts)}]`);
      output.push(msg.text);
      output.push('');
    }
  }
} else if (section === 'errors') {
  output.push('## Errors and Corrections\n');
  for (const msg of messages) {
    if (msg.role === 'user_complex' && msg.hasError) {
      output.push(`### Error [${formatTs(msg.ts)}]`);
      for (const part of msg.parts) {
        if (part.kind === 'tool_result' && part.error) {
          output.push('```\n' + part.text + '\n```');
        }
      }
      output.push('');
    }
    // Capture user corrections (short messages) for either source
    if (msg.role === 'user' && msg.text.length < 500) {
      const lower = msg.text.toLowerCase();
      if (lower.includes('no') || lower.includes('wrong') || lower.includes('fix') ||
          lower.includes('actually') || lower.includes('instead') || lower.includes('not what') ||
          lower.includes('revert') || lower.includes('undo')) {
        output.push(`### Correction [${formatTs(msg.ts)}]`);
        output.push(msg.text);
        output.push('');
      }
    }
  }
} else if (section === 'conversation') {
  conversationTurns = buildConversationTurns(messages);
  output.push('## Conversation\n');
  for (const turn of conversationTurns) {
    if (turn.kind === 'beat') {
      output.push(`_${turn.text}_`);
      output.push('');
      continue;
    }
    output.push(`### ${turn.kind === 'user' ? 'USER' : 'ASSISTANT'} [${formatTs(turn.ts)}]`);
    output.push(turn.text);
    output.push('');
  }
} else if (section === 'decisions') {
  output.push('## Decisions and Actions\n');
  for (const msg of messages) {
    if (msg.role === 'user') {
      output.push(`### User${queuedLabel(msg)} [${formatTs(msg.ts)}]`);
      output.push(msg.text);
      output.push('');
    }
    if (msg.role === 'assistant') {
      for (const part of msg.parts) {
        if (part.kind === 'text') output.push(part.text);
        if (part.kind === 'tool') output.push(`  > ${part.name}: ${part.input}`);
      }
      output.push('');
    }
  }
} else {
  // full
  output.push('## Full Conversation Flow\n');
  for (const msg of messages) {
    if (msg.role === 'user') {
      output.push(`### USER${queuedLabel(msg)} [${formatTs(msg.ts)}]`);
      output.push(msg.text);
      output.push('');
    } else if (msg.role === 'user_complex') {
      output.push(`### USER (tool results) [${formatTs(msg.ts)}]`);
      for (const part of msg.parts) {
        if (part.kind === 'text') {
          output.push(part.text);
        } else if (part.kind === 'tool_result') {
          const prefix = part.error ? '[ERROR] ' : '';
          output.push(`  ${prefix}Result: ${part.text}`);
        }
      }
      output.push('');
    } else if (msg.role === 'assistant') {
      output.push(`### ASSISTANT [${formatTs(msg.ts)}]`);
      for (const part of msg.parts) {
        if (part.kind === 'thinking') {
          output.push(`<thinking>${part.text}</thinking>`);
        } else if (part.kind === 'text') {
          output.push(part.text);
        } else if (part.kind === 'tool') {
          output.push(`  > ${part.name}: ${part.input}`);
        }
      }
      output.push('');
    }
  }
}

if (section === 'conversation' && format === 'json') {
  const withTs = conversationTurns.filter((t) => t.ts);
  process.stdout.write(
    JSON.stringify(
      {
        source: basename(inputFile),
        format: detectedFormat,
        messageCount: messages.length,
        turnCount: conversationTurns.length,
        firstTs: withTs.length > 0 ? withTs[0].ts : null,
        lastTs: withTs.length > 0 ? withTs[withTs.length - 1].ts : null,
        turns: conversationTurns,
      },
      null,
      2
    ) + '\n'
  );
} else {
  process.stdout.write(output.join('\n'));
}
