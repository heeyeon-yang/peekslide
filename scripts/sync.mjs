import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJ = path.join(ROOT, "projects");
const OUT = path.join(ROOT, "data", "decks.js");

function lockOf(name) {
  const dir = path.join(PROJ, name);
  const lf = path.join(dir, "lock.json");
  const pf = path.join(dir, "password.txt");
  let lock = fs.existsSync(lf) ? JSON.parse(fs.readFileSync(lf, "utf8")) : null;
  if (fs.existsSync(pf)) {
    const pw = fs.readFileSync(pf, "utf8").trim();
    if (pw) {
      const salt = lock?.salt || crypto.randomBytes(8).toString("hex");
      const hash = crypto.createHash("sha256").update(salt + pw).digest("hex");
      if (!lock || lock.hash !== hash) {
        lock = { salt, hash };
        fs.writeFileSync(lf, JSON.stringify(lock, null, 2) + "\n");
      }
    }
  }
  return lock;
}

export function readDecks() {
  const decks = {};
  if (!fs.existsSync(PROJ)) return decks;
  for (const e of fs.readdirSync(PROJ, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const f = path.join(PROJ, e.name, "pages.json");
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    delete j.password;
    const d = {
      title: e.name, desc: "", accent: "", publish: false, total: 0, parts: [], groups: [], pages: {},
      ...j,
      id: e.name,
      base: `projects/${e.name}/`,
      img: `projects/${e.name}/slides/{n}.png`,
      lock: lockOf(e.name),
    };
    if (!d.total) console.warn(`warn: ${e.name} has no total, run convert first`);
    for (const p of d.parts) {
      if (p.range[1] > d.total) console.warn(`warn: ${e.name} part ${p.id} range exceeds total ${d.total}`);
    }
    const seen = new Set();
    for (const g of d.groups) {
      for (const p of g) {
        if (p < 1 || p > d.total || seen.has(p)) console.warn(`warn: ${e.name} groups has invalid or duplicate page ${p}`);
        seen.add(p);
      }
    }
    decks[e.name] = d;
  }
  return decks;
}

export function writeDecks(file, decks) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "window.DECKS = " + JSON.stringify(decks, null, 2) + ";\n");
}

export function sync() {
  const decks = readDecks();
  const names = Object.keys(decks);
  for (const n of names) {
    const want = "source.pdf\npassword.txt\n" + (decks[n].publish ? "" : "slides/\nvideo/\nlayers/\n");
    const f = path.join(PROJ, n, ".gitignore");
    if (!fs.existsSync(f) || fs.readFileSync(f, "utf8") !== want) fs.writeFileSync(f, want);
  }
  writeDecks(OUT, decks);
  const pub = names.filter(n => decks[n].publish).length;
  const locked = names.filter(n => decks[n].lock).length;
  console.log(`sync: ${names.length} projects (${pub} public, ${locked} locked)`);
}

const self = fileURLToPath(import.meta.url).toLowerCase();
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === self) sync();
