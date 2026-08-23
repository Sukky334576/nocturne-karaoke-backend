# 🤖 AGENTS.MD • Instructions for AI Assistants (Pair Programming Rules)

> **IMPORTANT NOTICE FOR ALL FUTURE AGENTS:**
> Read this document completely before making any changes. Follow all operational rules strictly.

---

## 🚨 RULE 1: MANDATORY AUTOMATIC PRODUCTION DEPLOYMENT (ห้ามบอกให้ผู้ใช้เอาขึ้น PROD เอง)

* **ห้ามบอกให้ผู้ใช้ไปกดรันไฟล์ `.bat` หรือพิมพ์คำสั่ง `git push` ขึ้น Production เองโดยเด็ดขาด**
* ทุกครั้งที่คุณแก้ไขโค้ด, เพิ่มฟีเจอร์, หรือแก้บั๊กเสร็จสิ้น และทำการทดสอบเรียบร้อยแล้ว:
  1. ตรวจสอบ Syntax: `node -c <files>`
  2. รันทดสอบระบบ: `node test-full-loop.js`
  3. **สั่ง Git Commit และ Push ขึ้น GitHub ให้เสร็จสิ้นด้วยตัวคุณเองทันที:**
     ```powershell
     bin\git\cmd\git.exe add -A
     bin\git\cmd\git.exe commit -m "feat/fix: <รายละเอียดการเปลี่ยนแปลง>"
     bin\git\cmd\git.exe push origin main
     ```
* **ระบบ Render.com ผูกกับ GitHub Repo นี้ไว้แล้ว:** เมื่อคุณ Push โค้ดขึ้น GitHub ตัว Render จะดึงโค้ดไป Build และเปิดระบบ 24 ชม. บน Cloud ให้อัตโนมัติทันที
* **Production Live URL (24/7):** `https://nocturne-karaoke-backend.onrender.com`
* **GitHub Repository:** `https://github.com/Sukky334576/nocturne-karaoke-backend.git`

---

## 🎧 RULE 2: USER AUDIO ENVIRONMENT & HARDWARE TRUTH

1. **User Hardware:** การ์ดเสียง **Maono Fairy** (`Headphones (Maono Fairy)`)
   * มีระบบ Direct Hardware Monitor 0ms ในตัวอยู่แล้ว
   * **ห้ามเปิดเสียงไมค์สดออกหูฟังผู้ใช้โดยเด็ดขาด (Channel 1 / `hpVocalVol` ต้องเป็น `0.0` / Muted เสมอ)** เพื่อป้องกันเสียงสะท้อนก้อง (Double Voice / Phasing Echo) ในหูผู้ใช้
2. **Channel 2 (FiveM & Discord Routing):**
   * ส่งเสียงร้อง + ดนตรี เข้า `CABLE Input (VB-Audio Virtual Cable)`
   * ปรับ Preset Sync Offset เริ่มต้นที่ **120ms** เพื่อให้ภาพและเสียงใน Discord/FiveM ตรงกัน 100%
3. **Cloud Audio Engine Strategy (`isCloudHost`):**
   * บน Cloud (Render/Vercel) YouTube จะบล็อก IP ของ Data Center
   * ดังนั้น ในโหมด Cloud ให้ใช้ **Direct YouTube Player Mode** (เปิดเสียง HD ผ่าน YouTube Player โดยตรง และปรับ Volume ผ่าน Slider) ห้ามสั่ง `mute()` ทับเด็ดขาด

---

## 📁 RULE 3: KEY FILE STRUCTURE

* [`server.js`](file:///server.js): Node.js + Express Backend พร้อม In-Memory Search Caching (1ms) และ FFmpeg streaming
* [`public/app.js`](file:///public/app.js): Web Audio Engine, Auto-Tune Worklet, Dual-Channel Dispatcher, Modular Plugin Rack
* [`public/plugin-sdk.js`](file:///public/plugin-sdk.js): Nocturne Plugin SDK + 4 Official Plugins (Tape Delay, Chorus, Radio, Saturator)
* [`public/index.html`](file:///public/index.html) & [`public/style.css`](file:///public/style.css): Haute Horlogerie Dark Studio UI
* [`Push-To-GitHub.bat`](file:///Push-To-GitHub.bat): สำรองสำหรับผู้ใช้ (แต่ Agent ต้องรันผ่าน CLI เองเสมอ)
