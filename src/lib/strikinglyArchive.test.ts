import { describe, it, expect } from 'vitest';
import {
  parseArchiveDate,
  cleanTitleText,
  cleanWriteup,
  flattenWriteup,
  yamlQuote,
  eventFrontmatter,
  webinarPostBody,
  parseVimeoMetadata,
  parseYouTubeMetadata,
  parseWistiaMetadata,
  videoProviderFor,
  strikinglyImageUrl,
  strikinglyImageFallbackUrl,
  toEmbedUrl,
  richTextToPlain,
  richTextToParagraphs,
  storeFromHtml,
  pageByPath,
  archiveItems,
  webinarItems,
  galleryItems,
  slugify,
} from './strikinglyArchive.js';

describe('parseArchiveDate', () => {
  // Every one of these is a real title form from the old site. They differ in
  // separator, in month spelling and in whether an ordinal suffix is present,
  // and a parser that handled only the tidy ones would silently drop events.
  it('reads every date form the old site actually used', () => {
    const cases: [string, string, string][] = [
      ['April 17, 2019: Tech Talk', '2019-04-17', 'Tech Talk'],
      ['Aug 18th, 2018: Summer Social', '2018-08-18', 'Summer Social'],
      ['Oct 6, 2015, Panel on Innovation', '2015-10-06', 'Panel on Innovation'],
      ['June 11, 2018 GDPR Teach-in', '2018-06-11', 'GDPR Teach-in'],
      ['Sep 28th, 2017: Fall Social', '2017-09-28', 'Fall Social'],
      ['Jan 31st, 2014: Tech Trek', '2014-01-31', 'Tech Trek'],
    ];

    expect(cases.map(([raw]) => parseArchiveDate(raw))).toEqual(
      cases.map(([, date, rest]) => ({ date, rest })),
    );
  });

  // "May 23nd" is not a real ordinal — it is a typist's slip on the live site.
  // The suffix is matched and then ignored precisely so a slip like this cannot
  // drop a real event on the floor.
  it('reads a malformed ordinal as the day it obviously means', () => {
    expect(parseArchiveDate('May 23nd, 2018 Crypto Circle')).toEqual({
      date: '2018-05-23',
      rest: 'Crypto Circle',
    });
  });

  // The one undated event. Returning null rather than guessing is what keeps a
  // made-up date off the public site — the importer ships this entry as a draft.
  it('returns a null date for a title with no date at all', () => {
    expect(parseArchiveDate('Future of Healthcare Tech')).toEqual({
      date: null,
      rest: 'Future of Healthcare Tech',
    });
  });

  // A day out of range means the title was not what this parser thought it was.
  // Refusing beats emitting `2019-04-47`, which would reach a filename and a
  // schema before anyone noticed.
  it('returns a null date rather than a nonsense one for an impossible day', () => {
    expect(parseArchiveDate('April 47, 2019: Something').date).toBeNull();
  });

  // Same refusal for a word in the month position that is not a month — the
  // guard against reading an ordinary title as a dated one.
  it('returns a null date for a month it does not recognise', () => {
    expect(parseArchiveDate('Smarch 3, 2018: Something').date).toBeNull();
  });
});

