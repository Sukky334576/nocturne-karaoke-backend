@echo off
chcp 65001 >nul
color 0B
title NOCTURNE STUDIO - Windows Audio Setup Helper

echo =====================================================================
echo       🎤 NOCTURNE STUDIO - WINDOWS AUDIO SETUP HELPER
echo =====================================================================
echo.
echo  กำลังเปิดหน้าต่างการตั้งค่าเสียงของ Windows (Sound Control Panel)...
echo.

:: Launch Windows Sound Control Panel directly to Recording tab (Index 1)
start rundll32.exe shell32.dll,Control_RunDLL mmsys.cpl,,1

echo ---------------------------------------------------------------------
echo  📌 สิ่งที่คุณต้องทำในหน้าต่าง Sound ที่เด้งขึ้นมา:
echo ---------------------------------------------------------------------
echo.
echo  1. ไปที่แท็บ "Recording" (การบันทึกเสียง)
echo  2. ดับเบิ้ลคลิกที่ "ไมโครโฟนจริงของคุณ" (เช่น Microphone Maono PS22)
echo  3. ไปที่แท็บ "Listen" (การฟัง)
echo  4. ⚠️ ตรวจสอบว่า [ ] "Listen to this device" ไม่ได้ติ๊กถูก (เอาติ๊กถูกออก ห้ามเปิด!)
echo     (เพราะ Nocturne Studio จะส่งเสียงร้องพร้อม Reverb เข้าไลน์เสียงให้โดยตรง ป้องกันเสียงซ้ำซ้อน)
echo  5. กด Apply และ OK
echo.
echo ---------------------------------------------------------------------
echo  📌 การตั้งค่าในโปรแกรม FiveM / Discord:
echo ---------------------------------------------------------------------
echo  - Input Device (ไมค์เข้าเกม/ดิสคอร์ด) : ให้เลือก "Nocturne Studio Mic" (หรือ CABLE Output)
echo  - Output Device (หูฟังฟังเสียงเพื่อน) : ให้เลือก "หูฟังจริงของคุณ"
echo  - Noise Suppression (ตัดเสียงรบกวน)     : ให้เลือก "None / ปิด" (เพื่อไม่ให้เสียงดนตรีโดนตัด)
echo.
echo =====================================================================
echo  ตั้งค่าเสร็จแล้ว กลับไปที่ Nocturne Studio แล้วเริ่มร้องเพลงได้เลยครับ!
echo =====================================================================
echo.
pause
