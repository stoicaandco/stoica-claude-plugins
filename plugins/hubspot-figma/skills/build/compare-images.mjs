#!/usr/bin/env node
// Pixel comparison of a Figma screenshot against a live screenshot (needs `sharp`, installed in each project).
//   node tools/compare-images.mjs <figma.png> <live.png> [--out diff.png] [--tol 24] [--grid 8]
// Both images are scaled to the width of the first one and compared from the top. Prints a short report and a JSON line:
//   mismatchPct   share of pixels whose colour differs by more than --tol (0-255 per channel)
//   heightDelta   live height minus figma height after scaling (layout grew/shrank)
//   hotspots      the grid cells with the most mismatch (x, y, w, h in figma pixels) = where to look first
// Screenshot colour profiles shift saturated colours slightly: treat <2% as a match, and confirm colours with computed styles.
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); if (i < 0) return d; const [, v] = args.splice(i, 2); return v; };
const out = opt('out', null);
const tol = Number(opt('tol', 24));
const grid = Number(opt('grid', 8));
const [fa, fb] = args;
if (!fa || !fb) { console.error('usage: compare-images.mjs <figma.png> <live.png> [--out diff.png] [--tol 24] [--grid 8]'); process.exit(1); }

const a = await sharp(fa).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = a.info.width;
const bRaw = await sharp(fb).resize({ width: W }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const H = Math.min(a.info.height, bRaw.info.height);
const cw = Math.ceil(W / grid), ch = Math.ceil(H / grid);
const cells = new Array(grid * grid).fill(0);
const diff = Buffer.from(bRaw.data); // overlay on the live screenshot
let bad = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (Math.max(Math.abs(a.data[i] - bRaw.data[i]), Math.abs(a.data[i + 1] - bRaw.data[i + 1]), Math.abs(a.data[i + 2] - bRaw.data[i + 2])) > tol) {
      bad++;
      cells[Math.floor(y / ch) * grid + Math.floor(x / cw)]++;
      diff[i] = 255; diff[i + 1] = 0; diff[i + 2] = 60;
    }
  }
}
const hotspots = cells.map((n, k) => ({ x: (k % grid) * cw, y: Math.floor(k / grid) * ch, w: cw, h: ch, pct: +((100 * n) / (cw * ch)).toFixed(1) }))
  .filter((c) => c.pct > 1).sort((p, q) => q.pct - p.pct).slice(0, 5);
const result = { mismatchPct: +((100 * bad) / (W * H)).toFixed(2), compared: `${W}x${H}`, heightDelta: bRaw.info.height - a.info.height, hotspots, out };
if (out) await sharp(diff, { raw: { width: W, height: bRaw.info.height, channels: 4 } }).png().toFile(out);
console.log(`${result.mismatchPct}% of pixels differ (tol ${tol}); height delta ${result.heightDelta}px${hotspots.length ? `; worst areas: ${hotspots.map((h) => `(${h.x},${h.y}) ${h.pct}%`).join(' ')}` : ''}`);
console.log(JSON.stringify(result));
