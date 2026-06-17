// App Touch (5.1.3a) - "Qual o seu desfile inesquecivel?" - HTML/CSS/JS puro.
// Fluxo: idle (img) -> selecao -> podio (confirme) -> obrigado (img) -> idle.
// Resolucao fixa 16:9 (escala no CSS, sem JS de resize).

(() => {
  'use strict';

  const screen = document.getElementById('screen');
  const params = new URLSearchParams(location.search);
  const station = params.get('station') || '1';
  const EDITING = params.has('edit'); // modo edit: desliga timers automaticos

  // Resolucao fixa 16:9: numa tela 1920x1080 a escala e 1 (cheia); so reduz
  // proporcionalmente para caber em janelas menores (ex.: preview de teste).
  const stage = document.getElementById('stage');
  function fit() {
    stage.style.setProperty('--s', Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
  }
  window.addEventListener('resize', fit);
  fit();

  // ---- estado ----
  let desfiles = [];
  let locales = {};
  let lang = 'pt';
  const cfg = { timeout_s: 30, confirmation_return_s: 5 };

  let scr = 'idle';
  let top3 = []; // ids em ordem de escolha
  let highlightedId = null;
  let lastHighlight = null;

  let inactivityTimer, returnTimer;

  // ---- icones inline (SVG, evita raster do PSD) ----
  const SVG_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 6"/></svg>';
  const SVG_TROPHY =
    '<svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"><path d="M18 10h28v12a14 14 0 0 1-28 0V10Z"/><path d="M18 14h-7a7 7 0 0 0 9 10M46 14h7a7 7 0 0 1-9 10"/><path d="M32 36v8M22 54h20M25 44h14v10H25z"/><path d="m32 17 2.2 4.5 5 .7-3.6 3.5.9 4.9-4.5-2.4-4.5 2.4.9-4.9-3.6-3.5 5-.7z" fill="#fff" stroke="none"/></svg>';
  const SVG_CBOX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/><path d="m7.5 12 3 3 6-6.5"/></svg>';
  const SVG_PLAY =
    '<svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="46" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="3"/><path d="M41 33 71 50 41 67Z" fill="#fff"/></svg>';
  const SVG_ARROW =
    '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="21"/><path d="m17 16 8 8-8 8M27 16l8 8-8 8"/></svg>';

  // fitas: SVG com as cores reais correndo pelo caminho (path) de cada fita.
  // esquerda flui no sentido da seta (desce), direita no oposto (sobe).
  let RIBBONS = {};
  // cores exatas por tela/lado (conforme a arte original)
  const C = { red: '#ED1C24', green: '#00A04A', pink: '#FF66AA', blue: '#1E84CC', yellow: '#FFCB05' };
  const RIBBON_COLORS = {
    idle: { left: [C.red, C.green, C.pink], right: [C.red, C.blue, C.yellow] },
    selection: { left: [C.green, C.pink, C.blue] },
    podium: { left: [C.pink, C.blue], right: [C.blue, C.yellow] },
    thanks: { left: [C.pink, C.blue], right: [C.yellow, C.blue] },
  };
  function ribbon(screen) {
    const comps = RIBBONS[screen] || [];
    const cmap = RIBBON_COLORS[screen] || {};
    const groups = { left: '', right: '' };
    for (const c of comps) {
      const colors = cmap[c.side];
      if (!colors || !colors.length) continue;
      const N = colors.length;
      // secoes BEM grandes: cada cor ~ metade do comprimento da fita
      const seg = Math.max(360, Math.round(((c.len || 600) + 300) * 0.5));
      const period = N * seg;
      const dur = Math.max(5, period / 150);
      const anim = c.side === 'left' ? 'dashDown' : 'dashUp';
      colors.forEach((col, k) => {
        groups[c.side] +=
          `<path d="${c.d}" stroke="${col}" stroke-width="${c.width}" ` +
          `stroke-dasharray="${seg} ${period - seg}" ` +
          `style="--o:${-k * seg}px;--period:${period}px;stroke-dashoffset:${-k * seg}px;` +
          `animation:${anim} ${dur}s linear infinite"></path>`;
      });
    }
    let g = '';
    for (const side of ['left', 'right']) if (groups[side]) g += `<g data-edit="ribbon-${side}">${groups[side]}</g>`;
    return `<svg class="ribbon-svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">${g}</svg>`;
  }

  // bandeja de acessibilidade (idiomas) - recolhida por padrao fora do idle
  // bandeja de acessibilidade recriada em CSS (4 circulos: PT/EN/ES + acessib.)
  // recolhe sozinha apos inatividade; expande/recolhe com animacao (slide).
  // mao (Libras) azul, igual ao painel original
  const SVG_A11Y =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#1565c0" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 11V5.6a1.4 1.4 0 0 1 2.8 0V10"/><path d="M10.8 10V4.4a1.4 1.4 0 0 1 2.8 0V10"/>' +
    '<path d="M13.6 10.4V6a1.4 1.4 0 0 1 2.8 0v5"/>' +
    '<path d="M16.4 9.6a1.4 1.4 0 0 1 2.8 0V15a6 6 0 0 1-6 6h-1.6a6 6 0 0 1-5.2-3l-2.2-3.9a1.4 1.4 0 0 1 2.5-1.4L8 14"/></svg>';
  let a11yOpen = false;
  let a11yTimer;
  function trayHtml() {
    const langs = ['pt', 'en', 'es']
      .map((l) => `<button class="a11y-c${lang === l ? ' on' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`)
      .join('');
    return (
      `<div class="a11y${a11yOpen ? ' open' : ''}" id="a11y" data-edit="a11y">` +
      `<div class="a11y-panel">${langs}<button class="a11y-c a11y-icon" aria-label="acessibilidade">${SVG_A11Y}</button></div>` +
      `<button class="a11y-tab" id="a11ytoggle">${a11yOpen ? '‹' : '›'}</button>` +
      `</div>`
    );
  }
  function a11yAutoClose() {
    clearTimeout(a11yTimer);
    if (!a11yOpen || scr === 'idle') return; // no idle fica sempre expandido
    a11yTimer = setTimeout(() => {
      a11yOpen = false;
      const t = document.getElementById('a11y');
      if (t) {
        t.classList.remove('open');
        const g = document.getElementById('a11ytoggle');
        if (g) g.textContent = '›';
      }
    }, 6000);
  }
  function wireTray() {
    const tray = document.getElementById('a11y');
    if (tray) tray.addEventListener('click', (e) => e.stopPropagation());
    const tgl = document.getElementById('a11ytoggle');
    if (tgl)
      tgl.addEventListener('click', (e) => {
        e.stopPropagation();
        a11yOpen = !a11yOpen;
        const t = document.getElementById('a11y');
        t.classList.toggle('open', a11yOpen);
        tgl.textContent = a11yOpen ? '‹' : '›';
        a11yAutoClose();
      });
    document.querySelectorAll('.a11y-c[data-lang]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        lang = b.dataset.lang;
        a11yOpen = true;
        a11yAutoClose();
        updateTexts();
      }),
    );
    a11yAutoClose();
  }
  function rerenderCurrent() {
    if (scr === 'idle') renderIdle();
    else if (scr === 'selection') renderSelection();
    else if (scr === 'podium') renderPodium();
    else if (scr === 'thanks') renderThanks();
  }
  // troca de idioma SEM recriar a tela (evita piscar): atualiza so os textos
  function updateTexts() {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    const setLast = (sel, val) => { const el = document.querySelector(sel); if (el && el.lastChild) el.lastChild.textContent = val; };
    if (scr === 'idle') {
      set('.t-red', t('idle.line1')); set('.t-green', t('idle.line2'));
      set('.ib1', t('idle.box')); set('.ib2', t('idle.cta'));
    } else if (scr === 'selection') {
      set('.list-title', t('selection.title'));
      setLast('.advance', t('selection.advance'));
      if (highlightedId) {
        const d = byId(highlightedId);
        set('.gres-banner', d.gres || d.escola);
        set('.gres-enredo', `${d.enredo}, ${d.ano}`);
      }
    } else if (scr === 'podium') {
      set('.podium-title', t('podium.title'));
      setLast('.confirm-btn', t('podium.confirm'));
    } else if (scr === 'thanks') {
      set('.thanks-title', t('thanks.title'));
      set('.thanks-sub', t('thanks.subtitle'));
    }
    document.querySelectorAll('.a11y-c[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  }

  // ---- i18n ----
  function t(key) {
    const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), locales[lang]);
    return typeof v === 'string' ? v : key;
  }
  const byId = (id) => desfiles.find((d) => d.id === id);

  function setScreen(name, html) {
    scr = name;
    screen.innerHTML = html;
  }

  // ===================== IDLE =====================
  function renderIdle() {
    clearTimeout(inactivityTimer);
    clearTimeout(returnTimer);
    top3 = [];
    highlightedId = null;
    lastHighlight = null;
    a11yOpen = true; // idle: painel de acessibilidade expandido (como na arte)
    setScreen(
      'idle',
      `<div class="scr scr-idle" id="idle">
        <img class="idle-bg" src="/assets/brand/idle-photo.jpg" alt="" />
        ${ribbon('idle')}
        <div class="idle-title" data-edit="idle-title">
          <span class="t-bar t-red">${t('idle.line1')}</span>
          <span class="t-bar t-green">${t('idle.line2')}</span>
        </div>
        <img class="idle-logo" src="/assets/brand/logo.png" alt="" data-edit="idle-logo" />
        <div class="idle-box" data-edit="idle-box">
          <img class="idle-mask" src="/assets/icons/mask.png" alt="" />
          <div class="idle-box-text">
            <div class="ib1">${t('idle.box')}</div>
            <div class="ib2">${t('idle.cta')}</div>
          </div>
        </div>
        ${trayHtml()}
      </div>`,
    );
    document.getElementById('idle').addEventListener('click', startVote);
    wireTray();
  }

  // ===================== SELECTION =====================
  function startVote() {
    top3 = [];
    highlightedId = null;
    lastHighlight = null;
    a11yOpen = false; // depois do idle: bandeja recolhe
    renderSelection();
    resetInactivity();
  }

  // o video toca assim que a opcao e tocada (sem botao de play)
  function videoStageHtml() {
    const d = highlightedId ? byId(highlightedId) : null;
    return d && d.still ? `<img src="/assets/${d.still}" alt="" />` : '';
  }
  // titulo ACIMA do video (banner GRES + enredo), so quando ha destaque
  function videoTitleHtml() {
    const d = highlightedId ? byId(highlightedId) : null;
    if (!d) return '';
    return (
      `<div class="gres-banner">${d.gres || d.escola}</div>` +
      `<div class="gres-enredo">${d.enredo}, ${d.ano}</div>`
    );
  }

  function pillsHtml() {
    return desfiles
      .map((d) => {
        const thumb = d.thumb
          ? `<img class="thumb" src="/assets/${d.thumb}" alt="" />`
          : `<div class="thumb"></div>`;
        return (
          `<div class="pill${d.real ? '' : ' placeholder'}" data-id="${d.id}">` +
          thumb +
          `<div class="name">${d.escola}, ${d.ano}</div>` +
          `<div class="check"></div>` +
          `<div class="num"></div>` +
          `</div>`
        );
      })
      .join('');
  }

  // monta a tela UMA vez; interacoes atualizam o DOM no lugar (sem rebuild -> sem blink)
  function renderSelection() {
    setScreen(
      'selection',
      `<div class="scr">
        ${ribbon('selection')}
        ${trayHtml()}
        <div class="list-title" data-edit="sel-title">${t('selection.title')}</div>
        <div class="sel-list" id="list" data-edit="sel-list">${pillsHtml()}</div>
        <div class="video-title" id="video-title" data-edit="sel-videotitle"></div>
        <div class="stage-video" id="video" data-edit="sel-video"></div>
        <button class="advance disabled" id="advance" data-edit="sel-advance">
          <span class="adv-icon">${SVG_ARROW}</span>${t('selection.advance')}
        </button>
      </div>`,
    );
    lastHighlight = '__none__'; // forca o primeiro render do video
    document.getElementById('list').addEventListener('click', onListClick);
    document.getElementById('advance').addEventListener('click', () => {
      if (top3.length === 3) renderPodium();
    });
    wireTray();
    updateSelection();
  }

  // atualiza pills + video + botao SEM recriar a tela (corrige o blink)
  function updateSelection() {
    document.querySelectorAll('#list .pill').forEach((p) => {
      const order = top3.indexOf(p.dataset.id);
      const sel = order >= 0;
      p.classList.toggle('selected', sel);
      p.querySelector('.check').innerHTML = sel ? SVG_CHECK : '';
      p.querySelector('.num').textContent = sel ? String(order + 1) : '';
    });
    if (highlightedId !== lastHighlight) {
      document.getElementById('video').innerHTML = videoStageHtml();
      document.getElementById('video-title').innerHTML = videoTitleHtml();
      lastHighlight = highlightedId;
    }
    document.getElementById('advance').classList.toggle('disabled', top3.length !== 3);
  }

  // tocar o pill inteiro = voto (toggle) + tocar o video
  function onListClick(e) {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    const id = pill.dataset.id;
    const i = top3.indexOf(id);
    if (i >= 0) top3.splice(i, 1);
    else if (top3.length < 3) top3.push(id);
    highlightedId = id; // sempre toca o video da opcao tocada
    updateSelection();
  }

  // ===================== PODIUM (CONFIRME SEUS VOTOS) =====================
  function colHtml(d, rank, cls) {
    if (!d) return '';
    return (
      `<div class="col ${cls}">` +
      `<div class="rank">${rank}</div>` +
      `<div class="box">` +
      (rank === 1 ? `<div class="trophy">${SVG_TROPHY}</div>` : '') +
      `<div class="desc">${d.enredo}, <b>${d.escola}</b> - ${d.ano}</div>` +
      `</div></div>`
    );
  }

  function renderPodium() {
    setScreen(
      'podium',
      `<div class="scr">
        ${ribbon('podium')}
        ${trayHtml()}
        <div class="podium-title" data-edit="pod-title">${t('podium.title')}</div>
        <div class="podium-wrap" data-edit="pod-wrap">
          ${colHtml(byId(top3[1]), 2, 'col-2')}
          ${colHtml(byId(top3[0]), 1, 'col-1')}
          ${colHtml(byId(top3[2]), 3, 'col-3')}
          <div class="podium-base"></div>
        </div>
        <button class="confirm-btn" id="confirm" data-edit="pod-confirm"><span class="cbox">${SVG_CBOX}</span>${t('podium.confirm')}</button>
      </div>`,
    );
    document.getElementById('confirm').addEventListener('click', confirmVote);
    wireTray();
    resetInactivity();
  }

  async function confirmVote() {
    clearTimeout(inactivityTimer);
    const payload = [...top3];
    renderThanks();
    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top3: payload, station }),
      });
    } catch (err) {
      console.error('falha ao enviar voto', err);
    }
    if (!EDITING) returnTimer = setTimeout(renderIdle, cfg.confirmation_return_s * 1000);
  }

  // ===================== THANKS =====================
  function renderThanks() {
    setScreen(
      'thanks',
      `<div class="scr scr-thanks" id="thanks">
        ${ribbon('thanks')}
        <h1 class="thanks-title" data-edit="thx-title">${t('thanks.title')}</h1>
        <img class="thanks-logo" src="/assets/brand/logo-big.png" alt="" data-edit="thx-logo" />
        <p class="thanks-sub" data-edit="thx-sub">${t('thanks.subtitle')}</p>
        ${trayHtml()}
      </div>`,
    );
    document.getElementById('thanks').addEventListener('click', renderIdle);
    wireTray();
  }

  // ---- timeout de inatividade ----
  function resetInactivity() {
    clearTimeout(inactivityTimer);
    if (EDITING || scr === 'idle' || scr === 'thanks') return;
    inactivityTimer = setTimeout(renderIdle, cfg.timeout_s * 1000);
  }
  window.addEventListener('pointerdown', resetInactivity);

  // ---- boot ----
  async function boot() {
    const [d, l, rb] = await Promise.all([
      fetch('/api/desfiles').then((r) => r.json()),
      fetch('/api/locales').then((r) => r.json()),
      fetch('/assets/ribbons.json').then((r) => r.json()).catch(() => ({})),
    ]);
    desfiles = d;
    locales = l;
    RIBBONS = rb;
    try {
      const c = await fetch('/api/config/5.1.3a').then((r) => r.json());
      cfg.timeout_s = c.timeout_s ?? cfg.timeout_s;
      cfg.confirmation_return_s = c.confirmation_return_s ?? cfg.confirmation_return_s;
      lang = c.default_language || lang;
    } catch (_) {
      /* defaults */
    }
    renderIdle();
  }

  if (EDITING) {
    window.__editNav = [
      { label: 'Idle', fn: () => renderIdle() },
      { label: 'Seleção', fn: () => startVote() },
      {
        label: 'Pódio',
        fn: () => {
          top3 = desfiles.slice(0, 3).map((d) => d.id);
          highlightedId = null;
          renderPodium();
        },
      },
      { label: 'Obrigado', fn: () => renderThanks() },
    ];
  }

  boot();
})();
