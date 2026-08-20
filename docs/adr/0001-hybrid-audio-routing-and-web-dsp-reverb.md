# 1. Hybrid Audio Routing with Web Audio DSP Reverb

## Context & Decision
To sing live on Discord and FiveM without noticeable lag or audio dropouts, we need both zero-latency hardware voice monitoring and digital studio effects (Reverb). Software mixers (e.g., Voicemeeter) introduce high buffer latency (>50ms) and complex routing overhead.

We decided on a **Hybrid Routing Architecture**:
1. **Raw Voice & Singer Monitoring**: The singer's dry voice is monitored at 0.00ms latency via the Maono Fairy USB hardware headphone jack.
2. **Backing Track Dual Routing**: The local Node.js/Web Audio player outputs YouTube accompaniment directly to both `Headphones (Maono Fairy)` and `VB-CABLE Input` using Web Audio multi-sink routing (`setSinkId`).
3. **Vocal FX (Reverb)**: An in-app Web Audio DSP engine captures the microphone with zero input processing (raw stream), computes a synthetic impulse-response Reverb, and injects the 100% "Wet" reverb tail into `VB-CABLE Input` (and optionally headphones). The natural acoustic pre-delay of reverb makes this slight software latency feel completely natural rather than disorienting.

## Considered Options
- **Pure Software Voicemeeter / VAC Mixing**: Rejected due to high configuration complexity, sample rate mismatches, and noticeable microphone monitoring delay.
- **Pure Direct Mic Routing without Effects**: Rejected because the user requires vocal reverb enhancement for live singing.
- **DAW / VST Plugin Host (Reaper / Cantabile / VSTHost)**: Rejected due to excessive memory usage and complex virtual patching required for casual gaming and Discord sessions.
