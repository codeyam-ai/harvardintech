// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: f611b4ff8c241d2f41774b035c93ce9352cad7f319aee0a5551c075108003582
// npm/scenario-launch-diagnostics.js — the capture-browser launch failures that
// self-heal must NOT paper over, turned into actionable errors: a host missing
// Chromium's system libraries, and a Playwright release that ships no Chromium
// for this OS. Also runs the one-time browser install, whose output is where
// that second verdict lives.
// Split out of scenario-launch.js, which owns the launch and its retries and
// re-exports these names.
"use strict";

const { spawn } = require("child_process");

const PLAYWRIGHT_INSTALL_COMMAND = "npx playwright install chromium";
// What `playwright install` prints when this Playwright release ships no
// Chromium build for the host OS (e.g. 1.64 on macOS 13). The capture group is
// Playwright's own host string, `mac13-arm64`. Retrying can never succeed.
const PLAYWRIGHT_UNSUPPORTED_HOST_PATTERN = /does not support chromium on (\S+)/;
// Stable first token of the error an unsupported-host install failure is
// rethrown as — the other half of `CAPTURE_HOST_UNSUPPORTED_MARKER` in
// `capture_host_unsupported.rs`, which turns it into a blocked precondition.
const CAPTURE_HOST_UNSUPPORTED_MARKER = "CODEYAM_CAPTURE_HOST_UNSUPPORTED";
const PLAYWRIGHT_RELEASE_NOTES_URL = "https://playwright.dev/docs/release-notes";

// Stable first token of the error a missing-system-library launch failure is
// rethrown as. The Rust side keys on it (`scenario_check.rs`
// `CAPTURE_BROWSER_DEPS_MISSING_MARKER`) to turn the failure into a blocked
// precondition, so the two spellings must stay greppable from each other.
const CAPTURE_BROWSER_DEPS_MISSING_MARKER = "CODEYAM_CAPTURE_BROWSER_DEPS_MISSING";
// The two shapes a missing shared library takes in a launch error: the dynamic
// loader's own line (Chromium starts and dies), and Playwright's host
// validation box listing every missing library before it even spawns.
const MISSING_SHARED_LIBRARY_PATTERNS = [
  "error while loading shared libraries",
  "Host system is missing dependencies",
];
const SHARED_LIBRARY_NAME_PATTERN = /\blib[\w+-]+(?:\.[\w+-]+)*?\.so(?:\.\d+)*/g;
const PLAYWRIGHT_INSTALL_DEPS_COMMAND = "npx playwright install-deps chromium";
// Nix package for the libraries Chromium most often lacks on Replit, keyed by
// the stem before `.so`. A library outside this map still gets a remedy — it is
// just named without a package suggestion.
const REPLIT_NIX_PACKAGE_FOR_LIBRARY = {
  "libglib-2.0": "pkgs.glib",
  "libgobject-2.0": "pkgs.glib",
  "libgio-2.0": "pkgs.glib",
  libnss3: "pkgs.nss",
  libnssutil3: "pkgs.nss",
  libsmime3: "pkgs.nss",
  libnspr4: "pkgs.nspr",
  "libatk-1.0": "pkgs.atk",
  "libatk-bridge-2.0": "pkgs.at-spi2-atk",
  "libatspi": "pkgs.at-spi2-core",
  libcups: "pkgs.cups",
  "libdbus-1": "pkgs.dbus",
  libdrm: "pkgs.libdrm",
  libgbm: "pkgs.mesa",
  libxkbcommon: "pkgs.libxkbcommon",
  libasound: "pkgs.alsa-lib",
  "libpango-1.0": "pkgs.pango",
  libcairo: "pkgs.cairo",
  libexpat: "pkgs.expat",
  libX11: "pkgs.xorg.libX11",
  libXcomposite: "pkgs.xorg.libXcomposite",
  libXdamage: "pkgs.xorg.libXdamage",
  libXext: "pkgs.xorg.libXext",
  libXfixes: "pkgs.xorg.libXfixes",
  libXrandr: "pkgs.xorg.libXrandr",
  libxcb: "pkgs.xorg.libxcb",
};

// Does this launch error say the host is missing a shared library Chromium
// needs? Not retryable and not fixed by downloading the browser again.
function isMissingSystemLibrary(error) {
  return (
    !!error &&
    typeof error.message === "string" &&
    MISSING_SHARED_LIBRARY_PATTERNS.some((pattern) =>
      error.message.includes(pattern),
    )
  );
}

// Every distinct `lib*.so*` name a missing-library launch error mentions, in
// first-seen order. Covers both the loader line and Playwright's list.
function missingLibraryNames(error) {
  const message = (error && error.message) || "";
  return [...new Set(message.match(SHARED_LIBRARY_NAME_PATTERN) || [])];
}

