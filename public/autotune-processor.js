// Real-time Vocal Auto-Tune AudioWorklet Processor
// Features: YIN Pitch Detection + Musical Scale Snapping + Low-Latency Pitch Shifting

class AutoTuneProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'enabled', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'rootKey', defaultValue: 0, minValue: 0, maxValue: 11 }, // 0=C, 1=C#, 2=D ... 11=B
      { name: 'scaleType', defaultValue: 0, minValue: 0, maxValue: 3 }, // 0=Major, 1=Minor, 2=Chromatic, 3=Pentatonic
      { name: 'retuneSpeed', defaultValue: 0.1, minValue: 0.0, maxValue: 1.0 }, // 0.0 = Hard T-Pain, 1.0 = Natural
      { name: 'correctionAmount', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0 }
    ];
  }

  constructor() {
    super();
    this.bufferSize = 2048;
    this.inputBuffer = new Float32Array(this.bufferSize);
    this.inputWriteIndex = 0;

    // Circular delay buffer for pitch shifting
    this.delayBufferSize = 8192;
    this.delayBuffer = new Float32Array(this.delayBufferSize);
    this.delayWriteIndex = 0;

    this.grainSize = 512; // ~10.6ms at 48kHz for ultra low latency
    this.readOffset = 0;
    this.currentPitchRatio = 1.0;
    this.targetPitchRatio = 1.0;

    this.detectedNoteName = '-';
    this.targetNoteName = '-';
    this.processCounter = 0;

    // Scale Definitions (Intervals from Root Key in semitones)
    this.scales = {
      0: [0, 2, 4, 5, 7, 9, 11], // Major
      1: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
      2: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Chromatic
      3: [0, 2, 4, 7, 9] // Major Pentatonic
    };

    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  // Fast Autocorrelation / YIN Pitch Detection Algorithm
  detectPitch(buffer, sampleRate) {
    const halfBufferSize = Math.floor(buffer.length / 2);
    const difference = new Float32Array(halfBufferSize);
    const cmndf = new Float32Array(halfBufferSize);

    // Difference Function
    for (let tau = 0; tau < halfBufferSize; tau++) {
      let sum = 0;
      for (let i = 0; i < halfBufferSize; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      difference[tau] = sum;
    }

    // Cumulative Mean Normalized Difference
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfBufferSize; tau++) {
      runningSum += difference[tau];
      cmndf[tau] = difference[tau] / (runningSum / tau);
    }

    // Threshold detection
    const threshold = 0.20;
    let tauEstimate = -1;
    for (let tau = 2; tau < halfBufferSize; tau++) {
      if (cmndf[tau] < threshold) {
        while (tau + 1 < halfBufferSize && cmndf[tau + 1] < cmndf[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return 0;

    // Parabolic Interpolation
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < halfBufferSize - 1) {
      const s0 = cmndf[tauEstimate - 1];
      const s1 = cmndf[tauEstimate];
      const s2 = cmndf[tauEstimate + 1];
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    const pitch = sampleRate / betterTau;
    if (pitch >= 70 && pitch <= 1000) {
      return pitch;
    }
    return 0;
  }

  // Quantize Detected Pitch to Scale
  quantizePitchToScale(frequency, rootKey, scaleType) {
    if (frequency <= 0) return frequency;

    const midiNote = 69 + 12 * Math.log2(frequency / 440);
    const roundedMidi = Math.round(midiNote);
    const octave = Math.floor(roundedMidi / 12) - 1;

    const scaleIntervals = this.scales[scaleType] || this.scales[0];
    const allowedNotesInOctave = scaleIntervals.map(interval => (rootKey + interval) % 12);

    let minDiff = Infinity;
    let bestMidi = roundedMidi;

    for (let offset = -4; offset <= 4; offset++) {
      const candidateMidi = roundedMidi + offset;
      const noteClass = ((candidateMidi % 12) + 12) % 12;
      if (allowedNotesInOctave.includes(noteClass)) {
        const diff = Math.abs(midiNote - candidateMidi);
        if (diff < minDiff) {
          minDiff = diff;
          bestMidi = candidateMidi;
        }
      }
    }

    const targetFreq = 440 * Math.pow(2, (bestMidi - 69) / 12);
    
    const detNoteClass = ((Math.round(midiNote) % 12) + 12) % 12;
    const tgtNoteClass = ((bestMidi % 12) + 12) % 12;
    this.detectedNoteName = `${this.noteNames[detNoteClass]}${octave}`;
    this.targetNoteName = `${this.noteNames[tgtNoteClass]}${Math.floor(bestMidi / 12) - 1}`;

    return targetFreq;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0] || !output || !output[0]) return true;

    const inChannel = input[0];
    const outChannel = output[0];
    const enabled = parameters.enabled ? parameters.enabled[0] > 0.5 : false;

    // Direct pass-through if disabled
    if (!enabled) {
      for (let i = 0; i < inChannel.length; i++) {
        outChannel[i] = inChannel[i];
      }
      return true;
    }

    const rootKey = parameters.rootKey ? Math.floor(parameters.rootKey[0]) : 0;
    const scaleType = parameters.scaleType ? Math.floor(parameters.scaleType[0]) : 0;
    const retuneSpeed = parameters.retuneSpeed ? parameters.retuneSpeed[0] : 0.1;
    const correctionAmount = parameters.correctionAmount ? parameters.correctionAmount[0] : 1.0;

    // Write input into pitch detection buffer & delay buffer
    for (let i = 0; i < inChannel.length; i++) {
      this.inputBuffer[this.inputWriteIndex] = inChannel[i];
      this.inputWriteIndex = (this.inputWriteIndex + 1) % this.bufferSize;

      this.delayBuffer[this.delayWriteIndex] = inChannel[i];
      this.delayWriteIndex = (this.delayWriteIndex + 1) % this.delayBufferSize;
    }

    // Run pitch detection every 256 samples (~5.3ms)
    this.processCounter += inChannel.length;
    if (this.processCounter >= 256) {
      this.processCounter = 0;

      const analysisBuffer = new Float32Array(this.bufferSize);
      for (let i = 0; i < this.bufferSize; i++) {
        const idx = (this.inputWriteIndex + i) % this.bufferSize;
        analysisBuffer[i] = this.inputBuffer[idx];
      }

      const detectedFreq = this.detectPitch(analysisBuffer, 48000);
      if (detectedFreq > 0) {
        const targetFreq = this.quantizePitchToScale(detectedFreq, rootKey, scaleType);
        let ratio = targetFreq / detectedFreq;
        ratio = 1.0 + (ratio - 1.0) * correctionAmount;
        this.targetPitchRatio = Math.max(0.6, Math.min(1.8, ratio));

        this.port.postMessage({
          detectedFreq: Math.round(detectedFreq),
          detectedNote: this.detectedNoteName,
          targetNote: this.targetNoteName,
          ratio: this.targetPitchRatio.toFixed(3)
        });
      }
    }

    // Retune Speed smoothing
    const alpha = Math.max(0.05, 1.0 - retuneSpeed * 0.90);
    this.currentPitchRatio += (this.targetPitchRatio - this.currentPitchRatio) * alpha;

    // Granular Pitch Shifting tied directly to write head
    const grainSize = this.grainSize;
    const halfGrain = grainSize / 2;

    for (let i = 0; i < inChannel.length; i++) {
      this.readOffset = (this.readOffset + (1.0 - this.currentPitchRatio)) % grainSize;
      if (this.readOffset < 0) this.readOffset += grainSize;

      const wIndex = (this.delayWriteIndex - inChannel.length + i + this.delayBufferSize) % this.delayBufferSize;

      // Tap 1
      const offset1 = this.readOffset;
      const tap1Index = Math.floor((wIndex - offset1 - 256 + this.delayBufferSize) % this.delayBufferSize);
      const sample1 = this.delayBuffer[tap1Index];

      // Tap 2 (180 degree phase shifted)
      const offset2 = (this.readOffset + halfGrain) % grainSize;
      const tap2Index = Math.floor((wIndex - offset2 - 256 + this.delayBufferSize) % this.delayBufferSize);
      const sample2 = this.delayBuffer[tap2Index];

      // Window crossfade
      const phase = offset1 / grainSize;
      const window1 = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
      const window2 = 1.0 - window1;

      const shifted = sample1 * window1 + sample2 * window2;
      outChannel[i] = shifted;
    }

    return true;
  }
}

registerProcessor('autotune-processor', AutoTuneProcessor);
