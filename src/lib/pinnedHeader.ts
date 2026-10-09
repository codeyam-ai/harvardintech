// Marks the site header `data-scrolled` while it is pinned to the top of the
// screen, so its CSS can give it a shadow then and only then.
//
// The header itself is `position: sticky` (BaseLayout.astro), so the pinning is
// pure CSS and works with JavaScript off. What CSS cannot tell is WHEN the
// header has become stuck — a sticky element exposes no state for that — so a
// zero-height sentinel sits where the header's top edge rests, and this watches
// it. While the sentinel is on screen the page is at (or near) the top and the
// header looks exactly as it always has; once the sentinel scrolls off the top,
// the header is pinned over content and gets its shadow.
//
// Observing the HEADER would not work: a sticky header never leaves the screen,
// so it would never report a change.
//
// Pure DOM in and out, following ./navDisclosure.ts, with the observer
// injected so the contract is testable in jsdom, which ships no
// IntersectionObserver.

/** The slice of IntersectionObserver this module relies on. */
export type ObserverCtor = new (
  callback: (entries: { isIntersecting: boolean }[]) => void,
) => { observe(el: Element): void; disconnect(): void };

/** The attribute the header's CSS keys its shadow off. */
const SCROLLED_ATTR = 'data-scrolled';

/**
 * Start watching `sentinel` and toggle `data-scrolled` on `header` as it leaves
 * and re-enters the screen. Returns a function that stops the watch, or `null`
 * when no observer is available — the header still sticks, without a shadow.
 */
export function watchPinnedHeader(
  sentinel: Element,
  header: Element,
  Observer: ObserverCtor | undefined,
): (() => void) | null {
  if (!Observer) return null;

  const observer = new Observer(([entry]) => {
    header.toggleAttribute(SCROLLED_ATTR, !entry.isIntersecting);
  });
  observer.observe(sentinel);

  return () => observer.disconnect();
}
