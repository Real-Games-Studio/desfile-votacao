# Votação — Melhor Desfile de Todos os Tempos (Carnaval XP)

Dois interativos do Setor D: Epopeia que se conectam, num **monorepo web** (sem internet,
roda 100% local na LAN):

- **`touch/`** — 5.1.3a, 3 totens 32" touch. Visitante escolhe seu top 3 entre 10 desfiles.
- **`ranking/`** — 5.1.3b, 1 tela 75" signage. Mostra o ranking ao vivo (Loop A barras / Loop B pódio).
- **`server/`** — agregador de votos (roda **no PC do ranking**). Recebe votos das 3 estações,
  mantém o tally e faz broadcast via WebSocket.

## Stack
Node + Express + `ws` (servidor) · **HTML + CSS + JavaScript puro** nos front-ends (sem build, sem
framework). Chromium kiosk. Persistência: `server/data/votes.json` (append-only, sobrevive a
reboot). Sem dependência nativa.

## Rodar (sem build — o servidor serve tudo)
```bash
npm install
npm start          # ou: npm run dev  (com --watch)
```
- Touch:   http://localhost:8080/touch/?station=1
- Ranking: http://localhost:8080/ranking/
- API/WS:  http://localhost:8080

Vote no touch e veja o ranking animar ao vivo. Editar um `.html/.css/.js` e dar F5 já reflete —
não há etapa de build.

### Deploy nas máquinas (LAN cabeada)
Guia passo a passo (com prints de cada etapa) em **[INSTALL.md](INSTALL.md)**. Resumo:
- **PC do ranking** (host, ex. IP `192.168.0.10`): instala Node, libera firewall
  (`scripts/setup-firewall.bat`), sobe com `scripts/start-ranking.bat`.
- **3 PCs touch**: só copiam `scripts/start-totem.bat`, editam IP + número da estação, duplo-clique.
  Não instalam Node nem copiam o projeto.

## Kiosk
Os front-ends mostram o cursor por padrão (fase de teste). Para o modo kiosk de produção,
adicione a classe `kiosk` no `<body>` (`document.body.classList.add('kiosk')`) ou troque a regra
`cursor` no `style.css` — aí o cursor some.

## Configuração
- `config/5.1.3a.json` / `5.1.3b.json` — timeouts, idiomas, durações dos loops.
- `config/scoring.json` — regra do ranking (`weighted` 3/2/1 ou `count`).
- `shared/desfiles.json` — os 10 desfiles. `shared/locales/*` — textos PT/EN/ES.

## Acervo
Mídias em `assets/` (ver `assets/README.md`). Os apps degradam graciosamente sem elas.
