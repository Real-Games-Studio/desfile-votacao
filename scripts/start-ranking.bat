@echo off
REM ============================================================
REM  PC do RANKING (o host).
REM  Sobe o servidor + abre a tela de 75" em tela cheia.
REM  Coloque um atalho deste arquivo na pasta de Inicializacao
REM  do Windows pra subir sozinho no boot.
REM ============================================================
setlocal
cd /d "%~dp0.."

REM --- acha o navegador (Chrome, senao Edge) ---
set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%BROWSER%" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

REM --- sobe o servidor (host) minimizado ---
start "Desfile Server" /min cmd /c "node server\src\index.js"

REM --- espera o servidor ficar pronto ---
timeout /t 3 /nobreak >nul

REM --- abre o ranking em modo kiosk (tela cheia, sem barra) ---
start "" "%BROWSER%" --kiosk --app=http://localhost:8080/ranking/ --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-features=TranslateUI

endlocal
