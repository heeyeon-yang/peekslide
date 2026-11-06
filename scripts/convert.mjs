import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { sync } from "./sync.mjs";

const name = process.argv[2];
if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) {
  console.error("usage: npm run convert -- <name> [pdf]   (name: letters, digits, _ and -)");
  process.exit(1);
}
const dir = path.join("projects", name);
const pdfPath = process.argv[3] || path.join(dir, "source.pdf");
const outDir = path.join(dir, "slides");
const jsonPath = path.join(dir, "pages.json");
const SCALE = 1.5;

if (!fs.existsSync(pdfPath)) {
  console.error(`pdf not found: ${pdfPath}`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const data = new Uint8Array(fs.readFileSync(pdfPath));
const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n);
  const vp = page.getViewport({ scale: SCALE });
  const canvas = createCanvas(vp.width, vp.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  fs.writeFileSync(path.join(outDir, `${n}.png`), canvas.toBuffer("image/png"));
  console.log(`page ${n}/${pdf.numPages}`);
}
for (const f of fs.readdirSync(outDir)) {
  const m = /^(\d+)\.png$/.exec(f);
  if (m && +m[1] > pdf.numPages) fs.unlinkSync(path.join(outDir, f));
}

async function pageOf(dest) {
  const d = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
  if (!d) return null;
  return (await pdf.getPageIndex(d[0])) + 1;
}

const meta = fs.existsSync(jsonPath)
  ? JSON.parse(fs.readFileSync(jsonPath, "utf8"))
  : { title: name, desc: "", accent: "", publish: false, total: 0, parts: [], pages: {} };

if (!meta.parts || !meta.parts.length) {
  const outline = (await pdf.getOutline()) || [];
  const tops = [];
  for (const o of outline) {
    const p = await pageOf(o.dest);
    if (p) tops.push({ title: o.title.trim(), start: p });
  }
  meta.parts = tops.length
    ? tops.map((t, i) => ({
        id: String(i + 1),
        title: t.title,
        desc: "",
        range: [t.start, (tops[i + 1]?.start ?? pdf.numPages + 1) - 1],
      }))
    : [{ id: "1", title: "1. 전체", desc: "", range: [1, pdf.numPages] }];
  console.log(`parts initialised: ${meta.parts.length}`);
} else {
  console.log("parts kept");
}

meta.total = pdf.numPages;
fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + "\n");
console.log(`done: ${name}, ${pdf.numPages} pages`);
sync();
