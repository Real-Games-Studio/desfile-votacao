# Instalação nos PCs (Carnaval XP)

Setup: **4 PCs** na mesma rede cabeada (switch + cabo). 1 vira o **host (ranking)**, os outros 3 são **totens touch**.

> Importante: **só o PC do ranking instala alguma coisa.** Os totens são só um navegador
> apontando pro host — não copiam o projeto nem instalam nada além do navegador.

---

## 1) PC do RANKING (o host) — faça uma vez

1. **Instale o Node** (o "motor" que roda o servidor): baixe o LTS em https://nodejs.org e instale (next, next, next).
2. **Copie a pasta do projeto** pra esse PC (ex.: `C:\Desfile`).
3. **IP fixo:** configure esse PC com um IP fixo na rede (ex.: `192.168.0.10`).
   (Painel de Rede → adaptador → IPv4 → IP manual.) Anote esse IP.
4. **Libere o firewall:** clique direito em `scripts\setup-firewall.bat` →
   **Executar como administrador** (faz uma vez só).
5. **Suba tudo:** dê duplo-clique em `scripts\start-ranking.bat`.
   Ele abre o servidor + a tela do ranking em tela cheia.

✅ Pronto, o host está no ar.

---

## 2) Cada TOTEM TOUCH (3x)

1. Garanta que tem **Chrome ou Edge** instalado (já costuma vir).
2. Copie só o arquivo `scripts\start-totem.bat` pro totem (não precisa do resto).
3. Abra ele no Bloco de Notas e edite as 2 linhas do topo:
   - `SERVER` = o IP do host, ex.: `http://192.168.0.10:8080`
   - `STATION` = `1` no primeiro totem, `2` no segundo, `3` no terceiro
4. Salve e dê **duplo-clique** no `start-totem.bat`.

✅ A tela de votação abre em tela cheia e já conversa com o host.

---

## 3) Subir sozinho no boot (opcional, recomendado)

Em cada PC, coloque um **atalho** do `.bat` correspondente na pasta de Inicialização:

- Tecla **Win + R** → digite `shell:startup` → Enter
- Arraste um atalho do `.bat` pra essa pasta

Aí, ao ligar o PC, ele já sobe a experiência sozinho.

---

## Sair do modo tela cheia (durante manutenção)
- **Alt + F4** fecha o navegador kiosk.
- Para zerar os votos: feche o servidor, apague `server\data\votes.json`, suba de novo.

## Dúvidas comuns
- **Totem não conecta?** Confirme que os 4 PCs estão na mesma rede, que o IP do host está
  certo no `start-totem.bat`, e que o firewall foi liberado (passo 1.4).
- **Vídeo não toca?** Faltam os arquivos de mídia em `assets\` (ver `assets\README.md`);
  sem eles aparece um bloco com o nome da escola — não quebra nada.
