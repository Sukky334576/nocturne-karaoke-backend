# 🎤 Nocturne Studio • Voice Duplication & Phasing Fix

---

## 🛠️ รายการแก้ไขปัญหาเสียงพูดซ้อนกัน (Voice Echo / Duplication Fix)

### 1. 🔇 ปัญหาที่ 1: ระบบส่งเสียงสด (Dry) และเสียง Auto-Tune เข้าไปพร้อมกัน
* **สาเหตุ:** ในโปรแกรม เดิมทีทั้งท่อเสียงพูดสด (Dry Voice) และท่อเสียง Auto-Tune เปิดส่งเข้า `CABLE Input` พร้อมกันทั้งคู่ เมื่อเปิด Auto-Tune จึงเกิดเสียงร้อง 2 เสียงที่หน่วงกันเล็กน้อยซ้อนกันจนเกิดเสียงก้อง/เสียงซ้อน
* **การแก้ไข:** 
  * เมื่อเปิด **Auto-Tune (ON)**: ระบบจะ MUTE เสียงพูดสด (Dry Voice) ให้อัตโนมัติ เหลือเฉพาะเสียงร้องที่ดึงคีย์แล้วส่งเข้า Discord/FiveM ท่อเดียว 100%
  * เมื่อปิด **Auto-Tune (OFF)**: ระบบจะสลับมาส่งเสียงพูดสดผ่าน Noise Gate + Compressor ให้อย่างคมชัด

### 2. ⚙️ ปัญหาที่ 2: การตั้งค่า Windows Sound ซ้ำซ้อนกับตัวโปรแกรม (สำคัญมาก!)
* **สาเหตุ:** หากใน Windows Sound มีการไปติ๊ก **"Listen to this device"** ที่ไมค์จริงให้ส่งไป CABLE Input จะทำให้ Windows ส่งเสียงไมค์ 1 รอบ และ Nocturne Studio ส่งเสียงไมค์อีก 1 รอบ เพื่อนในเกมจึงได้ยินเสียงเบิ้ล 2 เท่า
* **วิธีแก้:**
  1. กดปุ่ม `Windows + R` พิมพ์ `mmsys.cpl` แล้วกด Enter
  2. ไปที่แท็บ **Recording (การบันทึก)**
  3. ดับเบิ้ลคลิกที่ **ไมโครโฟนจริงของคุณ** ➔ ไปที่แท็บ **Listen (การฟัง)**
  4. **<u>เอาติ๊กถูกออกจาก "Listen to this device" (ปิดไว้)</u>**
  5. ใน Discord / FiveM ให้เลือก **Input Device: `CABLE Output (VB-Audio Virtual Cable)`**

---

## 🌐 ลิงก์เข้าใช้งานระบบ Live

* **Public HTTPS Live URL:** [https://conference-creates-dealers-regulations.trycloudflare.com](https://conference-creates-dealers-regulations.trycloudflare.com)
* **Local Engine:** [http://localhost:3300](http://localhost:3300)
