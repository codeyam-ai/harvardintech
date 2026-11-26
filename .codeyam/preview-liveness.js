// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: d3d55f9f1920a0b30ebcb79f5cb6ac0bfd2281f759a38167c9bac5b75c3f41ed
// npm/preview-liveness.js — does the page stay responsive after it paints?
//
// A capture proves a page painted once. It cannot tell a healthy page from one
// that painted its first frame and then locked its main thread: the screenshot
// was taken before the lock. This probe loads the plain preview URL a user
// would open, waits for it to report ready, then repeatedly evaluates a trivial
// script for a settle window. One evaluation that takes longer than the block
// threshold means the main thread is stuck.
//
// It runs in its own browser with a GPU path enabled (WebGPU and WebGL through
// SwiftShader), not the capture browser. The capture browser passes
// `--disable-gpu`, which leaves `navigator.gpu` present but adapter-less, so an
// app's WebGPU branch never runs there and a WebGPU-only freeze stays invisible.
// Captures keep their deterministic flags; only this probe differs.
//
// Usage: node .codeyam/preview-liveness.js '{"url":"http://localhost:3000/"}'
// Optional fields: settleMs (10000), blockThresholdMs (3000), loadTimeoutMs
// (30000), readyExpression (a JS expression awaited truthy before the window).
// Prints one JSON line: {responsive, longestBlockMs, consoleTail, gpuAdapter,
// url, reason}. Exit 0 whenever a verdict was reached (responsive or not);
// exit 1 on a usage error or a browser that could not launch.
"use strict";

const { chromium } = require("playwright");
const {
  CAPTURE_HOST_RESOLVER_RULES,
  CAPTURE_DISABLED_FEATURES,
  mergeDisableFeaturesArg,
  playwrightDefaultDisableFeaturesArg,
  launchChromiumWithSelfHeal,
} = require("./scenario-launch");

const DEFAULT_SETTLE_MS = 10000;
const DEFAULT_BLOCK_THRESHOLD_MS = 3000;
const DEFAULT_LOAD_TIMEOUT_MS = 30000;
// Gap between evaluations, so the probe samples the window instead of
// saturating the page's task queue with its own work.
const SAMPLE_INTERVAL_MS = 200;
const CONSOLE_TAIL_LINES = 10;
// How long an adapter request may take before the GPU path counts as absent.
const ADAPTER_TIMEOUT_MS = 5000;

// The liveness browser's args: the capture's container-safety flags without
// `--disable-gpu`, plus a SwiftShader WebGPU adapter. Measured on Linux
// Chromium (Playwright 1.58): with `--disable-gpu`, `requestAdapter()` resolves
// null; with `--enable-unsafe-webgpu --use-webgpu-adapter=swiftshader` it
// resolves a `swiftshader` adapter and WebGL2 still works.
function livenessLaunchOptions({
  defaultDisableFeaturesArg = playwrightDefaultDisableFeaturesArg(),
} = {}) {
  const args = [
    `--host-resolver-rules=${CAPTURE_HOST_RESOLVER_RULES}`,
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
    "--enable-unsafe-webgpu",
    "--use-webgpu-adapter=swiftshader",
    mergeDisableFeaturesArg(defaultDisableFeaturesArg, CAPTURE_DISABLED_FEATURES),
  ];
  return defaultDisableFeaturesArg
    ? { args, ignoreDefaultArgs: [defaultDisableFeaturesArg] }
    : { args };
}

function parseRequest(argv) {
  const raw = argv[2];
  if (!raw) throw new Error("usage: preview-liveness.js '{\"url\":\"http://…\"}'");
  const request = JSON.parse(raw);
  if (typeof request.url !== "string" || !request.url) {
    throw new Error("preview-liveness: request needs a non-empty \"url\"");
  }
  return {
    url: request.url,
    settleMs: request.settleMs ?? DEFAULT_SETTLE_MS,
    blockThresholdMs: request.blockThresholdMs ?? DEFAULT_BLOCK_THRESHOLD_MS,
    loadTimeoutMs: request.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS,
    readyExpression: request.readyExpression || null,
  };
}

// Resolves to `{ timedOut: false, value, ms }` or `{ timedOut: true, ms }`.
// An evaluation stuck behind a locked main thread never settles, so the race
// against the threshold is what turns a hang into a measurement.
async function timedEvaluate(page, expression, limitMs) {
  const started = Date.now();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), limitMs);
  });
  const evaluation = page
    .evaluate(expression)
    .then((value) => ({ timedOut: false, value }))
    .catch((error) => ({ timedOut: false, error: String(error && error.message) }));
  const result = await Promise.race([evaluation, timeout]);
  clearTimeout(timer);
  return { ...result, ms: Date.now() - started };
}

