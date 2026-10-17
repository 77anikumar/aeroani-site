// One-time copy of every photo from the Squarespace CDN into images/<location>/,
// then flips "selfHosted" to true in data/photos.json so the site stops depending on Squarespace.
// Runs in GitHub Actions ("Copy photos into repo" workflow); also works locally with Node 18+.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = join(ROOT, "data/photos.json");
const data = JSON.parse(readFileSync(dataFile, "utf8"));

const SIZES = [
  ["", "2500w"],       // full size for the lightbox
  ["-thumb", "750w"],  // grid thumbnails
];

let downloaded = 0;
let failed = [];

for (const loc of data.locations) {
  const dir = join(ROOT, "images", loc.slug);
  mkdirSync(dir, { recursive: true });
  for (const path of loc.photos) {
    const base = path.split("/").pop().replace(/\.jpe?g$/i, "");
    for (const [suffix, width] of SIZES) {
      const out = join(dir, `${base}${suffix}.jpg`);
      if (existsSync(out)) continue;
      const url = `${data.cdnPrefix}${path}?format=${width}`;
      try {
        const res = await fetch(url);
        const type = res.headers.get("content-type") || "";
        if (!res.ok || !type.startsWith("image/")) throw new Error(`${res.status} ${type}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 10_000) throw new Error(`suspiciously small (${buf.length} bytes)`);
        writeFileSync(out, buf);
        downloaded++;
        console.log(`✓ ${loc.slug}/${base}${suffix}.jpg  ${(buf.length / 1024).toFixed(0)} KB`);
      } catch (err) {
        failed.push(`${url} — ${err.message}`);
        console.error(`✗ ${url} — ${err.message}`);
      }
    }
  }
}

if (failed.length) {
  console.error(`\n${failed.length} downloads failed; leaving selfHosted=false so the site keeps using the CDN.`);
  process.exit(1);
}

data.selfHosted = true;
writeFileSync(dataFile, JSON.stringify(data, null, 2) + "\n");
console.log(`\nDone: ${downloaded} files downloaded. selfHosted is now true.`);
