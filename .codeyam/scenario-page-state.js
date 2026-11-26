// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  protocol: 1  build: 3c04f028e1c7a16d15df213f41de17e3686934cb  source-sha256: 45d97b6d5d2e74d5f238b6547e91864440d1a620b888111c5276e3f589b4bc76
// npm/scenario-page-state.js — the read-only page-state snapshot a capture
// takes of its settled frame: localStorage, a bounded sample of visible text,
// head metadata, and an optional selector's text. Read by `capture-state` and
// by the seed-landing verifier in scenario-check.js, which both need one
// definition of "what the page showed".
// Split out of scenario-check.js, which re-exports `dumpPageState`.
"use strict";

// How many visible text nodes `dumpPageState` samples. Named because two
// callers must agree on it: the sampler itself, and `verifyProbeSeedLanded`,
// which can only treat "probe not found" as proof of absence when the sample
// did NOT hit this cap.
const PAGE_STATE_TEXT_NODE_CAP = 40;

// Read-only page-state snapshot for `capture-state`: the full localStorage
// map, a bounded sample of visible text nodes (document order), the page's
// head metadata (`<title>` plus every named `<meta>`'s content), and — when a
// selector is given — that element's text. Evaluated in-page against the
// settled frame so it reflects exactly what a real capture saw (the proxy
// already injected the scenario's seed into the served HTML). Every read is
// individually guarded so a sandboxed/cross-origin localStorage never throws
// the whole capture; the worst case is an empty section, not a failure.
async function dumpPageState(frame, selector) {
  return frame.evaluate(([sel, textNodeCap]) => {
    const localStorage = {};
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key != null) localStorage[key] = window.localStorage.getItem(key);
      }
    } catch (_) {
      /* localStorage may be unavailable (sandboxed/opaque origin) */
    }

    const visibleText = [];
    try {
      // Reject text inside non-rendered tags (SCRIPT/STYLE/etc.) so an
      // injected proxy script or inline CSS never masquerades as on-screen
      // text — that noise is exactly what makes a state dump misleading.
      const SKIP_TAGS = new Set([
        "SCRIPT",
        "STYLE",
        "NOSCRIPT",
        "TEMPLATE",
        "HEAD",
        "TITLE",
      ]);
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (parent && SKIP_TAGS.has(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return (node.textContent || "").trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        },
      );
      let node;
      while ((node = walker.nextNode()) && visibleText.length < textNodeCap) {
        const text = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (text) visibleText.push(text);
      }
    } catch (_) {
      /* no body / detached document */
    }

    // Head metadata, deliberately its OWN field rather than more `visibleText`.
    // `capture-state` consumers read `visibleText` as "text a reader sees on
    // the page", and a `<title>` is not that. But a page that renders its
    // seeded values only into `<title>` / `<meta content>` — a title-only page
    // is exactly the reported case — still received the seed, and the Rust
    // poll already counts it: matching the raw response body, head markup is
    // in its haystack. Collecting the same surface here is what lets the two
    // halves of one gate agree about what counts as the render.
    const headMetadata = [];
    try {
      const title = (document.title || "").replace(/\s+/g, " ").trim();
      if (title) headMetadata.push(title);
    } catch (_) {
      /* detached document */
    }
    try {
      // `name` or `property` only: a bare `<meta charset>` or an
      // `http-equiv` carries no authored content, and requiring one of the two
      // naming attributes keeps the haystack to metadata someone declared.
      const metas = document.querySelectorAll(
        "meta[name][content], meta[property][content]",
      );
      for (let i = 0; i < metas.length && headMetadata.length < textNodeCap; i++) {
        const content = (metas[i].getAttribute("content") || "")
          .replace(/\s+/g, " ")
          .trim();
        if (content) headMetadata.push(content);
      }
    } catch (_) {
      /* no head / detached document */
    }

    let selectorText = null;
    if (sel) {
      try {
        const el = document.querySelector(sel);
        if (el) selectorText = (el.textContent || "").replace(/\s+/g, " ").trim();
      } catch (_) {
        /* invalid selector — leave selectorText null */
      }
    }

    return { localStorage, visibleText, headMetadata, selectorText };
  }, [selector || null, PAGE_STATE_TEXT_NODE_CAP]);
}

module.exports = {
  PAGE_STATE_TEXT_NODE_CAP,
  dumpPageState,
};

// Diagnostic script: it writes no pixels, so only this number (not its code)
// feeds the capture pipeline id. Bump it if a change ever alters a frame.
const CAPTURE_VISUAL_CONTRACT = 1;
module.exports.CAPTURE_VISUAL_CONTRACT = CAPTURE_VISUAL_CONTRACT;
