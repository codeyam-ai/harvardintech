// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: 3bed91dd1e22f0d2015b783f5eb9c8204c9f97dbdc8aac98ca2aa259968fbfd0
// Launching the capture browser: the Chromium flags that keep a headless
// launch alive on dbus-less and containerized hosts, and the self-heal around
// `chromium.launch()` — install a missing browser, retry a transient crash, and
// diagnose (never heal) a host that lacks Chromium's system libraries — and the
// warm persistent context a capture worker keeps alive across captures
// (`createWarmContext`). Split out of scenario-check.js, which owns what happens
// once the browser is up.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");
const {
  PLAYWRIGHT_INSTALL_COMMAND,
  CAPTURE_HOST_UNSUPPORTED_MARKER,
  CAPTURE_BROWSER_DEPS_MISSING_MARKER,
  isMissingSystemLibrary,
  missingLibraryNames,
  missingLibraryRemedy,
  missingSystemLibraryError,
  runPlaywrightInstall,
  installFailureText,
  unsupportedHost,
  hostUnsupportedError,
} = require("./scenario-launch-diagnostics");

// Substring Playwright has emitted across every 1.x release when the
// browser cache is empty. Match the substring (not the full string)
// because Playwright includes the offending path inline.
const PLAYWRIGHT_MISSING_BROWSER_PATTERN = "Executable doesn't exist";

// Substrings Playwright/Chromium emit when the browser process dies on a
// transient launch crash. On the cloud VM the base image has no dbus session,
// so Chromium intermittently aborts at launch with `Received signal 11`
// (SIGSEGV) — an environmental fault, not a scenario fault. Match either form
// because the wording varies across Playwright releases and the OS signal
// reporter.
const PLAYWRIGHT_LAUNCH_CRASH_PATTERNS = ["SIGSEGV", "Received signal 11"];
// A transient SIGSEGV launch crash is environmental, so a bounded retry clears
// it. Keep it small — a genuinely broken environment must still surface loudly
// rather than spin.
const CAPTURE_LAUNCH_SIGSEGV_RETRIES = 2;
// Short backoff between SIGSEGV retries so the transient fault has a moment to
// clear; small enough not to eat the per-slug recapture budget.
const CAPTURE_LAUNCH_SIGSEGV_BACKOFF_MS = 250;

// Pin the headless capture browser's `localhost` resolution to the IPv4
// loopback the editor's listeners bind. The browser-facing preview origin is
// now `localhost` (secure-context apps refuse a bare IP — see
// `BROWSER_FACING_HOST`), but on a dual-stack host `localhost` can resolve to
// `::1` first, which nothing answers on — stalling the capture or paying a
// happy-eyeballs fallback delay. Forcing the map removes that intermittency
// deterministically for capture. The operator's OWN preview browser is covered
// separately by the editor binding `::1` alongside `127.0.0.1` (see start.rs).
const CAPTURE_HOST_RESOLVER_RULES = "MAP localhost 127.0.0.1";
const CAPTURE_LAUNCH_ARGS = [
  `--host-resolver-rules=${CAPTURE_HOST_RESOLVER_RULES}`,
  // Cloud-VM-no-dbus / containerized-launch hardening. Each flag below is
  // inert on a healthy desktop, so the laptop capture path is unchanged; on
  // the dbus-less cloud base image they stop Chromium from SIGSEGV-ing at
  // launch (signal 11). See plan chromium-capture-dbus-crash-hardening.
  // No setuid sandbox in the container (the cloud VM runs capture without the
  // kernel namespaces the sandbox needs).
  "--no-sandbox",
  // /dev/shm is tiny in many containers; route shared memory to /tmp so the
  // renderer doesn't crash allocating it.
  "--disable-dev-shm-usage",
  // No GPU on the headless cloud VM — avoid the GL init path that aborts.
  "--disable-gpu",
  // Software WebGL2, asked for EXPLICITLY rather than inherited. Playwright
  // adds this itself on Linux, which is why `--disable-gpu` left canvas apps
  // with working WebGL2 there — and why it did not on macOS, where Playwright
  // does not add it: `getContext("webgl2")` returned null and the WebGL2
  // capture test failed on every mac dev machine while passing in CI. That is
  // the host-capability dependency CLAUDE.md forbids, so the flag is now
  // stated here for every platform. A duplicate on Linux is harmless
  // (last-wins, same value). WebGPU is still unavailable either way.
  "--enable-unsafe-swiftshader",
];
// Features the capture browser disables on top of Playwright's own list.
// DBus: stub out the dbus integration Chromium reaches for at launch; the cloud
// base image has no dbus session bus, which is the proximate cause of the
// signal-11 abort.
//
// These are NOT a second `--disable-features=` switch. Chromium keeps only the
// LAST value of a repeated switch (verified empirically: `--disable-features=
// WebHID` hides `navigator.hid`, and a later `--disable-features=DBus` brings it
// back), so appending our own switch silently re-enabled every feature
// Playwright disables. `captureLaunchOptions` merges them into one value.
const CAPTURE_DISABLED_FEATURES = ["DBus"];
const DISABLE_FEATURES_PREFIX = "--disable-features=";

