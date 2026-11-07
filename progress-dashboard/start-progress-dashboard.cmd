@echo off
title SIGAP progress dashboard (localhost:4173)
cd /d "D:\Projects\hackathon_tencent\progress-dashboard"
echo ============================================================
echo  SIGAP progress dashboard - audit ISO 27001 (simulasi)
echo  LIVE di http://localhost:4173
echo  View per task:
echo    manager  : http://localhost:4173/#manager
echo    assessor : http://localhost:4173/#assessor
echo    staf     : http://localhost:4173/#staf/dc-server
echo  (id staf: dc-server, network-user, appdev, sap-func,
echo   sap-basis, cyber-security)
echo  Tekan Ctrl+C untuk berhenti.
echo ============================================================
echo.
call npm run dev
pause