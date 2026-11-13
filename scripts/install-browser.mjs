// postinstall: download the Chromium that local scenario capture and the
// screenshot scripts drive — unless PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD is set.
//
// Playwright's own skip variable only stops the download its package does on
// install; an explicit `playwright install chromium` ignores it. The deploy
// workflow already set the variable and still downloaded Chromium on every
// build, which nothing there uses. On 2026-11-13 that download failed outright
// ("Playwright does not support chromium on ubuntu26.04-x64") and took every
// deploy down with it. Honouring the variable here is what actually skips it.
import { spawnSync } from 'node:child_process';

const skip = process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD;
if (skip && skip !== '0' && skip.toLowerCase() !== 'false') {
  console.log('install-browser: PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD is set; skipping Chromium download.');
  process.exit(0);
}

const result = spawnSync('npx', ['playwright', 'install', 'chromium'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
