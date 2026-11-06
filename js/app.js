(() => {
  const DECKS = window.DECKS || {}, $ = s => document.querySelector(s), root = document.documentElement, body = document.body;
  const rng = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  let D = null, deckId = null, scope = 'all', cur = 1, st = 0, pendingLast = false, tok = 0;
  const H = (...a) => '#/d/' + [deckId, ...a].join('/');
  const info = n => ({ title: `${n}페이지`, ...(D.pages[n] || {}) });
  const partById = id => D.parts.find(p => p.id === String(id));
  const pages = () => scope === 'all' ? rng([1, D.total]) : rng(partById(scope).range);
  const steps = n => info(n).steps || [];
  const imgOf = n => D.img.replace('{n}', n);
  const card = (n, i) => `<a class="card" style="--i:${Math.min(i, 24)}" href="${H('p', n)}"><div class="th"><span>${n}</span><img loading="lazy" alt="" src="${imgOf(n)}" onerror="this.remove()"></div><div class="cap"><b>p.${n}</b>${D.pages[n]?.title || ''}</div></a>`;
  const name = p => p.title.replace(/^\d+\.\s*/, '');
  const num = p => `<i class="no">${p.id}</i>`;
  const sec = p => `<div class="sec-row"><h2>${num(p)}${name(p)}</h2>${p.desc ? `<span class="desc">${p.desc}</span>` : ''}<span class="tag">p.${p.range[0]}–${p.range[1]}</span></div>`;
  const list = p => `<div class="cards">${rng(p.range).map(card).join('')}</div>`;
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
  const clearStage = () => { tok++; $('#stage').innerHTML = ''; };
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
        (D.parts.length ? D.parts.map(q => sec(q) + list(q)).join('') : `<div class="cards">${rng([1, D.total]).map(card).join('')}</div>`)
      : `<div class="sec-row single"><h1>${num(p)}${name(p)}</h1>${p.desc ? `<span class="desc">${p.desc}</span>` : ''}<span class="tag">p.${p.range[0]}–${p.range[1]}</span></div>` + list(p);
  }
  function home() {
    deckId = null; D = null; clearStage();
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
    deckId = id; D = DECKS[id]; scope = 'all'; cur = 1; st = 0;
    buildChips(); applyAccent(D.accent); document.title = `${D.title} · PeekSlide`;
  }

  const fit = () => {
    const a = $('#area'), k = Math.min(a.clientWidth / 1920, a.clientHeight / 1080);
    $('#stage').style.transform = `translate(-50%,-50%) scale(${k})`;
  };
  const media = n => {
    const i = info(n), v = i.video;
    const ph = `<div class="ph"><h1>${n}. ${i.title}</h1>${(i.mock || []).map(([x, y, w, h, t]) => `<div class="box" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${t}</div>`).join('')}</div>`;
    let vid = '';
    if (v) {
      const [x, y, w, h] = v.rect || [160, 200, 1600, 760], pos = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      const file = /^(https?:|\/|projects\/)/.test(v.src || '') ? v.src : D.base + (v.src || '');
      vid = v.kind === 'youtube'
        ? `<iframe class="vid" style="${pos}" src="https://www.youtube-nocookie.com/embed/${v.id}?rel=0" allow="autoplay;fullscreen;encrypted-media" allowfullscreen></iframe>`
        : `<video class="vid" style="${pos}" src="${file}" controls playsinline></video>`;
    }
    return `${ph}<img alt="${i.title}" src="${imgOf(n)}" onerror="this.remove()">${vid}`;
  };
  const fx = () => {
    const h = st > 0 ? steps(cur)[st - 1] : null;
    $('#fxwrap').innerHTML = !h ? '' :
      `<svg viewBox="0 0 1920 1080"><defs><mask id="m"><rect width="1920" height="1080" fill="#fff"/>${h.box.map(([x, y, w, ht]) => `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="14"/>`).join('')}</mask></defs><rect class="dim" width="1920" height="1080" mask="url(#m)"/>${h.box.map(([x, y, w, ht]) => `<rect class="ring" x="${x}" y="${y}" width="${w}" height="${ht}" rx="14"/>`).join('')}</svg>`;
    const l = pages(); $('#pos').textContent = `${l.indexOf(cur) + 1} / ${l.length}` + (steps(cur).length ? ` · 단계 ${st}/${steps(cur).length}` : '');
  };
  const qa = n => {
    const i = info(n);
    const b = (i.qa || []).map(x => `<details><summary>${x.q}</summary><p>${x.a}</p></details>`).join('') +
      ((i.links || []).length ? `<h4>링크</h4>` + i.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('') : '');
    $('#qa').innerHTML = `<h3>${n}. ${i.title}</h3>` + (b || `<p>이 페이지에는 Q&A가 없습니다.</p>`);
  };
  function view(n, s2 = 0) {
    if (!pages().includes(n)) scope = 'all';
    cur = n; st = s2;
    const t = ++tok, stage = $('#stage'), im = new Image();
    im.src = imgOf(n);
    (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => {
      if (t !== tok) return;
      if (!$('#fxwrap')) stage.innerHTML = '<div id="fxwrap"></div>';
      const olds = [...stage.querySelectorAll('.sl')];
      const el = document.createElement('div');
      el.className = 'sl' + (olds.length ? ' in' : '');
      el.innerHTML = media(n);
      stage.insertBefore(el, $('#fxwrap'));
      setTimeout(() => olds.forEach(o => o.remove()), 220);
      fx(); qa(n); requestAnimationFrame(fit);
      [n + 1, n - 1].forEach(m => { if (m >= 1 && m <= D.total) new Image().src = imgOf(m); });
    });
  }
  const step = d => {
    const l = pages(), i = l.indexOf(cur);
    if (d > 0) { st < steps(cur).length ? (st++, fx()) : i < l.length - 1 && (location.hash = H('p', l[i + 1])); }
    else { st > 0 ? (st--, fx()) : i > 0 && (location.hash = H('p', l[i - 1]), pendingLast = true); }
  };
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (h[0] !== 'd' || !DECKS[h[1]]) return home();
    useDeck(h[1]);
    if (!unlocked(D)) return gate();
    if (h[2] === 'p') {
      const n = +h[3];
      if (!(n >= 1 && n <= D.total)) { location.hash = H('all'); return; }
      body.classList.add('viewing');
      view(n, pendingLast ? steps(n).length : 0); pendingLast = false;
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
    if (!body.classList.contains('viewing')) location.hash = H('p', pages()[0]);
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
  $('#bPrev').onclick = e => { e.stopPropagation(); step(-1); }; $('#bNext').onclick = e => { e.stopPropagation(); step(1); };
  $('#stage').addEventListener('click', e => { if (!e.target.closest('.vid')) step(1); });
  addEventListener('keydown', e => {
    if (e.target.tagName === 'VIDEO' || e.target.tagName === 'INPUT') return;
    const k = e.key, viewing = body.classList.contains('viewing');
    if (/^t$/i.test(k)) toggleTheme();
    else if (/^b$/i.test(k)) cycleAccent();
    else if (!viewing) return;
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); step(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); step(-1); }
    else if (/^p$/i.test(k)) body.classList.contains('present') ? endPresent() : present();
    else if (/^q$/i.test(k)) toggleQA();
    else if (k === 'Escape') body.classList.contains('present') ? endPresent() : back();
  });
  addEventListener('hashchange', route);
  new ResizeObserver(fit).observe($('#area'));
  addEventListener('resize', markChip);
  document.fonts?.ready.then(markChip);
  route();
})();
