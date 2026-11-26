// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: 66c7166a2934585b37a4b85923f4cf7664dbef53f819bb3d56ba8acbb8bb14f8
const { findScenarioError, SCENARIO_ERROR_MARKER } = require("./scenario-metrics");

function createIssue(kind, message, extra = {}) {
  const issue = {
    kind,
    message,
    url: extra.url ?? null,
    status: extra.status ?? null,
  };
  if (extra.matchedPattern != null) issue.matchedPattern = extra.matchedPattern;
  if (extra.contextSnippet != null) issue.contextSnippet = extra.contextSnippet;
  // The hydration gate's cross-origin ATTRIBUTION, carried as data rather than
  // only as prose. A consumer that must act on the verdict — escalating the
  // preview off the subpath when the counterpart origin hydrates — would
  // otherwise have to regex the English message, which breaks the moment the
  // wording is improved. Same conditional shape as the two fields above so an
  // issue that carries no attribution serializes exactly as it did before.
  if (extra.crossOrigin != null) issue.crossOrigin = extra.crossOrigin;
  if (extra.counterpartUrl != null) issue.counterpartUrl = extra.counterpartUrl;
  // The dev-server-down verdict, carried as data for the same reason as the
  // attribution fields above: a consumer that must distinguish "the app served
  // an error" from "the app was not serving at all" should branch on a field,
  // not on the prose of the message.
  if (extra.devServerDown != null) issue.devServerDown = extra.devServerDown;
  return issue;
}

function pushIssue(issues, issue) {
  const key = JSON.stringify(issue);
  if (!issues.some((existing) => JSON.stringify(existing) === key)) {
    issues.push(issue);
  }
}

// Derive which origin a capture actually loaded from, and whether that differs
// from the origin the VIEWER's browser is served.
//
// The two can legitimately differ: the capture browser runs where the app is,
// the viewer may not, and aiming them independently is what makes a capture
// work on a cloud VM at all. A capture that renders perfectly from the app's
// own origin while the user's pane sits on `/__codeyam_preview` is a USEFUL
// result — but only if the difference travels with it instead of having to be
// inferred from a URL the reader must parse themselves.
//
// Both unknowns resolve toward "no split", never toward a guess. A caller that
// supplies no `viewerOrigin` (every pre-existing call site) and a `url` with no
// parseable origin both yield `false`, so no existing consumer sees a changed
// verdict and an unclassifiable capture is never reported as diverging.
//
// Deliberately not reusing `isCrossOriginRequest` from scenario-check.js: that
// module imports THIS one, so depending on it would invert the dependency, and
// its fail-safe answers a different question (never strip markers) than this
// one does (never claim a split).
function deriveOriginSplit(url, viewerOrigin) {
  let captureOrigin = null;
  try {
    captureOrigin = new URL(url).origin;
  } catch (_) {
    /* a malformed or relative capture URL has no origin to report */
  }
  return {
    captureOrigin,
    viewerOrigin: viewerOrigin ?? null,
    captureOriginDiffersFromViewer:
      captureOrigin != null &&
      viewerOrigin != null &&
      captureOrigin !== viewerOrigin,
  };
}

function buildResult({
  loaded,
  hasContent,
  issues,
  outputPath,
  url,
  unmockedRoutes = [],
  mockUsage = { used: [], unused: [] },
  externalRequests = [],
  viewerOrigin = null,
}) {
  const { captureOrigin, captureOriginDiffersFromViewer } = deriveOriginSplit(
    url,
    viewerOrigin,
  );

  return {
    ok: loaded && hasContent && issues.length === 0,
    loaded,
    hasContent,
    url,
    outputPath: outputPath ?? null,
    issues,
    // Diagnostic-only: same-origin 4xx routes with no scenario mock. Does NOT
    // affect `ok` — the paired console error already fails the capture; this is
    // the actionable route list the failure message and `stub-unmocked-routes`
    // consume. Defaults to `[]` so callers that omit it are unchanged.
    unmockedRoutes,
    // Diagnostic-only, and deliberately NOT part of `ok`: an unused mock is not
    // automatically an error (a scenario may legitimately declare a mock for a
    // request the page makes only on interaction). Reporting it turns a silent
    // inertness into a visible fact; failing on it would break working scenarios
    // for a heuristic.
    mockUsage,
    // Requests grouped by origin, split mocked/unmocked and same/cross-origin.
    // The line that ends a "why is this page blank" misdiagnosis.
    externalRequests,
    // The two hops, named. See `deriveOriginSplit` for why they can differ and
    // why reporting the difference is not optional.
    captureOrigin,
    viewerOrigin,
    captureOriginDiffersFromViewer,
  };
}

