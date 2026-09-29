// Pure, framework-free helpers for the team / Board of Directors feature. Kept
// out of any `.astro` component so they can be unit-tested under vitest and
// reused by the landing-page BoardOfDirectors section and its tiles. No DOM, no
// Astro imports — just data in, data out.

export interface BoardMemberLike {
  slug?: string;
  name: string;
  role: string;
  photo?: string;
  bio?: string;
  order?: number;
  active?: boolean;
}

/**
 * Derive up-to-two-letter initials from a name, used as the avatar fallback
 * when a member has no `photo`. Splits on whitespace, takes the first letter of
 * the first two words, and upper-cases them (e.g. "Krysia Lenzo" -> "KL").
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Order board members for display: by ascending `order`, with members missing
 * an `order` treated as 0. Returns a new array — the input is not mutated — so
 * the public board always matches the curated sequence regardless of the
 * collection's on-disk file order.
 */
export function sortBoardMembers<T extends BoardMemberLike>(members: T[]): T[] {
  return [...members].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Keep only board members marked active for public display. A member is shown
 * unless `active` is explicitly false, so existing entries with no `active`
 * field (and members who never toggled the CMS checkbox) remain on the board.
 * Returns a new array — the input is not mutated.
 */
export function filterActiveBoardMembers<T extends BoardMemberLike>(members: T[]): T[] {
  return members.filter((m) => m.active !== false);
}

/**
 * Split a board member's `role` into display lines. The live board prints the
 * role over two lines — the title first, the Harvard class second (e.g.
 * "Founder · Harvard C'08" -> ["Founder", "Harvard C'08"]). Authors separate
 * the two parts with a "·"; surrounding whitespace is trimmed. A role without a
 * separator returns a single-element array so it renders on one line.
 */
export function splitRole(role: string): string[] {
  return role.split(/\s*·\s*/);
}