// Playwright's own default `--disable-features=<list>` switch, exactly as it
// will pass it, or null when it cannot be read. Read from playwright-core's
// switch table (not part of its public exports, so it is required by file path
// and any failure degrades to null rather than throwing).
function playwrightDefaultDisableFeaturesArg() {
  try {
    const playwrightDir = path.dirname(require.resolve("playwright/package.json"));
    const coreDir = path.dirname(
      require.resolve("playwright-core/package.json", { paths: [playwrightDir] }),
    );
    const { chromiumSwitches } = require(
      path.join(coreDir, "lib", "server", "chromium", "chromiumSwitches.js"),
    );
    const found = chromiumSwitches(false).find(
      (arg) => typeof arg === "string" && arg.startsWith(DISABLE_FEATURES_PREFIX),
    );
    return found || null;
  } catch (_) {
    return null;
  }
}

// One `--disable-features=` value carrying the default list plus `extra`,
// de-duplicated and order-preserving.
function mergeDisableFeaturesArg(defaultArg, extra) {
  const base =
    typeof defaultArg === "string" && defaultArg.startsWith(DISABLE_FEATURES_PREFIX)
      ? defaultArg.slice(DISABLE_FEATURES_PREFIX.length).split(",")
      : [];
  const merged = [];
  for (const feature of base.concat(extra)) {
    if (feature && !merged.includes(feature)) merged.push(feature);
  }
  return DISABLE_FEATURES_PREFIX + merged.join(",");
}

// The `chromium.launch` args for capture. Playwright's default
// `--disable-features` switch is suppressed via `ignoreDefaultArgs` and
// re-supplied merged with ours. Should the suppression ever miss (its match is
// exact-string), our merged switch is still the later one and a superset, so
// the last-wins rule still lands every feature.
function captureLaunchOptions({
  defaultDisableFeaturesArg = playwrightDefaultDisableFeaturesArg(),
} = {}) {
  const args = [
    ...CAPTURE_LAUNCH_ARGS,
    mergeDisableFeaturesArg(defaultDisableFeaturesArg, CAPTURE_DISABLED_FEATURES),
  ];
  return defaultDisableFeaturesArg
    ? { args, ignoreDefaultArgs: [defaultDisableFeaturesArg] }
    : { args };
}
// Point Chromium's dbus client at a dead address so it never blocks on (or
// crashes against) a missing session bus. Spread over the real env in the
// default launcher so the laptop path keeps its normal environment.
const CAPTURE_LAUNCH_DBUS_ENV = { DBUS_SESSION_BUS_ADDRESS: "/dev/null" };