describe('cleanTitleText', () => {
  // Zero-width spaces and left-to-right marks survive a naive trim and sort
  // wrong while looking perfectly clean.
  it('removes invisible characters and collapses whitespace', () => {
    expect(cleanTitleText('​Summer   Social‎ ')).toBe('Summer Social');
  });

  // Every one of these was read off the old site and confirmed by eye. They are
  // corrected because they are plainly mistakes rather than house style — "M
  // icrosoft" is a stray space, not a company.
  it('applies the whole title typo table', () => {
    const cases: [string, string][] = [
      ['M icrosoft Enterprise', 'Microsoft Enterprise'],
      ['M ic, Foursquare', 'Mic, Foursquare'],
      ['Google, S parkNotes', 'Google, SparkNotes'],
      ['Yieldmo, LearnVes', 'Yieldmo, LearnVest'],
      ['Union Square Venture', 'Union Square Ventures'],
      ['Handy, HerCampus', 'Handy, Her Campus'],
      ['Google, Linkedin', 'Google, LinkedIn'],
      ['Paxos ,Winston', 'Paxos, Winston'],
    ];

    expect(cases.map(([raw]) => cleanTitleText(raw))).toEqual(cases.map(([, fixed]) => fixed));
  });

  // Every event on this site is ours, so the prefix carries no information and
  // only costs width in a fold row.
  it('drops a leading "Harvard in Tech"', () => {
    expect(cleanTitleText('Harvard in Tech Crypto Circle')).toBe('Crypto Circle');
  });

  // Both are artefacts of lifting a title out of a page where the separator led
  // into the next line — a heading that ends on a comma reads as truncated.
  it('drops a trailing separator and a space before punctuation', () => {
    expect(cleanTitleText('Harvard Innovation ; Glamsquad,')).toBe('Harvard Innovation; Glamsquad');
  });

  // It must NOT strip the trailing organisations: where that list begins is a
  // judgement call with no reliable marker, so it is recorded per event in
  // curated-events.json and never guessed here.
  it('leaves a trailing organisation list alone', () => {
    expect(cleanTitleText('Summer Social Handy, Rebag, Huge')).toBe(
      'Summer Social Handy, Rebag, Huge',
    );
  });
});

describe('cleanWriteup and flattenWriteup', () => {
  // A deliberately SHORT table: a write-up is somebody's prose and the
  // historical record, so only outright errors are corrected — two misspelled
  // surnames, a mangled "teach-in", a doubled word, one subject-verb slip.
  it('applies the write-up typo table', () => {
    expect(cleanWriteup('A tech-in lead by Dr. Altcheck and Ms. Gleuck')).toBe(
      'A teach-in led by Dr. Altchek and Ms. Glueck',
    );
  });

  // A write-up is somebody's prose and the historical record, so paragraph
  // structure survives cleaning.
  it('keeps paragraph breaks', () => {
    expect(cleanWriteup('First para.\n\nSecond para.')).toBe('First para.\n\nSecond para.');
  });

  // The old editor left these throughout the copy; they are typography, not
  // wording, so fixing them does not touch what anybody wrote.
  it('removes a stray space before punctuation', () => {
    expect(cleanWriteup('Hello , world .')).toBe('Hello, world.');
  });

  // The events collection has no body, so the write-up has to survive as one
  // frontmatter string — this is the step that makes it one.
  it('flattens paragraphs to a single line', () => {
    expect(flattenWriteup('First para.\n\nSecond para.')).toBe('First para. Second para.');
  });

  // The importer feeds this straight into a YAML string, so a missing write-up
  // has to come back as empty rather than "undefined" appearing on a card.
  it('flattens an empty write-up to an empty string', () => {
    expect(flattenWriteup('')).toBe('');
    expect(flattenWriteup(undefined)).toBe('');
  });
});

