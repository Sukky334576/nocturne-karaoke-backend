# Karaoke Cloud Studio - System Architecture & Implementation Documentation

## 1. Overview & Core Philosophy
Karaoke Cloud Studio is a web-based real-time studio designed for streaming karaoke with synced backing tracks into Discord and FiveM via virtual audio cables (`VB-Audio Virtual Cable`).

---

## 2. Audio Graph Architecture (Web Audio API)

### A. Backing Track (ดนตรีคาราโอเกะ):
- **Source**: `audioSourceElement` (HTMLMediaElement streaming from backend `/api/audio`).
- **Processing**: `duckingGain` (Talk Mode / Ducking) $\rightarrow$ `pitchNode` (Worklet Key Shifter: $\pm 6$ Semitones) $\rightarrow$ `masterGain`.
- **Outputs**:
  1. **Headphones**: `masterGain` $\rightarrow$ `headphoneGain` $\rightarrow$ `headphoneAnalyser` $\rightarrow$ `audioCtx.destination` (Direct output, **Zero buffering echo**).
  2. **Discord (CABLE Input)**: `masterGain` $\rightarrow$ `cableSyncDelayNode` (Hardware Calibrated Offset, Default **`120ms`**) $\rightarrow$ `cableGain` $\rightarrow$ `cableAnalyser` $\rightarrow$ `destCable` (`CABLE Input`).

### B. Vocal Path & Hardware Monitoring (ไมโครโฟนร้อง):
- **Microphone**: `Maono Fairy` (USB microphone with 0ms built-in 3.5mm direct hardware headphone jack).
- **Dry Vocal to Discord**: Handled via Windows Sound (`Listen to this device` $\rightarrow$ `CABLE Input`) for true 0ms analog singing.
- **Headphone Vocal**: Singer listens to dry voice directly from mic jack (0ms). Web Audio only outputs the sweet **Wet Reverb Tail** (`headphoneReverbGain`) into headphones, avoiding software doubling comb-filter delay.

### C. Studio Vocal Reverb (เสียงก้องสตูดิโอ):
- **Source**: `micSource` $\rightarrow$ `reverbInputGain` $\rightarrow$ `convolverNode` (Impulse Response) $\rightarrow$ `reverbGain`.
- **Outputs**:
  - `reverbGain` $\rightarrow$ `destCable` (Sweet reverb tail sent into Discord).
  - `reverbGain` $\rightarrow$ `headphoneReverbGain` (1.3x boost) $\rightarrow$ `audioCtx.destination` (Sweet reverb tail audible in singer's headphones).

### D. Real-Time Vocal Auto-Tune:
- **Processor**: `autotune-processor.js` (YIN Pitch Detector + Scale Quantizer + circular write-head pitch shifter).
- **Signal**: `micSource` $\rightarrow$ `autotuneNode` $\rightarrow$ `autotuneGain` $\rightarrow$ `destCable`.

### E. Embedded Record Test (อัดเสียงทดสอบ):
- **Widget Location**: Embedded directly in the main interface under the Backing Track Key Shifter (No popup blocking lyrics).
- **Recorder Destination (`destRecordTest`)**:
  - `cableGain` (Backing track with 120ms sync delay).
  - `reverbGain` (Wet reverb tail).
  - `autotuneGain` (Auto-Tuned vocal when ON).
  - `recordMicGain` (Dry microphone input when Auto-Tune is OFF).
  - Result: Recording captures **100% of Voice + Music + Reverb** exactly as heard in Discord.

---

## 3. Lock-Step Video & Audio Sync
- **Mechanism**:
  - Video in YouTube iframe is paused while audio stream buffers.
  - On `audioSourceElement.onplaying`: YouTube video seeks to the exact playback second and starts playing in lock-step.
  - On `timeupdate`: Continuously measures drift; if drift $> 250\text{ms}$, snaps YouTube iframe to the exact audio time.
