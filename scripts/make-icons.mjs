/**
 * Renders scripts/icon-master.mjs → public PNGs:
 *   icon-512.png, icon-192.png (Android / manifest)
 *   apple-touch-icon.png 180×180 (iOS home screen)
 * Re-run anytime:  node scripts/make-icons.mjs
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import iconMaster from "./icon-master.mjs";

const SVG = iconMaster;

// iOS flattens alpha onto black — bake the kraft background in (it's already there).
const sizes = [
  ["icon-512.png", 512],
  ["icon-192.png", 192],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of sizes) {
  const buf = await sharp(Buffer.from(SVG), { density: 96 * (size / 512) * 4 })
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(new URL(`../public/${name}`, import.meta.url), buf);
  console.log(`✓ public/${name} (${size}×${size}, ${buf.length} bytes)`);
}
