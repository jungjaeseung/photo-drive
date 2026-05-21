/**
 * PWA icons from public/icons/image.png (1024×1024 source).
 * Run: pnpm --filter @photo-drive/web icons:generate
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons");
const sourcePath = join(outDir, "image.png");

if (!existsSync(sourcePath)) {
  console.error("Missing source:", sourcePath);
  process.exit(1);
}

const source = sharp(sourcePath).rotate();

const sizes = {
  "icon-1024.png": 1024,
  "icon-512.png": 512,
  "icon-192.png": 192,
  "apple-touch-icon.png": 180,
  "favicon-32.png": 32,
};

for (const [name, size] of Object.entries(sizes)) {
  await source
    .clone()
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toFile(join(outDir, name));
}

console.log("Icons generated from image.png:", Object.keys(sizes).join(", "));
