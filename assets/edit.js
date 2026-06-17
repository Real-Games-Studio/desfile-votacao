// Modo edit visual para as apps (touch e ranking). HTML/CSS/JS puro.
// - Sempre: carrega overrides salvos e aplica nos elementos [data-edit] (e re-aplica apos re-render).
// - Com ?edit=1: liga o editor (selecionar, arrastar, escalar, girar, z-index) e salvar.

(() => {
  'use strict';
  const EDIT = new URLSearchParams(location.search).has('edit');
  const APP = location.pathname.includes('/ranking') ? 'ranking' : 'touch';
  const stage = document.getElementById('stage');
  const screen = document.getElementById('screen');
  let overrides = {};

  const scale = () => parseFloat(getComputedStyle(stage).getPropertyValue('--s')) || 1;
  const tfStr = (o) =>
    `translate(${o.x || 0}px, ${o.y || 0}px) rotate(${o.r || 0}deg) scale(${o.s == null ? 1 : o.s})`;

  function applyTo(el) {
    const o = overrides[el.dataset.edit];
    if (!o) return;
    el.style.transform = tfStr(o);
    el.style.transformOrigin = 'center center';
    if (el instanceof SVGElement) el.style.transformBox = 'fill-box'; // gira/escala pelo centro da fita
    if (o.z != null) el.style.zIndex = o.z;
  }
  function applyAll() {
    document.querySelectorAll('[data-edit]').forEach(applyTo);
  }

  // re-aplica apos cada re-render das telas (e atualiza a lista no modo edit)
  function onMutate() {
    applyAll();
    if (EDIT && typeof populateList === 'function') populateList();
  }
  new MutationObserver(onMutate).observe(screen, { childList: true, subtree: true });

  fetch(`/api/overrides/${APP}`)
    .then((r) => r.json())
    .then((o) => { overrides = o || {}; applyAll(); if (EDIT) refreshOutline(); })
    .catch(() => {});

  if (!EDIT) return; // produção: só aplica e sai

  // ======================= EDITOR =======================
  document.documentElement.classList.add('editing');
  const css = document.createElement('style');
  css.textContent = `
    .editing #screen * { animation: none !important; }
    .editing #screen .ribbon-svg { pointer-events: none; }
    .editing #screen .ribbon-svg g[data-edit] { pointer-events: stroke; }
    [data-edit] { cursor: move; }
    .edit-sel { outline: 2px dashed #00e0ff !important; outline-offset: 2px; }
    .ribbon-svg g[data-edit].edit-sel { outline: none; }
    #edit-panel select { width: 130px; background: #0a0e16; color: #fff; border: 1px solid #2a3550; border-radius: 4px; padding: 4px; }
    #edit-panel #enav button { flex: 0 0 auto; padding: 6px 10px; font-size: 12px; background: #2a3550; }
    #edit-panel #enav button.on { background: #1e84cc; }
    #edit-panel { position: fixed; top: 12px; left: 12px; z-index: 99999;
      background: #11151f; color: #fff; font: 13px/1.4 system-ui, sans-serif;
      border: 1px solid #2a3550; border-radius: 8px; padding: 12px; width: 230px;
      box-shadow: 0 8px 30px rgba(0,0,0,.5); cursor: default; }
    #edit-panel h3 { margin: 0 0 8px; font-size: 13px; color: #00e0ff; }
    #edit-panel .key { font-weight: 700; word-break: break-all; margin-bottom: 8px; min-height: 18px; }
    #edit-panel label { display: flex; align-items: center; justify-content: space-between; margin: 5px 0; }
    #edit-panel input { width: 110px; background: #0a0e16; color: #fff; border: 1px solid #2a3550;
      border-radius: 4px; padding: 4px 6px; }
    #edit-panel .row { display: flex; gap: 6px; margin-top: 10px; }
    #edit-panel button { flex: 1; background: #1e84cc; color: #fff; border: 0; border-radius: 5px;
      padding: 7px; font-weight: 700; cursor: pointer; }
    #edit-panel button.ghost { background: #2a3550; }
    #edit-panel .hint { color: #7c89a8; font-size: 11px; margin-top: 8px; }
    #edit-toast { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 99999;
      background: #00a04a; color: #fff; padding: 10px 18px; border-radius: 6px; font: 600 14px system-ui;
      opacity: 0; transition: opacity .25s; pointer-events: none; }
    #edit-toast.show { opacity: 1; }`;
  document.head.appendChild(css);

  const panel = document.createElement('div');
  panel.id = 'edit-panel';
  panel.innerHTML =
    `<h3>✎ Modo edit — ${APP}</h3>` +
    `<div id="enav" class="row" style="flex-wrap:wrap;margin:0 0 10px"></div>` +
    `<label>Elemento <select id="elist"></select></label>` +
    `<div class="key" id="ek">(clique num elemento)</div>` +
    `<label>X <input id="ix" type="number" step="1"></label>` +
    `<label>Y <input id="iy" type="number" step="1"></label>` +
    `<label>Escala <input id="is" type="number" step="0.02"></label>` +
    `<label>Rotação <input id="ir" type="number" step="1"></label>` +
    `<label>Z-index <input id="iz" type="number" step="1"></label>` +
    `<div class="row"><button id="ereset" class="ghost">Resetar</button><button id="esave">Salvar</button></div>` +
    `<div class="hint">Arrastar = mover · roda = escala · Shift+roda = girar</div>`;
  document.body.appendChild(panel);
  const toast = document.createElement('div');
  toast.id = 'edit-toast';
  document.body.appendChild(toast);

  const $ = (id) => document.getElementById(id);
  let sel = null; // elemento selecionado
  let key = null;

  function ov() {
    if (!overrides[key]) overrides[key] = {};
    return overrides[key];
  }
  function refreshPanel() {
    const o = key ? overrides[key] || {} : {};
    $('ek').textContent = key || '(clique num elemento)';
    $('ix').value = Math.round(o.x || 0);
    $('iy').value = Math.round(o.y || 0);
    $('is').value = o.s == null ? 1 : o.s;
    $('ir').value = o.r || 0;
    $('iz').value = o.z == null ? '' : o.z;
  }
  function refreshOutline() {
    document.querySelectorAll('.edit-sel').forEach((e) => e.classList.remove('edit-sel'));
    if (sel) sel.classList.add('edit-sel');
  }
  function select(el) {
    sel = el; key = el.dataset.edit;
    refreshOutline(); refreshPanel();
    const l = $('elist'); if (l) l.value = key;
  }
  function selectKey(k) {
    const el = document.querySelector(`[data-edit="${CSS.escape(k)}"]`);
    if (el) select(el);
  }
  function applySel() { if (sel) applyTo(sel); }
  function populateList() {
    const list = $('elist');
    if (!list) return;
    const keys = [...document.querySelectorAll('[data-edit]')].map((e) => e.dataset.edit);
    list.innerHTML =
      '<option value="">— escolher —</option>' + keys.map((k) => `<option value="${k}">${k}</option>`).join('');
    if (key && keys.includes(key)) list.value = key;
  }
  function buildNav() {
    const nav = $('enav');
    const items = window.__editNav || [];
    nav.innerHTML = items.map((it, i) => `<button data-nav="${i}">${it.label}</button>`).join('');
    nav.querySelectorAll('[data-nav]').forEach((b) =>
      b.addEventListener('click', () => {
        items[+b.dataset.nav].fn();
        nav.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        setTimeout(populateList, 80);
      }),
    );
  }

  // inputs -> override
  ['ix', 'iy', 'is', 'ir', 'iz'].forEach((id) => {
    $(id).addEventListener('input', () => {
      if (!key) return;
      const o = ov();
      o.x = parseFloat($('ix').value) || 0;
      o.y = parseFloat($('iy').value) || 0;
      o.s = parseFloat($('is').value);
      if (isNaN(o.s)) o.s = 1;
      o.r = parseFloat($('ir').value) || 0;
      o.z = $('iz').value === '' ? null : parseInt($('iz').value, 10);
      applySel();
    });
  });
  $('ereset').addEventListener('click', () => {
    if (!key) return;
    delete overrides[key];
    if (sel) { sel.style.transform = ''; sel.style.zIndex = ''; }
    refreshPanel();
  });
  $('esave').addEventListener('click', () => {
    fetch(`/api/overrides/${APP}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(overrides),
    }).then(() => { toast.textContent = 'Salvo!'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1400); });
  });

  // arrastar pra mover (captura, pra nao disparar acoes da app)
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#edit-panel')) return; // deixa o painel funcionar
    const el = e.target.closest('[data-edit]');
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    select(el);
    const o = ov();
    drag = { sx: e.clientX, sy: e.clientY, ox: o.x || 0, oy: o.y || 0 };
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const s = scale();
    const o = ov();
    o.x = Math.round(drag.ox + (e.clientX - drag.sx) / s);
    o.y = Math.round(drag.oy + (e.clientY - drag.sy) / s);
    applySel(); refreshPanel();
  }, true);
  document.addEventListener('pointerup', () => { drag = null; }, true);

  // bloqueia cliques da app (ex: idle -> votar) enquanto edita
  document.addEventListener('click', (e) => {
    if (e.target.closest('#edit-panel')) return;
    if (e.target.closest('#stage')) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // roda = escala · Shift+roda = girar
  document.addEventListener('wheel', (e) => {
    if (!sel || !e.target.closest('#stage')) return;
    e.preventDefault();
    const o = ov();
    if (e.shiftKey) o.r = (o.r || 0) + (e.deltaY > 0 ? -2 : 2);
    else o.s = Math.max(0.1, +((o.s == null ? 1 : o.s) + (e.deltaY > 0 ? -0.03 : 0.03)).toFixed(3));
    applySel(); refreshPanel();
  }, { passive: false });

  $('elist').addEventListener('change', () => { const v = $('elist').value; if (v) selectKey(v); });
  buildNav();
  populateList();
  refreshPanel();
})();