// The message a capture fails with when the scenario frame navigated after its
// ready signal arrived — a dev server's live reload swapping the page under the
// shot.
const RELOADED_AFTER_READY =
  "The scenario page navigated after it signalled ready (a dev-server live reload)";

// Failure messages that mean the page was reloaded mid-capture rather than that
// the app is broken: Playwright's destroyed-context and detached-frame errors,
// and the marker above. Any dev server with live reload (Vite full reload,
// trunk, Flutter) produces them, so the match names no stack.
const LIVE_RELOAD_FAILURE_PATTERNS = [
  /Execution context was destroyed/i,
  /Frame was detached/i,
  /navigated after it signalled ready/,
];

// The first issue of a failed capture whose message names a mid-capture
// reload, or null. A capture that passed, or failed for any other reason, is
// never a reload candidate.
function liveReloadIssue(result) {
  if (!result || result.ok) return null;
  return (
    (result.issues || []).find((issue) =>
      LIVE_RELOAD_FAILURE_PATTERNS.some((re) => re.test(String(issue.message || ""))),
    ) || null
  );
}

// Run a capture `attempt`, and run it ONCE more when a dev server's live reload
// interrupted it: the reload is a temporary condition, and the second attempt
// waits for the ready signal on the reloaded page from scratch. The retry is
// recorded on the returned result (`reloadRetry`) so it is visible rather than
// silently absorbed, and a second failure is returned as-is, with its own
// reason. `onRetry` is told the first failure before the retry starts.
async function retryOnLiveReload(attempt, { onRetry = () => {} } = {}) {
  const first = await attempt();
  const reload = liveReloadIssue(first);
  if (!reload) return first;
  onRetry(reload.message);
  const second = await attempt();
  second.reloadRetry = { retried: true, firstError: reload.message };
  return second;
}

// The sentinel the reverse proxy stamps on its dev-server-down placeholder —
// the other half of this contract is
// `crates/proxy-http/src/reverse_proxy.rs::DEV_SERVER_DOWN_HEADER`, and the two
// spellings are deliberately greppable from each other. Keyed on the header
// rather than the placeholder's copy for two reasons: the response is a 200, so
// no status check can see it, and the copy is per-framework prose that drifts
// the moment `render_placeholder` is reworded.
const DEV_SERVER_DOWN_HEADER = "x-codeyam-dev-server-down";

// True when this response is the reverse proxy's dev-server-down placeholder
// rather than the app. The proxy stamps `DEV_SERVER_DOWN_HEADER` on exactly
// that response and four Rust consumers already key on it; this is the fifth,
// and the first on the capture side. Header names are compared
// case-insensitively — Playwright lowercases them, but the contract is the
// header, not Playwright's normalization of it. A null response is not a
// placeholder (the null-response case has its own branch). Pure, so the
// decision is unit-testable without a live browser or a downed dev server.
function isDevServerPlaceholderResponse(response) {
  if (!response || typeof response.headers !== "function") return false;
  const headers = response.headers() || {};
  return Object.keys(headers).some(
    (name) => name.toLowerCase() === DEV_SERVER_DOWN_HEADER,
  );
}

