/**
 * Turn the snapshot's webinar records into blog posts.
 *
 * The eleven 2020 recordings came back as ORDINARY BLOG POSTS carrying
 * `series: webinars`, rather than as a collection of their own. Eleven frozen
 * items did not justify a second schema, a second per-entry route and a second
 * CMS card; as posts they reuse `src/pages/blog/[slug].astro`, the existing
 * `embedUrl` -> Embed.astro path, and a screen editors already know. The one
 * new field is what puts them on /webinars.
 *
 * Titles are the hard part and they are NOT derived here. Only the first
 * recording carried a title on the old site; the other ten were identified by
 * their write-up alone, so a human read each one and named it. Those names live
 * in the table below, keyed by the snapshot's index.
 *
 * Usage:
 *   node scripts/import-webinars.mjs [--dry-run] [--force]
 *
 * Like the events importer, an existing post that has been edited since it was
 * written is left alone unless `--force` is given.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { slugify, webinarPostBody } from '../src/lib/strikinglyArchive.js';

const MANIFEST = 'archive/strikingly/manifest.json';
const OUT_DIR = 'src/content/blog';
const IMAGE_DIR = 'public/images/webinars';
const MEDIA_MANIFEST = 'src/data/media.json';

/**
 * The hand-written name and speaker line for each recording, by snapshot index.
 *
 * `drop: true` removes one from the import entirely. W6 is the only case: it was
 * never a recording we hosted, only a link to a webinar broadcast on somebody
 * else's site, and the snapshot found that page no longer resolves — its
 * certificate does not even match the domain any more. A post whose single
 * purpose is a dead link is worse than no post.
 */
const WEBINARS = {
  0: {
    title:
      'COVID-19 and Clean Air: How the Pandemic Created Opportunities for Technological Advances',
    summary: 'Prof. Dr. Gregor Luthe and Torsten Maehle of Atmofizer',
  },
  1: {
    title: 'Telepsychiatry and Closing Access Gaps in a Crisis',
    summary: 'Samir Malik, EVP & GM, Genoa Telepsychiatry',
  },
  2: {
    title: 'How COVID-19 Will Change Technology, Markets and Business',
    summary: 'Rodrigo Salvaterra, J.P. Morgan Chase',
  },
  3: {
    title: 'COVID-19, Pregnancy Outcomes and Telemedicine',
    summary: 'Dr. Eduardo Vadia and Dr. Sina Haeri, Access Physicians',
  },
  4: {
    title: 'Cybersecurity in the Supply Chain',
    summary: 'Jim Fleming (ISM) and Charlotte de Brabandt',
  },
  5: {
    title: 'EduTech Solutions to COVID-19',
    summary: 'Prof. Mark Esposito, with Harvard in Tech Seattle',
  },
  6: {
    title: 'COVID-19 Testing, Telehealth and Data-Driven Solutions',
    summary: 'Dr. David Stark and Nathaniel T. Bradley, Parallax',
    drop: true,
  },
  7: {
    title: 'Reopening the Economy During COVID-19',
    summary: 'Mayor Kate Gallego of Phoenix, with Harvard in Tech Seattle',
  },
  8: {
    title: 'COVID-19: Is Telemedicine the Future of Health Care?',
    summary: 'A seven-person panel, with Harvard in Tech Seattle',
  },
  9: {
    title: 'Interfaith Webinar: Finding Moral Strength in a Crisis',
    summary:
      'Greg M. Epstein, Lama Rod Owens, Rabbi Jonah C. Steinberg, Pat and Tammy McLeod, and Sana Shareef, with the COVID Foundation',
  },
  10: {
    title: 'Media and Technology in Growth Markets',
    summary: 'Marcus Brauchli, North Base Media',
  },
};

/**
 * The date given to a recording whose provider no longer publishes one.
 *
 * Five of the eleven are Vimeo uploads the provider no longer has: the snapshot
 * records `providerAvailable: false` for each, because Vimeo answers for them
 * with a metadata-free stub and a colour-bars image instead of a thumbnail.
 * Those five ship as DRAFTS — present in the repo and in the CMS, invisible on
 * the public site — and this value exists only so the file validates and sorts
 * next to the five live recordings, which all fall in April and May 2020. It is
 * not a claim about when any of them happened.
 */
const UNDATED_PLACEHOLDER = '2020-05-01';

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run'), force: argv.includes('--force') };
}

/** The file body for one imported recording. Draft when the provider gave no
 *  date, or when it has lost the recording altogether — see `webinarPostBody`. */
function postBody(record, meta) {
  return webinarPostBody({
    title: meta.title,
    date: record.publishedAt ?? UNDATED_PLACEHOLDER,
    summary: meta.summary,
    coverImage: record.coverImage,
    embedUrl: record.embedUrl,
    text: record.text,
    draft: !record.publishedAt || record.providerAvailable === false,
  });
}

/**
 * Paths default to the real ones and are injectable so a test can run the whole
 * import against a temp directory. Returns its counts rather than exiting, so
 * importing this module never takes the caller's process down.
 */
