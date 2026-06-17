@echo off
REM ============================================================
REM  Rode UMA VEZ, como ADMINISTRADOR, no PC do RANKING.
REM  Libera a porta 8080 pra os totens conseguirem se conectar.
REM  (Clique direito neste arquivo -> "Executar como administrador")
REM ============================================================
netsh advfirewall firewall add rule name="Desfile Votacao 8080" dir=in action=allow protocol=TCP localport=8080
echo.
echo Porta 8080 liberada no firewall. Pode fechar.
pause
