(() => {
  const DECKS = window.DECKS || {}, $ = s => document.querySelector(s), root = document.documentElement, body = document.body;
  const DEV = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const rng = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  let D = null, deckId = null, SL = [], scope = 'all', cur = 1, fi = 0, st = 0, pendingLast = false, tok = 0, ed = null;
  let sp = [], spA = 0, raf = 0;
  const EDEF = { dim: .62, round: 14, ringW: 3, w: 3, dash: 10, gap: 8, r: 0, dotR: 5, dots: 1, dur: 2.2 };
  const H = (...a) => '#/d/' + [deckId, ...a].join('/');
  const pinfo = n => ({ title: `${n}페이지`, ...(D.pages[n] || {}) });
  const slideOf = id => SL.find(s => s.id === id);
  const frameOf = n => SL.find(s => s.frames.includes(n));
  const lastOf = s => s.frames[s.frames.length - 1];
  const partById = id => D.parts.find(p => p.id === String(id));
  const within = (r, list = SL) => list.filter(s => s.id >= r[0] && s.id <= r[1]);
  const slides = () => scope === 'all' ? SL : within(partById(scope).range);
  const steps = n => pinfo(n).steps || [];
  const imgOf = n => D.img.replace('{n}', n);
  const curPage = () => slideOf(cur).frames[fi];
  const buildSlides = d => {
    const grp = new Map();
    (d.groups || []).forEach(g => { if (Array.isArray(g)) g.forEach(p => { if (!grp.has(p)) grp.set(p, g); }); });
    const out = [];
    for (let p = 1; p <= d.total; p++) {
      const g = grp.get(p);
      if (g && g[0] !== p) continue;
      const fr = g ? g.filter(x => x >= 1 && x <= d.total) : [p];
      out.push({ id: p, frames: fr.length ? fr : [p] });
    }
    return out;
  };
  const card = (s, i) => `<a class="card" style="--i:${Math.min(i, 24)}" href="${H('p', s.id)}"><div class="th"><span>${s.id}</span><img loading="lazy" alt="" src="${imgOf(lastOf(s))}" onerror="this.remove()"></div><div class="cap"><b>p.${s.id}${s.frames.length > 1 ? '–' + lastOf(s) : ''}</b>${D.pages[s.id]?.title || ''}</div></a>`;
  const name = p => p.title.replace(/^\d+\.\s*/, '');
  const num = p => `<i class="no">${p.id}</i>`;
  const sec = p => `<div class="sec-row"><h2>${num(p)}${name(p)}</h2>${p.desc ? `<span class="desc">${p.desc}</span>` : ''}<span class="tag">p.${p.range[0]}–${p.range[1]}</span></div>`;
  const list = p => `<div class="cards">${within(p.range).map(card).join('')}</div>`;
  const chips = $('#chips');
  const homeChip = '<a class="chip" data-id="home" href="#/">목록</a>';

  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const sread = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssave = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };

  const accentStyle = document.head.appendChild(document.createElement('style'));
  const applyAccent = hex => {
    accentStyle.textContent = /^#[0-9a-f]{6}$/i.test(hex || '')
      ? `:root:not([data-accent]){--accent:${hex};--accent-num:color-mix(in srgb,${hex} 82%,#000);--on-accent:#fff}:root:not([data-accent])[data-theme="dark"]{--accent:color-mix(in srgb,${hex} 78%,#fff);--accent-num:color-mix(in srgb,${hex} 55%,#fff);--on-accent:#111}`
      : '';
  };
  const bindBtn = b => {
    const at = e => { const r = b.getBoundingClientRect(); b.style.setProperty('--x', e.clientX - r.left + 'px'); b.style.setProperty('--y', e.clientY - r.top + 'px'); };
    b.addEventListener('pointerenter', at); b.addEventListener('pointerleave', at);
  };
  const clearStage = () => { tok++; editOff(); cancelAnimationFrame(raf); sp = []; spA = 0; $('#stage').innerHTML = ''; };
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const unlocked = d => !d.lock || sread('peek:' + d.id) === d.lock.hash;

  function buildChips() {
    chips.innerHTML = '<i id="ink"></i>' + homeChip +
      [['all', '전체보기'], ...D.parts.map(p => [p.id, name(p)])]
        .map(([id, t]) => `<a class="chip" data-id="${id}" href="${id === 'all' ? H('all') : H('part', id)}">${t}</a>`).join('');
  }
  function markChip() {
    const ink = $('#ink');
    if (!ink) return;
    chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.id === scope));
    const on = chips.querySelector('.chip.on');
    ink.style.opacity = on ? 1 : 0;
    if (!on) return;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
    requestAnimationFrame(() => ink.classList.add('ready'));
  }
  function grid() {
    markChip();
    const p = scope === 'all' ? null : partById(scope);
    $('#grid').innerHTML = !p
      ? `<div class="main-header"><h1 class="main-title">${D.title}</h1>${D.desc ? `<p class="main-desc">${D.desc}</p>` : ''}</div>` +
        (D.parts.length ? D.parts.map(q => sec(q) + list(q)).join('') : `<div class="cards">${SL.map(card).join('')}</div>`)
      : `<div class="sec-row single"><h1>${num(p)}${name(p)}</h1>${p.desc ? `<span class="desc">${p.desc}</span>` : ''}<span class="tag">p.${p.range[0]}–${p.range[1]}</span></div>` + list(p);
  }
  function home() {
    deckId = null; D = null; SL = []; clearStage();
    body.classList.remove('viewing', 'present');
    chips.innerHTML = ''; applyAccent(''); document.title = 'PeekSlide';
    $('#bP').style.display = 'none';
    const ds = Object.values(DECKS);
    const tile = (d, i) => `<a class="card" style="--i:${Math.min(i, 24)}" href="#/d/${d.id}/all"><div class="th"><span>${d.title.slice(0, 1)}</span>${d.lock ? '' : `<img loading="lazy" alt="" src="${d.img.replace('{n}', 1)}" onerror="this.remove()">`}</div><div class="cap"><b>${d.total}p</b>${d.title}${d.publish ? '' : ' (비공개)'}${d.lock ? ' · 잠금' : ''}</div></a>`;
    $('#grid').innerHTML = `<div class="main-header"><h1 class="main-title">PeekSlide</h1><p class="main-desc">프로젝트를 선택하세요.</p></div>` +
      (ds.length
        ? `<div class="cards">${ds.map(tile).join('')}</div>`
        : `<p class="main-desc">프로젝트가 없습니다. npm run convert -- 이름 으로 만든 뒤 npm run sync 를 실행하세요.</p>`);
    if (document.fullscreenElement) document.exitFullscreen();
  }
  function gate() {
    clearStage();
    body.classList.remove('viewing', 'present');
    $('#bP').style.display = 'none';
    chips.innerHTML = '<i id="ink"></i>' + homeChip;
    $('#grid').innerHTML = `<form class="gate" autocomplete="off"><h2>${D.title}</h2><p>비밀번호를 입력하세요.</p><div class="row"><input type="password" name="pw" aria-label="비밀번호" autofocus><button class="btn solid" type="submit"><span>열기</span></button></div><p class="err" role="alert"></p></form>`;
    const f = $('#grid .gate'), d = D;
    bindBtn(f.querySelector('.btn'));
    f.pw.focus();
    f.onsubmit = async e => {
      e.preventDefault();
      const err = f.querySelector('.err');
      if (!window.crypto || !crypto.subtle) { err.textContent = 'https 또는 localhost 주소로 열어 주세요.'; return; }
      if (await sha(d.lock.salt + f.pw.value) === d.lock.hash) { ssave('peek:' + d.id, d.lock.hash); deckId = null; route(); }
      else { err.textContent = '비밀번호가 맞지 않습니다.'; f.pw.select(); }
    };
  }
  function useDeck(id) {
    $('#bP').style.display = '';
    if (deckId === id) return;
    deckId = id; D = DECKS[id]; SL = buildSlides(D); scope = 'all'; cur = 1; fi = 0; st = 0;
    buildChips(); applyAccent(D.accent); document.title = `${D.title} · PeekSlide`;
  }

  const fit = () => {
    const a = $('#area'), k = Math.min(a.clientWidth / 1920, a.clientHeight / 1080);
    $('#stage').style.transform = `translate(-50%,-50%) scale(${k})`;
  };
  const fileOf = s => /^(https?:|\/|projects\/)/.test(s || '') ? s : D.base + (s || '');
  const media = n => {
    const i = pinfo(n), v = i.video;
    const ph = `<div class="ph"><h1>${n}. ${i.title}</h1>${(i.mock || []).map(([x, y, w, h, t]) => `<div class="box" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${t}</div>`).join('')}</div>`;
    let vid = '';
    if (v) {
      const [x, y, w, h] = v.rect || [160, 200, 1600, 760], pos = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      vid = v.kind === 'youtube'
        ? `<iframe class="vid" style="${pos}" src="https://www.youtube-nocookie.com/embed/${v.id}?rel=0" allow="autoplay;fullscreen;encrypted-media" allowfullscreen></iframe>`
        : `<video class="vid" style="${pos}" src="${fileOf(v.src)}" controls playsinline></video>`;
    }
    return `${ph}<img alt="${i.title}" src="${imgOf(n)}" onerror="this.remove()">${vid}`;
  };
  const layerHtml = (n, vis) => (pinfo(n).layers || []).map(L => {
    const [x, y, w, h] = L.rect || [0, 0, 1920, 1080];
    return `<img class="lyr${vis.has(L.id) ? ' on' : ''}" data-id="${L.id}" data-a="${L.anim || 'fade'}" alt="" src="${fileOf(L.src)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${L.round || 0}px">`;
  }).join('');
  const visAt = (n, k) => {
    const v = new Set();
    steps(n).slice(0, k).forEach(s => { (s.show || []).forEach(x => v.add(x)); (s.hide || []).forEach(x => v.delete(x)); });
    return v;
  };

  const FXSVG = '<svg viewBox="0 0 1920 1080"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><rect width="1920" height="1080" fill="#fff"/><g id="mh"></g></mask></defs><rect id="dimr" class="dim" width="1920" height="1080" mask="url(#m)" opacity="0"/><g id="rings"></g><g id="flows"></g></svg>';
  const lerp = (a, b, t) => a + (b - a) * t, ease = t => 1 - Math.pow(1 - t, 3);
  function spot(to, instant, ring, alpha, round, ringW) {
    const mh = $('#mh'), rg = $('#rings'), dm = $('#dimr');
    if (!mh) return;
    cancelAnimationFrame(raf);
    const a0 = spA, a1 = to.length ? (typeof alpha === 'number' ? alpha : EDEF.dim) : 0, n = Math.max(sp.length, to.length);
    const rx = typeof round === 'number' ? round : EDEF.round, rw = typeof ringW === 'number' ? ringW : EDEF.ringW;
    const ctr = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, w: 0, h: 0 });
    const from = [], tgt = [];
    for (let i = 0; i < n; i++) { from.push(sp[i] || ctr(to[i])); tgt.push(to[i] || ctr(sp[i])); }
    const draw = t => {
      const e = ease(t);
      const hs = from.map((a, i) => { const b = tgt[i]; return `x="${lerp(a.x, b.x, e)}" y="${lerp(a.y, b.y, e)}" width="${Math.max(0, lerp(a.w, b.w, e))}" height="${Math.max(0, lerp(a.h, b.h, e))}"`; });
      mh.innerHTML = hs.map(s => `<rect ${s} rx="${rx}"/>`).join('');
      rg.innerHTML = ring ? hs.map(s => `<rect class="ring" style="stroke-width:${rw}px" ${s} rx="${rx}"/>`).join('') : '';
      dm.setAttribute('opacity', lerp(a0, a1, e));
    };
    sp = to; spA = a1;
    if (instant || matchMedia('(prefers-reduced-motion:reduce)').matches) return draw(1);
    const t0 = performance.now();
    const tick = now => { const t = Math.min(1, (now - t0) / 480); draw(t); if (t < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }
  const pathD = (p, r) => {
    if (!r || p.length < 3) return 'M' + p.map(q => q.join(' ')).join(' L');
    const f = n => Math.round(n * 10) / 10;
    let d = `M${p[0][0]} ${p[0][1]}`;
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]), k = Math.min(r, l1 / 2, l2 / 2);
      if (k < 0.5) { d += ` L${b[0]} ${b[1]}`; continue; }
      d += ` L${f(b[0] + (a[0] - b[0]) * k / l1)} ${f(b[1] + (a[1] - b[1]) * k / l1)} Q${b[0]} ${b[1]} ${f(b[0] + (c[0] - b[0]) * k / l2)} ${f(b[1] + (c[1] - b[1]) * k / l2)}`;
    }
    const e = p[p.length - 1];
    return d + ` L${e[0]} ${e[1]}`;
  };
  const flowHtml = (f, i) => {
    const p = f.points;
    if (!Array.isArray(p) || p.length < 2) return '';
    const o = k => f[k] ?? EDEF[k], d = pathD(p, o('r')), w = o('w'), da = o('dash'), ga = o('gap'), n = Math.max(1, Math.round(o('dots')));
    const line = f.line === false ? '' :
      `<mask id="fm${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path class="fdraw" pathLength="1" style="stroke-width:${w + 24}px" d="${d}"/></mask>` +
      `<path class="fline" mask="url(#fm${i})" style="${f.color ? `stroke:${f.color};` : ''}stroke-width:${w}px;${da > 0 ? `stroke-dasharray:${da} ${ga};--fp:${da + ga}px;animation-duration:${(da + ga) / 24}s` : 'stroke-dasharray:none;animation:none'}" d="${d}"/>`;
    const dots = f.dot ? Array.from({ length: n }, (_, j) => `<circle class="fdot" r="${o('dotR')}" style="${f.color ? `fill:${f.color};` : ''}animation-delay:${f.line === false ? .1 : .8}s"><animateMotion dur="${o('dur')}s" begin="${-j * o('dur') / n}s" repeatCount="indefinite" path="${d}"/></circle>`).join('') : '';
    return line + dots;
  };
  function fx(anim) {
    const s = slideOf(cur), pn = s.frames[fi], h = st > 0 ? steps(pn)[st - 1] : null;
    spot((h?.box || []).map(([x, y, w, ht]) => ({ x, y, w, h: ht })), !anim, !!h?.ring, h?.dim, h?.round, h?.ringW);
    const fl = $('#flows');
    if (fl) { fl.classList.toggle('still', !anim); fl.innerHTML = (h?.flow || []).map(flowHtml).join(''); }
    const vis = visAt(pn, st);
    document.querySelectorAll('#lyrs .lyr').forEach(el => el.classList.toggle('on', vis.has(el.dataset.id)));
    const l = slides();
    const total = s.frames.reduce((a, p) => a + steps(p).length, 0) + s.frames.length - 1;
    const k = s.frames.slice(0, fi).reduce((a, p) => a + steps(p).length + 1, 0) + st;
    $('#pos').textContent = `${l.findIndex(x => x.id === cur) + 1} / ${l.length}` + (total ? ` · 단계 ${k}/${total}` : '');
  }
  const qa = id => {
    const s = slideOf(id), i = pinfo(id);
    const q = s.frames.flatMap(p => D.pages[p]?.qa || []), lk = s.frames.flatMap(p => D.pages[p]?.links || []);
    const b = q.map(x => `<details><summary>${x.q}</summary><p>${x.a}</p></details>`).join('') +
      (lk.length ? `<h4>링크</h4>` + lk.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('') : '');
    $('#qa').innerHTML = `<h3>${id}. ${i.title}</h3>` + (b || `<p>이 페이지에는 Q&A가 없습니다.</p>`);
  };
  function show(slideSwap, anim) {
    const s = slideOf(cur), pn = s.frames[fi], t = ++tok, stage = $('#stage'), im = new Image();
    im.src = imgOf(pn);
    (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => {
      if (t !== tok) return;
      if (!$('#fxwrap')) { stage.innerHTML = `<div id="fxwrap">${FXSVG}</div><div id="lyrs"></div><div id="edit"></div>`; sp = []; spA = 0; }
      if (slideSwap) spot([], true);
      const olds = [...stage.querySelectorAll('.sl')];
      const el = document.createElement('div');
      el.className = 'sl' + (olds.length ? ' in' : '');
      el.innerHTML = media(pn);
      stage.insertBefore(el, $('#fxwrap'));
      $('#lyrs').innerHTML = layerHtml(pn, visAt(pn, st));
      setTimeout(() => olds.forEach(o => o.remove()), 220);
      fx(anim); qa(cur); requestAnimationFrame(fit);
      [pn + 1, pn - 1].forEach(m => { if (m >= 1 && m <= D.total) new Image().src = imgOf(m); });
    });
  }
  function view(id, f = 0, s2 = 0) {
    const s = slideOf(id);
    if (!slides().some(x => x.id === id)) scope = 'all';
    editOff();
    cur = id; fi = Math.min(f, s.frames.length - 1); st = s2;
    show(true, false);
  }

  const edPt = e => {
    const r = $('#edit').getBoundingClientRect(), k = 1920 / r.width;
    return [Math.max(0, Math.min(1920, Math.round((e.clientX - r.left) * k))), Math.max(0, Math.min(1080, Math.round((e.clientY - r.top) * k)))];
  };
  const edRect = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])];
  const clone = o => JSON.parse(JSON.stringify(o));
  const newStep = () => ({ box: [], flow: [], x: {} });
  const edLoad = pn => {
    const l = ((D.pages[pn] || {}).steps || []).map(s => { const { box, flow, ...x } = clone(s); return { box: box || [], flow: flow || [], x }; });
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
  const ep = document.createElement('aside');
  ep.id = 'ep';
  $('#vbody').appendChild(ep);

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
    const layers = (D.pages[ed.pn] || {}).layers || [];
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
    D.pages[ed.pn] = { ...ed.orig, steps: edPrev() };
    st = ed.i + 1; fx(!instant);
    epCode();
  }
  const edAll = () => { edOverlay(); epRender(); edApply(false); };
  function editOn() {
    if (!DEV || !D || body.classList.contains('present') || !$('#edit')) return;
    const pn = curPage();
    ed = { deck: D, pn, orig: clone(D.pages[pn] || {}), g: edLoad(pn), i: 0, sel: null, tool: 'box', pts: [], hover: null, hl: null, d: null, undo: [], co: '', t0: 0, dirty: false, codeOpen: false, pt: 0 };
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
    editOff(); st = 0; fx(false);
  }
  async function edSave() {
    const steps2 = edSteps(), pn = ed.pn, d = ed.deck;
    try {
      const r = await fetch('/__save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deck: d.id, page: pn, steps: steps2 }) });
      if (!r.ok) throw new Error('save');
      if (!ed) return;
      ed.orig = { ...ed.orig, steps: steps2 }; ed.dirty = false;
      epCode(); toast(`저장했습니다: ${pn}페이지 ${steps2.length}단계`);
    } catch (e) { toast('저장은 npm run dev 에서만 됩니다. 코드 보기에서 복사해 붙여넣으세요'); }
  }
  function edFinish() {
    if (ed.pts.length < 2) { ed.pts = []; ed.hover = null; return edAll(); }
    mut(() => { const g = cs(); g.flow.push({ points: ed.pts }); ed.sel = { t: 'flow', k: g.flow.length - 1 }; ed.pts = []; ed.hover = null; ed.tool = 'box'; });
    edAll();
  }
  function edPlay() {
    body.classList.add('edit-v');
    st = ed.i; fx(false);
    clearTimeout(ed.pt);
    setTimeout(() => { if (ed) { st = ed.i + 1; fx(true); } }, 250);
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

  const step = d => {
    const l = slides(), s = slideOf(cur), i = l.findIndex(x => x.id === cur), pn = s.frames[fi];
    if (d > 0) {
      if (st < steps(pn).length) { st++; fx(true); }
      else if (fi < s.frames.length - 1) { fi++; st = 0; show(false, true); }
      else if (i < l.length - 1) location.hash = H('p', l[i + 1].id);
    } else {
      if (st > 0) { st--; fx(true); }
      else if (fi > 0) { fi--; st = steps(s.frames[fi]).length; show(false, true); }
      else if (i > 0) { pendingLast = true; location.hash = H('p', l[i - 1].id); }
    }
  };
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (h[0] !== 'd' || !DECKS[h[1]]) return home();
    useDeck(h[1]);
    if (!unlocked(D)) return gate();
    if (h[2] === 'p') {
      const s = frameOf(+h[3]);
      if (!s) { location.hash = H('all'); return; }
      if (s.id !== +h[3]) { location.hash = H('p', s.id); return; }
      body.classList.add('viewing');
      const f = pendingLast ? s.frames.length - 1 : 0;
      view(s.id, f, pendingLast ? steps(s.frames[f]).length : 0); pendingLast = false;
    } else {
      clearStage();
      body.classList.remove('viewing', 'present');
      scope = h[2] === 'part' && partById(h[3]) ? h[3] : 'all'; grid();
      if (document.fullscreenElement) document.exitFullscreen();
    }
  }
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 3200); };
  function present() {
    if (!D) return;
    if (!body.classList.contains('viewing')) location.hash = H('p', slides()[0].id);
    body.classList.add('present'); requestAnimationFrame(fit);
    (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject()).catch(() => toast('전체화면이 막혔어요. F11을 눌러주세요 (Esc로 종료)'));
  }
  const endPresent = () => { body.classList.remove('present'); if (document.fullscreenElement) document.exitFullscreen(); requestAnimationFrame(fit); };
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { body.classList.remove('present'); requestAnimationFrame(fit); } });
  const ACCENTS = [{ id: 'blue', label: 'Blue' }];
  const icon = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/></svg>`;
  let modes = $('#modes');
  if (!modes) {
    const old = $('#bB'); if (old) old.remove();
    modes = Object.assign(document.createElement('div'), { id: 'modes' });
    $('.tools').insertBefore(modes, $('#bT'));
  }
  modes.innerHTML = ACCENTS.map(a => `<button class="btn swatch" data-mode="${a.id}" aria-pressed="false" aria-label="${a.label} 색상 모드">${icon()}<span class="lbl">${a.label}</span></button>`).join('');
  const current = () => root.dataset.accent || '';
  const setTheme = t => { root.dataset.theme = t; save('theme', t); };
  const setAccent = id => {
    id = ACCENTS.some(a => a.id === id) ? id : '';
    if (id) root.dataset.accent = id; else delete root.dataset.accent;
    save('accent', id);
    modes.querySelectorAll('.swatch').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === id)));
  };
  const transition = (apply, el) => {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion:reduce)').matches) return apply();
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
      { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }));
  };
  const toggleTheme = () => transition(() => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'), $('#bT'));
  const cycleAccent = () => {
    const ids = ['', ...ACCENTS.map(a => a.id)];
    transition(() => setAccent(ids[(ids.indexOf(current()) + 1) % ids.length]), modes.querySelector('.swatch') || $('#bT'));
  };
  modes.addEventListener('click', e => {
    const b = e.target.closest('.swatch');
    if (b) transition(() => setAccent(current() === b.dataset.mode ? '' : b.dataset.mode), b);
  });
  const savedTheme = read('theme'), savedAccent = read('accent');
  setTheme(['light', 'dark'].includes(savedTheme) ? savedTheme : (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'));
  setAccent(savedAccent !== null ? savedAccent : (savedTheme === 'blue' ? 'blue' : ''));

  document.querySelectorAll('.btn').forEach(bindBtn);

  $('#bT').onclick = toggleTheme; $('#bP').onclick = present;
  const toggleQA = () => { body.classList.toggle('qa-on'); requestAnimationFrame(fit); };
  const back = () => { location.hash = scope === 'all' ? H('all') : H('part', scope); };
  $('#bQ').onclick = toggleQA;
  $('#bPrev').onclick = e => { e.stopPropagation(); e.currentTarget.blur(); step(-1); };
  $('#bNext').onclick = e => { e.stopPropagation(); e.currentTarget.blur(); step(1); };
  $('#stage').addEventListener('click', e => { if (!ed && !e.target.closest('.vid')) step(1); });
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(t => $('#stage').addEventListener(t, onPtr));
  $('#stage').addEventListener('dblclick', () => {
    if (!ed || ed.tool !== 'line' || !ed.pts.length) return;
    if (ed.pts.length > 2) ed.pts.pop();
    edFinish();
  });
  addEventListener('keydown', e => {
    if (['VIDEO', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (ed) return editKey(e);
    const k = e.key, viewing = body.classList.contains('viewing');
    if (/^t$/i.test(k)) toggleTheme();
    else if (/^b$/i.test(k)) cycleAccent();
    else if (!viewing) return;
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); step(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); step(-1); }
    else if (/^p$/i.test(k)) body.classList.contains('present') ? endPresent() : present();
    else if (/^q$/i.test(k)) toggleQA();
    else if (/^e$/i.test(k)) editOn();
    else if (k === 'Escape') body.classList.contains('present') ? endPresent() : back();
  });
  addEventListener('hashchange', route);
  new ResizeObserver(fit).observe($('#area'));
  addEventListener('resize', markChip);
  document.fonts?.ready.then(markChip);
  route();
})();
