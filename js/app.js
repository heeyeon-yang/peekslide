(() => {
  const DECKS = window.DECKS || {}, $ = s => document.querySelector(s), root = document.documentElement, body = document.body;
  const rng = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  let D = null, deckId = null, SL = [], scope = 'all', cur = 1, fi = 0, st = 0, pendingLast = false, tok = 0;
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
  const clearStage = () => { tok++; PS.edit?.off(); cancelAnimationFrame(raf); sp = []; spA = 0; $('#stage').innerHTML = ''; };
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
    PS.edit?.off();
    cur = id; fi = Math.min(f, s.frames.length - 1); st = s2;
    show(true, false);
  }

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
  $('#stage').addEventListener('click', e => { if (!PS.edit?.active() && !e.target.closest('.vid')) step(1); });
  addEventListener('keydown', e => {
    if (['VIDEO', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (PS.edit?.active()) return PS.edit.key(e);
    const k = e.key, viewing = body.classList.contains('viewing');
    if (/^t$/i.test(k)) toggleTheme();
    else if (/^b$/i.test(k)) cycleAccent();
    else if (!viewing) return;
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); step(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); step(-1); }
    else if (/^p$/i.test(k)) body.classList.contains('present') ? endPresent() : present();
    else if (/^q$/i.test(k)) toggleQA();
    else if (/^e$/i.test(k)) PS.edit?.on();
    else if (k === 'Escape') body.classList.contains('present') ? endPresent() : back();
  });
  addEventListener('hashchange', route);
  new ResizeObserver(fit).observe($('#area'));
  addEventListener('resize', markChip);
  document.fonts?.ready.then(markChip);
  // 로컬 편집 모듈이 붙는 접점. 배포본에서는 PS.edit 가 null 이다.
  const PS = window.PS = {
    $, body, root, toast, fx, spot, steps, curPage, pathD, EDEF, edit: null,
    get D() { return D; }, get st() { return st; }, set st(v) { st = v; }
  };
  route();
})();