describe('video provider metadata', () => {
  // The rule that decides whether a recording is published at all. A live Vimeo
  // video answers with a title and an upload date.
  it('reads a live Vimeo video as available and dated', () => {
    expect(
      parseVimeoMetadata({ title: 'A Webinar', upload_date: '2020-04-09 12:00:00' }),
    ).toEqual({ publishedAt: '2020-04-09', title: 'A Webinar', available: true });
  });

  // THE case this whole rule exists for. Vimeo answers for an upload it has
  // lost with a perfectly valid oEmbed document — an iframe, a width, a video
  // id — and no title, no duration, no date. Nothing is an error, so a missing
  // title is the only evidence the recording is gone. Five of the eleven 2020
  // webinars are in this state; reading this as "available" would publish five
  // posts whose players cannot play.
  it('reads a Vimeo stub with no title as UNAVAILABLE, not merely undated', () => {
    const stub = {
      type: 'video',
      version: '1.0',
      provider_name: 'Vimeo',
      html: '<iframe src="https://player.vimeo.com/video/413168012"></iframe>',
      video_id: 413168012,
    };

    expect(parseVimeoMetadata(stub)).toEqual({
      publishedAt: null,
      title: null,
      available: false,
    });
  });

  // YouTube carries both fields in the watch page's markup.
  it('reads a YouTube watch page', () => {
    const html =
      '<meta name="title" content="Harvard in Tech Seattle: EduTech">' +
      '<script>{"uploadDate":"2020-04-09T00:00:00-07:00"}</script>';

    expect(parseYouTubeMetadata(html)).toEqual({
      publishedAt: '2020-04-09',
      title: 'Harvard in Tech Seattle: EduTech',
      available: true,
    });
  });

  // Wistia spells it `created_at`. Reading `createdAt` alone — the plausible
  // camelCase guess — reported BOTH Wistia recordings as undated, which would
  // have shipped two live webinars as drafts.
  it('reads a Wistia media document via created_at', () => {
    expect(
      parseWistiaMetadata({
        media: { name: 'Video_HarvardInTechWebinar', created_at: '2020-04-07T17:29:51+00:00' },
      }),
    ).toEqual({
      publishedAt: '2020-04-07',
      title: 'Video_HarvardInTechWebinar',
      available: true,
    });
  });

  // The older epoch shape is still accepted, so a provider reverting its
  // serialization does not silently undate a recording.
  it('accepts the older Wistia epoch shape', () => {
    expect(parseWistiaMetadata({ createdAt: 1586280591 }).publishedAt).toBe('2020-04-07');
  });

  // One test rather than a case each, for the same reason as toEmbedUrl above:
  // a raw URL in an emitted test name is what the registry chokes on.
  it('routes each recording to the host that claims it', () => {
    const cases: [string, string][] = [
      ['https://vimeo.com/413168012', 'vimeo'],
      ['https://youtu.be/S4c48202-D8', 'youtube'],
      ['https://ourgroundswell.wistia.com/medias/46kd8ic53q', 'wistia'],
    ];

    expect(cases.map(([url]) => videoProviderFor(url)?.name)).toEqual(
      cases.map(([, name]) => name),
    );
  });

  // W6 links to somebody else's write-up page rather than a recording, so no
  // provider claims it and the snapshot records a link status instead.
  it('claims no provider for a host that is not a video site', () => {
    expect(videoProviderFor('https://goodhealthoutcomes.com/prlx_harvard_webinar')).toBeNull();
    expect(videoProviderFor('')).toBeNull();
  });

  // The Wistia request is built from the media URL, not guessed.
  it('builds the Wistia media JSON URL from the watch URL', () => {
    const provider = videoProviderFor('https://ourgroundswell.wistia.com/medias/46kd8ic53q');

    expect(provider?.request('https://ourgroundswell.wistia.com/medias/46kd8ic53q')).toEqual({
      url: 'https://ourgroundswell.wistia.com/medias/46kd8ic53q.json',
      as: 'json',
    });
  });
});

describe('yamlQuote', () => {
  // Event titles carry quotes (a talk on "How To Speak Tech"), and an
  // unescaped one ends the YAML scalar early and breaks the whole entry.
  it('escapes an embedded double quote', () => {
    expect(yamlQuote('A talk on "How To Speak Tech"')).toBe(
      '"A talk on \\"How To Speak Tech\\""',
    );
  });

  // Backslashes must be escaped BEFORE quotes. Doing it the other way round
  // would put a backslash in front of the quote and then escape THAT backslash,
  // leaving the quote bare again.
  it('escapes a backslash without double-escaping a following quote', () => {
    expect(yamlQuote('a\\b"c')).toBe('"a\\\\b\\"c"');
  });

  // A missing summary or location must still produce valid YAML. Emitting a
  // bare `undefined` would parse as the string "undefined" and put that word on
  // the page.
  it('renders a missing value as an empty scalar', () => {
    expect(yamlQuote(undefined)).toBe('""');
  });
});

