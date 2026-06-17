// App Ranking (5.1.3b) - tela 75" ao vivo. HTML/CSS/JS puro, sem build.
// Loop A (barras com FLIP) <-> Loop B (podio), alternando. Atualiza via WebSocket.
// Mesmo visual da marca do Touch (fitas, cores, fontes, logo).

(() => {
  'use strict';

  const screen = document.getElementById('screen');
  const stage = document.getElementById('stage');
  function fit() {
    stage.style.setProperty('--s', Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
  }
  window.addEventListener('resize', fit);
  fit();

  let snapshot = { entries: [], totalVotes: 0, updatedAt: 0 };
  let locales = {};
  let lang = 'pt';
  let loop = 'A';
  const cfg = { loopA_s: 30, loopB_s: 30 };
  let ws = null;
  let reconnectTimer, loopTimer;
  const EDITING = new URLSearchParams(location.search).has('edit'); // modo edit: nao alterna sozinho

  function t(key) {
    const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), locales[lang]);
    return typeof v === 'string' ? v : key;
  }

  // ---------- FITAS (mesmo sistema do touch) ----------
  let RIBBONS = {};
  const C = { red: '#ED1C24', green: '#00A04A', pink: '#FF66AA', blue: '#1E84CC', yellow: '#FFCB05' };
  const RIBBON_COLORS = { left: [C.pink, C.blue], right: [C.blue, C.yellow] };
  function ribbon() {
    const comps = RIBBONS.podium || [];
    const groups = { left: '', right: '' };
    for (const c of comps) {
      const colors = RIBBON_COLORS[c.side];
      if (!colors) continue;
      const N = colors.length;
      const seg = Math.max(360, Math.round(((c.len || 600) + 300) * 0.5));
      const period = N * seg;
      const dur = Math.max(5, period / 150);
      const anim = c.side === 'left' ? 'dashDown' : 'dashUp';
      // afasta as fitas pras bordas (esq mais pra esquerda, dir mais diagonal)
      const tf = c.side === 'left' ? 'translate(-80,0)' : 'translate(90,44)';
      colors.forEach((col, k) => {
        groups[c.side] +=
          `<path d="${c.d}" transform="${tf}" stroke="${col}" stroke-width="${c.width}" ` +
          `stroke-dasharray="${seg} ${period - seg}" ` +
          `style="--o:${-k * seg}px;--period:${period}px;stroke-dashoffset:${-k * seg}px;` +
          `animation:${anim} ${dur}s linear infinite"></path>`;
      });
    }
    let g = '';
    for (const side of ['left', 'right']) if (groups[side]) g += `<g data-edit="ribbon-${side}">${groups[side]}</g>`;
    return `<svg class="ribbon-svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">${g}</svg>`;
  }
  const logo = () => `<img class="rk-logo" src="/assets/brand/logo-big.png" alt="" data-edit="rk-logo" />`;
  const medalClass = (p) => (p === 1 ? 'gold' : p === 2 ? 'silver' : p === 3 ? 'bronze' : '');

  // ---------- LOOP A (barras + FLIP) ----------
  function renderLoopA() {
    screen.innerHTML =
      `<div class="loop">${ribbon()}${logo()}
        <div class="rk-head" data-edit="rk-head"><h1>${t('ranking.loopA.title')}</h1><p>${t('ranking.loopA.subtitle')}</p></div>
        <ul class="rows" id="rows" data-edit="rk-rows"></ul>
        <div class="rk-foot" id="footA" data-edit="rk-foot"></div>
      </div>`;
    updateLoopA(false);
  }
  function updateLoopA(animate) {
    const ul = document.getElementById('rows');
    if (!ul) return;
    const first = new Map();
    if (animate) for (const li of ul.children) first.set(li.dataset.id, li.getBoundingClientRect().top);

    const top = snapshot.entries.slice(0, 8);
    const existing = new Map([...ul.children].map((li) => [li.dataset.id, li]));
    const seen = new Set();
    top.forEach((e) => {
      seen.add(e.id);
      let li = existing.get(e.id);
      if (!li) {
        li = document.createElement('li');
        li.dataset.id = e.id;
        li.innerHTML =
          `<span class="pos"></span><span class="name"></span>` +
          `<span class="track"><span class="bar"></span></span><span class="pct"></span>`;
      }
      li.className = 'row ' + medalClass(e.position);
      li.querySelector('.pos').textContent = e.position + 'º';
      li.querySelector('.name').innerHTML = `${e.escola} <em>${e.ano}</em>`;
      li.querySelector('.bar').style.width = Math.max(e.pct, 1) + '%';
      li.querySelector('.pct').textContent = e.pct + '%';
      ul.appendChild(li);
    });
    // remove os que sairam do top 8
    for (const li of [...ul.children]) if (!seen.has(li.dataset.id)) li.remove();

    const foot = document.getElementById('footA');
    const vlabel = { pt: 'votos', en: 'votes', es: 'votos' }[lang] || 'votos';
    if (foot) foot.textContent = `${snapshot.totalVotes} ${vlabel}`;

    if (animate) {
      for (const li of ul.children) {
        const last = li.getBoundingClientRect().top;
        const delta = (first.get(li.dataset.id) ?? last) - last;
        if (delta) {
          li.style.transition = 'none';
          li.style.transform = `translateY(${delta}px)`;
          requestAnimationFrame(() => {
            li.style.transition = 'transform 700ms cubic-bezier(.22,1,.36,1)';
            li.style.transform = '';
          });
        }
      }
    }
  }

  // ---------- LOOP B (podio) ----------
  function photoHtml(e) {
    const ini = (e.escola || '?').slice(0, 2).toUpperCase();
    const img = e.still ? `<img src="/assets/${e.still}" alt="" onerror="this.remove()" />` : '';
    return `<div class="photo">${img}<span class="ph-fallback">${ini}</span><span class="badge">${e.position}</span></div>`;
  }
  function cardHtml(e) {
    if (!e) return '';
    return (
      `<figure class="card pos-${e.position}">` +
      photoHtml(e) +
      `<figcaption><div class="esc">${e.escola} <em>${e.ano}</em></div>` +
      `<q>${e.enredo}</q><div class="pct">${e.pct}%</div></figcaption></figure>`
    );
  }
  function renderLoopB() {
    const top = snapshot.entries.slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean); // 2o, 1o, 3o
    screen.innerHTML =
      `<div class="loop">${ribbon()}${logo()}
        <div class="rk-head" data-edit="rk-head"><h1>${t('ranking.loopB.title')}</h1><p>${t('ranking.loopB.subtitle')}</p></div>
        <div class="podium" data-edit="rk-podium">${order.map(cardHtml).join('')}</div>
      </div>`;
  }

  function renderCurrent() {
    if (loop === 'A') renderLoopA();
    else renderLoopB();
  }
  function scheduleLoop() {
    const dur = (loop === 'A' ? cfg.loopA_s : cfg.loopB_s) * 1000;
    loopTimer = setTimeout(() => {
      loop = loop === 'A' ? 'B' : 'A';
      renderCurrent();
      scheduleLoop();
    }, dur);
  }

  // ---------- WebSocket ----------
  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'ranking') {
          snapshot = msg.snapshot;
          if (loop === 'A') updateLoopA(true);
          else renderLoopB();
        }
      } catch (_) {
        /* ignora */
      }
    };
    ws.onclose = () => { reconnectTimer = setTimeout(connect, 2000); };
    ws.onerror = () => ws && ws.close();
  }

  // ---------- boot ----------
  async function boot() {
    const [loc, rb] = await Promise.all([
      fetch('/api/locales').then((r) => r.json()),
      fetch('/assets/ribbons.json').then((r) => r.json()).catch(() => ({})),
    ]);
    locales = loc;
    RIBBONS = rb;
    try {
      const c = await fetch('/api/config/5.1.3b').then((r) => r.json());
      cfg.loopA_s = c.loopA_s ?? cfg.loopA_s;
      cfg.loopB_s = c.loopB_s ?? cfg.loopB_s;
      lang = c.default_language || lang;
    } catch (_) {
      /* defaults */
    }
    try {
      snapshot = await fetch('/api/ranking').then((r) => r.json());
    } catch (_) {
      /* WS preenche */
    }
    renderCurrent();
    connect();
    if (!EDITING) scheduleLoop();
  }

  if (EDITING) {
    window.__editNav = [
      { label: 'Loop A', fn: () => { loop = 'A'; renderCurrent(); } },
      { label: 'Loop B', fn: () => { loop = 'B'; renderCurrent(); } },
    ];
  }

  boot();
})();