// Does this launch error look like a transient SIGSEGV browser crash?
// (environmental — e.g. the cloud VM's missing dbus session bus — not a
// scenario fault, so it is safe to retry).
function isTransientLaunchCrash(error) {
  return (
    error &&
    typeof error.message === "string" &&
    PLAYWRIGHT_LAUNCH_CRASH_PATTERNS.some((pattern) =>
      error.message.includes(pattern),
    )
  );
}

// Self-heal around `chromium.launch()`. Two recoverable classes:
//
//   1. "missing browser" — run `npx playwright install chromium` (echoing its
//      output so the user sees progress) and retry once. An install that fails
//      because Playwright does not support this host OS is rethrown as
//      `hostUnsupportedError`; any other install failure is rethrown with the
//      install's own reason — the launch's "Executable doesn't exist" would
//      point at a download that was just attempted and failed.
//   2. transient SIGSEGV launch crash — retry the launch up to
//      `CAPTURE_LAUNCH_SIGSEGV_RETRIES` times with a short backoff, since the
//      crash is environmental (dbus-less cloud VM) and clears on a retry.
//
// A third class is diagnosed but deliberately NOT healed: a host missing a
// system library Chromium links against. Installing system packages changes
// the user's environment (replit.nix, apt, often root), so it is rethrown —
// with no retry and no browser install — as `missingSystemLibraryError`,
// naming the library and the platform's remedy.
//
// For any unrecognized error, or after exhausting retries, rethrow the
// ORIGINAL Playwright error so the existing `Scenario check failed: <stderr>`
// path keeps showing the actionable message — looping would hide a real ops
// failure under a slow timeout.
async function launchChromiumWithSelfHeal({
  launch = () =>
    chromium.launch({
      ...captureLaunchOptions(),
      env: { ...process.env, ...CAPTURE_LAUNCH_DBUS_ENV },
    }),
  stderr = process.stderr,
  install = () => runPlaywrightInstall({ stderr }),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  env = process.env,
  platform = process.platform,
} = {}) {
  try {
    return await launch();
  } catch (error) {
    if (isMissingSystemLibrary(error)) {
      throw missingSystemLibraryError(error, { env, platform });
    }
    const isMissingBrowser =
      error &&
      typeof error.message === "string" &&
      error.message.includes(PLAYWRIGHT_MISSING_BROWSER_PATTERN);
    const isTransientCrash = isTransientLaunchCrash(error);
    if (!isMissingBrowser && !isTransientCrash) throw error;

    if (isTransientCrash) {
      for (let attempt = 1; attempt <= CAPTURE_LAUNCH_SIGSEGV_RETRIES; attempt++) {
        stderr.write(
          `Chromium crashed at launch (transient, likely a dbus-less environment) — retry ${attempt}/${CAPTURE_LAUNCH_SIGSEGV_RETRIES}.\n`,
        );
        await sleep(CAPTURE_LAUNCH_SIGSEGV_BACKOFF_MS);
        try {
          return await launch();
        } catch (retryError) {
          if (!isTransientLaunchCrash(retryError)) throw retryError;
        }
      }
      throw error;
    }

    stderr.write(
      "Playwright's Chromium browser is missing — installing it now (one-time ~150 MB download). Subsequent runs will be instant.\n",
    );
    try {
      await install();
    } catch (installError) {
      const host = unsupportedHost(installError);
      if (host) throw hostUnsupportedError(host, installError);
      const wrapped = new Error(
        `Playwright's Chromium browser is missing and installing it failed: ` +
          `${installFailureText(installError).trim()}\n${error.message}`,
      );
      wrapped.cause = installError;
      throw wrapped;
    }
    try {
      return await launch();
    } catch (retryError) {
      // A fresh download onto a host without Chromium's system libraries
      // (the common first-capture shape on Replit) fails HERE, and the
      // original "missing browser" error would now be a lie.
      if (isMissingSystemLibrary(retryError)) {
        throw missingSystemLibraryError(retryError, { env, platform });
      }
      throw error;
    }
  }
}