// Sample the page for `settleMs`. Stops at the first evaluation that exceeds
// the threshold: the thread is stuck and later samples would only queue
// behind it.
async function measureResponsiveness(page, { settleMs, blockThresholdMs }) {
  let longestBlockMs = 0;
  const deadline = Date.now() + settleMs;
  while (Date.now() < deadline) {
    const sample = await timedEvaluate(page, "1", blockThresholdMs);
    longestBlockMs = Math.max(longestBlockMs, sample.ms);
    // The timer can fire a millisecond early; a sample that timed out blocked
    // for at least the threshold by definition.
    if (sample.timedOut) {
      return { responsive: false, longestBlockMs: Math.max(longestBlockMs, blockThresholdMs) };
    }
    await new Promise((resolve) => setTimeout(resolve, SAMPLE_INTERVAL_MS));
  }
  return { responsive: true, longestBlockMs };
}

// The adapter the page's WebGPU code would get, or null when the GPU path did
// not come up. Reported so a run on a host without SwiftShader WebGPU says it
// did not exercise that path instead of passing silently.
async function probeGpuAdapter(page) {
  const sample = await timedEvaluate(
    page,
    `(async () => {
      if (!navigator.gpu) return null;
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return null;
      const info = adapter.info || {};
      return info.architecture || info.vendor || "unknown";
    })()`,
    ADAPTER_TIMEOUT_MS,
  );
  return sample.timedOut || sample.error ? null : sample.value;
}

// The last `limit` lines remembered, oldest first.
function createConsoleTail(limit = CONSOLE_TAIL_LINES) {
  const lines = [];
  return {
    remember(line) {
      lines.push(line);
      if (lines.length > limit) lines.shift();
    },
    lines: () => lines.slice(),
  };
}

// Navigate and wait for the page to report ready. Resolves to a note when
// either did not finish (null when both did); rethrows any other navigation
// error. A page that locks its thread before `load` never fires it, so a load
// timeout is not a verdict on its own — the sampling decides.
async function loadAndAwaitReady(page, request) {
  try {
    await page.goto(request.url, { waitUntil: "load", timeout: request.loadTimeoutMs });
  } catch (error) {
    // Only a timeout is a possible freeze. A refused connection or DNS
    // failure leaves Chromium's error page, which is always responsive —
    // reporting on it would pass a dev server that is not even up.
    if (!error || error.name !== "TimeoutError") throw error;
    return `load did not finish within ${request.loadTimeoutMs} ms`;
  }
  if (!request.readyExpression) return null;
  try {
    await page.waitForFunction(request.readyExpression, null, {
      timeout: request.loadTimeoutMs,
    });
    return null;
  } catch (error) {
    return `ready expression never became truthy: ${String(error.message).split("\n")[0]}`;
  }
}

// The report's `reason`: null for a responsive page, else the block and any
// load note.
function unresponsiveReasonText(request, verdict, loadNote) {
  if (verdict.responsive) return null;
  return (
    `the page's main thread blocked for over ${request.blockThresholdMs} ms ` +
    `(longest block ${verdict.longestBlockMs} ms)` +
    (loadNote ? `; ${loadNote}` : "")
  );
}

// Close the browser, giving up after `ms`: a frozen renderer can stall a
// graceful close, and the probe must never hang on it.
async function closeWithin(browser, ms) {
  let timer;
  await Promise.race([
    browser.close().catch(() => {}),
    new Promise((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  clearTimeout(timer);
}

async function runLiveness(request, { launch } = {}) {
  const browser = await launchChromiumWithSelfHeal({
    launch:
      launch ||
      (() =>
        chromium.launch({
          ...livenessLaunchOptions(),
          env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: "/dev/null" },
        })),
  });
  const consoleTail = createConsoleTail();
  try {
    const page = await browser.newPage();
    page.on("console", (msg) => consoleTail.remember(`[${msg.type()}] ${msg.text()}`));
    page.on("pageerror", (error) => consoleTail.remember(`[pageerror] ${error.message}`));

    const loadNote = await loadAndAwaitReady(page, request);
    const verdict = await measureResponsiveness(page, request);
    const gpuAdapter = verdict.responsive ? await probeGpuAdapter(page) : null;
    return {
      url: request.url,
      responsive: verdict.responsive,
      longestBlockMs: verdict.longestBlockMs,
      blockThresholdMs: request.blockThresholdMs,
      settleMs: request.settleMs,
      gpuAdapter,
      loadNote,
      consoleTail: consoleTail.lines(),
      reason: unresponsiveReasonText(request, verdict, loadNote),
    };
  } finally {
    await closeWithin(browser, 5000);
  }
}

module.exports = {
  livenessLaunchOptions,
  parseRequest,
  timedEvaluate,
  measureResponsiveness,
  createConsoleTail,
  loadAndAwaitReady,
  unresponsiveReasonText,
  closeWithin,
  probeGpuAdapter,
  runLiveness,
  DEFAULT_SETTLE_MS,
  DEFAULT_BLOCK_THRESHOLD_MS,
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;

if (require.main === module) {
  let request;
  try {
    request = parseRequest(process.argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
  runLiveness(request)
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report)}\n`);
      process.exit(0);
    })
    .catch((error) => {
      process.stderr.write(`preview-liveness failed: ${error.message}\n`);
      process.exit(1);
    });
}
