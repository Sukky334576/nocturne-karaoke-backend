const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopPaths = [
  'C:\\Users\\tong3\\OneDrive\\Desktop',
  'C:\\Users\\tong3\\Desktop'
];

const setupExe = 'C:\\Users\\tong3\\.gemini\\antigravity\\scratch\\karaoke-sync-player\\dist\\Nocturne Studio Setup 1.0.0.exe';

const readmeContent = `================================================================================
🎙️ NOCTURNE STUDIO • PRECISION KARAOKE & VOCAL ENGINE
   คู่มือการติดตั้งและตั้งค่าเสียงสำหรับผู้ทดสอบ (Beta Tester Quick Guide)
================================================================================

✨ คุณสมบัติเด่น:
- ร้องเพลงคาราโอเกะพร้อมเสียงร้องจริง + เอฟเฟกต์รีเวิร์บห้องสตูดิโอ
- ส่งเสียงตรงเข้า Discord และ FiveM PMA-Voice ได้ทันที 100%
- ไม่ต้องเปิดแชร์หน้าจอ และไม่มีเสียงสะท้อนดีเลย์เข้าหูตัวเอง

--------------------------------------------------------------------------------
📥 ขั้นตอนที่ 1: การติดตั้งโปรแกรม
--------------------------------------------------------------------------------
1. ดับเบิ้ลคลิกไฟล์ "Nocturne Studio Setup 1.0.0.exe"
2. กดติดตั้งตามขั้นตอน (ระบบจะลงไดรเวอร์เสียงจำลองให้อัตโนมัติในพื้นหลัง)
3. เมื่อเสร็จแล้ว จะมีไอคอน "Nocturne Studio" สีทองสวยงามปรากฏบนหน้าจอ Desktop

--------------------------------------------------------------------------------
🔑 ขั้นตอนที่ 2: การเปิดสิทธิ์ใช้งาน (Activate Tester Key)
--------------------------------------------------------------------------------
1. เปิดโปรแกรม Nocturne Studio จากหน้าจอ Desktop
2. ที่หน้าแรก หรือแถบเมนูด้านบน ให้กดปุ่ม "🔑 กรอกโค้ดทดลองใช้งาน (Redeem Tester Key)"
3. นำรหัสที่คุณได้รับจากผู้ส่ง มาวางในช่องแล้วกดยืนยัน (1 รหัสต่อ 1 เครื่อง)
   (ตัวอย่างรูปแบบโค้ด: NOCTURNE-BETA-XXXX หรือพิมพ์เฉพาะ 4 ตัวท้ายก็ได้)
4. ระบบจะปลดล็อกสถานะ ✨ TESTER PRO ให้ใช้งานได้ทุกฟีเจอร์ทันที!

--------------------------------------------------------------------------------
🎧 ขั้นตอนที่ 3: การตั้งค่าเสียงในโปรแกรม Nocturne Studio
--------------------------------------------------------------------------------
- ช่องที่ 1 (หูฟังของเรา): เลือกหูฟังหรือลำโพงที่คุณใช้งาน (เช่น หูฟังของคุณ)
- ช่องที่ 2 (ส่งเข้า FiveM & Discord): ระบบจะเลือก "🎙️ Nocturne Audio Line [CABLE Input]" ให้อัตโนมัติ
- ช่องไมโครโฟนสด (Live Mic): เลือกไมโครโฟนจริงที่คุณใช้พูด/ร้องเพลง

--------------------------------------------------------------------------------
🎙️ ขั้นตอนที่ 4: การตั้งค่าใน Discord และ FiveM
--------------------------------------------------------------------------------
- ใน Discord (การตั้งค่า -> เสียงและวิดีโอ -> ไมโครโฟน):
  ให้เลือกเป็น: "CABLE Output" หรือ "VB-Audio Virtual Cable (CABLE Output)"
- ใน FiveM (Settings -> Voice Chat -> Microphone):
  ให้เลือกเป็น: "CABLE Output" เช่นเดียวกัน

เพียงเท่านี้ เพลงคาราโอเกะ + เสียงร้องสดของคุณ + รีเวิร์บห้องร้อง จะถูกส่งเข้า Discord และ FiveM
ให้เพื่อนทุกคนได้ยินพร้อมกันอย่างคมชัดระดับสตูดิโอครับ! 🎵✨
================================================================================
`;

for (const d of desktopPaths) {
  if (!fs.existsSync(d)) continue;

  // Direct Update to Desktop root: Nocturne Studio Setup 1.0.0.exe
  const desktopSetupFile = path.join(d, 'Nocturne Studio Setup 1.0.0.exe');
  try {
    fs.copyFileSync(setupExe, desktopSetupFile);
    console.log('Successfully updated desktop setup exe at:', desktopSetupFile);
  } catch (err) {
    console.warn('Desktop root copy note:', err.message);
  }

  const pkgDir = path.join(d, 'Nocturne-Studio-Tester-Package');
  if (fs.existsSync(pkgDir)) {
    fs.rmSync(pkgDir, { recursive: true, force: true });
  }
  fs.mkdirSync(pkgDir, { recursive: true });

  // Copy Setup Exe and Readme only
  fs.copyFileSync(setupExe, path.join(pkgDir, 'Nocturne Studio Setup 1.0.0.exe'));
  fs.writeFileSync(path.join(pkgDir, 'คู่มือการติดตั้งและใช้งาน_README.txt'), readmeContent, 'utf8');

  // Master file for Project Owner ONLY on desktop
  const srcCodes = 'C:\\Users\\tong3\\Desktop\\TESTER_CODES.txt';
  const ownerMasterFile = path.join(d, 'รหัสทดลองใช้งาน_สำหรับเจ้าของโปรเจกต์_TESTER_CODES.txt');
  if (fs.existsSync(srcCodes)) {
    fs.copyFileSync(srcCodes, ownerMasterFile);
  }

  // Re-zip the clean package (contains ONLY installer and readme)
  const zipFile = path.join(d, 'Nocturne-Studio-Tester-Package.zip');
  try {
    if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
    execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${pkgDir}\\*' -DestinationPath '${zipFile}' -CompressionLevel Optimal"`, { stdio: 'inherit' });
    console.log('Successfully re-zipped clean package to:', zipFile);
  } catch (err) {
    console.error('Zip creation note:', err.message);
  }
}
