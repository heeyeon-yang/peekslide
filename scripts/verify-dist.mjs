// 배포 전 게이트: dist에 비공개/편집 관련 내용이 섞여 있으면 exit 1.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const dist = path.join(ROOT, "dist");
const errors = [];
const fail = m => errors.push(m);
const ALLOW = new Set(["admin/edit.js", "admin/edit.css"]); // 관리자 편집기 (로그인 후에만 로드)

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
if (!fs.existsSync(dist)) { console.error("verify: dist 없음 (build 먼저)"); process.exit(1); }
const files = walk(dist), rel = f => path.relative(dist, f).split(path.sep).join("/");

// 1) 비공개 프로젝트 목록 (projects/*/pages.json 에서 publish !== true)
const priv = [];
const pj = path.join(ROOT, "projects");
if (fs.existsSync(pj)) for (const n of fs.readdirSync(pj)) {
  const f = path.join(pj, n, "pages.json");
  if (!fs.existsSync(f)) continue;
  try { if (JSON.parse(fs.readFileSync(f, "utf8")).publish !== true) priv.push(n); }
  catch (e) { fail(`pages.json 파싱 실패: projects/${n}`); }
}

// 2) 경로 검사: 편집 코드, PDF 원본, 비공개 프로젝트 폴더
for (const f of files.map(rel)) {
  if (ALLOW.has(f)) continue;
  if (/^dev\//.test(f) || /(^|\/)edit\.(js|css)$/.test(f)) fail(`편집 파일 포함: ${f}`);
  if (/\.pdf$/i.test(f)) fail(`PDF 포함: ${f}`);
  for (const n of priv) if (f.startsWith(`projects/${n}/`)) fail(`비공개 프로젝트 파일 포함: ${f}`);
}

// 3) 내용 검사: 편집 API/브리지 흔적
const text = files.filter(f => /\.(js|css|html)$/.test(f));
for (const f of text) {
  if (ALLOW.has(rel(f))) continue;
  const s = fs.readFileSync(f, "utf8");
  for (const tok of ["__save", "peekslide-editor", "dev/edit", "epRender", "edSave"])
    if (s.includes(tok)) fail(`'${tok}' 발견: ${rel(f)}`);
}

// 4) decks.js: publish 덱만 있어야 함
const dj = path.join(dist, "data", "decks.js");
if (!fs.existsSync(dj)) fail("data/decks.js 없음");
else {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(dj, "utf8"), ctx);
  for (const [id, d] of Object.entries(ctx.window.DECKS || {})) {
    if (!d.publish) fail(`decks.js에 비공개 덱: ${id}`);
    if (priv.includes(id)) fail(`decks.js에 비공개 프로젝트: ${id}`);
  }
}

if (errors.length) { console.error("verify FAILED\n- " + errors.join("\n- ")); process.exit(1); }
console.log(`verify OK (${files.length} files, private skipped: ${priv.join(", ") || "-"})`);
