@echo off
REM ============================================================
REM  TESTE LOCAL (numa maquina so, pra mostrar/conferir).
REM  Sobe o servidor e abre Ranking + Touch em janelas normais,
REM  todas apontando pra localhost (a propria maquina).
REM  Para producao nos PCs use start-ranking.bat / start-totem.bat.
REM ============================================================
setlocal
cd /d "%~dp0.."

set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%BROWSER%" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

REM sobe o servidor (se ja estiver rodando, esta linha so avisa e segue)
start "Desfile Server" /min cmd /c "node server\src\index.js"
timeout /t 3 /nobreak >nul

REM abre as duas telas em janelas separadas, em localhost
start "" "%BROWSER%" --new-window "http://localhost:8080/ranking/"
start "" "%BROWSER%" --new-window "http://localhost:8080/touch/?station=1"

endlocal
