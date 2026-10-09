import { describe, it, expect, afterEach } from 'vitest';
import { watchPinnedHeader, type ObserverCtor } from './pinnedHeader';

// The markup as BaseLayout.astro server-renders it: a zero-height sentinel
// where the header's top edge rests, then the sticky header itself.
const MARKUP = `
  <div class="utility-bar">A global community</div>
  <div class="nav-sentinel" aria-hidden="true"></div>
  <header class="site-nav"></header>
`;

/**
 * An IntersectionObserver stand-in. jsdom ships none, and a real one could not
 * be scrolled from a test anyway — the point is to drive "the sentinel left the
 * screen" by hand.
 */
function fakeObserver() {
  const state: {
    callback: ((entries: { isIntersecting: boolean }[]) => void) | null;
    observed: Element[];
    disconnected: boolean;
  } = { callback: null, observed: [], disconnected: false };
  const Ctor = class {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
      state.callback = callback;
    }
    observe(el: Element) {
      state.observed.push(el);
    }
    disconnect() {
      state.disconnected = true;
    }
  } as unknown as ObserverCtor;
  const fire = (isIntersecting: boolean) => state.callback?.([{ isIntersecting }]);
  return { Ctor, state, fire };
}

function mount() {
  document.body.innerHTML = MARKUP;
  return {
    sentinel: document.querySelector<HTMLElement>('.nav-sentinel')!,
    header: document.querySelector<HTMLElement>('.site-nav')!,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('watchPinnedHeader', () => {
  // The observer must watch the sentinel, not the header: a sticky header never
  // leaves the screen, so observing it would never report a change.
  it('observes the sentinel rather than the header', () => {
    const { sentinel, header } = mount();
    const io = fakeObserver();

    watchPinnedHeader(sentinel, header, io.Ctor);

    expect(io.state.observed).toEqual([sentinel]);
  });

  // At the top of the page the header must look exactly as it always has, so
  // nothing is set until the observer reports the sentinel has gone.
  it('leaves the header unmarked before anything scrolls', () => {
    const { sentinel, header } = mount();
    const io = fakeObserver();

    watchPinnedHeader(sentinel, header, io.Ctor);

    expect(header.hasAttribute('data-scrolled')).toBe(false);
  });

  // The sentinel scrolling off the top of the screen is exactly the moment the
  // header becomes pinned, which is when its shadow should appear.
  it('marks the header scrolled once the sentinel leaves the screen', () => {
    const { sentinel, header } = mount();
    const io = fakeObserver();
    watchPinnedHeader(sentinel, header, io.Ctor);

    io.fire(false);

    expect(header.hasAttribute('data-scrolled')).toBe(true);
  });

  // Scrolling back to the top must take the shadow away again, or the header
  // would keep a shadow over the crimson strip it no longer covers.
  it('clears the mark when the sentinel comes back into view', () => {
    const { sentinel, header } = mount();
    const io = fakeObserver();
    watchPinnedHeader(sentinel, header, io.Ctor);

    io.fire(false);
    io.fire(true);

    expect(header.hasAttribute('data-scrolled')).toBe(false);
  });

  // A browser without IntersectionObserver still gets the sticky header from
  // CSS alone; it simply has no shadow. Nothing may throw on the way.
  it('does nothing when no observer is available', () => {
    const { sentinel, header } = mount();

    expect(watchPinnedHeader(sentinel, header, undefined)).toBeNull();
    expect(header.hasAttribute('data-scrolled')).toBe(false);
  });

  // The returned handle stops the watch, so a caller tearing the header down
  // does not leave an observer holding a detached element.
  it('returns a stop function that disconnects the observer', () => {
    const { sentinel, header } = mount();
    const io = fakeObserver();

    const stop = watchPinnedHeader(sentinel, header, io.Ctor);
    stop?.();

    expect(io.state.disconnected).toBe(true);
  });
});
