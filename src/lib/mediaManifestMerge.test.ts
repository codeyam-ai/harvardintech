// The media-manifest merge, tested against the @codeyam/cms commit path we
// depend on (patched locally — see "The patch on top of the package" in
// CMS_SETUP.md).
//
// This is the regression behind `75d884d`: a staged manifest change stores two
// WHOLE files, and its `original` is whatever `src/data/media.json` held when the
// admin page was built. Publishing `updated` as-is therefore wrote that stale
// snapshot over the branch and dropped every record published since — the
// 19 Oct city photos vanished from the library while their bytes stayed in
// `public/images/`. The fix reduces the staged change to the records it actually
// touched and replays them onto the branch's current manifest at publish time.
import { describe, it, expect } from 'vitest';
import {
  applyManifestOps,
  manifestOps,
  rebaseManifestChange,
  type ManifestOp,
} from '@codeyam/cms/lib/mediaLibrary';
import { commitAll } from '@codeyam/cms/lib/githubCommit';
import type { MediaAsset } from '@codeyam/cms/lib/mediaLibrary';
import type { PendingChange } from '@codeyam/cms/lib/pendingChanges';

function asset(filename: string, extra: Partial<MediaAsset> = {}): MediaAsset {
  return { filename, url: `/images/${filename}`, ...extra } as MediaAsset;
}

const manifest = (...assets: MediaAsset[]) => ({ assets });
const names = (m: { assets: MediaAsset[] }) => m.assets.map((a) => a.filename);

function manifestChange(original: string, updated: string): PendingChange {
  return {
    collection: 'media',
    slug: 'media.json',
    path: 'src/data/media.json',
    title: 'Media library',
    original,
    updated,
    kind: 'edit',
  } as PendingChange;
}

function imageChange(filename: string): PendingChange {
  return {
    collection: 'media',
    slug: filename,
    path: `public/images/${filename}`,
    title: filename,
    original: '',
    updated: 'UklGRg==',
    kind: 'edit',
    encoding: 'base64',
  } as PendingChange;
}

describe('applyManifestOps', () => {
  // The reproduction: the admin page was built before the city photos landed,
  // so its baseline lacks them. Replaying this session's one upload onto the
  // branch's manifest must keep every record the session never touched.
  it('keeps the branch records a stale baseline never saw', () => {
    const staleBaseline = manifest(asset('team/peter-boyce.png'));
    const staged = manifest(asset('team/peter-boyce.png'), asset('nyc-skyline.webp'));
    const head = manifest(asset('team/peter-boyce.png'), asset('cities/london.webp'), asset('cities/japan.webp'));

    const merged = applyManifestOps(head, manifestOps(staleBaseline, staged));

    expect(names(merged)).toEqual([
      'team/peter-boyce.png',
      'cities/london.webp',
      'cities/japan.webp',
      'nyc-skyline.webp',
    ]);
  });

  // A record this session deleted is removed from the branch's file too.
  it('removes a record the session deleted', () => {
    const ops: ManifestOp[] = [{ op: 'remove', filename: 'old.webp' }];

    expect(names(applyManifestOps(manifest(asset('a.webp'), asset('old.webp')), ops))).toEqual(['a.webp']);
  });

  // A changed record (new alt text) replaces the branch's copy in place rather
  // than appending a duplicate.
  it('replaces a changed record in place', () => {
    const ops: ManifestOp[] = [{ op: 'add', asset: asset('a.webp', { alt: 'New alt' }) }];
    const merged = applyManifestOps(manifest(asset('a.webp'), asset('b.webp')), ops);

    expect(names(merged)).toEqual(['a.webp', 'b.webp']);
    expect(merged.assets[0].alt).toBe('New alt');
  });

  // A reorder ranks the records it names and leaves records it never saw after them.
  it('applies a reorder and keeps unseen records after it', () => {
    const ops: ManifestOp[] = [{ op: 'order', filenames: ['b.webp', 'a.webp'] }];
    const head = manifest(asset('a.webp'), asset('new.webp'), asset('b.webp'));

    expect(names(applyManifestOps(head, ops))).toEqual(['b.webp', 'a.webp', 'new.webp']);
  });

  // No edits means the branch's file comes through untouched.
  it('returns the head records unchanged with no ops', () => {
    expect(names(applyManifestOps(manifest(asset('a.webp')), []))).toEqual(['a.webp']);
  });
});

