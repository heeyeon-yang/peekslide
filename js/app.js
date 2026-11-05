(() => {
  const D = window.DECK, $ = s => document.querySelector(s), root = document.documentElement, body = document.body;
  const rng = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const info = n => ({ title: `${n}페이지`, ...(D.pages[n] || {}) });
  const partById = id => D.parts.find(p => p.id === String(id));
  let scope = 'all', cur = 1, st = 0;
  const pages = () => scope === 'all' ? rng([1, D.total]) : rng(partById(scope).range);
  const steps = n => info(n).steps || [];
  const card = (n, i) => `<a class="card" style="--i:${Math.min(i, 24)}" href="#/p/${n}"><div class="th"><span>${n}</span><img loading="lazy" alt="" src="${D.img.replace('{n}', n)}" onerror="this.remove()"></div><div class="cap"><b>p.${n}</b>${D.pages[n]?.title || ''}</div></a>`;
  const head = (t, sub) => `<h1>${t}</h1><p>${sub}</p>`;
  function grid() {
    $('#chips').innerHTML = [['all', '전체보기'], ...D.parts.map(p => [p.id, p.title])]
      .map(([id, t]) => `<a class="chip${scope === id ? ' on' : ''}" href="#/${id === 'all' ? 'all' : 'part/' + id}">${t}</a>`).join('');
    $('#grid').innerHTML = scope === 'all'
      ? head(D.title, D.desc) + D.parts.map(p => `<h2>${p.title}</h2><p>${p.desc || ''} · ${p.range[0]}–${p.range[1]}p</p><div class="cards">${rng(p.range).map(card).join('')}</div>`).join('')
      : (p => head(p.title, `${p.desc || ''} · ${p.range[0]}–${p.range[1]}p`) + `<div class="cards">${rng(p.range).map(card).join('')}</div>`)(partById(scope));
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
      vid = v.kind === 'youtube'
        ? `<iframe class="vid" style="${pos}" src="https://www.youtube-nocookie.com/embed/${v.id}?rel=0" allow="autoplay;fullscreen;encrypted-media" allowfullscreen></iframe>`
        : `<video class="vid" style="${pos}" src="${v.src}" controls playsinline></video>`;
    }
    return `${ph}<img alt="${i.title}" src="${D.img.replace('{n}', n)}" onerror="this.remove()">${vid}`;
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
  function view(n, s2 = 0, anim = false) {
    if (!pages().includes(n)) scope = 'all';
    const dir = anim ? (n > cur ? ' fwd' : n < cur ? ' back' : '') : '';
    cur = n; st = s2;
    $('#stage').innerHTML = `<div class="sl${dir}">${media(n)}</div><div id="fxwrap"></div>`;
    fx(); qa(n); requestAnimationFrame(fit);
  }
  const step = d => {
    const l = pages(), i = l.indexOf(cur);
    if (d > 0) { st < steps(cur).length ? (st++, fx()) : i < l.length - 1 && (location.hash = `#/p/${l[i + 1]}`); }
    else { st > 0 ? (st--, fx()) : i > 0 && (location.hash = `#/p/${l[i - 1]}`, pendingLast = true); }
  };
  let pendingLast = false;
  function route() {
    const h = location.hash.replace('#/', '').split('/');
    if (h[0] === 'p') {
      const was = body.classList.contains('viewing'); body.classList.add('viewing'); view(+h[1], pendingLast ? steps(+h[1]).length : 0, was); pendingLast = false;
    } else {
      body.classList.remove('viewing', 'present');
      scope = h[0] === 'part' && partById(h[1]) ? h[1] : 'all'; grid();
      if (document.fullscreenElement) document.exitFullscreen();
    }
  }
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 3200); };
  function present() {
    if (!body.classList.contains('viewing')) location.hash = `#/p/${pages()[0]}`;
    body.classList.add('present'); requestAnimationFrame(fit);
    (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject()).catch(() => toast('전체화면이 막혔어요. F11을 눌러주세요 (Esc로 종료)'));
  }
  const endPresent = () => { body.classList.remove('present'); if (document.fullscreenElement) document.exitFullscreen(); requestAnimationFrame(fit); };
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { body.classList.remove('present'); requestAnimationFrame(fit); } });
  const setTheme = t => { root.dataset.theme = t; try { localStorage.setItem('theme', t); } catch (e) {} };
  const toggleTheme = () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion:reduce)').matches) return setTheme(next);
    const r = $('#bT').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => setTheme(next)).ready.then(() => root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
      { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }));
  };
  let saved = null; try { saved = localStorage.getItem('theme'); } catch (e) {}
  setTheme(saved || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'));

  $('#bT').onclick = toggleTheme; $('#bP').onclick = present;
  const toggleQA = () => { body.classList.toggle('qa-on'); requestAnimationFrame(fit); };
  const back = () => { location.hash = scope === 'all' ? '#/all' : `#/part/${scope}`; };
  $('#bQ').onclick = toggleQA;
  $('#bPrev').onclick = e => { e.stopPropagation(); step(-1); }; $('#bNext').onclick = e => { e.stopPropagation(); step(1); };
  $('#stage').addEventListener('click', e => { if (!e.target.closest('.vid')) step(1); });
  addEventListener('keydown', e => {
    if (e.target.tagName === 'VIDEO') return;
    const k = e.key, viewing = body.classList.contains('viewing');
    if (/^t$/i.test(k)) toggleTheme();
    else if (!viewing) return;
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); step(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); step(-1); }
    else if (/^p$/i.test(k)) body.classList.contains('present') ? endPresent() : present();
    else if (/^q$/i.test(k)) toggleQA();
    else if (k === 'Escape') body.classList.contains('present') ? endPresent() : back();
  });
  addEventListener('hashchange', route);
  new ResizeObserver(fit).observe($('#area'));
  if (!location.hash) location.hash = '#/all'; else route();
})();