describe('eventFrontmatter', () => {
  // The exact bytes of the 33 committed archive entries.
  it('writes the full entry when every field is present', () => {
    expect(
      eventFrontmatter({
        title: 'Summer Social',
        date: '2018-08-18',
        location: 'New York, NY',
        description: '200+ technologists came.',
      }),
    ).toBe(
      '---\ntitle: "Summer Social"\ndate: 2018-08-18\nlocation: "New York, NY"\n' +
        'description: "200+ technologists came."\n---\n',
    );
  });

  // An absent optional key renders nothing; `location: ""` would render an
  // empty line on the card instead.
  it('omits absent optional fields rather than writing them empty', () => {
    const out = eventFrontmatter({ title: 'Untitled', date: '2019-04-18' });

    expect(out).not.toContain('location:');
    expect(out).not.toContain('description:');
  });

  // The one undated event rides on a placeholder date, and this flag is the
  // only thing keeping that invented date off the public site.
  it('marks a draft entry', () => {
    expect(eventFrontmatter({ title: 'X', date: '2019-04-18', draft: true })).toContain(
      'draft: true',
    );
  });

  // No body: an event is a card, not an article, so the write-up rides in
  // `description` and the file ends at the closing fence.
  it('writes frontmatter only, with no body', () => {
    expect(eventFrontmatter({ title: 'X', date: '2019-04-18' })).toBe(
      '---\ntitle: "X"\ndate: 2019-04-18\n---\n',
    );
  });
});

describe('webinarPostBody', () => {
  // A webinar IS an article, so unlike an event its write-up stays a rendered
  // body with its paragraphs intact.
  it('keeps the write-up as the post body', () => {
    const out = webinarPostBody({
      title: 'EduTech Solutions to COVID-19',
      date: '2020-04-09',
      summary: 'Prof. Mark Esposito',
      coverImage: '/images/webinars/edutech.jpg',
      embedUrl: 'https://www.youtube-nocookie.com/embed/S4c48202-D8',
      text: 'First para.\n\nSecond para.',
    });

    expect(out).toContain('series: webinars');
    expect(out).toContain('embedUrl: "https://www.youtube-nocookie.com/embed/S4c48202-D8"');
    expect(out.endsWith('First para.\n\nSecond para.\n')).toBe(true);
  });

  // A recording the provider has lost gets no cover and no player — both keys
  // drop out rather than being written empty.
  it('omits the cover and the embed when the recording is gone', () => {
    const out = webinarPostBody({
      title: 'Media and Technology in Growth Markets',
      date: '2020-05-01',
      summary: 'Marcus Brauchli',
      draft: true,
    });

    expect(out).not.toContain('coverImage:');
    expect(out).not.toContain('embedUrl:');
    expect(out).toContain('draft: true');
  });
});

describe('strikinglyImageUrl', () => {
  // This URL shape is the only way the archive photos can be fetched at all,
  // and only until the domain moves — getting it wrong means the snapshot comes
  // back empty with no second chance.
  it('builds the custom-images URL from a storage key and format', () => {
    expect(strikinglyImageUrl('117929/DSC00341_blzqo1', 'jpg')).toBe(
      'https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/117929/DSC00341_blzqo1.jpg',
    );
  });

  // Storage keys arrive JSON-escaped in the page source (`117929\/DSC00341`),
  // so the escape is stripped here rather than at every call site.
  it('strips the JSON escaping the page source carries', () => {
    expect(strikinglyImageUrl('117929\\/DSC00341', 'png')).toContain('117929/DSC00341.png');
  });

  // The second URL the snapshot tries when the direct one 404s. It is the
  // transform the live page itself requests, so it exists for anything the site
  // actually displayed.
  it('builds the rendered-page transform as the fallback form', () => {
    expect(strikinglyImageFallbackUrl('13213024/298042_2283', 'png')).toBe(
      'https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_9000,w_1920,f_auto,q_auto/13213024/298042_2283.png',
    );
  });
});

