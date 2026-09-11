// Glyphs for the "Focus areas" rows — what each area IS, drawn as a simple
// pictogram rather than a brand mark.
//
// Separate from `brandIcons.ts` on purpose: that module holds third-party marks
// (X, LinkedIn, Medium) whose shapes are fixed by their owners, while these are
// ours to redraw. Same contract though — path data in `currentColor`, so a row
// icon inherits the crimson around it and needs no second asset for a dark or
// coloured band later.
//
// Resolution is by LABEL, so an editor renaming "Programs" to "Events &
// programs" in the CMS still gets the calendar, and an unknown label degrades to
// no icon rather than to a wrong one.

export interface AreaIcon {
  viewBox: string;
  paths: string[];
}

export const AREA_ICONS: Record<string, AreaIcon> = {
  // Programs — a calendar: the year's events, webinars and podcasts.
  programs: {
    viewBox: '0 0 24 24',
    paths: [
      'M8 2v2h8V2h2v2h3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2h2zM4 10v10h16V10H4zm2.5 2h4v4h-4v-4z',
    ],
  },
  // Chapters — a map pin: the city communities.
  chapters: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 2a7 7 0 0 1 7 7c0 5.1-7 13-7 13S5 14.1 5 9a7 7 0 0 1 7-7zm0 4.4A2.6 2.6 0 1 0 14.6 9 2.6 2.6 0 0 0 12 6.4z',
    ],
  },
  // Communities — a conversation: the alumni WhatsApp network.
  communities: {
    viewBox: '0 0 24 24',
    paths: [
      'M4 3h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.6L4 20.5V16a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 4.6h10v1.8H7V7.6zm0 3.6h7V13H7v-1.8z',
    ],
  },
  // Content hub — a document: blog, Medium, LinkedIn.
  content: {
    viewBox: '0 0 24 24',
    paths: [
      'M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1.6V9h4.4L13 4.6zM7 12h10v1.6H7V12zm0 4h10v1.6H7V16zm0-8h4v1.6H7V8z',
    ],
  },
  // Membership — a person: joining, getting involved, supporting.
  membership: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 12a4.8 4.8 0 1 0-4.8-4.8A4.8 4.8 0 0 0 12 12zm0 2c-4.4 0-8 2.3-8 5.1V22h16v-2.9c0-2.8-3.6-5.1-8-5.1z',
    ],
  },
};

/** The most specific label match wins, so "Content Hub" resolves to the document
 *  rather than being caught by a looser rule. Unknown labels return null. */
export function areaIcon(value: string | null | undefined): AreaIcon | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (AREA_ICONS[key]) return AREA_ICONS[key];
  const ordered: Array<[string, string]> = [
    ['content', 'content'],
    ['member', 'membership'],
    ['communit', 'communities'],
    ['chapter', 'chapters'],
    ['program', 'programs'],
    ['event', 'programs'],
  ];
  const hit = ordered.find(([needle]) => key.includes(needle));
  return hit ? AREA_ICONS[hit[1]] : null;
}
