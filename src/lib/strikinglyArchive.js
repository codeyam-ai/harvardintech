/* Pure rules for reading the old Strikingly site.
 *
 * harvardintech.com was built on Strikingly, and every photo and write-up on it
 * lives only on Strikingly's CDN. Once the domain moves, that history is gone —
 * so `scripts/snapshot-strikingly.mjs` saves it into the repo first, and this
 * module holds the parts of that job worth testing: how a page's data is found
 * inside the HTML, how an image URL is built, and how a raw title or write-up
 * becomes something we would publish.
 *
 * Plain ESM (the package is `"type": "module"`), so the `.mjs` scripts and
 * vitest import the same file. It lives under `src/lib` because vitest's
 * `include` is `src/**` — a module parked beside the scripts is a module no
 * test can reach. The same reasoning as `donorImport.js`, minus that file's UMD
 * wrapper, which exists only because a Python build inlines it.
 *
 * Nothing here touches the network or the filesystem: data in, data out.
 */

/** Characters Strikingly's editor leaves in copy that must never reach a page:
 *  a zero-width space and a left-to-right mark. Both are invisible, and both
 *  survive a naive trim — a title ending in one looks clean and sorts wrong. */
const INVISIBLE_CHARS = /[​‎﻿]/g;

/** Month names as the old site wrote them — full, three-letter, and the
 *  four-letter "Sept" it uses in places. Order matters only for readability;
 *  the lookup is by lowercased prefix. */
const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * A leading date on an event title, in every form the old site actually used.
 *
 * Observed: "April 17, 2019:", "Aug 18th, 2018:", "Oct 6, 2015,", "June 11,
 * 2018 " (no separator at all) and "May 23nd, 2018" — that last one being a
 * typo for 23rd. The ordinal suffix is therefore matched but IGNORED rather
 * than validated: "23nd" is not a real ordinal, and a parser that insisted on
 * one would drop a real event on the floor over a typist's slip.
 */
const LEADING_DATE = new RegExp(
  '^\\s*([A-Za-z]+)\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{4})\\s*[:,\\-–—]?\\s*',
);

/** Named HTML entities the Strikingly copy actually contains. Kept small and
 *  explicit rather than pulling in a parser: an unknown entity should survive
 *  visibly so it can be noticed, not be silently mangled. */
const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

/** Tags after which text must not be glued to what follows. `<br>` and every
 *  block element are a visual break on the page, so they are a SPACE here —
 *  without this, "Tech Talk<br>with HLS Professor" reads "Tech Talkwith HLS
 *  Professor", which is exactly how the raw titles arrive. */
const BLOCK_BOUNDARY = /<\s*\/?\s*(br|p|div|h[1-6]|li|ul|ol|tr|td|blockquote|section)\b[^>]*>/gi;

/** Decode the entities above, plus numeric ones. */
export function decodeEntities(text) {
  return String(text ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (whole, name) => {
      const found = ENTITIES[name.toLowerCase()];
      return found === undefined ? whole : found;
    });
}

/**
 * The visible text of a Strikingly RichText value.
 *
 * Block tags become a single space first (see BLOCK_BOUNDARY), then the
 * remaining tags are dropped, entities decoded, invisible characters removed,
 * and whitespace collapsed. The result is a single line — callers that want
 * paragraphs use {@link richTextToParagraphs}.
 */
