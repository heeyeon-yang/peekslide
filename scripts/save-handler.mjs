import fs from "node:fs";
import path from "node:path";
import { ROOT, sync } from "./sync.mjs";

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

export function saveHandler(req, res) {
  if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
  let raw = "";
  req.on("data", c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on("end", () => {
    try {
      const { deck, page, steps } = JSON.parse(raw);
      if (typeof deck !== "string" || !/^[A-Za-z0-9_-]+$/.test(deck)) throw new Error("deck");
      const f = path.join(ROOT, "projects", deck, "pages.json");
      const meta = JSON.parse(fs.readFileSync(f, "utf8"));
      const n = Number(page);
      if (!Number.isInteger(n) || n < 1 || n > meta.total) throw new Error("page");
      if (!Array.isArray(steps) || !steps.every(okStep)) throw new Error("steps");
      meta.pages = meta.pages || {};
      meta.pages[n] = { ...(meta.pages[n] || {}), steps };
      fs.writeFileSync(f, JSON.stringify(meta, null, 2) + "\n");
      sync();
      res.statusCode = 200; res.end("ok");
    } catch (e) {
      res.statusCode = 400; res.end(String(e.message));
    }
  });
}
