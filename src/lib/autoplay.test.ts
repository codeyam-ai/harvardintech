import { describe, it, expect } from 'vitest';
import { SCENARIO_FLAG, isScenarioRender, autoplayEnabled } from './autoplay';

describe('isScenarioRender', () => {
  // The capture harness opens every page with this parameter, so its presence
  // is what distinguishes "a tool is photographing this" from "a person is
  // reading it".
  it('recognises the scenario parameter the capture harness adds', () => {
    expect(isScenarioRender(`?${SCENARIO_FLAG}=harvard-in-tech-landing-page`)).toBe(true);
    expect(isScenarioRender(`${SCENARIO_FLAG}=x`)).toBe(true);
  });

  // Loose about the value, like `isEmbeddedPreview` next door and for the same
  // reason: the meaning is the flag's presence, and the cost of being wrong is
  // asymmetric — a missed capture wastes a scenario's screenshot, a false
  // positive costs one reader a slideshow that waits to be clicked.
  it('ignores the value', () => {
    expect(isScenarioRender(`?${SCENARIO_FLAG}`)).toBe(true);
    expect(isScenarioRender(`?${SCENARIO_FLAG}=`)).toBe(true);
  });

  // An ordinary visit carries no such parameter.
  it('says no for an ordinary visit', () => {
    expect(isScenarioRender('')).toBe(false);
    expect(isScenarioRender('?utm_source=newsletter')).toBe(false);
    expect(isScenarioRender('?scenario=x')).toBe(false);
  });
});

describe('autoplayEnabled', () => {
  // The reader's own setting comes first. A carousel that advances itself is
  // exactly the motion `prefers-reduced-motion` exists to stop.
  it('is off when the reader asked for reduced motion', () => {
    expect(autoplayEnabled({ search: '', reducedMotion: true })).toBe(false);
  });

  // The case this function was written for. Playwright refuses to act on an
  // element whose box is still moving, so a slideshow that advances every six
  // seconds can keep a hover-framed capture from ever settling — which is how
  // `harvard-in-tech-board-on-four-sizes` became uncapturable, its hover on
  // `#board` timing out while the hero shifted above it.
  it('is off while a scenario is being captured', () => {
    expect(autoplayEnabled({ search: `?${SCENARIO_FLAG}=x`, reducedMotion: false })).toBe(false);
  });

  // The ordinary case, which must keep working: a reader who has asked for
  // nothing special still gets the slideshow.
  it('is on for an ordinary visit', () => {
    expect(autoplayEnabled({ search: '', reducedMotion: false })).toBe(true);
    expect(autoplayEnabled({ search: '?utm_source=newsletter', reducedMotion: false })).toBe(true);
  });
});
