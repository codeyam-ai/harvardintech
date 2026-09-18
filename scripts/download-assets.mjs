import fs from 'fs';
import { execSync } from 'child_process';

const extract = JSON.parse(fs.readFileSync('/workspace/.codeyam/tmp/extract.json', 'utf8'));

// Gallery: bump to retina + decent quality
const gallery = extract.gallery.map((u) =>
  u.replace('h_200,w_200', 'h_400,w_400').replace(',q_1/', ',q_auto/').replace('q_80', 'q_auto'),
);

const dir = '/workspace/public/images/gallery';
// wipe old 12
for (const f of fs.readdirSync(dir)) fs.rmSync(`${dir}/${f}`);

let i = 0;
for (const url of gallery) {
  i++;
  const name = `event-${String(i).padStart(2, '0')}.jpg`;
  execSync(`curl -sL --max-time 30 -o "${dir}/${name}" "${url}"`);
}
console.log('gallery downloaded:', i);

// WhatsApp banner (bigger)
execSync(`curl -sL --max-time 30 -o "/workspace/public/images/sections/whatsapp-banner.jpg" "https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_9000,w_1200,f_auto,q_auto/13213024/20390"`);
console.log('whatsapp banner downloaded');

// The support icons that used to be fetched here (trophy, chat, briefcase,
// quote, star — flat-circle PNGs from the old Strikingly site) are gone. No page
// ever rendered them, and re-downloading them on every run put five unused
// third-party images of unknown licence back into the repo. Support sections use
// inline SVG now; if icons are ever needed again they belong in brandIcons.ts.
