@echo off
chcp 65001 >nul
color 0A
title Karaoke Cloud Studio - Local Launcher

echo =====================================================================
echo       🎤 KARAOKE CLOUD STUDIO - POWERED BY DEEPMIND AI
echo =====================================================================
echo.
echo  กำลังเริ่มการทำงานของระบบเสียง Zero-Latency Karaoke Engine...
echo.

cd /d "%~dp0"

:: Open Browser automatically to local studio
start "" "http://localhost:3000"

:: Start Node.js Engine
node server.js

pause
