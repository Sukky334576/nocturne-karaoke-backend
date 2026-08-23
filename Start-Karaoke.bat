@echo off
chcp 65001 >nul
color 0B
title NOCTURNE STUDIO • Karaoke Engine & Cloudflare Tunnel Launcher

echo =====================================================================
echo       🎤 NOCTURNE STUDIO - PRECISION VOCAL & KARAOKE ENGINE
echo =====================================================================
echo.
echo  [1/3] กำลังเริ่มการทำงานของเซิร์ฟเวอร์ Local Engine (Port 3300)...
echo  [2/3] กำลังเปิดอุโมงค์ Cloudflare Tunnel สำหรับใช้งานภายนอก...
echo  [3/3] กำลังเปิดบราวเซอร์เข้าสู่หน้าสตูดิโอ...
echo.

cd /d "%~dp0"

:: Start Cloudflare Tunnel in background window
start "Cloudflare Tunnel (Public HTTPS)" /min bin\cloudflared.exe tunnel --url http://127.0.0.1:3300

:: Open Browser automatically to local studio
start "" "http://localhost:3300"

:: Start Node.js Engine (Keeps window alive)
node server.js

pause
