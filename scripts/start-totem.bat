@echo off
REM ============================================================
REM  TOTEM TOUCH (copie este arquivo pra cada um dos 3 totens).
REM  Abre a tela de votacao em tela cheia, apontando pro host.
REM
REM  >>> EDITE AS 2 LINHAS ABAIXO <<<
REM    SERVER  = IP fixo do PC do ranking (host) na rede
REM    STATION = numero deste totem: 1, 2 ou 3
REM ============================================================
setlocal
set "SERVER=http://192.168.0.10:8080"
set "STATION=1"

REM --- acha o navegador (Chrome, senao Edge) ---
set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%BROWSER%" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

start "" "%BROWSER%" --kiosk --app=%SERVER%/touch/?station=%STATION% --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-features=TranslateUI --overscroll-history-navigation=0

endlocal
