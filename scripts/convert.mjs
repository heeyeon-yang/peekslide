import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = process.argv[2] || "projects/test/source.pdf";
const outDir = "assets/slides";
const SCALE = 1.5;

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

async function pageOf(dest) {
  const d = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
  if (!d) return null;
  return (await pdf.getPageIndex(d[0])) + 1;
}

const outline = (await pdf.getOutline()) || [];
const tops = [];
for (const o of outline) {
  const p = await pageOf(o.dest);
  if (p) tops.push({ title: o.title.trim(), start: p });
}

let parts = tops.map((t, i) => ({
  id: String(i + 1),
  title: t.title,
  desc: "",
  range: [t.start, (tops[i + 1]?.start ?? pdf.numPages + 1) - 1],
}));
if (!parts.length) {
  console.log("no bookmarks found, using a single part");
  parts = [{ id: "1", title: "All", desc: "", range: [1, pdf.numPages] }];
}

const file = "data/slides.js";
const win = {};
new Function("window", fs.readFileSync(file, "utf8"))(win);
const deck = win.DECK;
deck.total = pdf.numPages;
deck.parts = parts;
fs.writeFileSync(file, "window.DECK = " + JSON.stringify(deck, null, 2) + ";\n");
console.log(`done: ${pdf.numPages} pages, ${parts.length} parts`);