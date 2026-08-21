# 🎤 Nocturne Studio • Vocal Dynamics & Presets Upgrade

ระบบได้รับการอัปเกรดฟังก์ชันใหม่ตามความต้องการของผู้ใช้งานเรียบร้อยแล้ว:

---

## 🚀 ฟังก์ชันใหม่ที่เพิ่มเข้ามา

### 1. 🎵 แถบปรับระดับเสียงเพลงดนตรี (Backing Track Volume Slider)
* วางตำแหน่งตรงกรอบสีแดงในแถบ **Now Playing Bar** ระหว่างชื่อเพลงกับปุ่ม Play/Pause
* ปรับระดับเสียงเพลงได้ตั้งแต่ `0% – 150%` โดยไม่กระทบกับระดับเสียงไมโครโฟน
* เชื่อมโยงกับทั้งระบบ Web Audio DSP และ YouTube Player Direct Fallback

### 2. 🔇 Vocal Dynamics & 0ms Noise Gate (ตัดเสียงรบกวน & คุมระดับเสียงร้อง)
* **High-Precision Noise Gate Worklet (`noise-gate-processor.js`):**
  * ตัดเสียงพัดลม, เสียงคีย์บอร์ด, และเสียงลมหายใจอัตโนมัติเมื่อหยุดร้อง
  * **แยกท่อสัญญาณเด็ดขาด:** ไม่ตัดเสียงเพลงดนตรี 100%
  * มีไฟสถานะ LED แบบเรียลไทม์ (`OPEN` สีเขียว = ร้องเพลง / `MUTED` สีส้ม = ดักตัดเสียง)
* **Studio Vocal Compressor / Limiter:**
  * ดันเสียงร้องท่อนเบาให้คมชัด และบีบอัดเสียงท่อนฮุคไม่ให้แตกหูเพื่อนใน Discord

### 3. 🎛️ One-Click Pro Vocal Presets (พรีเซ็ตเสียงสำเร็จรูป 1 คลิก)
* **🎙️ Studio Pop:** Auto-Tune ธรรมชาติ + Reverb 25% (1.8s) + Gate -45dB + Comp 4:1
* **🤖 T-Pain Trap:** Hard Auto-Tune Retune Speed 0.0s + Reverb 35% + Comp 6:1
* **🎸 Rock Arena:** Arena Reverb 40% (2.8s) + Comp 5:1 (ทรงพลัง ก้องกังวาน)
* **📻 Lo-Fi Warm:** Reverb 20% (1.2s) + Comp 2.5:1 (โทนอุ่นนุ่มนวล)
* **🗣️ Clean Talk:** ปิดเอฟเฟกต์ทั้งหมดเพื่อคุยปกติ

---

## 🌐 ลิงก์เข้าใช้งานระบบ Production

* **Public HTTPS Live URL:** [https://prep-tied-cables-accordance.trycloudflare.com](https://prep-tied-cables-accordance.trycloudflare.com)
* **Local Engine:** [http://localhost:3300](http://localhost:3300)
