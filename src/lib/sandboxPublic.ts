// The CMS media library lists the images under `<publicRoot>/images`, and during
// a codeyam session the editor points that root (`CODEYAM_PUBLIC_ROOT`) at the
// content sandbox. Nothing ever filled it, so /admin/media showed "No images yet"
// in the preview and in every scenario. The sandbox gets a copy of the committed
// images whenever it is (re)initialised: at dev-server boot and before each seed.
import * as fs from 'node:fs';
import * as path from 'node:path';

/** The editor's `CODEYAM_PUBLIC_ROOT`, relative to the project root. */
export const SANDBOX_PUBLIC_REL = path.join('.codeyam', 'tmp', 'content-sandbox', 'public');

/**
 * Make `dest` an exact copy of `src`: whatever was in `dest` is removed first,
 * and a missing `src` leaves `dest` as an empty directory. Every sandbox
 * (re)initialisation is built from this.
 */
export function replaceWithCopy(src: string, dest: string): void {
  fs.rmSync(dest, { recursive: true, force: true });
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
  else fs.mkdirSync(dest, { recursive: true });
}

/**
 * Replace the sandbox's `images/` with a fresh copy of the committed
 * `public/images`, so an upload staged in one scenario never leaks into the
 * next. Returns the destination directory.
 */
export function mirrorPublicImages(projectRoot: string): string {
  const src = path.join(projectRoot, 'public', 'images');
  const dest = path.join(projectRoot, SANDBOX_PUBLIC_REL, 'images');
  replaceWithCopy(src, dest);
  return dest;
}
