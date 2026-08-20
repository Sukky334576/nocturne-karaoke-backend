// Reverb Impulse Response Generator for Web Audio ConvolverNode
class ReverbGenerator {
  static createImpulseResponse(audioCtx, options = {}) {
    const duration = options.duration || 2.5; // seconds
    const decay = options.decay || 2.0;
    const preDelay = options.preDelay || 0.02; // 20ms pre-delay
    const sampleRate = audioCtx.sampleRate || 48000;
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const preDelaySamples = Math.floor(preDelay * sampleRate);

    for (let i = 0; i < length; i++) {
      if (i < preDelaySamples) {
        left[i] = 0;
        right[i] = 0;
      } else {
        const t = (i - preDelaySamples) / (length - preDelaySamples);
        // Exponential decay envelope
        const envelope = Math.pow(1 - t, decay);
        // Stereo random noise with subtle correlation for spatial width
        const nL = (Math.random() * 2 - 1);
        const nR = (Math.random() * 2 - 1);
        left[i] = nL * envelope;
        right[i] = nR * envelope;
      }
    }

    return impulse;
  }
}

window.ReverbGenerator = ReverbGenerator;
