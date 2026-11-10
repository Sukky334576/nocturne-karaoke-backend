@echo off
chcp 65001 >nul
title NOCTURNE STUDIO • Building Windows Installer (.exe)
color 0B
cd /d "%~dp0"

echo =====================================================================
echo       📦 NOCTURNE STUDIO - WINDOWS INSTALLER BUILDER (.EXE)
echo =====================================================================
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
    explorer.exe dist
) else (
    echo.
    echo  ❌ เกิดข้อผิดพลาดในการสร้างตัวติดตั้ง
)

pause
