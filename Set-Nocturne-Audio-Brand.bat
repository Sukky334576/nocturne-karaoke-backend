@echo off
chcp 65001 >nul
title NOCTURNE STUDIO • กำหนดชื่อไลน์เสียงเป็น Nocturne Studio
color 0B

:: ตรวจสอบและขอสิทธิ์ Admin อัตโนมัติ (UAC Prompt)
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo.
    echo  [!] กำลังขอสิทธิ์ Administrator เพื่อตั้งชื่อไลน์เสียงในระบบ Windows...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    cd /d "%~dp0"

echo =====================================================================
echo       🎙️ NOCTURNE STUDIO - AUDIO ENDPOINT SYSTEM BRANDING
echo =====================================================================
echo.
echo  กำลังเปลี่ยนชื่อไลน์เสียงในระบบ Windows Audio Subsystem...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0resources\driver\register-endpoints.ps1"

echo.
echo =====================================================================
echo  ✅ ตั้งค่าสำเร็จเรียบร้อย 100%!
echo.
echo  ชื่อใน Discord, FiveM และ Windows จะกลายเป็น:
echo    - ไมโครโฟนเข้าเกม/ดิสคอร์ด: Nocturne Studio (Nocturne Studio Mic)
echo    - ช่องเสียงส่งจากโปรแกรม:   Nocturne Studio (Nocturne Audio Line)
echo.
echo  คำว่า VB Audio จะหายไปจากระบบทั้งหมดแล้วครับ!
echo =====================================================================
echo.
pause
