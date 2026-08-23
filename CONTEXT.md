# Nocturne Studio (Karaoke Sync Player)

Precision real-time vocal audio studio and YouTube karaoke player with hardware dual-routing for Discord & FiveM.

---

## 🚨 MANDATORY AUTOMATIC PRODUCTION DEPLOYMENT RULE (FOR ALL AGENTS)

* **ห้ามบอกให้ผู้ใช้ไปรันไฟล์ `.bat` หรือ Push ขึ้น Production เอง**
* เมื่อแก้ไขโค้ดเสร็จแล้ว ให้ Agent ทำการทดสอบ (`node test-full-loop.js`) และสั่ง **`git add -A && git commit -m "..." && git push origin main`** ทันทีด้วยตัวคุณเอง
* GitHub Repo: `https://github.com/Sukky334576/nocturne-karaoke-backend.git`
* Production 24/7 Server: `https://nocturne-karaoke-backend.onrender.com`

---

## 🎧 Hardware & Audio Constraints

1. **User Soundcard:** Maono Fairy (has direct hardware monitor). Keep `hpVocalVol` = 0.0 (muted) to prevent acoustic double echo in user's headphones.
2. **Channel 2 (FiveM & Discord):** Routes to `CABLE Input (VB-Audio Virtual Cable)` with calibrated 120ms sync offset.
3. **Cloud Audio Engine:** On Cloud (`isCloudHost`), YouTube player audio plays directly in high-definition (unmuted) to avoid datacenter IP bot detection.

---

## Language & Terminology

### Audio Routing & Hardware

**Direct Monitoring**:
Listening to the microphone signal directly from the hardware interface without software latency.
_Avoid_: Software monitoring, loopback listening

**Backing Track**:
The YouTube audio stream playing karaoke accompaniment.
_Avoid_: BGM, background music

**Virtual Audio Cable**:
The virtual audio device (VB-CABLE) routing mixed audio into VoIP applications.
_Avoid_: Soundcard, virtual mic

**VoIP Sink**:
The communication platform (Discord or FiveM PMA-Voice) receiving the vocal and backing track audio.
_Avoid_: In-game voice, Discord mic

**Dual Routing**:
Simultaneous output of the backing track to both the local singer headphones and the virtual audio cable.
_Avoid_: Audio splitting, stereo mix

### Vocal Effects & Playback

**Vocal FX Engine**:
The real-time Web Audio DSP pipeline generating studio vocal effects (Reverb, Tape Delay, Stereo Chorus, Radio Filter, Tube Saturator).
_Avoid_: Voice changer, soundboard

**Modular Plugin Rack**:
The expandable audio insert slot system allowing users and developers to create custom audio plugins via `NocturneAudioPlugin` SDK.

**Ducking**:
Keyboard hotkey or voice-triggered attenuation of the backing track volume during conversation.
_Avoid_: Music mute, auto-lower

**Key Shift**:
Transposing the musical pitch of the backing track by semitones in real time without altering playback speed.
_Avoid_: Pitch speed, fast forward
