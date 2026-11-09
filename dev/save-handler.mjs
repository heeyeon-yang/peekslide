import fs from "node:fs";
import path from "node:path";
import { ROOT, sync } from "../scripts/sync.mjs";

const num = Number.isFinite;
const okBox = b => Array.isArray(b) && b.length === 4 && b.every(num);
const okIds = a => Array.isArray(a) && a.every(x => typeof x === "string");
const FLOW_NUM = ["w", "dash", "gap", "curve", "dotR", "dots", "dur"];
const FLOW_BOOL = ["line", "dot"];
const STEP_NUM = ["dim", "round", "ringW"];
const okFlow = f =>
  f && typeof f === "object" && Array.isArray(f.points) && f.points.length > 1 &&
  f.points.every(p => Array.isArray(p) && p.length === 2 && p.every(num)) &&
  Object.entries(f).every(([k, v]) => k === "points" || (FLOW_NUM.includes(k) && num(v)) || (FLOW_BOOL.includes(k) && typeof v === "boolean") || (k === "color" && typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)));
const KEYS = ["box", "flow", "show", "hide", "ring", ...STEP_NUM];
const okStep = s =>
  s && typeof s === "object" && !Array.isArray(s) &&
  Object.keys(s).every(k => KEYS.includes(k)) &&
  (s.box === undefined || (Array.isArray(s.box) && s.box.every(okBox))) &&
  (s.flow === undefined || (Array.isArray(s.flow) && s.flow.every(okFlow))) &&
  (s.show === undefined || okIds(s.show)) &&
  (s.hide === undefined || okIds(s.hide)) &&
  (s.ring === undefined || typeof s.ring === "boolean") &&
  STEP_NUM.every(k => s[k] === undefined || num(s[k]));

// 파트(섹션) 검증: 겹침 없음, 1~전체 페이지 안, 이름에 < > 금지 (Lambda와 같은 규칙)
const okParts = (parts, total) => {
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 30) return false;
  const good = parts.every(p => p && typeof p === "object" &&
    typeof p.id === "string" && /^[A-Za-z0-9_-]{1,20}$/.test(p.id) &&
    typeof p.title === "string" && p.title.length >= 1 && p.title.length <= 60 && !/[<>]/.test(p.title) &&
    (p.desc === undefined || (typeof p.desc === "string" && p.desc.length <= 120 && !/[<>]/.test(p.desc))) &&
    Array.isArray(p.range) && p.range.length === 2 && p.range.every(Number.isInteger) &&
    p.range[0] >= 1 && p.range[0] <= p.range[1] && p.range[1] <= total);
  if (!good || new Set(parts.map(p => p.id)).size !== parts.length) return false;
  const s = [...parts].sort((a, b) => a.range[0] - b.range[0]);
  return s.every((p, i) => !i || p.range[0] > s[i - 1].range[1]);
};
const cleanParts = parts => [...parts].sort((a, b) => a.range[0] - b.range[0])
  .map(({ id, title, desc, range }) => ({ id, title, desc: desc || "", range }));

export function saveHandler(req, res) {
  if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
  let raw = "";
  req.on("data", c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on("end", () => {
    try {
      const { deck, page, steps, parts } = JSON.parse(raw);
      if (typeof deck !== "string" || !/^[A-Za-z0-9_-]+$/.test(deck)) throw new Error("deck");
      const f = path.join(ROOT, "projects", deck, "pages.json");
      const meta = JSON.parse(fs.readFileSync(f, "utf8"));
      if (parts !== undefined) {
        if (!okParts(parts, meta.total)) throw new Error("parts");
        meta.parts = cleanParts(parts);
      } else {
        const n = Number(page);
        if (!Number.isInteger(n) || n < 1 || n > meta.total) throw new Error("page");
        if (!Array.isArray(steps) || !steps.every(okStep)) throw new Error("steps");
        meta.pages = meta.pages || {};
        meta.pages[n] = { ...(meta.pages[n] || {}), steps };
      }
      fs.writeFileSync(f, JSON.stringify(meta, null, 2) + "\n");
      sync();
      res.statusCode = 200; res.end("ok");
    } catch (e) {
      res.statusCode = 400; res.end(String(e.message));
    }
  });
}
