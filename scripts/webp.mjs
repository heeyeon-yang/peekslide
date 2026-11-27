import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [name, ll = ""] = process.argv.slice(2);
if (!name) { console.error("usage: npm run webp -- <name> [무손실 페이지 예: 4,5,6]"); process.exit(1); }
const L = new Set(ll.split(",").filter(Boolean).map(Number));
const d = path.join("projects", name, "slides");
for (const f of fs.readdirSync(d)) {
  const m = /^(\d+)\.png$/.exec(f);
  if (!m) continue;
  const n = +m[1], src = path.join(d, f);
  await sharp(src).webp(L.has(n) ? { lossless: true } : { quality: 85 }).toFile(path.join(d, `${n}.webp`));
  fs.unlinkSync(src);
  console.log(`${name}/${n}.webp${L.has(n) ? " (lossless)" : ""}`);
}
