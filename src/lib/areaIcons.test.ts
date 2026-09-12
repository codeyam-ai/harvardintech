import { describe, it, expect } from 'vitest';
import { AREA_ICONS, areaIcon } from './areaIcons';

describe('areaIcon', () => {
  // Each default Focus area label resolves to its own pictogram.
  it('resolves each default focus area label', () => {
    expect(areaIcon('Programs')).toBe(AREA_ICONS.programs);
    expect(areaIcon('Chapters')).toBe(AREA_ICONS.chapters);
    expect(areaIcon('Communities')).toBe(AREA_ICONS.communities);
    expect(areaIcon('Content Hub')).toBe(AREA_ICONS.content);
    expect(areaIcon('Membership')).toBe(AREA_ICONS.membership);
  });

  // A label an editor reworded in the CMS still finds its pictogram.
  it('resolves a reworded label by the word it contains', () => {
    expect(areaIcon('Events & programs')).toBe(AREA_ICONS.programs);
    expect(areaIcon('Upcoming events')).toBe(AREA_ICONS.programs);
  });

  // An unrecognised label gets no icon rather than a wrong one.
  it('returns null for an unknown or missing label', () => {
    expect(areaIcon('Mentoring')).toBeNull();
    expect(areaIcon('')).toBeNull();
    expect(areaIcon(null)).toBeNull();
    expect(areaIcon(undefined)).toBeNull();
  });
});
