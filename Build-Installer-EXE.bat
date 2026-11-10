@echo off
chcp 65001 >nul
title NOCTURNE STUDIO • Building Windows Installer (.exe)
color 0B
cd /d "%~dp0"

echo =====================================================================
echo       📦 NOCTURNE STUDIO - WINDOWS INSTALLER BUILDER (.EXE)
echo =====================================================================
echo.
echo  กำลังปิด Process Nocturne Studio ที่อาจทำงานค้างอยู่...
taskkill /F /IM "Nocturne Studio.exe" >nul 2>&1
echo.
echo  กำลังคอมไพล์โปรแกรมและแพ็คเกจ Virtual Audio Subsystem...
echo  โปรดรอสักครู่ (ใช้เวลาประมาณ 1-2 นาที)...
echo.

call npm.cmd run build:exe

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo  ✅ สร้างตัวติดตั้งสำเร็จเรียบร้อย!
    echo  📂 ตัวติดตั้ง (.exe) อยู่ในโฟลเดอร์: dist\
    echo =====================================================================
    if exist "%USERPROFILE%\Desktop" (
        copy /Y "dist\Nocturne Studio Setup 1.0.0.exe" "%USERPROFILE%\Desktop\" >nul 2>&1
    )
    if exist "%USERPROFILE%\OneDrive\Desktop" (
        copy /Y "dist\Nocturne Studio Setup 1.0.0.exe" "%USERPROFILE%\OneDrive\Desktop\" >nul 2>&1
    )
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-desktop-shortcut.ps1" >nul 2>&1
    explorer.exe dist
) else (
    echo.
    echo  ❌ เกิดข้อผิดพลาดในการสร้างตัวติดตั้ง
)

pause