// The fix for the platform the capture is running on. Replit is detected by the
// same env signals `preview_host_provider/replit.rs` uses; there system
// packages come from replit.nix. Any other Linux host gets Playwright's own
// dependency installer; anything else gets the library names and a hint.
function missingLibraryRemedy(libraries, { env = process.env, platform = process.platform } = {}) {
  const named = libraries.length > 0 ? libraries.join(", ") : "the missing libraries";
  if (env.REPL_ID || env.REPLIT_DEV_DOMAIN) {
    const packages = [
      ...new Set(
        libraries
          .map((lib) => REPLIT_NIX_PACKAGE_FOR_LIBRARY[lib.split(".so")[0]])
          .filter(Boolean),
      ),
    ];
    const suggestion =
      packages.length > 0 ? ` (${packages.join(", ")})` : "";
    return `add the Nix package(s) providing ${named}${suggestion} to the \`deps\` list in replit.nix, then restart the Repl and re-run the capture`;
  }
  if (platform === "linux") {
    return `install Chromium's system libraries with \`${PLAYWRIGHT_INSTALL_DEPS_COMMAND}\` (may need sudo), then re-run the capture`;
  }
  return `install the system package(s) that provide ${named} for this OS, then re-run the capture`;
}

// The rethrown error for a missing-library launch failure: marker line naming
// the libraries, a `remedy:` line, then the original Playwright message as
// diagnostic. Line-oriented so the Rust side can lift each part out.
function missingSystemLibraryError(error, { env, platform } = {}) {
  const libraries = missingLibraryNames(error);
  const remedy = missingLibraryRemedy(libraries, { env, platform });
  const wrapped = new Error(
    `${CAPTURE_BROWSER_DEPS_MISSING_MARKER} ${libraries.join(",")}\n` +
      `remedy: ${remedy}\n` +
      error.message,
  );
  wrapped.cause = error;
  return wrapped;
}

// Run the browser install, echoing its output to `stderr` as it arrives (so the
// user still sees download progress, and stdout stays the capture's JSON
// result) while also keeping it: the install's failure reason lives in that
// output, not in its exit code. A failure rejects with `output` attached.
function runPlaywrightInstall({ stderr = process.stderr } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(PLAYWRIGHT_INSTALL_COMMAND, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const echo = (chunk) => {
      output += chunk;
      stderr.write(chunk);
    };
    child.stdout.on("data", echo);
    child.stderr.on("data", echo);
    child.on("error", (error) => {
      error.output = output;
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) return resolve();
      const error = new Error(`\`${PLAYWRIGHT_INSTALL_COMMAND}\` exited with code ${code}`);
      error.output = output;
      reject(error);
    });
  });
}

// Everything an install failure said: its captured output (a string, or
// execSync's `[stdin, stdout, stderr]` array) plus its message.
function installFailureText(installError) {
  if (!installError) return "";
  const output = Array.isArray(installError.output)
    ? installError.output.filter(Boolean).join("\n")
    : installError.output || "";
  return `${output}\n${installError.message || ""}`;
}

// Playwright's host string when the install failed because this Playwright
// release does not support the host OS, else null.
function unsupportedHost(installError) {
  const match = installFailureText(installError).match(PLAYWRIGHT_UNSUPPORTED_HOST_PATTERN);
  return match ? match[1] : null;
}

// The fix for an unsupported host. Deliberately names no version: which
// Playwright last supported a given OS changes with every release, so the
// release notes are the source of truth, not a table baked in here.
function hostUnsupportedRemedy(host) {
  return (
    `the installed Playwright ships no Chromium for ${host}; pin \`playwright\` to an exact ` +
    `older version that supports this OS in package.json and reinstall (no package.json: ` +
    `\`npm install --prefix .codeyam playwright@<version>\`), then re-run the capture — ` +
    `see ${PLAYWRIGHT_RELEASE_NOTES_URL} for each version's supported OS releases`
  );
}

// The rethrown error for an unsupported-host install failure: marker line
// naming Playwright's host string, a `remedy:` line, then the install's own
// output as diagnostic — same line-oriented shape as `missingSystemLibraryError`.
function hostUnsupportedError(host, installError) {
  const wrapped = new Error(
    `${CAPTURE_HOST_UNSUPPORTED_MARKER} ${host}\n` +
      `remedy: ${hostUnsupportedRemedy(host)}\n` +
      installFailureText(installError).trim(),
  );
  wrapped.cause = installError;
  return wrapped;
}

module.exports = {
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
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
