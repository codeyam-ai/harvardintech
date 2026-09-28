import { describe, it, expect, afterEach } from 'vitest';
import { initNavDisclosure } from './navDisclosure';

// The header markup as PrimaryNav.astro server-renders it: the nav is inside an
// OPEN <details> with a native summary, wrapped in the shell the button joins.
const MARKUP = `
  <header class="site-nav">
    <a class="brand" href="/">Harvard Alumni in Tech</a>
    <div class="nav-shell">
      <details class="nav-drawer" open>
        <summary class="nav-summary">Menu</summary>
        <nav class="links" id="site-menu" aria-label="Primary">
          <a href="/events">All Events</a>
          <a href="/#events">Upcoming events</a>
          <a class="nav-menu-cta" href="https://example.com/subscribe">Subscribe</a>
        </nav>
      </details>
    </div>
  </header>
`;

/**
 * A MediaQueryList stand-in. jsdom ships no matchMedia, and a real one could
 * not be flipped from a test anyway — the point here is to drive the breakpoint
 * crossing by hand.
 */
function fakeMql(matches: boolean) {
  const listeners = new Set<() => void>();
  return {
    matches,
    addEventListener: (_type: string, fn: () => void) => void listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) => void listeners.delete(fn),
    /** Cross the breakpoint and notify, the way the browser would. */
    set(next: boolean) {
      this.matches = next;
      listeners.forEach((fn) => fn());
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function mount(narrow = true) {
  document.body.innerHTML = MARKUP;
  const shell = document.querySelector<HTMLElement>('.nav-shell')!;
  const mql = fakeMql(narrow);
  const teardown = initNavDisclosure(shell, mql as unknown as MediaQueryList);
  const button = document.querySelector<HTMLButtonElement>('.nav-toggle')!;
  return { shell, mql, teardown, button };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('initNavDisclosure', () => {
  // The upgrade itself: a button the native summary cannot be, carrying the
  // relationship to the region it controls that <details> has no way to state.
  it('inserts a toggle button wired to the menu and hides the summary', () => {
    const { button } = mount();

    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('site-menu');
    expect(button.type).toBe('button');
    expect(document.querySelector<HTMLElement>('summary')!.hidden).toBe(true);
  });

  // The button must be a SIBLING of the <details>, not inside it. The shell is
  // display:contents so the button lands in the header row beside the wordmark;
  // inside the drawer it would be dragged onto the drawer's own full-width row.
  it('places the button outside the details element', () => {
    const { shell, button } = mount();

    expect(button.parentElement).toBe(shell);
    expect(button.closest('details')).toBeNull();
  });

  // <details> is forced open and left that way: the nav stays in the DOM and
  // CSS alone decides whether it is seen, which is what leaves desktop alone.
  it('forces the details open so the nav is never removed from the DOM', () => {
    mount();
    expect(document.querySelector<HTMLDetailsElement>('details')!.open).toBe(true);
  });

  // The core interaction. `data-open` is the hook every CSS rule keys on.
  it('flips aria-expanded and data-open on click', () => {
    const { shell, button } = mount();

    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(shell.hasAttribute('data-open')).toBe(true);

    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(shell.hasAttribute('data-open')).toBe(false);
  });

  // Escape closes AND returns focus to the control that opened it — otherwise
  // focus is stranded inside a region that is no longer visible.
  it('closes on Escape and returns focus to the button', () => {
    const { shell, button } = mount();
    button.click();

    const link = document.querySelector<HTMLAnchorElement>('#site-menu a')!;
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(shell.hasAttribute('data-open')).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  // Escape with the menu already closed must not steal focus to the button.
  it('ignores Escape when the menu is already closed', () => {
    const { shell, button } = mount();
    const link = document.querySelector<HTMLAnchorElement>('#site-menu a')!;
    link.focus();

    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(shell.hasAttribute('data-open')).toBe(false);
    expect(document.activeElement).toBe(link);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  // Closing on navigation matters most for a SAME-PAGE link: `/#events` scrolls
  // without a reload, so nothing else would ever close the menu and the visitor
  // would land behind the panel they just used.
  it.each([
    ['a link to another route', '/events'],
    ['a same-page anchor', '/#events'],
    ['an external link', 'https://example.com/subscribe'],
  ])('closes when %s inside the menu is clicked', (_label, href) => {
    const { shell } = mount();
    document.querySelector<HTMLButtonElement>('.nav-toggle')!.click();
    expect(shell.hasAttribute('data-open')).toBe(true);

    document.querySelector<HTMLAnchorElement>(`#site-menu a[href="${href}"]`)!.click();

    expect(shell.hasAttribute('data-open')).toBe(false);
  });

  // Back/forward restores the live DOM from the bfcache, open menu and all.
  it('resets to closed on a restored bfcache page', () => {
    const { shell, button } = mount();
    button.click();

    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: true });
    window.dispatchEvent(event);

    expect(shell.hasAttribute('data-open')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  // An ordinary load is not a restore and must not disturb an open menu.
  it('leaves an open menu alone on a non-persisted pageshow', () => {
    const { shell, button } = mount();
    button.click();

    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: false });
    window.dispatchEvent(event);

    expect(shell.hasAttribute('data-open')).toBe(true);
  });

  // Crossing up to desktop clears the state, so the hover mega-menu is never
  // rendered against a stale `data-open` left behind by a phone-width session.
  it('clears the open state when the breakpoint stops matching', () => {
    const { shell, mql, button } = mount();
    button.click();
    expect(shell.hasAttribute('data-open')).toBe(true);

    mql.set(false);

    expect(shell.hasAttribute('data-open')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  // Calling twice must not stack a second button or a second set of listeners.
  it('is a no-op when it has already run on the same shell', () => {
    const { shell, mql } = mount();

    initNavDisclosure(shell, mql as unknown as MediaQueryList);

    expect(document.querySelectorAll('.nav-toggle')).toHaveLength(1);
  });

  // No menu on the page at all — every other route's layout — must not throw.
  it('does nothing when there is no drawer to upgrade', () => {
    document.body.innerHTML = '<header class="site-nav"><div class="nav-shell"></div></header>';
    const shell = document.querySelector<HTMLElement>('.nav-shell')!;

    expect(() => initNavDisclosure(shell, fakeMql(true) as unknown as MediaQueryList)).not.toThrow();
    expect(document.querySelector('.nav-toggle')).toBeNull();
  });

  // Teardown detaches what it attached, so the breakpoint listener cannot
  // outlive the menu it was driving.
  it('removes its media query listener on teardown', () => {
    const { mql, teardown } = mount();
    expect(mql.listenerCount).toBe(1);

    teardown();

    expect(mql.listenerCount).toBe(0);
  });
});

describe('the no-JavaScript contract', () => {
  // The markup ships as `<details open>` so a visitor without JavaScript still
  // has every link and a native control to collapse them. This module is the
  // one thing that could take that away, so what is asserted here is that it
  // does NOT: after the upgrade the links are all still in the document and the
  // details is still open, in both menu states.
  //
  // That the SERVER renders this shape is not assertable here — vitest does not
  // import `.astro` (see vitest.config.ts), so PrimaryNav's output is covered by
  // its captured scenarios instead.
  it('removes no link and never closes the details, open or closed', () => {
    const { button } = mount();
    const details = document.querySelector<HTMLDetailsElement>('details')!;

    expect(details.open).toBe(true);
    expect(document.querySelectorAll('#site-menu a[href]')).toHaveLength(3);

    button.click();
    expect(details.open).toBe(true);
    expect(document.querySelectorAll('#site-menu a[href]')).toHaveLength(3);

    button.click();
    expect(details.open).toBe(true);
    expect(document.querySelectorAll('#site-menu a[href]')).toHaveLength(3);
  });

  // The summary is hidden rather than deleted, so removing the button would
  // hand control back to the native element rather than stranding the menu.
  it('hides the native summary without removing it', () => {
    mount();
    const summary = document.querySelector<HTMLElement>('summary');

    expect(summary).not.toBeNull();
    expect(summary!.hidden).toBe(true);
    expect(summary!.textContent).toContain('Menu');
  });
});
