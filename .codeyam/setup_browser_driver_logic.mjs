// Pure, browser-independent helpers for the co-driven setup-browser driver
// (`setup_browser_driver.mjs`). No Playwright / CDP import lives here, so these
// unit-test in milliseconds under the `control-api-js` runner while the driver
// imports and orchestrates them against a real Chromium at runtime. Keeping the
// value-building logic out of the browser-coupled entrypoint is what makes the
// driver testable at all — the entrypoint stays a thin dispatch shell.

// Flatten a Playwright accessibility snapshot into a compact `role: name`
// outline the agent reads to choose where to click by role+name rather than
// pixel coordinates. Capped at depth 6 / 200 rows / 160 chars per line so a
// deep page can't produce an unbounded or unscannable map.
export function flattenTree(node, depth, acc) {
  if (!node || depth > 6 || acc.length > 200) return acc;
  if (node.role && node.name) {
    acc.push(`${"  ".repeat(depth)}${node.role}: ${node.name}`.slice(0, 160));
  }
  for (const child of node.children || []) flattenTree(child, depth + 1, acc);
  return acc;
}

// CDP `Input.dispatchMouseEvent` params for a client mouse frame, defaulting a
// missing button/position/click-count so a sparse frame is still a valid event.
export function mouseInputParams(cmd) {
  return {
    type: cmd.event || "mousePressed",
    x: cmd.x || 0,
    y: cmd.y || 0,
    button: cmd.button || "left",
    clickCount: cmd.clickCount || 1,
  };
}

// CDP `Input.dispatchKeyEvent` params for a client key frame; empty text/key
// default so a bare keydown is still well-formed.
export function keyInputParams(cmd) {
  return {
    type: cmd.event || "keyDown",
    text: cmd.text || "",
    key: cmd.key || "",
  };
}

// CDP mouse-wheel params for a client scroll frame, defaulting deltas to 0.
export function scrollInputParams(cmd) {
  return {
    type: "mouseWheel",
    x: cmd.x || 0,
    y: cmd.y || 0,
    deltaX: cmd.deltaX || 0,
    deltaY: cmd.deltaY || 0,
  };
}
