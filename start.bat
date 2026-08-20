@echo off
title Karaoke Sync Player
echo ========================================================
echo   Starting Karaoke Sync Player (Discord ^& FiveM)
echo ========================================================
cd /d "%~dp0"

:: Start Node.js server in background
start /b node server.js

:: Wait 1.5 seconds for server to start
timeout /t 2 /nobreak >nul

:: Open in App Mode using Edge or Chrome
start msedge.exe --app="http://localhost:3300" 2>nul || start chrome.exe --app="http://localhost:3300" 2>nul || start http://localhost:3300

echo.
echo Server is running! You can close this window or keep it minimized.
pause
