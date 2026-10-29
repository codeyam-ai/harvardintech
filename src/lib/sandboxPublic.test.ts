import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { SANDBOX_PUBLIC_REL, mirrorPublicImages, replaceWithCopy } from './sandboxPublic';

const tmpDirs: string[] = [];
function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-public-'));
  tmpDirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function write(file: string, body = 'x'): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

describe('replaceWithCopy', () => {
  // The sandbox must start as the source tree, nested folders included.
  it('copies a nested tree into a missing destination', () => {
    const root = tmpDir();
    write(path.join(root, 'src', 'a.md'), 'A');
    write(path.join(root, 'src', 'sub', 'b.md'), 'B');
    replaceWithCopy(path.join(root, 'src'), path.join(root, 'dest'));
    expect(fs.readFileSync(path.join(root, 'dest', 'a.md'), 'utf8')).toBe('A');
    expect(fs.readFileSync(path.join(root, 'dest', 'sub', 'b.md'), 'utf8')).toBe('B');
  });

  // A file one scenario seeded must not leak into the next one.
  it('removes files that only the old destination had', () => {
    const root = tmpDir();
    write(path.join(root, 'src', 'a.md'));
    write(path.join(root, 'dest', 'stale.md'));
    replaceWithCopy(path.join(root, 'src'), path.join(root, 'dest'));
    expect(fs.readdirSync(path.join(root, 'dest'))).toEqual(['a.md']);
  });

  // A collection that does not exist in production still needs a directory to seed into.
  it('leaves an empty destination when the source is missing', () => {
    const root = tmpDir();
    write(path.join(root, 'dest', 'stale.md'));
    replaceWithCopy(path.join(root, 'nope'), path.join(root, 'dest'));
    expect(fs.readdirSync(path.join(root, 'dest'))).toEqual([]);
  });
});

describe('mirrorPublicImages', () => {
  // The media library read an empty sandbox and showed "No images yet".
  it('copies the committed images into the sandbox public root', () => {
    const root = tmpDir();
    write(path.join(root, 'public', 'images', 'hero.jpg'), 'img');
    const dest = mirrorPublicImages(root);
    expect(dest).toBe(path.join(root, SANDBOX_PUBLIC_REL, 'images'));
    expect(fs.readFileSync(path.join(dest, 'hero.jpg'), 'utf8')).toBe('img');
  });

  // An upload staged by one scenario must be gone before the next seed.
  it('drops images that are not committed', () => {
    const root = tmpDir();
    write(path.join(root, 'public', 'images', 'hero.jpg'));
    write(path.join(root, SANDBOX_PUBLIC_REL, 'images', 'upload.png'));
    expect(fs.readdirSync(mirrorPublicImages(root))).toEqual(['hero.jpg']);
  });

  // A project with no public/images must still boot with an empty library.
  it('creates an empty images folder when the project has none', () => {
    const root = tmpDir();
    const dest = mirrorPublicImages(root);
    expect(fs.readdirSync(dest)).toEqual([]);
  });
});
