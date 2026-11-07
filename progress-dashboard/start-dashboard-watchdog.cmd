@echo off
title SIGAP dashboard watchdog (127.0.0.1:4173)
cd /d "D:\Projects\hackathon_tencent\progress-dashboard"
echo ============================================================
echo  SIGAP dashboard watchdog - aturan 0 workflow v5.2
echo  Menjaga http://127.0.0.1:4173 tetap hidup, satu instance.
echo  JANGAN tutup jendela ini selama audit berjalan.
echo  Catatan: target nol downtime, tapi crash/PC sleep tetap ada
echo  jeda pemulihan; saat dashboard mati semua aksi fail-closed.
echo ============================================================
echo.
call npm run watchdog
pause
