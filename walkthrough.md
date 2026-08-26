# 🎙️ Nocturne Studio • Dual Discord & FiveM Audio Routing Fix

---

## 🛠️ รายละเอียดการแก้ปัญหา "เสียงพูดออกดิส แต่เสียงเพลงไม่ออกดิส"

### 1. 🔍 สาเหตุที่แท้จริง
* เมื่อเปิดใช้งานผ่าน Cloud ก่อนหน้านี้ มีการใช้ระบบเปิดเสียงจาก YouTube Iframe โดยตรง
* **ข้อจำกัดความปลอดภัยของเบราว์เซอร์ (Browser Cross-Origin Sandbox):** ตัว YouTube Iframe ถูกจำกัดไม่ให้ต่อเข้ากับระบบ Web Audio API ของเบราว์เซอร์ ทำให้เสียงเพลงวิ่งตรงออกลำโพง/หูฟังธรรมดา แต่ **ไม่ได้ถูกส่งเข้าสาย `CABLE Input (VB-Audio Virtual Cable)`**
* ผลลัพธ์คือ: ใน Discord และ FiveM (ซึ่งดักฟังเสียงจาก VB-CABLE) จึงได้รับเฉพาะเสียงไมโครโฟน แต่ไม่มีเสียงดนตรีคาราโอเกะส่งเข้าไปด้วย

### 2. 🚀 การแก้ไขที่ติดตั้ง
1. **Master Web Audio Stream Pipeline:** อัปเดตตัวดึงสตรีมเสียงหลังบ้าน `yt-dlp` รุ่นล่าสุด ดึงสัญญาณเสียงคุณภาพสูงเข้าสู่ `audioSourceElement` ในระบบ Web Audio API
2. **Dual-Channel Dispatcher Active:** สัญญาณเพลงจะวิ่งผ่าน:
   * 🎧 **Channel 1 (หูเรา):** `musicHpGain` ➔ ส่งออกหูฟังของคุณ
   * 🎙️ **Channel 2 (FiveM & Discord):** `musicCableGain` ➔ ส่งเข้า `VB-CABLE` เข้า Discord/FiveM พร้อมระบบชดเชยดีเลย์ 120ms
3. **Key Shift & Ducking Support:** ระบบคีย์เพลงและระบบลดเสียงเพลงตอนพูด (Ducking) ทำงานได้อย่างสมบูรณ์แบบทั้งในหูเราและใน Discord 100%

---

## 🌐 ลิงก์เข้าใช้งานระบบ Live (24/7)

* **Live Cloud URL:** 👉 **[https://nocturne-karaoke-backend.onrender.com](https://nocturne-karaoke-backend.onrender.com)**
* **Local Engine:** [http://localhost:3300](http://localhost:3300)
