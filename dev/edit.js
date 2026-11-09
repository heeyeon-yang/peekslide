// dev 전용 편집기. Vite serve 플러그인이 주입하며 build.mjs는 dev/를 dist로 복사하지 않는다.
(() => {
  const PS = window.PS;
  if (!PS) return;
  const { $, body, root, toast, fx, spot, steps, curPage, pathD, EDEF } = PS;
  const DEV = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  let ed = null;
  const ep = document.createElement('aside');
  ep.id = 'ep';
  $('#vbody').appendChild(ep);
  const edPt = e => {
    const r = $('#edit').getBoundingClientRect(), k = 1920 / r.width;
    return [Math.max(0, Math.min(1920, Math.round((e.clientX - r.left) * k))), Math.max(0, Math.min(1080, Math.round((e.clientY - r.top) * k)))];
  };
  const edRect = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])];
  const clone = o => JSON.parse(JSON.stringify(o));
  const newStep = () => ({ box: [], flow: [], x: {} });
  const edLoad = pn => {
    const l = ((PS.D.pages[pn] || {}).steps || []).map(s => { const { box, flow, ...x } = clone(s); return { box: box || [], flow: flow || [], x }; });
    return l.length ? l : [newStep()];
  };
  const toStep = g => ({ ...(g.box.length ? { box: g.box } : {}), ...(g.flow.length ? { flow: g.flow } : {}), ...g.x });
  const edPrev = () => ed.g.map(toStep);
  const edSteps = () => edPrev().filter(s => Object.keys(s).length);
  const edText = () => '"steps": [\n' + edSteps().map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]';
  const copyText = async t => {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    const a = document.createElement('textarea');
    a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    a.remove(); return ok;
  };

  const cs = () => ed.g[ed.i];
  const selFlow = () => (ed.sel && ed.sel.t === 'flow' ? cs().flow[ed.sel.k] : null) || null;
  const accentHex = () => { const v = getComputedStyle(root).getPropertyValue('--accent').trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : '#ff3f8c'; };
  const snap = () => JSON.stringify({ g: ed.g, i: ed.i, sel: ed.sel });
  function mut(fn, key) {
    const now = Date.now();
    if (!(key && ed.co === key && now - ed.t0 < 700)) { ed.undo.push(snap()); if (ed.undo.length > 80) ed.undo.shift(); }
    ed.co = key || ''; ed.t0 = now;
    fn(); ed.dirty = true;
  }
  function edOverlay() {
    const o = $('#edit');
    if (!o || !ed) return;
    const g = cs(), f = selFlow(), hl = ed.hl;
    let svg = '<svg class="esvg" viewBox="0 0 1920 1080">';
    if (hl && hl.t === 'flow' && g.flow[hl.k]) svg += `<path class="hl" d="${pathD(g.flow[hl.k].points, g.flow[hl.k].r ?? EDEF.r)}"/>`;
    if (f && !ed.over) svg += f.points.map(([x, y]) => `<circle class="hd" cx="${x}" cy="${y}" r="10"/>`).join('');
    if (ed.pts.length) {
      const pp = ed.hover ? [...ed.pts, ed.hover] : ed.pts;
      svg += `<path class="draft" d="${pathD(pp, 0)}"/>` + ed.pts.map(([x, y]) => `<circle class="hd" cx="${x}" cy="${y}" r="8"/>`).join('');
    }
    svg += '</svg>';
    if (hl && hl.t === 'box' && g.box[hl.k]) { const [x, y, w, h] = g.box[hl.k]; svg += `<i class="hlb" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${g.x.round ?? EDEF.round}px"></i>`; }
    o.innerHTML = svg;
  }
  function epState() {
    const t = $('#epstate');
    if (!t || !ed) return;
    t.textContent = ed.dirty ? '저장 안 됨' : '저장됨';
    t.className = ed.dirty ? 'dirty' : '';
  }
  function epCode() {
    const c = $('#epcode');
    if (c && ed) c.textContent = edSteps().length ? edText() : '(단계 없음)';
    epState();
  }
  function epRender() {
    if (!ed) return;
    const g = cs(), f = selFlow(), n = ed.g.length, x = g.x;
    const sum = s => [s.box.length ? `박스 ${s.box.length}` : '', s.flow.length ? `선 ${s.flow.length}` : '', s.x.show || s.x.hide ? '부품' : ''].filter(Boolean).join(' · ') || '비어 있음';
    const fld = (sc, k, label, min, max, stp, v) => `<label class="fld"><span>${label}</span><output>${v}</output><input type="range" data-s="${sc}" data-k="${k}" min="${min}" max="${max}" step="${stp}" value="${v}"></label>`;
    const rows = [...g.box.map((_, k) => ['box', k, `박스 ${k + 1}`]), ...g.flow.map((_, k) => ['flow', k, `선 ${k + 1}`])];
    const item = ([t, k, label]) => `<div class="it${ed.sel && ed.sel.t === t && ed.sel.k === k ? ' on' : ''}" data-act="sel" data-t="${t}" data-k="${k}" data-hl="${t}:${k}"><span>${label}</span><button data-act="rm" data-t="${t}" data-k="${k}">삭제</button></div>`;
    const dash = f ? (f.dash ?? EDEF.dash) : 0;
    const settings = f
      ? `<section><h5>선 ${ed.sel.k + 1} 설정</h5>${fld('flow', 'w', '굵기', 1, 12, 1, f.w ?? EDEF.w)}` +
        `<div class="seg"><button data-act="solid" class="${dash === 0 ? 'on' : ''}">실선</button><button data-act="dashed" class="${dash > 0 ? 'on' : ''}">점선</button></div>` +
        `<div class="gap"></div>${fld('flow', 'r', '꺾이는 모서리 둥글기', 0, 200, 2, f.r ?? EDEF.r)}` +
        `<label class="colr"><span>색</span><input type="color" data-s="flow" data-k="color" value="${f.color || accentHex()}"><button data-act="nocolor" ${f.color ? '' : 'disabled'}>포인트 색 쓰기</button></label>` +
        `<label class="tg"><input type="checkbox" data-s="flow" data-k="dot"${f.dot ? ' checked' : ''}><span>움직이는 점 추가</span></label>` +
        (f.dot ? fld('flow', 'dotR', '원 크기', 2, 20, 1, f.dotR ?? EDEF.dotR) : '') +
        `<p class="hint">점을 드래그해 모양을 바꿀 수 있어요. 꺾이는 곳의 둥글기는 위 슬라이더로 조절합니다.</p></section>`
      : g.box.length ? `<section><h5>박스 설정</h5>${fld('step', 'round', '모서리 둥글기', 0, 80, 1, x.round ?? EDEF.round)}</section>` : '';
    const layers = (PS.D.pages[ed.pn] || {}).layers || [];
    const layerHtml2 = layers.length ? `<section><h5>부품 이미지 <small>이 단계에서</small></h5>${layers.map(L => { const v = x.show && x.show.includes(L.id) ? 's' : x.hide && x.hide.includes(L.id) ? 'h' : ''; return `<label class="ly"><span>${L.id}</span><select data-layer="${L.id}"><option value=""${v === '' ? ' selected' : ''}>변화 없음</option><option value="s"${v === 's' ? ' selected' : ''}>나타남</option><option value="h"${v === 'h' ? ' selected' : ''}>숨김</option></select></label>`; }).join('')}</section>` : '';
    ep.innerHTML =
      `<div class="ep-h"><b>편집</b><span class="pg">${ed.pn}페이지</span><button data-act="exit">닫기</button></div>` +
      `<section><h5>단계 <small>스페이스 한 번에 한 단계</small></h5><div class="stp">${ed.g.map((s, i) => `<button data-act="step" data-i="${i}" class="${i === ed.i ? 'on' : ''}" title="${sum(s)}">${i + 1}</button>`).join('')}<button data-act="new" title="새 단계">＋</button></div>` +
      `<div class="row"><button data-act="mv-"${ed.i ? '' : ' disabled'}>◀ 앞으로</button><button data-act="mv+"${ed.i < n - 1 ? '' : ' disabled'}>뒤로 ▶</button><button data-act="dup">복제</button><button data-act="del">삭제</button></div>` +
      `<p class="hint">${ed.i + 1}단계 · 한 단계에 박스와 선을 여러 개 함께 넣을 수 있어요.</p>` +
      `<div class="items">${rows.length ? rows.map(item).join('') : '<p class="hint">아래에서 박스나 선을 추가하세요.</p>'}</div></section>` +
      `<section><h5>추가</h5><div class="seg"><button data-act="tool-box" class="${ed.tool === 'box' ? 'on' : ''}">박스 그리기</button><button data-act="tool-line" class="${ed.tool === 'line' ? 'on' : ''}">선 그리기</button></div>` +
      `<p class="hint">${ed.tool === 'box' ? '슬라이드를 드래그하면 그 부분이 밝아집니다.' : '슬라이드를 클릭해 점을 찍고 “선 완료”를 누르세요. 더블클릭으로도 끝낼 수 있어요.'}</p>` +
      (ed.tool === 'line' ? `<div class="row"><button data-act="finish" class="primary"${ed.pts.length > 1 ? '' : ' disabled'}>선 완료</button><button data-act="cancel-line"${ed.pts.length ? '' : ' disabled'}>취소</button></div>` : '') + '</section>' +
      settings + layerHtml2 +
      `<section><details class="code"${ed.codeOpen ? ' open' : ''}><summary>코드 보기</summary><pre id="epcode"></pre><div class="row"><button data-act="copy">코드 복사</button></div></details>` +
      `<p class="hint">단축키: 스페이스 미리보기 · Enter 선 완료 · Z 되돌리기 · S 저장 · Esc 닫기</p></section>` +
      `<div class="foot"><span id="epstate"></span><button data-act="undo">되돌리기</button><button data-act="play">▶ 미리보기</button><button class="primary" data-act="save">저장</button></div>`;
    epCode();
  }
  function edApply(instant) {
    PS.D.pages[ed.pn] = { ...ed.orig, steps: edPrev() };
    PS.st = ed.i + 1; fx(!instant);
    epCode();
  }
  const edAll = () => { edOverlay(); epRender(); edApply(false); };
  function editOn() {
    if (!(DEV || PS.admin?.token()) || !PS.D || body.classList.contains('present') || !$('#edit')) return;
    const pn = curPage();
    ed = { deck: PS.D, pn, orig: clone(PS.D.pages[pn] || {}), g: edLoad(pn), i: 0, sel: null, tool: 'box', pts: [], hover: null, hl: null, d: null, undo: [], co: '', t0: 0, dirty: false, codeOpen: false, pt: 0 };
    body.classList.add('edit');
    edAll();
  }
  function editOff() {
    if (!ed) return;
    clearTimeout(ed.pt);
    ed.deck.pages[ed.pn] = ed.orig;
    ed = null; body.classList.remove('edit', 'edit-v');
    const o = $('#edit'); if (o) o.innerHTML = '';
  }
  function edExit() {
    if (ed.dirty && !confirm('저장하지 않은 변경이 있습니다. 변경을 버리고 닫을까요?')) return;
    editOff(); PS.st = 0; fx(false);
  }
  async function edSave() {
    const steps2 = edSteps(), pn = ed.pn, d = ed.deck;
    try {
      const tk = PS.admin?.token();
      if (!DEV && !tk) { toast('로그인이 만료되었습니다. 관리자 버튼으로 다시 로그인하세요.'); return; }
      const r = await fetch(DEV ? '/__save' : PS.admin.api + '/save', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(DEV ? {} : { Authorization: 'Bearer ' + tk }) }, body: JSON.stringify({ deck: d.id, page: pn, steps: steps2 }) });
      if (r.status === 401) { toast('로그인이 만료되었습니다. 관리자 버튼으로 다시 로그인하세요.'); return; }
      if (!r.ok) throw new Error('save');
      if (!ed) return;
      ed.orig = { ...ed.orig, steps: steps2 }; ed.dirty = false;
      epCode(); toast(`저장했습니다: ${pn}페이지 ${steps2.length}단계`);
    } catch (e) { toast(DEV ? '저장은 npm run dev 에서만 됩니다. 코드 보기에서 복사해 붙여넣으세요' : '저장하지 못했습니다. 잠시 뒤 다시 시도하세요'); }
  }
  function edFinish() {
    if (ed.pts.length < 2) { ed.pts = []; ed.hover = null; return edAll(); }
    mut(() => { const g = cs(); g.flow.push({ points: ed.pts }); ed.sel = { t: 'flow', k: g.flow.length - 1 }; ed.pts = []; ed.hover = null; ed.tool = 'box'; });
    edAll();
  }
  function edPlay() {
    body.classList.add('edit-v');
    PS.st = ed.i; fx(false);
    clearTimeout(ed.pt);
    setTimeout(() => { if (ed) { PS.st = ed.i + 1; fx(true); } }, 250);
    ed.pt = setTimeout(() => body.classList.remove('edit-v'), 3800);
  }
  function edAct(a, el) {
    const g = cs(), d = el ? el.dataset : {};
    switch (a) {
      case 'exit': return edExit();
      case 'tool-box': ed.tool = 'box'; ed.pts = []; ed.hover = null; break;
      case 'tool-line': ed.tool = 'line'; ed.pts = []; ed.sel = null; break;
      case 'cancel-line': ed.pts = []; ed.hover = null; break;
      case 'finish': return edFinish();
      case 'step': ed.i = +d.i; ed.sel = null; ed.pts = []; break;
      case 'prev': ed.i = Math.max(0, ed.i - 1); ed.sel = null; ed.pts = []; break;
      case 'next': ed.i = Math.min(ed.g.length - 1, ed.i + 1); ed.sel = null; ed.pts = []; break;
      case 'new': mut(() => { ed.g.push(newStep()); ed.i = ed.g.length - 1; ed.sel = null; ed.pts = []; }); break;
      case 'dup': mut(() => { ed.g.splice(ed.i + 1, 0, clone(g)); ed.i++; ed.sel = null; }); break;
      case 'del': mut(() => { if (ed.g.length > 1) { ed.g.splice(ed.i, 1); ed.i = Math.min(ed.i, ed.g.length - 1); } else ed.g[0] = newStep(); ed.sel = null; }); break;
      case 'mv-': mut(() => { [ed.g[ed.i - 1], ed.g[ed.i]] = [ed.g[ed.i], ed.g[ed.i - 1]]; ed.i--; }); break;
      case 'mv+': mut(() => { [ed.g[ed.i + 1], ed.g[ed.i]] = [ed.g[ed.i], ed.g[ed.i + 1]]; ed.i++; }); break;
      case 'sel': ed.sel = { t: d.t, k: +d.k }; ed.tool = 'box'; ed.pts = []; break;
      case 'rm': mut(() => { (d.t === 'box' ? g.box : g.flow).splice(+d.k, 1); ed.sel = null; }); break;
      case 'solid': { const f = selFlow(); if (f) mut(() => { f.dash = 0; }); break; }
      case 'dashed': { const f = selFlow(); if (f) mut(() => { f.dash = 10; f.gap = 8; }); break; }
      case 'nocolor': { const f = selFlow(); if (f) mut(() => { delete f.color; }); break; }
      case 'undo': { const u = ed.undo.pop(); if (u) { const o = JSON.parse(u); ed.g = o.g; ed.i = Math.min(o.i, o.g.length - 1); ed.sel = o.sel; ed.pts = []; ed.dirty = true; } break; }
      case 'play': return edPlay();
      case 'copy': copyText(edText()).then(ok => toast(ok ? '복사했습니다' : '복사하지 못했습니다')); return;
      case 'save': edSave(); return;
    }
    edAll();
  }
  const EKEYS = { Escape: 'esc', e: 'exit', b: 'tool-box', l: 'tool-line', Enter: 'finish', '[': 'prev', ']': 'next', Delete: 'delsel', z: 'undo', c: 'copy', s: 'save', ' ': 'play' };
  function editKey(e) {
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && /^[zs]$/i.test(k)) { e.preventDefault(); edAct(/^z$/i.test(k) ? 'undo' : 'save'); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let a = EKEYS[k] || EKEYS[k.toLowerCase()];
    if (!a) return;
    e.preventDefault();
    if (a === 'esc') a = ed.pts.length ? 'cancel-line' : 'exit';
    if (a === 'delsel') { if (!ed.sel) return; return edAct('rm', { dataset: { t: ed.sel.t, k: ed.sel.k } }); }
    edAct(a);
  }
  const onPtr = e => {
    if (!ed) return;
    const o = $('#edit'), g = cs();
    if (e.type === 'pointerdown') {
      if (e.button !== 0 || !e.target.closest('#edit')) return;
      e.preventDefault();
      const p = edPt(e), f = selFlow();
      if (f && ed.tool !== 'line') {
        const j = f.points.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) <= 22);
        if (j >= 0) { ed.undo.push(snap()); ed.d = { kind: 'pt', j, f, moved: false }; o.setPointerCapture(e.pointerId); return; }
      }
      if (ed.tool === 'line') { ed.pts.push(p); edOverlay(); epRender(); return; }
      ed.d = { kind: 'new', p0: p, rects: g.box.map(([x, y, w, h]) => ({ x, y, w, h })) };
      o.setPointerCapture(e.pointerId);
    } else if (e.type === 'pointermove') {
      const p = edPt(e), d = ed.d;
      if (!d) { if (ed.tool === 'line' && ed.pts.length) { ed.hover = p; edOverlay(); } return; }
      if (d.kind === 'pt') { d.f.points[d.j] = p; d.moved = true; edOverlay(); edApply(true); return; }
      const r = edRect(d.p0, p);
      spot([...d.rects, { x: r[0], y: r[1], w: r[2], h: r[3] }], true, !!g.x.ring, g.x.dim, g.x.round, g.x.ringW);
    } else {
      const d = ed.d;
      if (!d) return;
      ed.d = null;
      if (d.kind === 'pt') { if (d.moved) ed.dirty = true; else ed.undo.pop(); edAll(); return; }
      const r = edRect(d.p0, edPt(e));
      if (r[2] >= 10 && r[3] >= 10) mut(() => { g.box.push(r); ed.sel = { t: 'box', k: g.box.length - 1 }; });
      edAll();
    }
  };

  ep.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || !ed || b.disabled) return;
    if (b.blur) b.blur();
    edAct(b.dataset.act, b);
  });
  ep.addEventListener('input', e => {
    const t = e.target;
    if (!ed || !t.dataset.k) return;
    const o = t.dataset.s === 'flow' ? selFlow() : cs().x;
    if (!o) return;
    mut(() => { o[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; }, 'f:' + t.dataset.s + t.dataset.k);
    if (t.type === 'range') t.parentElement.querySelector('output').textContent = t.value;
    edApply(true);
  });
  ep.addEventListener('change', e => {
    const t = e.target;
    if (!ed) return;
    if (t.dataset.layer) {
      mut(() => {
        const x = cs().x, id = t.dataset.layer;
        x.show = (x.show || []).filter(v => v !== id); x.hide = (x.hide || []).filter(v => v !== id);
        if (t.value === 's') x.show.push(id); else if (t.value === 'h') x.hide.push(id);
        if (!x.show.length) delete x.show;
        if (!x.hide.length) delete x.hide;
      });
      edAll();
    } else if (t.dataset.k === 'color' || t.type === 'checkbox') epRender();
    if (t.tagName === 'SELECT' && t.blur) t.blur();
  });
  ep.addEventListener('toggle', e => { if (ed && e.target.tagName === 'DETAILS') ed.codeOpen = e.target.open; }, true);
  ep.addEventListener('mouseover', e => {
    if (!ed) return;
    const r = e.target.closest ? e.target.closest('[data-hl]') : null;
    const v = r ? r.dataset.hl.split(':') : null;
    ed.hl = v ? { t: v[0], k: +v[1] } : null;
    edOverlay();
  });
  ep.addEventListener('mouseenter', () => { if (ed) { ed.over = true; edOverlay(); } });
  ep.addEventListener('mouseleave', () => { if (ed) { ed.over = false; ed.hl = null; edOverlay(); } });

  const stage = $('#stage');
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(t => stage.addEventListener(t, onPtr));
  stage.addEventListener('dblclick', () => {
    if (!ed || ed.tool !== 'line' || !ed.pts.length) return;
    if (ed.pts.length > 2) ed.pts.pop();
    edFinish();
  });
  PS.edit = { on: editOn, off: editOff, key: editKey, active: () => !!ed };
})();

(() => {
  const f = document.getElementById('foot');
  if (!f) return;
  f.style.cssText += ';white-space:normal;height:auto;padding-top:8px;padding-bottom:8px;display:block;line-height:1.7;user-select:all';
  const cmds = [
    'git pull --rebase origin main',
    'npm run convert -- 프로젝트이름 "PDF경로"',
    'bash scripts/ship.sh "메시지"'
  ];
  f.innerHTML = '<b>새 프로젝트</b><br>' + cmds.map(c => `<code style="display:block;user-select:all">${c}</code>`).join('');
})();