describe('toEmbedUrl', () => {
  // One test rather than a case each: these are four spellings of a single
  // rule, and a per-case name would put a raw URL — including a '?' the test
  // registry rejects — into the emitted test name.
  it('turns every supported watch link into its player URL', () => {
    const cases: [string, string][] = [
      ['https://vimeo.com/516712836', 'https://player.vimeo.com/video/516712836'],
      ['https://youtu.be/S4c48202-D8', 'https://www.youtube-nocookie.com/embed/S4c48202-D8'],
      [
        'https://www.youtube.com/watch?v=kcjF1y6kcco',
        'https://www.youtube-nocookie.com/embed/kcjF1y6kcco',
      ],
      [
        'https://ourgroundswell.wistia.com/medias/46kd8ic53q',
        'https://fast.wistia.net/embed/iframe/46kd8ic53q',
      ],
    ];

    expect(cases.map(([raw]) => toEmbedUrl(raw))).toEqual(cases.map(([, player]) => player));
  });

  // W9's URL carries a Mailchimp campaign id and an unsubstituted [UNIQID]
  // placeholder. Neither belongs in a permanent embed.
  it('drops the tracking query string', () => {
    expect(toEmbedUrl('https://vimeo.com/422004140?mc_cid=f5a0f5076c&mc_eid=[UNIQID]')).toBe(
      'https://player.vimeo.com/video/422004140',
    );
  });

  // W6 links to somebody else's write-up page rather than a recording.
  // Returning undefined is what stops a non-player being put inside an iframe;
  // the caller renders a link instead.
  it('returns undefined for a host that is not a video provider', () => {
    expect(toEmbedUrl('https://goodhealthoutcomes.com/prlx_harvard_webinar')).toBeUndefined();
  });

  // A recording with no link at all must not produce an iframe pointed at
  // nothing; the post simply carries no embed.
  it('returns undefined for an empty or missing URL', () => {
    expect(toEmbedUrl('')).toBeUndefined();
    expect(toEmbedUrl(undefined)).toBeUndefined();
  });
});

describe('richText helpers', () => {
  // The titles arrive as "Tech Talk<br>with HLS Professor". Without treating a
  // block boundary as a space they read "Tech Talkwith HLS Professor", which is
  // exactly how the raw data looks.
  it('treats a line break as a space rather than gluing words together', () => {
    expect(richTextToPlain('<p>Tech Talk</p><p>HLS Professor Susan Crawford</p>')).toBe(
      'Tech Talk HLS Professor Susan Crawford',
    );
  });

  // Sponsor lists are full of ampersands, so an undecoded `&amp;` would reach a
  // published title verbatim.
  it('decodes entities and strips tags', () => {
    expect(richTextToPlain('<strong>Rock Health &amp; General Catalyst</strong>')).toBe(
      'Rock Health & General Catalyst',
    );
  });

  // The counterpart to the single-line form above: a webinar post keeps its
  // paragraphs because it renders as an article body, not a card. A BLANK line
  // between them, not a single newline — markdown reads one newline as a soft
  // wrap and would run the two paragraphs together.
  it('keeps paragraph breaks when asked for paragraphs', () => {
    expect(richTextToParagraphs('<p>One.</p><p>Two.</p>')).toBe('One.\n\nTwo.');
  });
});

