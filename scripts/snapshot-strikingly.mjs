/**
 * Save the old Strikingly site into the repo, before the domain moves.
 *
 * harvardintech.com is still served by Strikingly, and every photo on it lives
 * only on Strikingly's CDN. The moment the domain points at GitHub Pages those
 * URLs stop resolving and roughly a decade of event photography and write-ups
 * is gone. This script is the one-time capture that prevents that. RUN IT
 * BEFORE THE CUTOVER — nothing else in the archive work depends on its timing,
 * but this does, and it cannot be re-run afterwards.
 *
 * What it writes, under `archive/strikingly/` at the repo ROOT — deliberately
 * outside `public/` so it is never deployed, and outside `src/` so Astro never
 * tries to build it:
 *
 *   events/NN-YYYY-MM-DD-<slug>.<ext>   the archive event photos
 *   galleries/<name>/NN.<ext>           the chapter and home galleries
 *   webinars/WNN.<ext>                  the provider video thumbnails
 *   pages/<path>.json                   each page's raw pageData, word for word
 *   manifest.json                       one record per item, plus totals
 *
 * Usage:
 *   node scripts/snapshot-strikingly.mjs [--dry-run] [--from <dir>] [--out <dir>]
 *
 *   --dry-run   list what would be saved, download nothing
 *   --from      read saved HTML from a directory instead of the network, so a
 *               capture can be re-parsed after the site is gone
 *   --out       write somewhere other than archive/strikingly
 *
 * Idempotent: a file already on disk with the same sha256 is skipped, so a
 * re-run after a partial failure costs only the missing downloads. Exits
 * non-zero if any download fails, because a half-captured archive that reports
 * success is the one outcome worth failing loudly over.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  storeFromHtml,
  pageByPath,
  archiveItems,
  featuredEventItem,
  webinarItems,
  galleryItems,
  parseArchiveDate,
  cleanTitleText,
  cleanWriteup,
  strikinglyImageUrl,
  strikinglyImageFallbackUrl,
  slugify,
  videoProviderFor,
} from '../src/lib/strikinglyArchive.js';

const ORIGIN = 'https://www.harvardintech.com';
const USER_AGENT = 'Mozilla/5.0 (compatible; harvardintech-archive/1.0)';

/** The pages worth keeping. `/home` is fetched from the bare origin. */
const PAGES = [
  { key: 'home', path: '/home', url: '' },
  { key: 'events', path: '/events', url: '/events' },
  { key: 'webinars', path: '/webinars', url: '/webinars' },
  { key: 'japan', path: '/japan', url: '/japan' },
  { key: 'nyc', path: '/nyc', url: '/nyc' },
  { key: 'san-francisco', path: '/san-francisco', url: '/san-francisco' },
  { key: 'l-a', path: '/l-a', url: '/l-a' },
  { key: 'about-us', path: '/about-us', url: '/about-us' },
  { key: 'volunteers', path: '/volunteers', url: '/volunteers' },
];

/** Which page each gallery is saved under. The home and events galleries are
 *  the same 20 photos, so they share one directory rather than being stored
 *  twice under two names. */
const GALLERY_DIRS = {
  home: 'home-events',
  events: 'home-events',
  japan: 'japan',
  nyc: 'nyc',
  'san-francisco': 'san-francisco',
  'l-a': 'l-a',
};

function parseArgs(argv) {
  const args = { dryRun: false, from: null, out: 'archive/strikingly' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--from') args.from = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Read a page's HTML, from `--from` if given, else over the network. */
async function loadPage(page, from) {
  if (from) {
    const file = path.join(from, `${page.key}.html`);
    if (!fs.existsSync(file)) throw new Error(`missing saved page: ${file}`);
    return fs.readFileSync(file, 'utf8');
  }
  const response = await fetch(`${ORIGIN}${page.url}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${page.key}: HTTP ${response.status}`);
  return response.text();
}

/**
 * Download one image, trying the direct URL and then the rendered-page
 * transform. Returns `{ buffer, sourceUrl }`, or throws with both failures
 * named — a silent fallback would hide that the direct form has stopped
 * working, which is the early warning that the CDN is going away.
 */
async function downloadImage(storageKey, format) {
  const candidates = [
    strikinglyImageUrl(storageKey, format),
    strikinglyImageFallbackUrl(storageKey, format),
  ];
  const failures = [];
  for (const url of candidates) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!response.ok) {
        failures.push(`${url} -> HTTP ${response.status}`);
        continue;
      }
      return { buffer: Buffer.from(await response.arrayBuffer()), sourceUrl: url };
    } catch (error) {
      failures.push(`${url} -> ${error.message}`);
    }
  }
  throw new Error(failures.join('; '));
}

