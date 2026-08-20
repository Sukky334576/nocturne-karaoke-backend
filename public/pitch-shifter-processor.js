// Web Audio API AudioWorklet for Real-Time High-Fidelity Pitch Shifting (Key Shift)
class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'pitchRatio',
        defaultValue: 1.0,
        minValue: 0.5, // -12 semitones
        maxValue: 2.0  // +12 semitones
      }
    ];
  }

  constructor() {
    super();
    // 0.2s ring buffer size (~9600 samples at 48kHz)
    this.bufferSize = 9600;
    this.bufferL = new Float32Array(this.bufferSize);
    this.bufferR = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.phase0 = 0.0;
    this.phase1 = 0.5; // 180 degrees phase offset
    this.windowSize = 2048;
  }

  // Linear interpolation for smooth non-integer ring buffer reads
  interpolate(buffer, index) {
    while (index < 0) index += this.bufferSize;
    while (index >= this.bufferSize) index -= this.bufferSize;
    const i0 = Math.floor(index);
    const i1 = (i0 + 1) % this.bufferSize;
    const frac = index - i0;
    return buffer[i0] * (1 - frac) + buffer[i1] * frac;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || input[0].length === 0) return true;

    const inputL = input[0];
    const inputR = input[1] || input[0];
    const outputL = output[0];
    const outputR = output[1] || output[0];

    const pitchRatioParam = parameters.pitchRatio;
    const isParamArray = pitchRatioParam.length > 1;

    for (let i = 0; i < inputL.length; i++) {
      const ratio = isParamArray ? pitchRatioParam[i] : pitchRatioParam[0];

      // Write sample into ring buffer
      this.bufferL[this.writeIndex] = inputL[i];
      this.bufferR[this.writeIndex] = inputR[i];

      if (Math.abs(ratio - 1.0) < 0.001) {
        // Direct clean pass-through when at 0 semitones
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
      } else {
        // Modulated delay with smooth triangular crossfade
        const rate = (1.0 - ratio) / this.windowSize;
        this.phase0 = (this.phase0 + rate) % 1.0;
        if (this.phase0 < 0) this.phase0 += 1.0;

        this.phase1 = (this.phase1 + rate) % 1.0;
        if (this.phase1 < 0) this.phase1 += 1.0;

        // Hann/Cosine Window for zero clicks
        const w0 = 0.5 * (1 - Math.cos(2 * Math.PI * this.phase0));
        const w1 = 0.5 * (1 - Math.cos(2 * Math.PI * this.phase1));

        const delay0 = this.phase0 * this.windowSize;
        const delay1 = this.phase1 * this.windowSize;

        const readPos0 = this.writeIndex - delay0;
        const readPos1 = this.writeIndex - delay1;

        const s0L = this.interpolate(this.bufferL, readPos0);
        const s1L = this.interpolate(this.bufferL, readPos1);
        const s0R = this.interpolate(this.bufferR, readPos0);
        const s1R = this.interpolate(this.bufferR, readPos1);

        outputL[i] = s0L * w0 + s1L * w1;
        outputR[i] = s0R * w0 + s1R * w1;
      }

      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }

    return true;
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