export function main({
  argv = process.argv.slice(2),
  manifestPath = MANIFEST,
  outDir = OUT_DIR,
  imageDir = IMAGE_DIR,
  mediaManifest = MEDIA_MANIFEST,
  archiveRoot = 'archive/strikingly',
  publicImages = 'public/images',
} = {}) {
  const args = parseArgs(argv);
  if (!fs.existsSync(manifestPath)) {
    console.error(`missing ${manifestPath} — run scripts/snapshot-strikingly.mjs first`);
    return { ok: false, written: 0, unchanged: 0, dropped: 0, skipped: [] };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const webinars = manifest.items.filter((item) => item.kind === 'webinar');

  fs.mkdirSync(outDir, { recursive: true });
  if (!args.dryRun) fs.mkdirSync(imageDir, { recursive: true });

  const media = fs.existsSync(mediaManifest)
    ? JSON.parse(fs.readFileSync(mediaManifest, 'utf8'))
    : { assets: [] };
  media.assets = Array.isArray(media.assets) ? media.assets : [];

  let written = 0;
  let unchanged = 0;
  let dropped = 0;
  const skipped = [];

  for (const record of webinars) {
    const meta = WEBINARS[record.index];
    if (!meta) {
      // A snapshot record with no hand-written name means the source page
      // gained a recording since the table was written — that needs a human to
      // name it, not a guessed title, so the import stops rather than inventing.
      throw new Error(`no title recorded for webinar index ${record.index}`);
    }
    if (meta.drop) {
      dropped += 1;
      continue;
    }

    // Copy the provider thumbnail into public/ under a name derived from the
    // post, not from W-number: the number is a snapshot detail and would mean
    // nothing to an editor looking at the media library.
    //
    // A recording the provider has lost gets NO cover. What comes back for one
    // is not a still from the video — it is Vimeo's generic colour-bars image,
    // the same bytes for every dead upload — so shipping it would put a colour
    // chart on the page and call it a video still, including in the alt text.
    const slug = slugify(meta.title);
    let coverImage;
    if (record.file && record.providerAvailable !== false) {
      const source = path.join(archiveRoot, record.file);
      const ext = path.extname(record.file) || '.jpg';
      const name = `${slug}${ext}`;
      coverImage = `/images/webinars/${name}`;
      if (!args.dryRun && fs.existsSync(source)) {
        const target = path.join(imageDir, name);
        fs.copyFileSync(source, target);
        const filename = `webinars/${name}`;
        const asset = {
          filename,
          url: `/images/${filename}`,
          // A real alt, not an empty one: these are the only images on the site
          // whose subject is knowable from the record itself, so describing
          // them costs nothing and an empty string here would be a decorative
          // claim that is simply untrue.
          alt: `Video still from ${meta.title}`,
          sizeBytes: fs.statSync(target).size,
        };
        const at = media.assets.findIndex((entry) => entry.filename === filename);
        // An editor may have written a better alt in the media library; keep it.
        if (at === -1) media.assets.push(asset);
        else media.assets[at] = { ...asset, alt: media.assets[at].alt || asset.alt };
      }
    }

    const file = path.join(outDir, `webinar-${slug}.md`);
    const next = postBody({ ...record, coverImage }, meta);

    if (fs.existsSync(file)) {
      const current = fs.readFileSync(file, 'utf8');
      if (current === next) {
        unchanged += 1;
        continue;
      }
      if (!args.force) {
        skipped.push(path.basename(file));
        continue;
      }
    }
    if (!args.dryRun) fs.writeFileSync(file, next);
    written += 1;
  }

  if (!args.dryRun) {
    // Drop records for webinar images that are no longer on disk. A re-run that
    // stops importing a cover — because the provider lost the recording since
    // the last one — must take its record with it, or the media library lists
    // a file the site does not have. Only this importer's own prefix is
    // touched; every other asset record is left exactly as it was.
    media.assets = media.assets.filter(
      (asset) =>
        !String(asset.filename).startsWith('webinars/') ||
        fs.existsSync(path.join(publicImages, asset.filename)),
    );
    media.assets.sort((a, b) => a.filename.localeCompare(b.filename));
    fs.writeFileSync(mediaManifest, `${JSON.stringify(media, null, 2)}\n`);
  }

  const kept = webinars.filter((r) => !WEBINARS[r.index]?.drop);
  const gone = kept.filter((r) => r.providerAvailable === false);
  console.log(`${written} written, ${unchanged} unchanged, ${dropped} dropped`);
  console.log(
    `${kept.length - gone.length} publish; ${gone.length} ship as drafts because the ` +
      'provider no longer has the recording',
  );
  if (gone.length > 0) {
    console.log('\nNo longer playable — the video host returns no metadata for these:');
    for (const record of gone) console.log(`  - ${WEBINARS[record.index].title} (${record.videoUrl})`);
  }
  if (skipped.length > 0) {
    console.log('\nEdited since they were imported — re-run with --force to overwrite:');
    for (const name of skipped) console.log(`  - ${name}`);
  }
  return { ok: true, written, unchanged, dropped, skipped, published: kept.length - gone.length };
}

// Run only when invoked as a command, so the module can be imported and
// exercised by a test without writing into the real blog collection.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!main().ok) process.exit(1);
}
