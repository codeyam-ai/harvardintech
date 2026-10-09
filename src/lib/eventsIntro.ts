// The standfirst under the /events banner.
//
// The city list used to be typed into the markup: "Boston & Cambridge, New
// York, London, DC & DMV, and Seattle". That sentence had already gone stale
// once — it is the same roster the nav and the utility bar derive from the
// chapters collection, so publishing a chapter updated the menu and left this
// line behind. Deriving it here is what stops the page claiming a different set
// of cities from the menu directly above it.
import { presenceSummary } from './localPresence';
import { chapterNavItems, type ChapterLike } from './nav';

/** "A, B, and C" — Oxford comma, because the roster contains "DC & DMV". */
export function formatCityList(cities: readonly string[]): string {
  const names = cities.map((c) => c.trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function eventsLede(cities: readonly string[]): string {
  const list = formatCityList(cities);
  // With no chapters published the sentence still has to read as English, so
  // the clause drops out rather than leaving "across our  chapters".
  return list
    ? `In-person events, panels, and gatherings across our ${list} chapters, plus a global community connected online.`
    : 'In-person events, panels, and gatherings, plus a global community connected online.';
}

/**
 * The standfirst for a chapter roster: only the ACTIVE chapters, in menu order.
 *
 * "In-person events … across our X chapters" promises a calendar. A forming
 * city holds no events — it is an online group for now — so naming it here
 * would promise one that is not there. Promoting it to `active` in /admin adds
 * it to this sentence with no other edit.
 */
export function eventsLedeFor(chapters: ChapterLike[]): string {
  return eventsLede(chapterNavItems(presenceSummary(chapters).active).map((c) => c.label));
}