/** Download an absolute URL (the webinar thumbnails, which are not Strikingly). */
async function downloadUrl(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return { buffer: Buffer.from(await response.arrayBuffer()), sourceUrl: url };
}

/**
 * What the provider still knows about a recording: `{ publishedAt, title,
 * available }`.
 *
 * `available` is the load-bearing one. A provider that still hosts a video
 * answers with its title; one that has lost it answers with a stub. Vimeo in
 * particular returns a perfectly valid oEmbed document for a video it will not
 * play — an `html` iframe and a `video_id`, but no `title`, no `duration` and
 * no `upload_date` — and serves a generic colour-bars image in place of the
 * thumbnail. Nothing about the response is an error, so the only way to tell a
 * live recording from a dead one is that the metadata is missing.
 *
 * Recording that distinction here is what stops the import from publishing a
 * post whose video does not play and whose cover is a colour chart.
 */
export async function providerMetadata(videoUrl, { fetchImpl = fetch } = {}) {
  const unknown = { publishedAt: null, title: null, available: null };
  const provider = videoProviderFor(videoUrl);
  if (!provider) return unknown;
  const request = provider.request(videoUrl);
  try {
    const response = await fetchImpl(request.url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return { ...unknown, available: false };
    return provider.parse(
      request.as === 'json' ? await response.json() : await response.text(),
    );
  } catch {
    return { ...unknown, available: false };
  }
}

/** The status of an external page we only link to (W6). */
async function headStatus(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    return response.status;
  } catch {
    return 0;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const outRoot = path.resolve(args.out);
  const records = [];
  const failures = [];
  const seenHashes = new Map();
  let downloaded = 0;
  let skipped = 0;
  let totalBytes = 0;

  /** Save one binary, unless an identical file is already there. */
  function save(relPath, buffer) {
    const full = path.join(outRoot, relPath);
    const hash = sha256(buffer);
    if (fs.existsSync(full) && sha256(fs.readFileSync(full)) === hash) {
      skipped += 1;
    } else {
      ensureDir(path.dirname(full));
      fs.writeFileSync(full, buffer);
      downloaded += 1;
    }
    totalBytes += buffer.length;
    return hash;
  }

  const stores = {};
  for (const page of PAGES) {
    try {
      const html = await loadPage(page, args.from);
      const store = storeFromHtml(html);
      if (!store) throw new Error('no $S.stores block found');
      const pageData = pageByPath(store, page.path);
      if (!pageData) throw new Error(`no page at ${page.path}`);
      stores[page.key] = pageData;
      if (!args.dryRun) {
        const file = path.join(outRoot, 'pages', `${page.key}.json`);
        ensureDir(path.dirname(file));
        fs.writeFileSync(file, `${JSON.stringify(pageData, null, 2)}\n`);
      }
      console.log(`page ${page.key}: ${(pageData.sections ?? []).length} sections`);
    } catch (error) {
      failures.push(`page ${page.key}: ${error.message}`);
      console.error(`page ${page.key}: FAILED ${error.message}`);
    }
  }

  // ── Archive events ────────────────────────────────────────────────────────
  // The home page carries all 33 (its first has no date and appears nowhere
  // else); /events carries 32 with their dates, photos and write-ups. Index i
  // on the home list is index i-1 on the events list — verified against the
  // captured pages — so the two are zipped rather than matched by title, which
  // differs between the pages for the same event.
  const homeItems = stores.home ? archiveItems(stores.home) : [];
  const eventItems = stores.events ? archiveItems(stores.events) : [];

  // Drive from whichever list actually loaded, rather than from home
  // unconditionally. This capture happens ONCE, before the domain moves, and
  // driving the loop off `homeItems` meant a home page that failed to fetch
  // produced ZERO events even when /events had parsed perfectly — losing all 33
  // while the galleries and webinars still came back looking like a success.
  // A missing page now costs only what that page uniquely held.
  const usingHome = homeItems.length >= eventItems.length;
  const primary = usingHome ? homeItems : eventItems;
  const offset = usingHome ? homeItems.length - eventItems.length : 0;

  for (let i = 0; i < primary.length; i += 1) {
    const home = usingHome ? homeItems[i] : null;
    const detail = usingHome ? (eventItems[i - offset] ?? null) : eventItems[i];
    const parsed = detail
      ? parseArchiveDate(detail.rawTitle)
      : { date: null, rest: home?.rawTitle ?? '' };
    const homeParsed = home ? parseArchiveDate(home.rawTitle) : { date: null, rest: '' };
    const date = parsed.date ?? homeParsed.date;
    const titleSource = cleanTitleText(homeParsed.rest || parsed.rest);
    const slug = slugify(titleSource) || `event-${i}`;
    const image = detail?.image ?? home?.image ?? null;
    const record = {
      kind: 'event',
      page: '/events',
      section: detail?.section ?? home?.section ?? null,
      index: i,
      date,
      rawTitle: detail?.rawTitle ?? home?.rawTitle ?? '',
      homeTitle: home?.rawTitle ?? null,
      rawSubtitle: detail?.rawSubtitle ?? '',
      text: cleanWriteup(detail?.text ?? home?.text ?? ''),
      linkUrl: detail?.linkUrl ?? home?.linkUrl ?? null,
      videoUrl: null,
      thumbnailUrl: null,
      sourceUrl: null,
      file: null,
      bytes: null,
      sha256: null,
      w: image?.w ?? null,
      h: image?.h ?? null,
    };

    if (image) {
      const ext = image.format ?? 'jpg';
      const name = `${String(i).padStart(2, '0')}-${date ?? 'undated'}-${slug}.${ext}`;
      const rel = path.join('events', name);
      record.file = rel;
      record.sourceUrl = strikinglyImageUrl(image.storageKey, ext);
      if (args.dryRun) {
        console.log(`would save ${rel}`);
      } else {
        try {
          const { buffer, sourceUrl } = await downloadImage(image.storageKey, ext);
          record.sha256 = save(rel, buffer);
          record.bytes = buffer.length;
          record.sourceUrl = sourceUrl;
          seenHashes.set(record.sha256, rel);
        } catch (error) {
          failures.push(`event ${i} (${slug}): ${error.message}`);
          console.error(`event ${i}: FAILED ${error.message}`);
        }
      }
    }
    records.push(record);
  }

  // ── The featured (upcoming) event photo ───────────────────────────────────
  const featured = stores.events ? featuredEventItem(stores.events) : null;
  if (featured?.image) {
    const ext = featured.image.format ?? 'jpg';
    const rel = path.join('events', `sept-28.${ext}`);
    const record = {
      kind: 'event',
      page: '/events',
      section: featured.section,
      index: 'featured',
      date: null,
      rawTitle: featured.rawTitle,
      text: cleanWriteup(featured.text),
      linkUrl: featured.linkUrl,
      videoUrl: null,
      thumbnailUrl: null,
      sourceUrl: strikinglyImageUrl(featured.image.storageKey, ext),
      file: rel,
      bytes: null,
      sha256: null,
      w: featured.image.w,
      h: featured.image.h,
    };
    if (args.dryRun) {
      console.log(`would save ${rel}`);
    } else {
      try {
        const { buffer, sourceUrl } = await downloadImage(featured.image.storageKey, ext);
        record.sha256 = save(rel, buffer);
        record.bytes = buffer.length;
        record.sourceUrl = sourceUrl;
      } catch (error) {
        failures.push(`featured event: ${error.message}`);
      }
    }
    records.push(record);
  }

  // ── Galleries ─────────────────────────────────────────────────────────────
  const savedGalleryHashes = new Set();
  for (const [key, dirName] of Object.entries(GALLERY_DIRS)) {
    const pageData = stores[key];
    if (!pageData) continue;
    const galleries = galleryItems(pageData);
    let n = 0;
    for (const gallery of galleries) {
      if (gallery.images.length === 0) {
        records.push({
          kind: 'gallery',
          page: `/${key}`,
          section: gallery.section,
          index: null,
          rawTitle: gallery.heading,
          note: 'gallery present but empty',
          file: null,
          bytes: null,
          sha256: null,
        });
        continue;
      }
      for (const image of gallery.images) {
        const ext = image.format ?? 'jpg';
        const rel = path.join('galleries', dirName, `${String(n).padStart(2, '0')}.${ext}`);
        const record = {
          kind: 'gallery',
          page: `/${key}`,
          section: gallery.section,
          index: n,
          rawTitle: gallery.heading,
          text: image.caption,
          sourceUrl: strikinglyImageUrl(image.storageKey, ext),
          file: rel,
          bytes: null,
          sha256: null,
          w: image.w,
          h: image.h,
        };
        if (args.dryRun) {
          console.log(`would save ${rel}`);
        } else {
          try {
            const { buffer, sourceUrl } = await downloadImage(image.storageKey, ext);
            const hash = sha256(buffer);
            // The home and events galleries are the same twenty photos. Saving
            // the second copy would double the bytes for nothing, so an
            // already-seen hash is recorded as a duplicate instead.
            if (savedGalleryHashes.has(hash)) {
              record.duplicateOf = seenHashes.get(hash) ?? null;
              record.sha256 = hash;
              record.file = seenHashes.get(hash) ?? rel;
              records.push(record);
              continue;
            }
            record.sha256 = save(rel, buffer);
            record.bytes = buffer.length;
            record.sourceUrl = sourceUrl;
            savedGalleryHashes.add(hash);
            seenHashes.set(hash, rel);
          } catch (error) {
            failures.push(`gallery ${key}/${n}: ${error.message}`);
          }
        }
        records.push(record);
        n += 1;
      }
    }
  }

  // ── Webinars ──────────────────────────────────────────────────────────────
  const webinars = stores.webinars ? webinarItems(stores.webinars) : [];
  const thumbHashes = new Map();
  for (const item of webinars) {
    const name = `W${String(item.index).padStart(2, '0')}`;
    const record = {
      kind: 'webinar',
      page: '/webinars',
      section: 0,
      index: item.index,
      rawTitle: item.rawTitle,
      rawSubtitle: '',
      text: cleanWriteup(item.text),
      linkUrl: item.linkUrl,
      videoUrl: item.videoUrl,
      embedUrl: item.embedUrl ?? null,
      thumbnailUrl: item.thumbnailUrl,
      publishedAt: null,
      providerTitle: null,
      providerAvailable: null,
      sourceUrl: item.thumbnailUrl,
      file: null,
      bytes: null,
      sha256: null,
      httpStatus: null,
    };

    if (!args.dryRun) {
      const provider = await providerMetadata(item.videoUrl);
      record.publishedAt = provider.publishedAt;
      record.providerTitle = provider.title;
      record.providerAvailable = provider.available;
      // W6 is a link to somebody else's page rather than a recording. Whether
      // that page still answers decides if it becomes a link-only post or is
      // dropped, so the status is recorded rather than assumed.
      if (!item.embedUrl && item.videoUrl) record.httpStatus = await headStatus(item.videoUrl);
    }

    if (item.thumbnailUrl) {
      const ext = (item.thumbnailUrl.match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i)?.[1] ?? 'jpg').toLowerCase();
      const rel = path.join('webinars', `${name}.${ext}`);
      record.file = rel;
      if (args.dryRun) {
        console.log(`would save ${rel}`);
      } else {
        try {
          const { buffer } = await downloadUrl(item.thumbnailUrl);
          const hash = sha256(buffer);
          const already = thumbHashes.get(hash);
          if (already) {
            // W6 reuses W5's thumbnail. Recording that is more useful than
            // shipping the same bytes twice under two names.
            record.duplicateOf = already;
            record.sha256 = hash;
            record.file = already;
          } else {
            record.sha256 = save(rel, buffer);
            record.bytes = buffer.length;
            thumbHashes.set(hash, rel);
          }
        } catch (error) {
          failures.push(`webinar ${name}: ${error.message}`);
          console.error(`webinar ${name}: FAILED ${error.message}`);
        }
      }
    }
    records.push(record);
  }

  // ── Manifest ──────────────────────────────────────────────────────────────
  const manifest = {
    capturedAt: new Date().toISOString(),
    origin: ORIGIN,
    totals: {
      events: records.filter((r) => r.kind === 'event').length,
      galleries: records.filter((r) => r.kind === 'gallery').length,
      webinars: records.filter((r) => r.kind === 'webinar').length,
      filesWritten: downloaded,
      filesUnchanged: skipped,
      bytes: totalBytes,
    },
    items: records,
  };

  if (!args.dryRun) {
    ensureDir(outRoot);
    fs.writeFileSync(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const mb = (totalBytes / 1024 / 1024).toFixed(1);
  console.log(
    `\n${manifest.totals.events} events, ${manifest.totals.galleries} gallery photos, ` +
      `${manifest.totals.webinars} webinars`,
  );
  console.log(`${downloaded} written, ${skipped} unchanged, ${mb} MB total`);
  if (Number(mb) > 50) {
    console.log(
      'NOTE: over 50 MB. The plan asks that the photos move to the org drive at this size, ' +
        'keeping the manifest and write-ups in the repo.',
    );
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
  }
  // Returned rather than exited so the module stays importable: a
  // `process.exit` here would take the test runner down with it. The CLI
  // wrapper at the foot of this file turns `ok: false` into the non-zero exit.
  return { ok: failures.length === 0, manifest, failures };
}

// Run only when invoked as a command, so the module can be imported and
// exercised by a test without firing a real snapshot at the live site.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((result) => {
      if (!result.ok) process.exit(1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
