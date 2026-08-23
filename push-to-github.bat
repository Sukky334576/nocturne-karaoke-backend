@echo off
chcp 65001 >nul
echo ====================================================
echo 🚀 NOCTURNE STUDIO • ONE-CLICK GITHUB SYNC (24/7 CLOUD)
echo ====================================================
echo.
echo กำลังนำโค้ดเวอร์ชันล่าสุดขึ้น GitHub Repository:
echo https://github.com/Sukky334576/nocturne-karaoke-backend.git
echo.

cd /d "%~dp0"
bin\git\cmd\git.exe add -A
bin\git\cmd\git.exe commit -m "feat: Full Nocturne Studio update with Dual-Channel Dispatcher, Anti-Echo, and Modular Plugin System"
echo.
echo กำลัง Push โค้ด... (หากมีหน้าต่างล็อกอิน GitHub เด้งขึ้นมา ให้กดยืนยันในบราวเซอร์)
echo.
bin\git\cmd\git.exe push origin main

echo.
echo ====================================================
echo ✅ ซิงค์โค้ดขึ้น GitHub เรียบร้อยแล้ว!
echo ☁️ Render.com จะทำการ Build และเปิดเว็บ 24 ชม. อัตโนมัติที่:
echo 👉 https://nocturne-karaoke-backend.onrender.com
echo ====================================================
echo.
pause
