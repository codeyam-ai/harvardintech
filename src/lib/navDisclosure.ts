// Turns the header's no-JS <details> menu into a real button disclosure on
// phones and tablets.
//
// Why a progressive upgrade rather than a menu built in JavaScript: the markup
// ships as `<details open>` wrapping the nav, so with JavaScript off — or before
// this module loads — every link is present and reachable, and a narrow-screen
// visitor still gets a native summary they can collapse. This file only swaps
// that native control for a button, which is what buys the ARIA the native
// element cannot express (`aria-controls` pointing at the nav) and the
// close-on-navigate behaviour a `<details>` has no opinion about.
//
// Nothing here is a menubar or a modal. It is the plain disclosure pattern:
// one button, `aria-expanded`, and the controlled region right after it. That
// is deliberate — a drawer would need a focus trap and a scroll lock, and both
// are failure modes this site does not need to take on to show five links.
//
// Visibility is driven entirely by CSS off the `data-open` attribute this sets
// (see PrimaryNav.astro), so the desktop hover mega-menu is untouched: above the
// breakpoint the state is cleared and the attribute never applies.
//
// Pure DOM in and out, following ./momentumNetworkDom.ts, so the whole contract
// is testable in jsdom without a browser or a built page.

/** The nav the button controls. Also the `aria-controls` target. */
const MENU_ID = 'site-menu';

function buildToggle(doc: Document): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'nav-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', MENU_ID);
  button.setAttribute('aria-label', 'Menu');

  // The bars are decorative: the visible word "Menu" beside them is the
  // accessible name, so a screen reader is not handed a picture of a control.
  const bars = doc.createElement('span');
  bars.className = 'nav-toggle-bars';
  bars.setAttribute('aria-hidden', 'true');

  const text = doc.createElement('span');
  text.className = 'nav-toggle-text';
  text.textContent = 'Menu';

  button.append(bars, text);
  return button;
}

/**
 * Upgrade `root` — the `<div class="nav-shell">` in the header — into a button
 * disclosure controlling `#site-menu`.
 *
 * The button is inserted as a SIBLING of the `<details>`, not inside it. The
 * shell is `display: contents`, so the button lands directly in the header's
 * flex row beside the wordmark while the drawer keeps its own full-width row
 * beneath. Putting it inside the `<details>` cannot achieve that: the spec
 * makes `display: contents` compute to `block` on a `<details>`, so the whole
 * disclosure stays one box and the button is dragged under the wordmark with it.
 *
 * `mql` is the narrow-screen media query (`(max-width: 1040px)`). While it
 * matches, the menu has a closed resting state; when it stops matching the
 * state is cleared so the desktop menu renders exactly as it did before.
 *
 * Safe to call on a page without the menu, and safe to call twice — both are
 * no-ops. Returns a teardown function that removes every listener it added.
 */
export function initNavDisclosure(root: HTMLElement, mql: MediaQueryList): () => void {
  const noop = () => {};

  const drawer = root.querySelector<HTMLDetailsElement>('details');
  const summary = root.querySelector<HTMLElement>('summary');
  const menu = root.querySelector<HTMLElement>(`#${MENU_ID}`);
  if (!drawer || !summary || !menu) return noop;
  // Already upgraded — a second init would stack duplicate buttons and listeners.
  if (root.querySelector('.nav-toggle')) return noop;

  const doc = root.ownerDocument;
  const button = buildToggle(doc);
  root.insertBefore(button, drawer);

  // The native control is now redundant, and leaving it visible would give the
  // same region two controls disagreeing about its state. Forcing `open` makes
  // the <details> inert: the nav is always in the DOM and CSS alone decides
  // whether it is seen, which is what keeps the desktop menu unaffected.
  summary.hidden = true;
  drawer.open = true;

  function setOpen(open: boolean): void {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) root.setAttribute('data-open', '');
    else root.removeAttribute('data-open');
  }

  // Closed is the resting state on a narrow screen; above the breakpoint there
  // is no state at all, because the hover menu is not a disclosure.
  function applyBreakpoint(): void {
    setOpen(false);
  }

  function onToggleClick(): void {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  }

  // Escape closes and hands focus back to the control that opened it —
  // otherwise focus is left inside a region that is no longer visible.
  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (button.getAttribute('aria-expanded') !== 'true') return;
    setOpen(false);
    button.focus();
  }

  // Closing on navigation matters most for the same-page links (`/#events`,
  // `/#board`): those scroll without a reload, so nothing else would ever
  // close the menu and the visitor would land behind the panel they just used.
  function onMenuClick(event: Event): void {
    const target = event.target as Element | null;
    if (target?.closest('a[href]')) setOpen(false);
  }

  // Back/forward restores the live DOM from the bfcache, open menu and all.
  function onPageshow(event: PageTransitionEvent): void {
    if (event.persisted) applyBreakpoint();
  }

  applyBreakpoint();

  button.addEventListener('click', onToggleClick);
  root.addEventListener('keydown', onKeydown);
  menu.addEventListener('click', onMenuClick);
  mql.addEventListener('change', applyBreakpoint);
  const view = doc.defaultView;
  view?.addEventListener('pageshow', onPageshow as EventListener);

  return () => {
    button.removeEventListener('click', onToggleClick);
    root.removeEventListener('keydown', onKeydown);
    menu.removeEventListener('click', onMenuClick);
    mql.removeEventListener('change', applyBreakpoint);
    view?.removeEventListener('pageshow', onPageshow as EventListener);
  };
}
