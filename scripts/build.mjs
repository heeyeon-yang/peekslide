import fs from "node:fs";
import path from "node:path";
import { ROOT, sync, readDecks, writeDecks } from "./sync.mjs";

const dist = path.join(ROOT, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

sync();
const pub = Object.fromEntries(Object.entries(readDecks()).filter(([, d]) => d.publish));
if (!Object.keys(pub).length) console.warn("warn: no public decks");

const cp = src => {
  const s = path.join(ROOT, src);
  if (fs.existsSync(s)) fs.cpSync(s, path.join(dist, src), { recursive: true });
};
cp("index.html");
cp("css");
cp("js");
// 관리자 편집기: 로그인 후에만 불러온다. dev/ 의 나머지는 복사하지 않는다.
fs.mkdirSync(path.join(dist, "admin"), { recursive: true });
for (const f of ["edit.js", "edit.css"]) fs.copyFileSync(path.join(ROOT, "dev", f), path.join(dist, "admin", f));
cp("assets/fonts");
for (const n of Object.keys(pub)) {
  cp(`projects/${n}/slides`);
  cp(`projects/${n}/video`);
  cp(`projects/${n}/layers`);
}
writeDecks(path.join(dist, "data", "decks.js"), pub);
console.log(`build: ${Object.keys(pub).join(", ") || "(none)"} -> dist`);
