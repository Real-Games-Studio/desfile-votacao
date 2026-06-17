// Shim do showcase estatico (GitHub Pages, sem servidor).
// Intercepta /api/* (dados embutidos + voto no localStorage) e finge o WebSocket
// (ranking ao vivo entre abas do mesmo navegador via BroadcastChannel/storage).
(() => {
  'use strict';
  const SD = window.__SD || {};
  const VKEY = 'desfile_votes';
  const WEIGHTS = { 1: 3, 2: 2, 3: 1 };
  const getVotes = () => { try { return JSON.parse(localStorage.getItem(VKEY) || '[]'); } catch { return []; } };
  const setVotes = (v) => localStorage.setItem(VKEY, JSON.stringify(v));

  function computeRanking() {
    const desfiles = SD.desfiles || [];
    const votes = getVotes();
    const points = new Map(desfiles.map((d) => [d.id, 0]));
    for (const v of votes)
      (v.top3 || []).forEach((id, i) => {
        if (points.has(id)) points.set(id, points.get(id) + (WEIGHTS[i + 1] || 0));
      });
    const total = [...points.values()].reduce((a, b) => a + b, 0);
    const entries = desfiles
      .map((d) => ({
        id: d.id, escola: d.escola, gres: d.gres, ano: d.ano, enredo: d.enredo,
        still: d.still, thumb: d.thumb, real: d.real,
        points: points.get(d.id) || 0,
        pct: total > 0 ? Math.round((points.get(d.id) / total) * 100) : 0,
      }))
      .sort((a, b) => b.points - a.points || a.escola.localeCompare(b.escola))
      .map((e, i) => ({ ...e, position: i + 1 }));
    return { entries, totalVotes: votes.length, updatedAt: Date.now() };
  }

  const bc = (() => { try { return new BroadcastChannel('desfile'); } catch { return { postMessage() {} }; } })();

  // ---- fetch shim (so /api/*; o resto e arquivo real) ----
  const realFetch = window.fetch.bind(window);
  const J = (o) => Promise.resolve(new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } }));
  window.fetch = (url, opts = {}) => {
    const m = String(url).match(/\/api\/([^?]*)/);
    if (!m) return realFetch(url, opts);
    const p = m[1];
    if (p === 'desfiles') return J(SD.desfiles || []);
    if (p === 'locales') return J(SD.locales || {});
    if (p.startsWith('config/')) return J((SD.config || {})[p.split('/')[1]] || {});
    if (p === 'ranking') return J(computeRanking());
    if (p === 'vote') {
      const body = JSON.parse(opts.body || '{}');
      const valid = new Set((SD.desfiles || []).map((d) => d.id));
      const clean = [];
      (body.top3 || []).forEach((id) => { if (valid.has(id) && !clean.includes(id)) clean.push(id); });
      if (clean.length) {
        const v = getVotes();
        v.push({ top3: clean, station: body.station || '1', ts: Date.now() });
        setVotes(v);
        try { bc.postMessage('vote'); } catch {}
      }
      return J({ ok: true });
    }
    if (p.startsWith('overrides/')) {
      const appn = p.split('/')[1] === 'ranking' ? 'ranking' : 'touch';
      if ((opts.method || 'GET').toUpperCase() === 'POST') {
        localStorage.setItem('ov_' + appn, opts.body || '{}');
        return J({ ok: true });
      }
      try { return J(JSON.parse(localStorage.getItem('ov_' + appn) || '{}')); } catch { return J({}); }
    }
    return J({});
  };

  // ---- WebSocket falso (ranking ao vivo entre abas do mesmo navegador) ----
  window.WebSocket = function () {
    const self = { readyState: 1, send() {}, close() {}, onopen: null, onmessage: null, onclose: null, onerror: null };
    const emit = () => self.onmessage && self.onmessage({ data: JSON.stringify({ type: 'ranking', snapshot: computeRanking() }) });
    setTimeout(() => { self.onopen && self.onopen(); emit(); }, 40);
    try { bc.onmessage = emit; } catch {}
    window.addEventListener('storage', (e) => { if (e.key === VKEY) emit(); });
    return self;
  };
})();
