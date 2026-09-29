// The label that sits above the name in a page banner — "Chapter",
// "Chapter · Forming", "Community".
//
// It is a module rather than a ternary at each call site because three places
// derive it (the chapter page, the community page, and the CMS hints that tell
// an editor what the banner will read) and they had already drifted once: the
// community page spelled its own kind into the TITLE, so the AI page announced
// "HARVARD ALUMNI IN TECH AI". Deriving the label in one place is what keeps a
// new page type from inventing a fourth spelling.

export type BannerKind = 'chapter' | 'community';

export interface BannerInput {
  kind: BannerKind;
  /** A chapter's roster status. Only `forming` changes the label. */
  status?: string;
  name: string;
}

export interface Banner {
  /** The eyebrow above the name. */
  label: string;
  /** The name itself, unchanged — the banner never folds the kind into it. */
  title: string;
}

export function bannerFor({ kind, status, name }: BannerInput): Banner {
  if (kind === 'community') {
    return { label: 'Community', title: name };
  }
  // A forming chapter says so in the one place every visitor looks first,
  // rather than leaving them to infer it from a missing leads block further
  // down the page.
  return { label: status === 'forming' ? 'Chapter · Forming' : 'Chapter', title: name };
}