describe('manifestOps', () => {
  // An upload is exactly one add — not a whole-library rewrite.
  it('reduces an upload to one add', () => {
    const ops = manifestOps(manifest(asset('a.webp')), manifest(asset('a.webp'), asset('b.webp')));

    expect(ops).toEqual([{ op: 'add', asset: asset('b.webp') }]);
  });

  // A discarded record becomes a remove.
  it('reports a deleted record as a remove', () => {
    const ops = manifestOps(manifest(asset('a.webp'), asset('b.webp')), manifest(asset('a.webp')));

    expect(ops).toEqual([{ op: 'remove', filename: 'b.webp' }]);
  });

  // An edited record is an add that replaces by filename.
  it('reports an edited record as an add', () => {
    const ops = manifestOps(manifest(asset('a.webp')), manifest(asset('a.webp', { alt: 'x' })));

    expect(ops).toEqual([{ op: 'add', asset: asset('a.webp', { alt: 'x' }) }]);
  });

  // A genuine drag-reorder of shared records is recorded with the new order.
  it('reports a reorder of shared records', () => {
    const ops = manifestOps(manifest(asset('a.webp'), asset('b.webp')), manifest(asset('b.webp'), asset('a.webp')));

    expect(ops).toEqual([{ op: 'order', filenames: ['b.webp', 'a.webp'] }]);
  });

  // Identical manifests produce no edits at all.
  it('returns nothing for identical manifests', () => {
    expect(manifestOps(manifest(asset('a.webp')), manifest(asset('a.webp')))).toEqual([]);
  });
});

describe('rebaseManifestChange', () => {
  const STALE = JSON.stringify(manifest(asset('a.webp')));
  const STAGED = JSON.stringify(manifest(asset('a.webp'), asset('mine.webp')));
  const HEAD = JSON.stringify(manifest(asset('a.webp'), asset('theirs.webp')));

  // The rebased change diffs against the branch, so the drift check no longer
  // flags the manifest merely because someone else uploaded first.
  it('rebases the manifest change onto the branch file', () => {
    const [rebased] = rebaseManifestChange([manifestChange(STALE, STAGED)], HEAD);

    expect(rebased.original).toBe(HEAD);
    expect(names(JSON.parse(rebased.updated))).toEqual(['a.webp', 'theirs.webp', 'mine.webp']);
  });

  // A branch with no manifest yet starts from an empty library.
  it('starts from an empty library when the branch has no manifest', () => {
    const [rebased] = rebaseManifestChange([manifestChange(STALE, STAGED)], null);

    expect(rebased.original).toBe('');
    expect(names(JSON.parse(rebased.updated))).toEqual(['mine.webp']);
  });

  // Other staged changes pass through untouched.
  it('leaves non-manifest changes alone', () => {
    const image = imageChange('mine.webp');
    const out = rebaseManifestChange([image, manifestChange(STALE, STAGED)], HEAD);

    expect(out[0]).toBe(image);
  });

  // Nothing staged against the manifest means nothing to rebase.
  it('is the identity when no manifest change is staged', () => {
    const changes = [imageChange('mine.webp')];

    expect(rebaseManifestChange(changes, HEAD)).toEqual(changes);
  });
});

describe('commitAll manifest merge', () => {
  // End to end through the publish path: the blob written for media.json must
  // be the merge, not the stale snapshot the session staged.
  it('writes the merged manifest, keeping records published since staging', async () => {
    const STALE = JSON.stringify(manifest(asset('team/peter-boyce.png')));
    const STAGED = JSON.stringify(manifest(asset('team/peter-boyce.png'), asset('nyc-skyline.webp')));
    const HEAD = JSON.stringify(manifest(asset('team/peter-boyce.png'), asset('cities/london.webp')));
    const blobs: string[] = [];

    const fetchFn = ((url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';
      const respond = (body: unknown, status = 200) =>
        Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body), text: () => Promise.resolve('') });
      if (method === 'GET' && url.includes('/contents/src/data/media.json')) {
        return respond({ content: btoa(HEAD), encoding: 'base64' });
      }
      if (method === 'GET' && url.includes('/contents/')) return respond({}, 404);
      if (method === 'GET' && url.includes('git/ref/')) return respond({ object: { sha: 'base' } });
      if (method === 'GET' && url.includes('git/commits/')) return respond({ tree: { sha: 'tree' } });
      if (method === 'POST' && url.endsWith('git/blobs')) {
        blobs.push(JSON.parse(init!.body!).content);
        return respond({ sha: `blob${blobs.length}` });
      }
      return respond({ sha: 'new' });
    }) as Parameters<typeof commitAll>[4];

    await commitAll(
      [
        { path: 'src/data/media.json', content: STAGED },
        { path: 'public/images/nyc-skyline.webp', content: 'UklGRg==', encoding: 'base64' },
      ],
      'Upload via CodeYam CMS',
      { owner: 'nseldeib', repo: 'harvardintech', branch: 'main' },
      'token',
      fetchFn,
      [],
      { changes: [manifestChange(STALE, STAGED), imageChange('nyc-skyline.webp')], overwriteDrift: true },
    );

    expect(names(JSON.parse(blobs[0]))).toEqual(['team/peter-boyce.png', 'cities/london.webp', 'nyc-skyline.webp']);
  });
});
