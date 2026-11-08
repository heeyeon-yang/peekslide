(() => {
  const API = 'https://zxwg2aezqnipns6ad44bt2rhae0nlrau.lambda-url.ap-northeast-2.on.aws'; // 끝에 / 없이
  const PS = window.PS, $ = PS.$, K = 'peek:admin';
  const tok = () => { try { return sessionStorage.getItem(K); } catch (e) { return null; } };
  const put = t => { try { t ? sessionStorage.setItem(K, t) : sessionStorage.removeItem(K); } catch (e) {} };
  const exp = t => { try { return JSON.parse(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).exp; } catch (e) { return 0; } };
  const valid = () => { const t = tok(); return !!t && exp(t) > Date.now(); };

  // 편집기는 로그인한 뒤에만 내려받는다 (일반 방문자에게는 전달되지 않음)
  let loading = null;
  const loadEditor = () => {
    if (PS.edit) return Promise.resolve();
    return loading || (loading = new Promise((ok, no) => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'admin/edit.css'; document.head.appendChild(l);
      const s = document.createElement('script'); s.src = 'admin/edit.js';
      s.onload = ok;
      s.onerror = () => { loading = null; l.remove(); s.remove(); no(new Error('editor')); };
      document.body.appendChild(s);
    }));
  };

  const eb = document.createElement('button');
  eb.id = 'bE'; eb.className = 'btn'; eb.textContent = '편집';
  $('.tools').insertBefore(eb, $('#bQ'));
  eb.onclick = () => PS.edit ? PS.edit.on() : PS.toast('편집기를 불러오는 중입니다. 잠시 뒤 다시 눌러 주세요.');

  const sync = () => {
    const on = valid();
    PS.body.classList.toggle('admin', on);
    $('#bA').textContent = on ? '관리자 ●' : '관리자';
    if (on) loadEditor().catch(() => PS.toast('편집기를 불러오지 못했습니다.'));
    else if (PS.edit && PS.edit.active()) PS.edit.off();
  };

  function ask() {
    const d = document.createElement('dialog');
    d.className = 'adm';
    d.innerHTML = '<form><h3>관리자 로그인</h3><input type="password" name="pw" autocomplete="current-password" aria-label="비밀번호"><p class="err" role="alert"></p><div class="row"><button class="btn" type="button" data-x>취소</button><button class="btn solid" type="submit"><span>로그인</span></button></div></form>';
    document.body.appendChild(d);
    const f = d.querySelector('form'), err = f.querySelector('.err'), go = f.querySelector('.solid');
    d.querySelector('[data-x]').onclick = () => d.close();
    d.addEventListener('close', () => d.remove());
    f.onsubmit = async e => {
      e.preventDefault();
      if (!f.pw.value) return;
      go.disabled = true; err.textContent = '';
      try {
        const r = await fetch(API + '/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: f.pw.value }) });
        if (!r.ok) throw new Error(r.status === 401 ? '비밀번호가 맞지 않습니다.' : '서버 오류 (' + r.status + ')');
        put((await r.json()).token); sync(); d.close(); PS.toast('관리자로 로그인했습니다.');
      } catch (x) { err.textContent = x.message === 'Failed to fetch' ? '서버에 연결할 수 없습니다.' : x.message; f.pw.select(); }
      go.disabled = false;
    };
    d.showModal(); f.pw.focus();
  }

  PS.admin = {
    token: () => valid() ? tok() : null,
    api: API,
    open() {
      if (valid()) { if (confirm('로그아웃할까요?')) { put(null); sync(); PS.toast('로그아웃했습니다.'); } return; }
      ask();
    }
  };
  setInterval(() => { if (!valid() && PS.body.classList.contains('admin')) sync(); }, 30000);
  sync();
})();
