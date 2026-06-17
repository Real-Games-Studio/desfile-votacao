// Servidor agregador de votos - roda no PC do Ranking (instancia unica na LAN).
// - Recebe votos das 3 estacoes touch (POST /api/vote)
// - Mantem tally em memoria, persiste em data/votes.json (append-only)
// - Faz broadcast do ranking via WebSocket (/ws) a cada voto
// - Em producao tambem serve os builds estaticos de touch/ e ranking/

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { computeRanking } from './ranking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(__dirname, '..', 'data');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');
const USAGE_LOG = path.join(DATA_DIR, 'usage.log');

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// ---- carrega dados estaticos de configuracao ----
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const desfiles = readJson(path.join(ROOT, 'shared', 'desfiles.json'));
const scoring = readJson(path.join(ROOT, 'config', 'scoring.json'));
const configById = {
  '5.1.3a': readJson(path.join(ROOT, 'config', '5.1.3a.json')),
  '5.1.3b': readJson(path.join(ROOT, 'config', '5.1.3b.json')),
};
const locales = {
  pt: readJson(path.join(ROOT, 'shared', 'locales', 'pt.json')),
  en: readJson(path.join(ROOT, 'shared', 'locales', 'en.json')),
  es: readJson(path.join(ROOT, 'shared', 'locales', 'es.json')),
};
const validIds = new Set(desfiles.map((d) => d.id));

// ---- estado em memoria + persistencia ----
fs.mkdirSync(DATA_DIR, { recursive: true });
/** @type {Array<{top3:string[],station:string,ts:number}>} */
let votes = [];
if (fs.existsSync(VOTES_FILE)) {
  try {
    votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8'));
    if (!Array.isArray(votes)) votes = [];
  } catch {
    votes = [];
  }
}

let snapshot = computeRanking(votes, desfiles, scoring);

function persistVotes() {
  fs.writeFile(VOTES_FILE, JSON.stringify(votes), (err) => {
    if (err) console.error('[votes] falha ao persistir:', err.message);
  });
}

function logUsage(line) {
  fs.appendFile(USAGE_LOG, line + '\n', () => {});
}

// ---- app HTTP ----
const app = express();
app.use(express.json());

// CORS permissivo (LAN fechada; em dev os front-ends rodam em portas Vite distintas)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, votes: votes.length, uptime: process.uptime() });
});

app.get('/api/desfiles', (_req, res) => res.json(desfiles));

app.get('/api/locales', (_req, res) => res.json(locales));

app.get('/api/config/:id', (req, res) => {
  const cfg = configById[req.params.id];
  if (!cfg) return res.status(404).json({ error: 'config nao encontrada' });
  res.json(cfg);
});

app.get('/api/ranking', (_req, res) => res.json(snapshot));

// ---- overrides do modo edit (layout ajustado na tela, persistido) ----
const overrideFile = (appName) => {
  const safe = appName === 'ranking' ? 'ranking' : 'touch';
  return path.join(DATA_DIR, `overrides-${safe}.json`);
};
app.get('/api/overrides/:app', (req, res) => {
  const f = overrideFile(req.params.app);
  if (fs.existsSync(f)) {
    try { return res.json(JSON.parse(fs.readFileSync(f, 'utf-8'))); } catch { /* vazio */ }
  }
  res.json({});
});
app.post('/api/overrides/:app', (req, res) => {
  fs.writeFile(overrideFile(req.params.app), JSON.stringify(req.body || {}, null, 2), (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.post('/api/vote', (req, res) => {
  const body = req.body || {};
  const top3 = Array.isArray(body.top3) ? body.top3.slice(0, 3) : [];
  const station = String(body.station ?? 'unknown');

  // validacao: 1 a 3 ids validos, sem repeticao
  const clean = [];
  for (const id of top3) {
    if (validIds.has(id) && !clean.includes(id)) clean.push(id);
  }
  if (clean.length < 1) {
    return res.status(400).json({ error: 'voto invalido: nenhum desfile valido' });
  }

  const vote = { top3: clean, station, ts: Date.now() };
  votes.push(vote);
  persistVotes();
  logUsage(`${new Date(vote.ts).toISOString()} vote station=${station} top3=${clean.join(',')}`);

  snapshot = computeRanking(votes, desfiles, scoring);
  scheduleBroadcast();

  res.json({ ok: true, position: null });
});

// ---- serve os front-ends estaticos (HTML/CSS/JS puro, sem build) e os assets ----
app.use('/assets', express.static(path.join(ROOT, 'assets')));
app.use('/touch', express.static(path.join(ROOT, 'touch')));
app.use('/ranking', express.static(path.join(ROOT, 'ranking')));

// ---- HTTP + WebSocket no mesmo servidor ----
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  // manda o estado atual assim que conecta
  ws.send(JSON.stringify({ type: 'ranking', snapshot }));
});

let broadcastTimer = null;
function scheduleBroadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    const payload = JSON.stringify({ type: 'ranking', snapshot });
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload);
    }
  }, 300); // debounce
}

server.listen(PORT, HOST, () => {
  console.log(`[desfile] servidor ouvindo em http://${HOST}:${PORT}`);
  console.log(`[desfile] votos carregados: ${votes.length}`);
});
