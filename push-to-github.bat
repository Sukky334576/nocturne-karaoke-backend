@echo off
chcp 65001 >nul
title NOCTURNE STUDIO • GITHUB 24/7 CLOUD SYNC
echo ====================================================
echo 🚀 NOCTURNE STUDIO • GITHUB 24/7 CLOUD SYNC
echo ====================================================
echo.
echo 📁 โฟลเดอร์: %~dp0
echo 🐙 GitHub Repo: https://github.com/Sukky334576/nocturne-karaoke-backend.git
echo.

cd /d "%~dp0"
bin\git\cmd\git.exe add -A
bin\git\cmd\git.exe commit -m "feat: Full Nocturne Studio update with Dual-Channel Dispatcher, Anti-Echo, and Modular Plugin System" >nul 2>&1

echo ----------------------------------------------------
echo [วิธีที่ 1] กด Enter เพื่อลองส่งขึ้น GitHub ทันที
echo [วิธีที่ 2] วาง GitHub Personal Access Token (ghp_...) แล้วกด Enter
echo ----------------------------------------------------
echo.
set /p GHTOKEN="กรอกหรือวาง GitHub Token (หรือกด Enter): "

if not "%GHTOKEN%"=="" (
    echo.
    echo 🔑 กำลังเชื่อมต่อผ่าน GitHub Token...
    bin\git\cmd\git.exe remote set-url origin https://%GHTOKEN%@github.com/Sukky334576/nocturne-karaoke-backend.git
)

echo.
echo ⏳ กำลังส่งข้อมูลขึ้น GitHub... กรุณารอสักครู่
echo.
bin\git\cmd\git.exe push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================
    echo ✅ ซิงค์โค้ดขึ้น GitHub สำเร็จ 100%!
    echo ☁️ Render.com กำลัง Build และเปิดเว็บ 24 ชม. ให้อัตโนมัติที่:
    echo 👉 https://nocturne-karaoke-backend.onrender.com
    echo ====================================================
) else (
    echo.
    echo ====================================================
    echo ❌ เกิดข้อผิดพลาดในการ Push (ยังไม่มีสิทธิ์เข้าถึง GitHub)
    echo.
    echo 💡 วิธีสร้าง GitHub Token ง่ายๆ ใน 30 วินาที:
    echo 1. เข้าเว็บ: https://github.com/settings/tokens
    echo 2. กดปุ่ม "Generate new token (classic)"
    echo 3. ติ๊กถูกที่ช่อง [repo] แล้วกดปุ่มเขียว "Generate token" ด้านล่าง
    echo 4. คัดลอกโค้ด (ขึ้นต้นด้วย ghp_...)
    echo 5. ดับเบิ้ลคลิกไฟล์ Push-To-GitHub.bat นี้ใหม่ แล้ววาง Token ลงไป
    echo ====================================================
)

echo.
echo กดปุ่มใดๆ เพื่อปิดหน้าต่างนี้...
pause >nul
