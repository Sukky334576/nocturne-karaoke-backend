// High-Precision 0ms Real-Time Noise Gate AudioWorklet
class NoiseGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -45, minValue: -90, maxValue: 0 }, // in dB
      { name: 'attack', defaultValue: 0.005, minValue: 0.001, maxValue: 0.1 }, // 5ms
      { name: 'release', defaultValue: 0.08, minValue: 0.01, maxValue: 0.5 },  // 80ms
      { name: 'enabled', defaultValue: 1, minValue: 0, maxValue: 1 }
    ];
  }

  constructor() {
    super();
    this.envelope = 0;
    this.gain = 1.0;
    this.lastReportTime = 0;
    this.isOpen = true;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;

    const enabled = parameters.enabled ? parameters.enabled[0] : 1;
    if (enabled < 0.5) {
      // Gate Bypassed
      for (let channel = 0; channel < input.length; channel++) {
        output[channel].set(input[channel]);
      }
      return true;
    }

    const thresholdDb = parameters.threshold ? parameters.threshold[0] : -45;
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const attackTime = parameters.attack ? parameters.attack[0] : 0.005;
    const releaseTime = parameters.release ? parameters.release[0] : 0.08;

    const attackCoeff = Math.exp(-1.0 / (sampleRate * attackTime));
    const releaseCoeff = Math.exp(-1.0 / (sampleRate * releaseTime));

    const inputChannel = input[0];
    const outputChannel0 = output[0];
    const outputChannel1 = output[1] || output[0];

    let currentOpen = this.isOpen;

    for (let i = 0; i < inputChannel.length; i++) {
      const sample = inputChannel[i];
      const absSample = Math.abs(sample);

      // Envelope follower
      if (absSample > this.envelope) {
        this.envelope = attackCoeff * this.envelope + (1 - attackCoeff) * absSample;
      } else {
        this.envelope = releaseCoeff * this.envelope + (1 - releaseCoeff) * absSample;
      }

      // Gate Logic
      let targetGain = 0.0;
      if (this.envelope > thresholdLinear) {
        targetGain = 1.0;
        currentOpen = true;
      } else {
        targetGain = 0.0;
        currentOpen = false;
      }

      // Smooth gain transitions
      const coeff = (targetGain > this.gain) ? attackCoeff : releaseCoeff;
      this.gain = coeff * this.gain + (1 - coeff) * targetGain;

      outputChannel0[i] = sample * this.gain;
      if (output[1]) {
        outputChannel1[i] = (input[1] ? input[1][i] : sample) * this.gain;
      }
    }

    this.isOpen = currentOpen;

    // Report gate status to UI periodically (~15 fps)
    if (currentTime - this.lastReportTime > 0.065) {
      this.lastReportTime = currentTime;
      this.port.postMessage({
        isOpen: this.isOpen,
        envelopeDb: 20 * Math.log10(Math.max(1e-5, this.envelope))
      });
    }

    return true;
  }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);
