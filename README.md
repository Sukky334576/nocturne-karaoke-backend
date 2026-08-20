# 🎤 Karaoke Sync Player (Discord & FiveM)

โปรแกรมเล่นเพลง YouTube สำหรับร้องเพลงใน **Discord** และ **FiveM** แบบ **Low-Latency (ไม่ดีเลย์ & ไม่กระตุก)** พร้อมระบบ **Dual Audio Output**, **Key Shifter (ปรับคีย์เพลง)**, และ **Studio Vocal Reverb**.

---

## ⚙️ 1. การตั้งค่า Windows Sound (ทำครั้งเดียว)

เพื่อให้เสียงไม่กระตุกและ Sample Rate ตรงกันทั้งหมด (48,000 Hz):

1. กดปุ่ม `Windows + R` พิมพ์ `mmsys.cpl` แล้วกด **Enter** (หน้าต่าง Sound จะเปิดขึ้นมา)
2. **แถบ Playback (การเล่น)**:
   - ดับเบิ้ลคลิกที่ **Headphones (Maono Fairy)** -> ไปที่แท็บ `Advanced` -> เลือก `24-bit, 48000 Hz` หรือ `16-bit, 48000 Hz` -> กด OK
   - ดับเบิ้ลคลิกที่ **CABLE Input (VB-Audio Virtual Cable)** -> ไปที่แท็บ `Advanced` -> เลือก `2 channel, 24-bit, 48000 Hz` -> กด OK
3. **แถบ Recording (การบันทึก)**:
   - ดับเบิ้ลคลิกที่ **Microphone (Maono Fairy)**:
     - ไปที่แท็บ `Listen` -> ติ๊กถูกที่ **"Listen to this device"**
     - ในช่อง `Playback through this device` ให้เลือกเป็น **CABLE Input (VB-Audio Virtual Cable)**
     - ไปที่แท็บ `Advanced` -> เลือก `48000 Hz` -> กด OK
   - ดับเบิ้ลคลิกที่ **CABLE Output (VB-Audio Virtual Cable)**:
     - ไปที่แท็บ `Advanced` -> เลือก `2 channel, 24-bit, 48000 Hz` -> กด OK

---

## 🎧 2. การตั้งค่าใน Discord และ FiveM

### ใน Discord (`Settings > Voice & Video`):
* **Input Device**: เลือกเป็น `CABLE Output (VB-Audio Virtual Cable)`
* **Output Device**: เลือกเป็น `Headphones (Maono Fairy)`
* **Noise Suppression (Krisp)**: `Disabled` (ปิด)
* **Echo Cancellation**: `Off` (ปิด)
* **Noise Reduction**: `Off` (ปิด)
* **Automatic Gain Control**: `Off` (ปิด)

### ใน FiveM (PMA-Voice):
* **Microphone / Input Device**: เลือกเป็น `CABLE Output (VB-Audio Virtual Cable)`
* **Noise Filter / Noise Gate**: ปรับให้ต่ำหรือปิด

---

## 🚀 3. วิธีเปิดใช้งานโปรแกรม

1. ดับเบิ้ลคลิกที่ไฟล์ **`start.bat`** (หรือรัน `node server.js` แล้วเปิด `http://localhost:3300`)
2. หน้าต่างโปรแกรมจะเปิดขึ้นมาแบบ Standalone App
3. กดปุ่ม **`⚡ START AUDIO ENGINE`** ด้านบนขวา 1 ครั้ง
4. ค้นหาชื่อเพลง หรือแปะลิงก์ YouTube เพื่อเริ่มร้องเพลงได้ทันที!

---

## 🎹 ฟังก์ชันเด่น

* **🎹 Key Shifter**: ปรับคีย์เพลงขึ้น/ลงได้ตั้งแต่ `-6` ถึง `+6` Semitones โดยความเร็วและจังหวะเพลงไม่เพี้ยน
* **✨ Studio Reverb**: เปิด/ปิด และปรับระดับความก้องของเสียงร้องได้
* **🎮 ปุ่มลัด (Hotkey)**: กด `F8` หรือ `Numpad -` หรือ `` ` `` เพื่อสลับโหมด **พูดคุย (Ducking เพลงจะเบาลง 80%) / โหมดร้องเพลง**
* **🎚️ Dual Volume**: ปรับความดังเพลงในหูเรา และความดังเพลงที่ส่งไป Discord/FiveM แยกกันได้อิสระ
