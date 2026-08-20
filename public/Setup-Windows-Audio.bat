@echo off
chcp 65001 >nul
color 0B
title Karaoke Sync Player - Windows Audio Setup Helper

echo =====================================================================
echo       🎤 KARAOKE CLOUD STUDIO - WINDOWS AUDIO SETUP HELPER
echo =====================================================================
echo.
echo  กำลังเปิดหน้าต่างการตั้งค่าเสียงของ Windows (Sound Control Panel)...
echo.

:: Launch Windows Sound Control Panel directly to Recording tab (Index 1)
start control mmsys.cpl sounds
start rundll32.exe shell32.dll,Control_RunDLL mmsys.cpl,,1

echo ---------------------------------------------------------------------
echo  📌 สิ่งที่คุณต้องทำในหน้าต่าง Sound ที่เด้งขึ้นมา:
echo ---------------------------------------------------------------------
echo.
echo  1. ไปที่แท็บ "Recording" (การบันทึกเสียง)
echo  2. ดับเบิ้ลคลิกที่ "ไมค์ของคุณ" (เช่น Microphone Maono Fairy)
echo  3. ไปที่แท็บ "Listen" (การฟัง)
echo  4. ติ๊กถูกที่ [x] "Listen to this device"
echo  5. ในช่อง "Playback through this device" -> ให้เลือก "CABLE Input"
echo  6. กด Apply และ OK
echo.
echo ---------------------------------------------------------------------
echo  📌 ในโปรแกรม Discord / FiveM:
echo ---------------------------------------------------------------------
echo  - Input Device (ไมค์)    : ให้เลือก "CABLE Output"
echo  - Output Device (หูฟัง)  : ให้เลือก "หูฟังของคุณ"
echo  - Noise Suppression      : ให้เลือก "None / ปิด" (เพื่อไม่ให้เพลงโดนตัด)
echo.
echo =====================================================================
echo  ตั้งค่าเสร็จแล้ว กลับไปเปิดหน้าเว็บคาราโอเกะแล้วเริ่มร้องเพลงได้เลยครับ!
echo =====================================================================
echo.
pause