export function richTextToPlain(html) {
  return decodeEntities(
    String(html ?? '')
      .replace(BLOCK_BOUNDARY, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The same text, but keeping paragraph breaks — what a write-up needs when it
 * becomes a markdown body. Each block boundary becomes a newline, runs of
 * blank lines collapse to one, and every line is individually trimmed.
 */
export function richTextToParagraphs(html) {
  const withBreaks = String(html ?? '').replace(BLOCK_BOUNDARY, '\n');
  return decodeEntities(withBreaks.replace(/<[^>]*>/g, ''))
    .replace(INVISIBLE_CHARS, '')
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter((line, index, lines) => line !== '' || (index > 0 && lines[index - 1] !== ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The `$S.stores = {...}` object embedded in a rendered Strikingly page.
 *
 * Every page of the site is listed in `pageData.pages`, but only the page that
 * was actually requested has its sections hydrated — the rest arrive as stubs
 * carrying `slideSettings` and nothing else. That is why the snapshot fetches
 * each URL separately instead of reading all nine out of one response.
 *
 * Parsed by decoding from the assignment onwards rather than regex-matching to
 * a closing brace: the JSON contains braces inside strings, so a regex either
 * stops early or swallows the rest of the document. Returns `null` when the
 * marker is absent, which is how a caller tells "not a Strikingly page" from
 * "a Strikingly page with nothing on it".
 */
export function storeFromHtml(html) {
  const text = String(html ?? '');
  const marker = text.indexOf('$S.stores=');
  const start = marker === -1 ? text.indexOf('$S.stores =') : marker;
  if (start === -1) return null;
  const afterEquals = text.indexOf('=', start) + 1;
  const json = text.slice(afterEquals).trimStart();
  try {
    return JSON.parse(sliceFirstJsonValue(json));
  } catch {
    return null;
  }
}

/**
 * The first complete JSON value at the head of `text`.
 *
 * A brace-depth scan that knows about strings and escapes, because the store is
 * followed by more JavaScript and `JSON.parse` needs to be handed exactly the
 * object and nothing else.
 */
function sliceFirstJsonValue(text) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(0, i + 1);
    }
  }
  return text;
}

/** The entry in `store.pageData.pages` whose `path` matches, or `null`. */
export function pageByPath(store, path) {
  const pages = store?.pageData?.pages;
  if (!Array.isArray(pages)) return null;
  const wanted = String(path ?? '').replace(/\/+$/, '') || '/home';
  return pages.find((page) => String(page?.path ?? '').replace(/\/+$/, '') === wanted) ?? null;
}

/**
 * The download URL for a Strikingly image.
 *
 * `storageKey` arrives JSON-escaped in the page source (`117929\/DSC00341`), so
 * the backslashes are stripped here rather than at every call site.
 */
export function strikinglyImageUrl(storageKey, format) {
  const key = String(storageKey ?? '').replace(/\\/g, '');
  const ext = String(format ?? 'jpg').replace(/^\./, '');
  return `https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/${key}.${ext}`;
}

/**
 * The rendered-page form of the same image, used as a FALLBACK when the direct
 * URL above 404s. It is the transform the live site requests, so it exists for
 * anything the page actually displayed.
 */
export function strikinglyImageFallbackUrl(storageKey, format) {
  const key = String(storageKey ?? '').replace(/\\/g, '');
  const ext = String(format ?? 'jpg').replace(/^\./, '');
  return `https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_9000,w_1920,f_auto,q_auto/${key}.${ext}`;
}

/** The plain text of a named RichText component on a section or item. */
function textOf(components, key) {
  return richTextToPlain(components?.[key]?.value);
}

/** The paragraph-preserving text of a named RichText component. */
function bodyOf(components, key) {
  return richTextToParagraphs(components?.[key]?.value);
}

/** The image record on a Media component, normalized to the fields we save. */
function imageOf(components, key = 'media1') {
  const image = components?.[key]?.image;
  if (!image?.storageKey) return null;
  return {
    storageKey: String(image.storageKey).replace(/\\/g, ''),
    format: image.format ?? 'jpg',
    w: image.w ?? null,
    h: image.h ?? null,
    bytes: image.s ?? null,
    linkUrl: image.link_url || null,
  };
}

/** Every section of a page, as `{ index, heading, components }`. */
export function sectionsOf(page) {
  const sections = page?.sections;
  if (!Array.isArray(sections)) return [];
  return sections.map((section, index) => ({
    index,
    heading: textOf(section?.components, 'text1'),
    components: section?.components ?? {},
  }));
}

/** The repeatable list on a section, or `[]`. */
function repeatableList(components, key = 'repeatable1') {
  const list = components?.[key]?.list;
  return Array.isArray(list) ? list : [];
}

/**
 * The past-events list on `/events`.
 *
 * Found by HEADING ("Past Events") rather than by section index, because a
 * section order is the most fragile thing about a page like this — and the
 * heading is the one part an editor would have had to change deliberately.
 * Falls back to the longest repeatable on the page when no heading matches, so
 * a renamed heading degrades to a warning rather than an empty archive.
 */
export function archiveItems(page) {
  const sections = sectionsOf(page);
  const byHeading = sections.find((section) => /past\s*events/i.test(section.heading));
  const chosen =
    byHeading ??
    sections
      .slice()
      .sort((a, b) => repeatableList(b.components).length - repeatableList(a.components).length)[0];
  if (!chosen) return [];
  return repeatableList(chosen.components).map((item, index) => {
    const components = item?.components ?? {};
    const rawTitle = textOf(components, 'text1');
    return {
      index,
      section: chosen.index,
      rawTitle,
      rawSubtitle: textOf(components, 'text2'),
      text: bodyOf(components, 'text3'),
      linkUrl: components?.button1?.link_url || null,
      image: imageOf(components),
    };
  });
}

/**
 * The featured (upcoming) event on `/events` — the one section whose repeatable
 * holds a single item with its own image and ticket link. On the snapshot this
 * is the Sept 28 evening; it is returned separately because it is not history.
 */
export function featuredEventItem(page) {
  const sections = sectionsOf(page);
  for (const section of sections) {
    const list = repeatableList(section.components);
    if (list.length !== 1) continue;
    const components = list[0]?.components ?? {};
    const image = imageOf(components);
    if (!image?.linkUrl) continue;
    return {
      section: section.index,
      rawTitle: textOf(components, 'text1'),
      text: bodyOf(components, 'text3') || bodyOf(components, 'text2'),
      linkUrl: image.linkUrl,
      image,
    };
  }
  return null;
}

/**
 * The webinar list on `/webinars`.
 *
 * Only the first of the eleven carries a title; the rest are identified by
 * their write-up alone, which is why the import table names them by hand.
 */
export function webinarItems(page) {
  const sections = sectionsOf(page);
  const chosen =
    sections.find((section) => repeatableList(section.components).length > 1) ?? sections[0];
  if (!chosen) return [];
  return repeatableList(chosen.components).map((item, index) => {
    const components = item?.components ?? {};
    const video = components?.media1?.video ?? {};
    const videoUrl = video.url || null;
    return {
      index,
      rawTitle: textOf(components, 'text1'),
      text: bodyOf(components, 'text3'),
      videoUrl,
      embedUrl: toEmbedUrl(videoUrl),
      thumbnailUrl: video.thumbnail_url || null,
      linkUrl: components?.button1?.link_url || null,
    };
  });
}

/**
 * Every gallery on a page, as `{ section, images[] }`.
 *
 * A Strikingly gallery keeps its photos under `sources`, not `list`. An empty
 * gallery is RETAINED rather than filtered out — the L.A. page has one, and
 * "this page had a gallery and it was empty" is a fact the snapshot should
 * record rather than silently equate with "this page had no gallery".
 */
export function galleryItems(page) {
  return sectionsOf(page)
    .filter((section) => section.components?.gallery1)
    .map((section) => {
      const sources = section.components.gallery1.sources;
      return {
        section: section.index,
        heading: section.heading,
        images: (Array.isArray(sources) ? sources : [])
          .filter((source) => source?.storageKey)
          .map((source) => ({
            storageKey: String(source.storageKey).replace(/\\/g, ''),
            format: source.format ?? 'jpg',
            w: source.w ?? null,
            h: source.h ?? null,
            bytes: source.s ?? null,
            caption: richTextToPlain(source.caption) || null,
          })),
      };
    });
}

/**
 * The date at the head of an archive title, as `{ date, rest }`.
 *
 * `date` is `YYYY-MM-DD` and `rest` is the title with the date removed. Returns
 * `{ date: null, rest }` when there is no leading date — which is the real case
 * for "Future of Healthcare Tech", the one event that ships as a draft until
 * somebody supplies its date. Guessing one would put a made-up date on the
 * public site, so this returns null and lets the caller refuse to publish.
 */
export function parseArchiveDate(rawTitle) {
  const title = String(rawTitle ?? '').replace(INVISIBLE_CHARS, '');
  const match = title.match(LEADING_DATE);
  if (!match) return { date: null, rest: title.trim() };
  const month = MONTHS[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!month || !day || day > 31 || !year) return { date: null, rest: title.trim() };
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { date: iso, rest: title.slice(match[0].length).trim() };
}

/**
 * Typos to fix in titles and organisation names, as `[wrong, right]`.
 *
 * Every one was read off the old site and confirmed by eye. They are corrected
 * because they are plainly mistakes rather than house style — "M icrosoft" is
 * a stray space, not a company. Kept as data so the list can be reviewed as a
 * list, and so a correction the owner disagrees with is one line to drop.
 */
export const TITLE_TYPOS = [
  ['M icrosoft', 'Microsoft'],
  ['M ic', 'Mic'],
  ['S parkNotes', 'SparkNotes'],
  ['LearnVes', 'LearnVest'],
  ['Union Square Venture', 'Union Square Ventures'],
  ['HerCampus', 'Her Campus'],
  ['Linkedin', 'LinkedIn'],
  ['Circleon', 'Circle on'],
  ['Paxos ,Winston', 'Paxos, Winston'],
];

/**
 * A title cleaned for publication: invisible characters gone, whitespace
 * collapsed, the typo table applied, a leading "Harvard in Tech" removed (every
 * event is ours), and any trailing separator dropped.
 *
 * It does NOT strip the trailing list of organisations — where that list starts
 * is a judgement call with no reliable marker, so it is recorded per event in
 * `curated-events.json` and never guessed.
 */
export function cleanTitleText(rawTitle) {
  let title = String(rawTitle ?? '')
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [wrong, right] of TITLE_TYPOS) {
    title = title.split(wrong).join(right);
  }
  return title
    .replace(/^harvard\s+in\s+tech\s*[:\-–—]?\s*/i, '')
    .replace(/\s+([,;:.])/g, '$1')
    .replace(/[,;:\-–—]\s*$/, '')
    .trim();
}

/**
 * Write-up typos the owner can veto, as `[wrong, right]`. Narrower than the
 * title table on purpose: a write-up is somebody's prose and the historical
 * record, so only outright errors are touched — two misspelled surnames, a
 * mangled "teach-in", a doubled word and one subject-verb slip.
 */
export const WRITEUP_TYPOS = [
  ['Altcheck', 'Altchek'],
  ['Gleuck', 'Glueck'],
  ['tech-in', 'teach-in'],
  ['to to ', 'to '],
  ['lead by', 'led by'],
];

/**
 * A write-up cleaned for publication. Paragraphs are preserved; only invisible
 * characters, stray spaces before punctuation and the table above are changed.
 * The wording itself is left exactly as it was written.
 */
export function cleanWriteup(rawText) {
  let text = String(rawText ?? '').replace(INVISIBLE_CHARS, '');
  for (const [wrong, right] of WRITEUP_TYPOS) {
    text = text.split(wrong).join(right);
  }
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').replace(/\s+([,;:.!?])/g, '$1').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * A player URL for a recording, or `undefined` when the link is not a video at
 * all.
 *
 * `undefined` rather than the original URL is the point: W6 is a link to an
 * external write-up page, and returning it here would put a non-player inside
 * an iframe. The caller renders a link instead.
 *
 * Tracking query strings are dropped — W9's Vimeo URL carries a Mailchimp
 * campaign id and an unsubstituted `[UNIQID]` placeholder, neither of which
 * belongs in a permanent embed.
 */
export function toEmbedUrl(videoUrl) {
  const url = String(videoUrl ?? '').trim();
  if (!url) return undefined;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const short = url.match(/youtu\.be\/([\w-]+)/i);
  if (short) return `https://www.youtube-nocookie.com/embed/${short[1]}`;
  const watch = url.match(/youtube\.com\/watch\?[^#]*\bv=([\w-]+)/i);
  if (watch) return `https://www.youtube-nocookie.com/embed/${watch[1]}`;
  const wistia = url.match(/wistia\.com\/medias\/([\w-]+)/i);
  if (wistia) return `https://fast.wistia.net/embed/iframe/${wistia[1]}`;
  return undefined;
}

/**
 * A multi-paragraph write-up flattened to the single line an event's
 * `description` field holds.
 *
 * The events collection has no body — an event is a card, not an article — so
 * the write-up has to survive as one frontmatter string. Paragraph breaks
 * become single spaces rather than being preserved, because YAML would
 * otherwise need a block scalar on every one of the 33 entries, and the archive
 * rows render the text as one run anyway.
 *
 * This lives here, beside the other import rules, rather than in the importer
 * script: vitest's `include` is `src/**`, so a rule parked in `scripts/` is a
 * rule no test can reach — and this one decides what every archive row says.
 */
export function flattenWriteup(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * What a video host still knows about a recording, read out of its response.
 *
 * `available` is the load-bearing field and the reason these are pure functions
 * with tests rather than inline branches in the snapshot script. A provider that
 * has LOST an upload does not answer with an error — Vimeo returns a perfectly
 * valid oEmbed document carrying an iframe and a video id, but no title, no
 * duration and no date, and serves a generic colour-bars image in place of the
 * thumbnail. Nothing about that response is a failure, so the ONLY signal that
 * the recording is gone is the missing metadata. Five of the eleven 2020
 * webinars are in exactly that state, and this rule is what keeps them off the
 * public site instead of publishing five players that cannot play.
 */
export function parseVimeoMetadata(data) {
  return {
    publishedAt: data?.upload_date ? String(data.upload_date).slice(0, 10) : null,
    title: data?.title ?? null,
    available: Boolean(data?.title),
  };
}

/** The same three fields read off a YouTube watch page's HTML. */
export function parseYouTubeMetadata(html) {
  const text = String(html ?? '');
  const date = text.match(/"uploadDate"\s*:\s*"([\d-]{10})/);
  const title = text.match(/<meta\s+name="title"\s+content="([^"]*)"/i);
  return {
    publishedAt: date ? date[1] : null,
    title: title ? title[1] : null,
    available: Boolean(date),
  };
}

/**
 * The same three fields from a Wistia media JSON document.
 *
 * Wistia spells it `created_at` and returns an ISO string; an older shape used a
 * `createdAt` epoch, so both are accepted. Getting this key wrong is not
 * hypothetical — reading `createdAt` alone reported both Wistia recordings as
 * undated, which would have shipped two live webinars as drafts.
 */
export function parseWistiaMetadata(data) {
  const media = data?.media ?? data;
  const created = media?.created_at ?? media?.createdAt;
  const date = typeof created === 'number' ? new Date(created * 1000) : new Date(created ?? NaN);
  return {
    publishedAt: Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10),
    title: media?.name ?? null,
    available: Boolean(media?.name ?? created),
  };
}

/**
 * The three video hosts the archive uses, each with the request that asks it
 * about a recording and the parser for what comes back.
 *
 * A table rather than a chain of `if`s so the snapshot's network function stays
 * a bare fetch-and-hand-off, and so adding a fourth host is data rather than
 * another branch in a script no test can reach.
 */
export const VIDEO_PROVIDERS = [
  {
    name: 'vimeo',
    matches: /vimeo\.com/i,
    request: (url) => ({
      url: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
      as: 'json',
    }),
    parse: parseVimeoMetadata,
  },
  {
    name: 'youtube',
    matches: /youtu\.be|youtube\.com/i,
    request: (url) => ({ url, as: 'text' }),
    parse: parseYouTubeMetadata,
  },
  {
    name: 'wistia',
    matches: /wistia\.com\/medias\//i,
    request: (url) => {
      const media = url.match(/(https?:\/\/[^/]*wistia\.com)\/medias\/([\w-]+)/i);
      return { url: `${media[1]}/medias/${media[2]}.json`, as: 'json' };
    },
    parse: parseWistiaMetadata,
  },
];

/** The provider that hosts `videoUrl`, or `null` when no known host claims it. */
export function videoProviderFor(videoUrl) {
  const url = String(videoUrl ?? '');
  if (!url) return null;
  return VIDEO_PROVIDERS.find((provider) => provider.matches.test(url)) ?? null;
}

/**
 * A YAML double-quoted scalar.
 *
 * Both importers write frontmatter, and both were carrying their own copy of
 * this — which is how the two drift. Backslashes are escaped BEFORE quotes, or
 * escaping the quote would then have its own backslash escaped again and the
 * value would break at the next parse.
 */
export function yamlQuote(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The complete markdown file for one imported archive event: frontmatter only,
 * no body.
 *
 * An event is a card, not an article — the events collection has no body — so
 * the write-up rides in `description`. Optional keys are OMITTED rather than
 * written empty, because `location: ""` renders an empty line on the card while
 * an absent key renders nothing.
 *
 * Lives here rather than in the importer so the exact bytes that land in
 * `src/content/events/` are pinned by a test. This is the function that decides
 * what 33 committed files say.
 */
// The optional fields carry defaults so a type checker treats them as OPTIONAL:
// a destructured parameter with no default is inferred as required, which made
// every caller passing a subset a `tsc` error from the .ts test file.
export function eventFrontmatter({ title, date, location = '', description = '', draft = false }) {
  const lines = ['---', `title: ${yamlQuote(title)}`, `date: ${date}`];
  if (location) lines.push(`location: ${yamlQuote(location)}`);
  if (description) lines.push(`description: ${yamlQuote(description)}`);
  if (draft) lines.push('draft: true');
  lines.push('---', '');
  return lines.join('\n');
}

/**
 * The complete markdown file for one imported webinar post: frontmatter plus
 * the write-up as the rendered body.
 *
 * Unlike an event, a webinar IS an article, so the write-up stays a body with
 * its paragraphs intact.
 *
 * `draft: true` is written when the recording has no date OR when the provider
 * has lost it. Both matter: an undated post would otherwise carry a placeholder
 * date as fact, and a lost recording would publish a player that cannot play.
 */
export function webinarPostBody({
  title,
  date,
  summary = '',
  coverImage = '',
  embedUrl = '',
  text = '',
  draft = false,
}) {
  const lines = [
    '---',
    `title: ${yamlQuote(title)}`,
    `date: ${date}`,
    `summary: ${yamlQuote(summary)}`,
    'series: webinars',
  ];
  if (coverImage) lines.push(`coverImage: ${yamlQuote(coverImage)}`);
  if (embedUrl) lines.push(`embedUrl: ${yamlQuote(embedUrl)}`);
  if (draft) lines.push('draft: true');
  lines.push('---', '');
  if (text) lines.push(text, '');
  return lines.join('\n');
}

/**
 * A URL slug from a title: lowercase, accents folded, punctuation dropped,
 * words joined by single hyphens. Used for both the event filenames and the
 * webinar post slugs so the two importers cannot drift apart.
 */
export function slugify(title) {
  return String(title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(INVISIBLE_CHARS, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