// Launch a persistent Chromium context on `userDataDir` with the capture's
// launch flags plus `contextOptions`, through the same self-heal path. A
// persistent context keeps its HTTP and compiled-code caches on disk in that
// profile, which is what a warm capture context reuses (see `createWarmContext`).
function launchPersistentChromiumWithSelfHeal(userDataDir, contextOptions) {
  return launchChromiumWithSelfHeal({
    launch: () =>
      chromium.launchPersistentContext(userDataDir, {
        ...captureLaunchOptions(),
        env: { ...process.env, ...CAPTURE_LAUNCH_DBUS_ENV },
        ...contextOptions,
      }),
  });
}

// A warm capture context: one persistent Chromium context a capture worker
// keeps alive across captures (`capture.contextReuse: "persistent"`).
//
// A fresh context per capture starts with an empty HTTP cache and an empty
// compiled-code cache, so a single-bundle wasm app re-fetches and recompiles
// its whole module for every screenshot. A persistent context keeps those
// caches in its on-disk profile. What it must NOT keep is app state, so before
// every capture `acquire` clears cookies and every storage type an app can
// write — local storage, IndexedDB, service workers, Cache Storage, file
// systems — for every origin the context has seen. Session storage dies with
// the page, which the capture closes. The HTTP cache, the code cache and the
// GPU shader cache survive; they are caches of the app's code, not its state.
//
// Per-capture setup (init scripts, routes, extra headers) goes on the PAGE in
// this mode, never on the context, because a context-level init script or
// route can never be removed and would leak into every later capture. See
// `pageScopedCaptureTarget`.

// The CDP `Storage.clearDataForOrigin` types that hold app state. Deliberately
// not `all`: that also drops the shader cache, which is a cache of the app's
// code, and a cold one is part of what a warm context exists to skip.
const CLEARED_STORAGE_TYPES = [
  "cookies",
  "file_systems",
  "indexeddb",
  "local_storage",
  "websql",
  "service_workers",
  "cache_storage",
].join(",");

// The origin of `url`, or null for one without a real origin (`about:`,
// `data:`, a malformed URL).
function originOf(url) {
  try {
    const origin = new URL(url).origin;
    return origin && origin !== "null" ? origin : null;
  } catch (_) {
    return null;
  }
}

// The target `prepareCaptureContext` writes per-capture setup to in warm mode:
// cookies on the context (cleared before every capture), everything else on the
// page, where it ends with the page.
function pageScopedCaptureTarget(context, page) {
  return {
    addCookies: (cookies) => context.addCookies(cookies),
    addInitScript: (script, arg) => page.addInitScript(script, arg),
    route: (matcher, handler) => page.route(matcher, handler),
    setExtraHTTPHeaders: (headers) => page.setExtraHTTPHeaders(headers),
  };
}

// Add the origin of every request `context` makes to `origins`, so a later
// reset knows whose app state to clear. URLs without a real origin are skipped.
function trackRequestOrigins(context, origins) {
  context.on("request", (request) => {
    const origin = originOf(request.url());
    if (origin) origins.add(origin);
  });
}

// Clear the app state (`CLEARED_STORAGE_TYPES`) of every origin in `origins`
// through a CDP session on a throwaway page of `context`. No origins means
// nothing to clear, so no page is opened. A failed clear is thrown — the
// caller must not hand an uncleared context to the next scenario — but the
// throwaway page is closed either way.
async function clearOriginsAppState(context, origins) {
  if (origins.size === 0) return;
  const page = await context.newPage();
  try {
    const cdp = await context.newCDPSession(page);
    for (const origin of origins) {
      await cdp.send("Storage.clearDataForOrigin", {
        origin,
        storageTypes: CLEARED_STORAGE_TYPES,
      });
    }
    await cdp.detach().catch(() => {});
  } finally {
    await page.close().catch(() => {});
  }
}

