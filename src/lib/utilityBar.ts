// The two forms of the crimson strip's one line, kept out of the component so
// both are testable without rendering Astro.
//
// The full line names every chapter. On a 390px phone that is roughly seventy
// characters of letter-spaced monospace, which wrapped to three lines and cost
// a phone visitor a third of their first screen before they reached the logo —
// so narrow screens get the compact form instead, swapped by CSS alone.

/** The half of the line that is true regardless of how many chapters exist. */
export const UTILITY_LEDE = 'A global community';

/** The full line: the lede, then every chapter, dot-separated. */
export function utilityLine(cities: string[]): string {
  // No chapters degrades to the lede rather than leaving a dangling separator.
  return cities.length > 0 ? `${UTILITY_LEDE} · ${cities.join(' · ')}` : UTILITY_LEDE;
}

/**
 * The narrow-screen line: the lede alone.
 *
 * The owner chose this over "A global community · 6 chapters" (2026-09-28).
 * A count of chapters is not what a phone visitor is at the top of the page
 * for, and the chapters are one tap away in the menu directly below.
 *
 * It takes `cities` although it does not read them: the signature is the same
 * as `utilityLine` so the component can hand both the same argument, and so
 * restoring a derived count later is a change to this function alone.
 */
export function utilityLineCompact(_cities: string[]): string {
  return UTILITY_LEDE;
}
