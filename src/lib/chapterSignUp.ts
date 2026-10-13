// Wording for the chapter page's "Stay in touch" band.
//
// The page closes with the global-community band, whose newsletter card makes
// the general pitch. This band makes the local one — hear about this city's
// events first — so it names the city when it has one, and makes no place
// claim at all when it does not.

export interface ChapterSignUpCopy {
  title: string;
  intro: string;
}

export function chapterSignUpCopy(name?: string): ChapterSignUpCopy {
  const place = name?.trim();
  if (!place) {
    return {
      title: 'Hear about events first',
      intro:
        "One newsletter, with what's coming up near you at the top and news from the wider community below.",
    };
  }
  return {
    title: `Hear about ${place} events first`,
    intro: `One newsletter, with what's coming up in ${place} at the top and news from the wider community below.`,
  };
}
