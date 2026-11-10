@echo off
chcp 65001 >nul
title NOCTURNE STUDIO • Desktop Karaoke & Vocal Engine
color 0A
cd /d "%~dp0"

echo =====================================================================
echo       🎙️ NOCTURNE STUDIO - DESKTOP KARAOKE & VOCAL ENGINE
echo =====================================================================
echo.
echo  [1/2] กำลังตรวจสอบความพร้อมของระบบเสียง Local Audio DSP...
echo  [2/2] กำลังเปิดโปรแกรม NOCTURNE STUDIO (Native Desktop App)...
echo.

call npm.cmd run app

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ กำลังเปิดด้วย npx electron...
    call npx.cmd electron .
)

pause
