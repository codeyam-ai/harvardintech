// codeyam-generated — DO NOT EDIT.
// codeyam-editor: 0.1.7  build: a7cfba071c939e2a4f6c87eb60005c6c345c51fb  source-sha256: 46b66cf27419a8a788901724edcf1b24fa29ea9a5c4e14e434018e234bfe25aa
// npm/scenario-dom-fingerprint.js — the DOM fingerprint a single driven
// interaction is judged by: snapshot before, snapshot after, and "did the page
// change?" is whether the two fingerprints differ.
//
// Fingerprints what the user can SEE, not only the serialized markup. A clone's
// `innerHTML` omits two kinds of visible change: content inside an open shadow
// root (a web component's whole UI), and a form control's live state (`value`,
// `checked` are properties, not attributes, so a moved slider serializes
// exactly as before). VM9 5bd7adff filled a range input inside a web
// component, watched the slider and the map move, and was told
// `interactionEffect: "none"`. Both are folded in here. A CLOSED shadow root is
// unreachable from script by design and stays invisible — an honest limit.
// Split out of scenario-check-run.js, which re-exports both helpers.
"use strict";

// Hash serialized markup into a compact `<length>-<hash>` fingerprint, so two
// snapshots compare by value. Pure; `getDOMFingerprint` decides what markup
// goes in.
function fingerprintHtml(html) {
  const text = String(html || "");
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `${text.length}-${hash}`;
}

// Runs IN THE PAGE (passed to `frame.evaluate`), so it must be self-contained.
// Serializes `document.body`, then every open shadow root under it
// (recursively), then each form control's live state, into one string.
function serializeVisibleDom() {
  if (!document.body) return null;
  const parts = [];
  // Serialize a root's children on a detached copy, so the live page is
  // untouched: drop each inline `cursor` and re-serialize every inline style in
  // its canonical form.
  //
  // The cursor is pointer feedback, not app state — egui/eframe rewrites its
  // canvas's cursor every time the pointer crosses a widget, so counting it
  // made a click on empty canvas read as "changed", hiding exactly the dead
  // step the verdict exists to name. It is removed through the style object,
  // never a text regex, which would also eat visible text like "cursor: 4,2".
  // Canonical form matters because the first script write to `el.style`
  // re-serializes the WHOLE attribute (`display:block` → `display: block;`),
  // which alone would move the fingerprint. A ShadowRoot cannot be cloned
  // itself, so its children are copied into a holder instead.
  const serializeChildren = (root) => {
    const holder = document.createElement("div");
    for (const child of root.childNodes) holder.appendChild(child.cloneNode(true));
    for (const el of holder.querySelectorAll("[style]")) {
      el.style.removeProperty("cursor");
      el.setAttribute("style", el.style.cssText);
    }
    return holder.innerHTML;
  };
  const walk = (root) => {
    parts.push(serializeChildren(root));
    for (const el of root.querySelectorAll("*")) {
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        parts.push(`<#control ${el.value}|${el.checked === true}>`);
      }
      if (el.shadowRoot) {
        parts.push("<#shadow>");
        walk(el.shadowRoot);
        parts.push("</#shadow>");
      }
    }
  };
  walk(document.body);
  return parts.join("");
}

async function getDOMFingerprint(frame) {
  try {
    const html = await frame.evaluate(serializeVisibleDom);
    return html === null ? "" : fingerprintHtml(html);
  } catch (err) {
    return "";
  }
}

module.exports = {
  fingerprintHtml,
  getDOMFingerprint,
  serializeVisibleDom,
};