// The verdict on the initial load's response: `issue` is the navigation issue
// it earns (or null), and `devServerPlaceholder` says the document was the
// proxy's dev-server-down placeholder, which must never be screenshotted.
// Pure over a Playwright-shaped response.
function navigationStatusIssue(response, config, url) {
  // The proxy's dev-server-down placeholder is a 200 carrying codeyam's own
  // sentinel header, so it is checked BEFORE the status branches below —
  // status alone cannot tell it from the app. Left unchecked, the capture
  // photographs codeyam's "Ready to scaffold" card, reports success, and
  // leaves that frame on disk to be shown later as the app's real state.
  if (isDevServerPlaceholderResponse(response)) {
    return {
      devServerPlaceholder: true,
      issue: createIssue(
        "navigation",
        "Captured the editor's dev-server placeholder, not the app. The proxy " +
          `answered with \`${DEV_SERVER_DOWN_HEADER}\`, which means the proxy ` +
          "could not reach the app for this request. That happens two ways: the " +
          "app's dev server is not running, or it is running and the proxy could " +
          "not reach it this time. The screenshot would be of codeyam's own " +
          "placeholder card. Re-run the capture first — it is the cheaper check, " +
          "and a transient miss clears. If the same capture fails this way again, " +
          "confirm the app's dev server is up and accepting connections.",
        { url, devServerDown: true },
      ),
    };
  }
  if (response && response.status() >= 400) {
    return {
      devServerPlaceholder: false,
      issue: createIssue("navigation", `Navigation returned HTTP ${response.status()}`, {
        url: response.url(),
        status: response.status(),
      }),
    };
  }
  if (!response && config.navigation === "topLevel") {
    // A real top-level document load always yields a response. A null one
    // means the status could never be checked — and an unverified status is
    // not a passing status: a 500 whose error body renders text would
    // otherwise satisfy `hasContent` and pass as `ok`. Fail loudly instead.
    // The iframe path stays tolerant: there the app response is matched by
    // exact URL and is legitimately allowed to miss.
    return {
      devServerPlaceholder: false,
      issue: createIssue(
        "navigation",
        "Navigation response unavailable — could not verify the HTTP status of the top-level document",
        { url },
      ),
    };
  }
  return { devServerPlaceholder: false, issue: null };
}

// Check for codeyam's scenario-renderer error fallback. We anchor on the
// DOM marker the ScenarioRenderer stamps on its error / seed-error frames
// rather than scanning the whole page body for ERROR_PATTERNS — a
// legitimately-mocked scenario whose content quotes one of those harness
// phrases must not be flagged. Apps with no codeyam ScenarioRenderer never
// emit the marker, so their pages are treated as healthy regardless of body
// text. The scan is scoped to the marked element's own text. Returns the
// `error-state` issue, or null.
async function scenarioErrorMarkerIssue(page, frame, url) {
  const errorMarker = await frame.evaluate((attr) => {
    const el = document.querySelector(`[${attr}]`);
    if (!el) return null;
    return {
      reason: el.getAttribute(attr) || "",
      text: el.innerText || el.textContent || "",
    };
  }, SCENARIO_ERROR_MARKER);
  const scenarioError = findScenarioError(errorMarker);
  if (!scenarioError) return null;
  const { matchedPattern, contextSnippet } = scenarioError;
  return createIssue(
    "error-state",
    `Page contains error content (matched "${matchedPattern}"): ${contextSnippet ?? ""}`,
    {
      url: page.url() || url,
      matchedPattern,
      contextSnippet,
    },
  );
}

module.exports = {
  createIssue,
  pushIssue,
  DEV_SERVER_DOWN_HEADER,
  isDevServerPlaceholderResponse,
  navigationStatusIssue,
  scenarioErrorMarkerIssue,
  buildResult,
  deriveOriginSplit,
  RELOADED_AFTER_READY,
  liveReloadIssue,
  retryOnLiveReload,
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
