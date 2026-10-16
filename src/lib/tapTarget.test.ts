import { describe, it, expect } from 'vitest';
import { MIN_TAP_TARGET, socialBadgeSize } from './tapTarget';

describe('socialBadgeSize', () => {
  // The footer's 18px glyphs made a 42px badge; it is floored at 44.
  it('raises a small glyph badge to the minimum tap target', () => {
    expect(socialBadgeSize(18)).toBe(MIN_TAP_TARGET);
  });

  // The chapter Connect row's 24px glyphs already give 48px; left alone.
  it('keeps the glyph plus padding when that is already large enough', () => {
    expect(socialBadgeSize(24)).toBe(48);
  });

  // Exactly at the floor: 20px glyph plus 24px padding is 44.
  it('returns the floor when glyph plus padding lands on it exactly', () => {
    expect(socialBadgeSize(20)).toBe(44);
  });

  // A zero-size glyph still yields a tappable badge.
  it('never returns less than the minimum for a zero glyph', () => {
    expect(socialBadgeSize(0)).toBe(MIN_TAP_TARGET);
  });
});

describe('MIN_TAP_TARGET', () => {
  // The 44px figure the responsive sweep judges tap targets against.
  it('is 44 pixels', () => {
    expect(MIN_TAP_TARGET).toBe(44);
  });
});
