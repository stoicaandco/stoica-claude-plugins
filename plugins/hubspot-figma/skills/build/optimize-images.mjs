// Resizes every .jpg/.jpeg/.png in the given folder to a 1600px max width and
// recompresses at quality 80, in place.
//
// NB: HubSpot's `hs` CLI (local-dev-lib file type allowlist) rejects .webp
// uploads to Design Manager outright ("Invalid file type requested") as of
// CLI 8.14.0 -- confirmed via a failed `hs cms fetch` on a .webp file.
// JPEG output is required for the bundled theme assets, not a choice.
// (HubSpot's CDN still serves WebP/AVIF automatically to supporting
// browsers for any image delivered through hubfs -- this script's job is
// just to not ship an oversized, under-compressed source file.)
// Run: npm run optimize-images (needs 'sharp': npm install)

import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const IMAGES_DIR = path.resolve(process.argv[2] || 'theme/images');
const MAX_WIDTH = 1600;
const QUALITY = 80;
const RASTER_EXT = /\.(jpe?g|png)$/i;

const files = await readdir(IMAGES_DIR);
const targets = files.filter((f) => RASTER_EXT.test(f));

if (targets.length === 0) {
  console.log('No raster images to optimize.');
  process.exit(0);
}

for (const file of targets) {
  const src = path.join(IMAGES_DIR, file);
  const tmp = src + '.tmp';
  const beforeStat = await stat(src);

  const info = await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(tmp);

  const { rename } = await import('node:fs/promises');
  await rename(tmp, src);

  const beforeKb = Math.round(beforeStat.size / 1024);
  const afterKb = Math.round(info.size / 1024);
  console.log(`${file}: ${beforeKb}KB -> ${afterKb}KB`);
}

console.log(`\nOptimized ${targets.length} image(s) in place.`);
