@echo off
title Push Nocturne Studio to Production (GitHub & Vercel)
cd /d "%~dp0"
echo ===================================================
echo 🚀 Pushing Nocturne Studio to Production...
echo ===================================================
bin\git\cmd\git.exe status
echo.
echo Pushing to GitHub (origin main)...
bin\git\cmd\git.exe push origin main
echo.
echo ===================================================
echo ✅ Done! Check Vercel Dashboard for live deployment.
echo ===================================================
pause
