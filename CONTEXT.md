# Karaoke Sync Player

A low-latency YouTube karaoke playback and audio routing system designed for live singing in Discord and FiveM.

## Language

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
The real-time Web Audio DSP pipeline generating studio vocal effects (such as Reverb and Delay).
_Avoid_: Voice changer, soundboard

**Wet/Dry Signal**:
The ratio of effect-processed audio (wet) versus raw unprocessed audio (dry) sent to outputs.
_Avoid_: Effect volume, balance

**Ducking**:
Keyboard hotkey or voice-triggered attenuation of the backing track volume during conversation.
_Avoid_: Music mute, auto-lower

**Key Shift**:
Transposing the musical pitch of the backing track by semitones in real time without altering playback speed.
_Avoid_: Pitch speed, fast forward
