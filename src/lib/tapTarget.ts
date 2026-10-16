// Tap-target sizing shared by components that draw their own round or square
// hit areas. 44px is the minimum comfortable target on a touch screen, and the
// figure the responsive sweep (`responsiveSweep.ts`) judges links against.

export const MIN_TAP_TARGET = 44;

/** Diameter of a social badge for a glyph of `glyphSize` px: the glyph plus a
 *  12px ring on each side, never under {@link MIN_TAP_TARGET}. The footer's
 *  18px glyphs made a 42px badge before the floor (responsive pass, 2026-10-16). */
export function socialBadgeSize(glyphSize: number): number {
  return Math.max(glyphSize + 24, MIN_TAP_TARGET);
}
