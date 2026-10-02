// Whether a self-advancing element — today only the homepage hero carousel —
// should advance itself on this page load.
//
// Two things switch it off, and they are different kinds of reason.
//
// THE READER'S SETTING. A carousel that moves on its own is the plainest case of
// what `prefers-reduced-motion: reduce` is for. Every other moving part on this
// site already honours it (see `parallax.ts`, `gallery.ts`,
// `momentumNetworkDom.ts`); the carousel was the one that did not, which is a
// gap rather than a decision.
//
// THE CAPTURE HARNESS. Playwright will not act on an element whose bounding box
// is still changing between frames. A hero that shifts every six seconds can
// therefore keep a capture from ever settling, and the failure lands nowhere
// near the hero: `harvard-in-tech-board-on-four-sizes` frames the board by
// hovering `#board`, far below the fold, and on 2026-10-01 that hover timed out
// at five seconds while the slideshow kept the page in motion above it. The
// scenario's own note on `/events` had already recorded the same shape — "a
// hover on the foot times out because the Luma iframe above keeps resizing" —
// so this is a class of failure, not one scenario's bad luck.
//
// WHY A PURE FUNCTION over `location.search` rather than an ambient read: the
// site is `output: 'static'`, so the query string is knowable only in the
// browser, which puts this in a `<script>`. This repo's convention for that is a
// bundled script importing a tested function, never logic stranded in an inline
// string where no test can reach it — the same tradeoff `embeddedPreview.ts`
// documents for the CMS preview pane.

/** The parameter the capture harness appends to every scenario URL. */
export const SCENARIO_FLAG = '_codeyam_scenario';

/**
 * True when `search` carries the capture harness's scenario parameter.
 *
 * Deliberately loose about the VALUE, like `isEmbeddedPreview` beside it: the
 * meaning is the flag's presence. The failure modes are asymmetric and both
 * small — a missed capture wastes a screenshot, a false positive leaves one
 * reader a carousel that waits to be clicked.
 *
 * @param search A `location.search` string, with or without the leading `?`.
 */
export function isScenarioRender(search: string): boolean {
  if (!search) return false;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.has(SCENARIO_FLAG);
}

/**
 * Should a self-advancing element start its timer?
 *
 * Taking both signals as data rather than reading `window` here is what makes
 * the rule testable; the caller passes its own `location.search` and
 * `matchMedia` result.
 */
export function autoplayEnabled({
  search,
  reducedMotion,
}: {
  search: string;
  reducedMotion: boolean;
}): boolean {
  if (reducedMotion) return false;
  if (isScenarioRender(search)) return false;
  return true;
}
