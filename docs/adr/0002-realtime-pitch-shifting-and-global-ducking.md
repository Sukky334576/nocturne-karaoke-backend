# 2. Realtime Pitch Shifting and Global Ducking

## Context & Decision
Singers need to adjust musical keys (transposing $\pm$ semitones) without affecting tempo, and need instant volume ducking in FiveM during roleplay communication.

We decided to:
1. **Audio Stream Processing Engine**: Stream direct YouTube audio through a Web Audio / DSP pitch-shifter worklet node, allowing continuous pitch manipulation ($\pm 6$ semitones) with phase vocoder / time-stretch preservation.
2. **Toggle Ducking Mechanism**: Implement a stateful toggle hotkey that reduces backing track volume by 80% with a smooth 150ms exponential crossfade, avoiding harsh audio clicks when transitioning between singing and speaking in-game.

## Consequences
- Requires stream audio extraction endpoint in the local backend server (`yt-stream`).
- Global keyboard events can be captured smoothly via local Node.js / Web backend or browser window focus.