// One worker's warm context. `launchPersistent(userDataDir, contextOptions)`
// opens the context; it is injectable so tests need no browser.
//
// The context's options (viewport, device scale, locale, …) are fixed at
// launch, so a capture whose options differ relaunches it on the same profile:
// the caches are on disk and survive the relaunch. A context that closed or
// failed to reset is discarded and relaunched the same way.
function createWarmContext({
  launchPersistent = launchPersistentChromiumWithSelfHeal,
  profileDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "codeyam-capture-profile-")),
  removeProfile = (dir) => fs.rmSync(dir, { recursive: true, force: true }),
} = {}) {
  let dir = null;
  let current = null; // { context, key, closed: boolean }
  // Every origin any context on this profile has requested. Kept across
  // relaunches: the profile persists app state on disk, so a relaunched context
  // can still hold an earlier capture's storage for an origin it never touched.
  const origins = new Set();

  async function discard() {
    const held = current;
    current = null;
    if (held && !held.closed) {
      await held.context.close().catch(() => {});
    }
  }

  async function launch(contextOptions, key) {
    if (!dir) dir = profileDir();
    const context = await launchPersistent(dir, contextOptions);
    const held = { context, key, closed: false };
    context.on("close", () => {
      held.closed = true;
    });
    trackRequestOrigins(context, origins);
    current = held;
  }

  // Close any page a previous capture (or the launch itself) left open, then
  // clear every origin's app state.
  async function reset(held) {
    for (const page of held.context.pages()) {
      await page.close().catch(() => {});
    }
    await held.context.clearCookies();
    await clearOriginsAppState(held.context, origins);
  }

  return {
    // The warm context for a capture with `contextOptions`, its app state
    // cleared, and the milliseconds spent launching it (0 when it was reused).
    async acquire(contextOptions) {
      const key = JSON.stringify(contextOptions);
      if (current && (current.closed || current.key !== key)) await discard();
      let launchMs = 0;
      if (!current) {
        const startedAt = Date.now();
        await launch(contextOptions, key);
        launchMs = Date.now() - startedAt;
      }
      try {
        await reset(current);
      } catch (_) {
        // A context that cannot be cleared cannot be trusted with the next
        // scenario: drop it and clear a relaunched one. A second failure is
        // thrown — the capture fails rather than running on uncleared state.
        await discard();
        const startedAt = Date.now();
        await launch(contextOptions, key);
        launchMs += Date.now() - startedAt;
        await reset(current);
      }
      return { context: current.context, launchMs };
    },
    // Drop the context (its next `acquire` relaunches). Called when a capture
    // could not close its page, so nothing it left can reach the next one.
    discard,
    // Close the context and delete its profile.
    async close() {
      await discard();
      if (dir) {
        removeProfile(dir);
        dir = null;
      }
    },
  };
}

module.exports = {
  launchChromiumWithSelfHeal,
  launchPersistentChromiumWithSelfHeal,
  CLEARED_STORAGE_TYPES,
  createWarmContext,
  clearOriginsAppState,
  trackRequestOrigins,
  originOf,
  pageScopedCaptureTarget,
  isTransientLaunchCrash,
  isMissingSystemLibrary,
  missingLibraryNames,
  missingLibraryRemedy,
  CAPTURE_BROWSER_DEPS_MISSING_MARKER,
  CAPTURE_HOST_UNSUPPORTED_MARKER,
  CAPTURE_LAUNCH_ARGS,
  CAPTURE_DISABLED_FEATURES,
  captureLaunchOptions,
  mergeDisableFeaturesArg,
  playwrightDefaultDisableFeaturesArg,
  CAPTURE_HOST_RESOLVER_RULES,
  CAPTURE_LAUNCH_SIGSEGV_RETRIES,
  PLAYWRIGHT_INSTALL_COMMAND,
  PLAYWRIGHT_MISSING_BROWSER_PATTERN,
  PLAYWRIGHT_LAUNCH_CRASH_PATTERNS,
};

// Pixel-path script: its code and this number both feed the capture pipeline
// id. Bump the number for a change that alters pixels without changing code.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