describe('storeFromHtml', () => {
  const store = {
    pageData: {
      pages: [
        {
          path: '/events',
          sections: [
            {
              components: {
                text1: { type: 'RichText', value: '<p>Past Events</p>' },
                repeatable1: {
                  list: [
                    {
                      components: {
                        text1: { type: 'RichText', value: '<p>Aug 18th, 2018: Summer Social</p>' },
                        text2: { type: 'RichText', value: '<p>As reported by a board member</p>' },
                        text3: { type: 'RichText', value: '<p>200+ technologists came.</p>' },
                        media1: {
                          type: 'Media',
                          image: { storageKey: '117929/abc', format: 'jpg', w: 250, h: 186, s: 1234 },
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        {
          path: '/webinars',
          sections: [
            {
              components: {
                text1: { type: 'RichText', value: '<p>Webinars</p>' },
                repeatable1: {
                  list: [
                    {
                      components: {
                        text1: { type: 'RichText', value: '<p>A Titled Webinar</p>' },
                        text3: { type: 'RichText', value: '<p>What it covered.</p>' },
                        media1: {
                          type: 'Media',
                          video: {
                            url: 'https://vimeo.com/413168012',
                            thumbnail_url: 'https://i.vimeocdn.com/video/885812709_1280.jpg',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        {
          path: '/l-a',
          sections: [{ components: { gallery1: { sources: [] } } }],
        },
      ],
    },
  };
  const html = `<html><script>$S.stores=${JSON.stringify(store)};$S.other=1;</script></html>`;

  // The store JSON contains braces inside strings, so a regex that matched to a
  // closing brace would stop early or swallow the rest of the document.
  it('parses the embedded store out of a page', () => {
    expect(storeFromHtml(html)?.pageData?.pages).toHaveLength(3);
  });

  // Null rather than a throw is how a caller tells "not a Strikingly page" from
  // "a Strikingly page with nothing on it".
  it('returns null when the marker is absent', () => {
    expect(storeFromHtml('<html><body>nothing here</body></html>')).toBeNull();
  });

  // Every page of the site is listed in one store, so the snapshot has to pick
  // the right one out — and say so plainly when a path is not there.
  it('finds a page by its path', () => {
    expect(pageByPath(storeFromHtml(html), '/events')?.path).toBe('/events');
    expect(pageByPath(storeFromHtml(html), '/nope')).toBeNull();
  });

  // The end-to-end shape of one imported event: the three text fields and the
  // photo all have to come off the same repeatable item, or an entry ends up
  // with somebody else's write-up.
  it('reads the archive items with their dates, write-ups and photos', () => {
    const items = archiveItems(pageByPath(storeFromHtml(html), '/events'));

    expect(items).toHaveLength(1);
    expect(parseArchiveDate(items[0].rawTitle).date).toBe('2018-08-18');
    expect(items[0].text).toBe('200+ technologists came.');
    expect(items[0].image?.storageKey).toBe('117929/abc');
  });

  // A webinar's video lives on a Media component rather than in the text, and
  // the link it carries is a watch page, not something an iframe can load.
  it('reads the webinar items with a player URL derived from the video link', () => {
    const items = webinarItems(pageByPath(storeFromHtml(html), '/webinars'));

    expect(items).toHaveLength(1);
    expect(items[0].rawTitle).toBe('A Titled Webinar');
    expect(items[0].embedUrl).toBe('https://player.vimeo.com/video/413168012');
  });

  // The L.A. page has a gallery with nothing in it. "This page had a gallery
  // and it was empty" is a fact worth recording, not the same as "this page had
  // no gallery" — so the empty one is retained rather than filtered away.
  it('retains a gallery that is present but empty', () => {
    const galleries = galleryItems(pageByPath(storeFromHtml(html), '/l-a'));

    expect(galleries).toHaveLength(1);
    expect(galleries[0].images).toEqual([]);
  });
});

describe('slugify', () => {
  // The slug becomes a committed filename and, for a webinar, a public URL —
  // so punctuation in a title must not reach either.
  it('builds a filename-safe slug', () => {
    expect(slugify('Crypto + Blockchain Circle: The Future')).toBe(
      'crypto-blockchain-circle-the-future',
    );
  });

  // Dropping it would collide "Ideas & Conversation" with "Ideas Conversation";
  // spelling it out keeps the two apart and keeps the slug readable.
  it('spells out an ampersand rather than dropping it', () => {
    expect(slugify('Ideas & Conversation')).toBe('ideas-and-conversation');
  });

  // Speaker and venue names carry accents; stripping the character outright
  // would turn "Café" into "Caf" rather than "Cafe".
  it('folds accents instead of losing the letters', () => {
    expect(slugify('Café Sessión')).toBe('cafe-session');
  });

  // The slug is capped at 80 characters, and a long title can put the cut
  // exactly on a separator — leaving a filename ending in `-.md`.
  it('never ends on a hyphen, even when truncation lands on one', () => {
    expect(slugify('a'.repeat(78) + ' bb')).not.toMatch(/-$/);
  });
});
