// Gera a pasta docs/ (showcase estatico p/ GitHub Pages) a partir das apps.
// Adapta paths e injeta o shim. As pastas originais (server/LAN) ficam intactas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const read = (p) => fs.readFileSync(p, 'utf-8');
const readJson = (p) => JSON.parse(read(p));

// limpa docs/
fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(DOCS, { recursive: true });

// copia assets/ -> docs/assets/
fs.cpSync(path.join(ROOT, 'assets'), path.join(DOCS, 'assets'), { recursive: true });

// dados embutidos
const SD = {
  desfiles: readJson(path.join(ROOT, 'shared', 'desfiles.json')),
  locales: {
    pt: readJson(path.join(ROOT, 'shared', 'locales', 'pt.json')),
    en: readJson(path.join(ROOT, 'shared', 'locales', 'en.json')),
    es: readJson(path.join(ROOT, 'shared', 'locales', 'es.json')),
  },
  config: {
    '5.1.3a': readJson(path.join(ROOT, 'config', '5.1.3a.json')),
    '5.1.3b': readJson(path.join(ROOT, 'config', '5.1.3b.json')),
  },
};
fs.writeFileSync(path.join(DOCS, 'static-data.js'), 'window.__SD = ' + JSON.stringify(SD) + ';\n');
fs.copyFileSync(path.join(ROOT, 'scripts', 'static-shim.js'), path.join(DOCS, 'static-shim.js'));

// processa cada app (touch, ranking) -> docs/<app>/
for (const app of ['touch', 'ranking']) {
  const out = path.join(DOCS, app);
  fs.mkdirSync(out, { recursive: true });

  // app.js e style.css: /assets/ -> ../assets/ (paths relativos; /api fica pro shim)
  const js = read(path.join(ROOT, app, 'app.js')).replaceAll('/assets/', '../assets/');
  fs.writeFileSync(path.join(out, 'app.js'), js);
  const css = read(path.join(ROOT, app, 'style.css')).replaceAll('/assets/', '../assets/');
  fs.writeFileSync(path.join(out, 'style.css'), css);

  // index.html: injeta static-data + shim antes do app.js; corrige edit.js
  let html = read(path.join(ROOT, app, 'index.html'))
    .replace('/assets/edit.js', '../assets/edit.js')
    .replace(
      '<script src="app.js"></script>',
      '<script src="../static-data.js"></script>\n    <script src="../static-shim.js"></script>\n    <script src="app.js"></script>',
    );
  fs.writeFileSync(path.join(out, 'index.html'), html);
}

// landing docs/index.html
fs.writeFileSync(
  path.join(DOCS, 'index.html'),
  `<!doctype html><html lang="pt"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Votação Melhor Desfile — Carnaval XP (demo)</title>
<style>
  body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
    background:#000;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:40px}
  h1{font-size:32px;margin:0}p{color:#9fb0cf;max-width:640px;line-height:1.5}
  .cards{display:flex;gap:24px;flex-wrap:wrap;justify-content:center}
  a.card{display:block;width:300px;padding:26px;border-radius:14px;text-decoration:none;color:#fff;font-weight:800;font-size:22px;
    background:linear-gradient(135deg,#1e84cc,#0c3c78);box-shadow:0 10px 30px rgba(0,0,0,.4)}
  a.card span{display:block;font-weight:400;font-size:14px;color:#cfe2ff;margin-top:10px}
  .note{font-size:13px;color:#7c89a8;max-width:680px}
</style></head><body>
  <h1>🎭 Votação — Melhor Desfile de Todos os Tempos</h1>
  <p>Demonstração das duas telas do interativo (Carnaval XP · Rio Carnaval Expo).</p>
  <div class="cards">
    <a class="card" href="touch/?station=1">🖐️ Touch (totem)<span>Vote no seu top 3</span></a>
    <a class="card" href="ranking/">📺 Ranking (75")<span>Placar ao vivo</span></a>
  </div>
  <p class="note">Demo estática: o voto fica salvo no seu navegador (localStorage). Abra o Touch e o Ranking
  em duas abas pra ver o placar atualizar ao vivo. A votação real entre máquinas roda no servidor da LAN
  (ver INSTALL.md no repositório). Dica: adicione <b>?edit=1</b> na URL pra abrir o modo de edição visual.</p>
</body></html>\n`,
);

// .nojekyll (garante que o GitHub Pages sirva tudo, inclusive pastas com _)
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '');

console.log('OK -> docs/ gerado (touch, ranking, assets, landing)');
