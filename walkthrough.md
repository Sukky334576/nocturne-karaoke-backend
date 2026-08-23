# 🔌 Nocturne Studio • Modular Plugin Architecture

---

## 🚀 สรุปการติดตั้งระบบ Modular Plugin System

ระบบ **Modular FX Insert Rack** พร้อมใช้งานบนหน้าเว็บแล้ว โดยอนุญาตให้ผู้ใช้และนักพัฒนาภายนอกสามารถสร้างและเสียบ Audio FX Plugins เข้ากับสายสัญญาณไมโครโฟนของ Nocturne Studio ได้อย่างอิสระและปลอดภัย 100%:

```
[ ไมโครโฟน ]
     │
[ 🔇 0ms Noise Gate ➔ 🎚️ Vocal Compressor ]
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  🔌 NOCTURNE FX INSERT RACK (Slot 1, 2, 3...)           │
│                                                         │
│  [ Slot 1: 📼 Vintage Tape Delay ]  (Bypass Switch)     │
│  [ Slot 2: 🌊 80s Stereo Chorus ]   (Bypass Switch)     │
│  [ Slot 3: 📻 Radio / Phone EQ ]    (Bypass Switch)     │
│  [ Slot 4: ⚡ Warm Tube Saturator ] (Bypass Switch)     │
│                                                         │
│  🔒 Safety Brickwall Limiter (-0.1 dB Anti-Clipping)    │
└─────────────────────────────────────────────────────────┘
     │
     ├─────────────────────────────┐
     ▼                             ▼
[ 🤖 Auto-Tune Snapper ]    [ 🏛️ Reverb Impulse Engine ]
     │                             │
     ▼                             ▼
[ 🎧 Headphone Dispatcher ]  [ 🎙️ FiveM / Discord Dispatcher (120ms) ]
```

---

## 📦 4 ปลั๊กอินอย่างเป็นทางการ (Official Pre-Installed FX)

1. 📼 **Vintage Tape Delay:** เสียงสะท้อนเอคโค่สไตล์เทปอนาล็อก พร้อมฟิลเตอร์ตัดย่านแหลมไม่ให้เสียงแทงหู และระบบ Safe Feedback Limiter
2. 🌊 **80s Stereo Chorus & Vocal Doubler:** ขยายมิติเสียงร้องให้หนานุ่ม กว้าง มีประกาย มิติสเตอริโอสไตล์ 80s
3. 📻 **Telephone / Radio Megaphone EQ:** กรองความถี่ Bandpass และเติม Distortion อุ่นๆ สไตล์วิทยุสื่อสารหรือโทรศัพท์โบราณ
4. ⚡ **Warm Tube Saturator:** ขับเคลื่อน Harmonic Overdrive ด้วยกราฟ `tanh` ทำให้เสียงร้องมีน้ำหนัก พุ่ง และแน่นขึ้น

---

## 🛠️ คู่มือนักพัฒนา (Developer Guide: เขียน Plugin เอง)

นักพัฒนาภายนอกสามารถสร้างไฟล์ JavaScript `.js` ไฟล์เดียวแล้วลากมาวางในหน้าเว็บได้ทันที โดยสืบทอดจากคลาส `NocturneAudioPlugin`:

```javascript
// my-custom-flanger.js
export default class CustomFlangerPlugin extends NocturneAudioPlugin {
  constructor() {
    super({
      id: 'custom-flanger',
      name: 'Cosmic Flanger',
      version: '1.0.0',
      author: 'YourName',
      description: 'เสียงร้องหมุนวนสไตล์อวกาศ',
      icon: '🛸',
      enabled: false,
      params: [
        { id: 'rate', label: 'LFO Speed', type: 'slider', min: 0.1, max: 5.0, step: 0.1, default: 0.8, unit: 'Hz' },
        { id: 'mix', label: 'Flanger Mix', type: 'slider', min: 0.0, max: 1.0, step: 0.05, default: 0.5, unit: '%' }
      ]
    });
  }

  setupAudioGraph(audioCtx) {
    this.delayNode = audioCtx.createDelay(0.05);
    this.lfo = audioCtx.createOscillator();
    this.lfoGain = audioCtx.createGain();
    this.lfoGain.gain.value = 0.002;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    this.lfo.start();

    this.inputNode.connect(this.delayNode);
    this.delayNode.connect(this.wetGainNode);
    this.wetGainNode.connect(this.outputNode);
  }

  onParamChange(paramId, value) {
    if (paramId === 'rate' && this.lfo) this.lfo.frequency.value = value;
  }
}
```

---

## 🌐 ลิงก์เข้าใช้งานระบบ Live

* **Public HTTPS Live URL:** [https://conference-creates-dealers-regulations.trycloudflare.com](https://conference-creates-dealers-regulations.trycloudflare.com)
* **Local Engine:** [http://localhost:3300](http://localhost:3300)
