/**
 * NOCTURNE STUDIO • Modular Audio Plugin SDK
 * High-performance Web Audio DSP Extension Framework
 */

// --- Base Class for all Nocturne Audio Plugins ---
class NocturneAudioPlugin {
  constructor(config = {}) {
    this.id = config.id || 'custom-plugin';
    this.name = config.name || 'Custom Plugin';
    this.version = config.version || '1.0.0';
    this.author = config.author || 'Community';
    this.description = config.description || '';
    this.category = config.category || 'vocal-fx'; // 'vocal-fx' | 'utility'
    this.icon = config.icon || '✨';
    this.enabled = config.enabled !== undefined ? config.enabled : false;

    this.audioCtx = null;
    this.inputNode = null;
    this.outputNode = null;
    this.dryGainNode = null;
    this.wetGainNode = null;
    this.params = config.params || [];
    this.paramValues = {};

    // Initialize default parameter values
    this.params.forEach(p => {
      this.paramValues[p.id] = p.default !== undefined ? p.default : 0;
    });
  }

  // Lifecycle: Build audio graph
  init(audioCtx) {
    this.audioCtx = audioCtx;
    this.inputNode = audioCtx.createGain();
    this.outputNode = audioCtx.createGain();
    this.dryGainNode = audioCtx.createGain();
    this.wetGainNode = audioCtx.createGain();

    // Default bypass routing
    this.inputNode.connect(this.dryGainNode);
    this.dryGainNode.connect(this.outputNode);

    this.setupAudioGraph(audioCtx);
    this.applyBypassState();
  }

  setupAudioGraph(audioCtx) {
    // Override in subclasses
  }

  onParamChange(paramId, value) {
    // Override in subclasses
  }

  setParam(paramId, value) {
    this.paramValues[paramId] = value;
    if (this.audioCtx) {
      this.onParamChange(paramId, value);
    }
  }

  getParam(paramId) {
    return this.paramValues[paramId];
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    this.applyBypassState();
  }

  applyBypassState() {
    if (!this.audioCtx || !this.dryGainNode || !this.wetGainNode) return;
    const now = this.audioCtx.currentTime;
    if (this.enabled) {
      // Wet active: dry muted or mixed
      this.dryGainNode.gain.setTargetAtTime(0.0, now, 0.02);
      this.wetGainNode.gain.setTargetAtTime(1.0, now, 0.02);
    } else {
      // Bypassed: 100% clean dry passthrough
      this.dryGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      this.wetGainNode.gain.setTargetAtTime(0.0, now, 0.02);
    }
  }

  destroy() {
    try {
      if (this.inputNode) this.inputNode.disconnect();
      if (this.outputNode) this.outputNode.disconnect();
      if (this.dryGainNode) this.dryGainNode.disconnect();
      if (this.wetGainNode) this.wetGainNode.disconnect();
    } catch (e) {}
  }
}

// ==========================================================================
// 1. OFFICIAL PLUGIN: Vintage Tape Delay (Echo)
// ==========================================================================
class VintageTapeDelayPlugin extends NocturneAudioPlugin {
  constructor() {
    super({
      id: 'tape-delay',
      name: 'Vintage Tape Delay',
      version: '1.2.0',
      author: 'Nocturne Acoustics',
      description: 'เสียงสะท้อนสไตล์เทปคลาสสิก อุ่นนุ่ม พร้อมฟิลเตอร์ตัดย่านแหลมสไตล์อนาล็อก',
      icon: '📼',
      enabled: false,
      params: [
        { id: 'time', label: 'Delay Time', type: 'slider', min: 0.05, max: 0.8, step: 0.01, default: 0.28, unit: 's' },
        { id: 'feedback', label: 'Repeat (Feedback)', type: 'slider', min: 0.0, max: 0.75, step: 0.02, default: 0.35, unit: '%' },
        { id: 'tone', label: 'Tape Warmth', type: 'slider', min: 1000, max: 8000, step: 100, default: 3200, unit: 'Hz' },
        { id: 'mix', label: 'Echo Mix', type: 'slider', min: 0.0, max: 1.0, step: 0.05, default: 0.30, unit: '%' }
      ]
    });
  }

  setupAudioGraph(audioCtx) {
    this.delayNode = audioCtx.createDelay(1.5);
    this.delayNode.delayTime.setValueAtTime(this.paramValues.time, audioCtx.currentTime);

    this.feedbackNode = audioCtx.createGain();
    this.feedbackNode.gain.setValueAtTime(this.paramValues.feedback, audioCtx.currentTime);

    this.toneFilter = audioCtx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.setValueAtTime(this.paramValues.tone, audioCtx.currentTime);

    this.effectMixNode = audioCtx.createGain();
    this.effectMixNode.gain.setValueAtTime(this.paramValues.mix, audioCtx.currentTime);

    this.directThrough = audioCtx.createGain();
    this.directThrough.gain.setValueAtTime(1.0, audioCtx.currentTime);

    // Routing: input -> direct + delay loop
    this.inputNode.connect(this.directThrough);
    this.directThrough.connect(this.wetGainNode);

    this.inputNode.connect(this.delayNode);
    this.delayNode.connect(this.toneFilter);
    this.toneFilter.connect(this.effectMixNode);
    this.effectMixNode.connect(this.wetGainNode);

    // Feedback Loop: tone -> feedback -> delay
    this.toneFilter.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);

    this.wetGainNode.connect(this.outputNode);
  }

  onParamChange(paramId, value) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (paramId === 'time' && this.delayNode) {
      this.delayNode.delayTime.setTargetAtTime(value, now, 0.03);
    } else if (paramId === 'feedback' && this.feedbackNode) {
      // Hard safety clamp to 0.85 max to prevent infinite runaway feedback
      this.feedbackNode.gain.setTargetAtTime(Math.min(0.85, value), now, 0.03);
    } else if (paramId === 'tone' && this.toneFilter) {
      this.toneFilter.frequency.setTargetAtTime(value, now, 0.03);
    } else if (paramId === 'mix' && this.effectMixNode) {
      this.effectMixNode.gain.setTargetAtTime(value, now, 0.03);
    }
  }
}

// ==========================================================================
// 2. OFFICIAL PLUGIN: 80s Stereo Chorus & Doubler
// ==========================================================================
class StereoChorusPlugin extends NocturneAudioPlugin {
  constructor() {
    super({
      id: 'stereo-chorus',
      name: '80s Stereo Chorus',
      version: '1.1.0',
      author: 'Nocturne Acoustics',
      description: 'ขยายมิติเสียงร้องให้หนานุ่ม กว้าง มีประกาย มิติสเตอริโอสไตล์ 80s',
      icon: '🌊',
      enabled: false,
      params: [
        { id: 'rate', label: 'Speed (Rate)', type: 'slider', min: 0.2, max: 4.0, step: 0.1, default: 1.2, unit: 'Hz' },
        { id: 'depth', label: 'Modulation Depth', type: 'slider', min: 0.001, max: 0.008, step: 0.0005, default: 0.0035, unit: 'ms' },
        { id: 'mix', label: 'Chorus Mix', type: 'slider', min: 0.0, max: 1.0, step: 0.05, default: 0.45, unit: '%' }
      ]
    });
  }

  setupAudioGraph(audioCtx) {
    this.delayNode = audioCtx.createDelay(0.1);
    this.delayNode.delayTime.setValueAtTime(0.025, audioCtx.currentTime);

    this.lfo = audioCtx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(this.paramValues.rate, audioCtx.currentTime);

    this.lfoGain = audioCtx.createGain();
    this.lfoGain.gain.setValueAtTime(this.paramValues.depth, audioCtx.currentTime);

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    this.lfo.start();

    this.wetGain = audioCtx.createGain();
    this.wetGain.gain.setValueAtTime(this.paramValues.mix, audioCtx.currentTime);

    this.dryDirect = audioCtx.createGain();
    this.dryDirect.gain.setValueAtTime(1.0, audioCtx.currentTime);

    this.inputNode.connect(this.dryDirect);
    this.dryDirect.connect(this.wetGainNode);

    this.inputNode.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.wetGainNode);

    this.wetGainNode.connect(this.outputNode);
  }

  onParamChange(paramId, value) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (paramId === 'rate' && this.lfo) {
      this.lfo.frequency.setTargetAtTime(value, now, 0.05);
    } else if (paramId === 'depth' && this.lfoGain) {
      this.lfoGain.gain.setTargetAtTime(value, now, 0.05);
    } else if (paramId === 'mix' && this.wetGain) {
      this.wetGain.gain.setTargetAtTime(value, now, 0.05);
    }
  }

  destroy() {
    super.destroy();
    try {
      if (this.lfo) this.lfo.stop();
    } catch (e) {}
  }
}

// ==========================================================================
// 3. OFFICIAL PLUGIN: Telephone / Radio Lo-Fi Filter
// ==========================================================================
class RadioFilterPlugin extends NocturneAudioPlugin {
  constructor() {
    super({
      id: 'radio-filter',
      name: 'Radio / Megaphone EQ',
      version: '1.0.0',
      author: 'Nocturne Acoustics',
      description: 'จำลองเสียงร้องผ่านวิทยุสื่อสาร โทรศัพท์โบราณ หรือโทรโข่ง Lo-Fi',
      icon: '📻',
      enabled: false,
      params: [
        { id: 'freq', label: 'Center Frequency', type: 'slider', min: 800, max: 2500, step: 50, default: 1500, unit: 'Hz' },
        { id: 'drive', label: 'Distortion Crunch', type: 'slider', min: 1, max: 5, step: 0.2, default: 2.0, unit: 'x' },
        { id: 'mix', label: 'Effect Mix', type: 'slider', min: 0.0, max: 1.0, step: 0.05, default: 0.85, unit: '%' }
      ]
    });
  }

  setupAudioGraph(audioCtx) {
    // Highpass to cut low end
    this.highpass = audioCtx.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.setValueAtTime(600, audioCtx.currentTime);

    // Lowpass to cut high air
    this.lowpass = audioCtx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.setValueAtTime(this.paramValues.freq, audioCtx.currentTime);

    // Bandpass peak
    this.peak = audioCtx.createBiquadFilter();
    this.peak.type = 'peaking';
    this.peak.frequency.setValueAtTime(1400, audioCtx.currentTime);
    this.peak.Q.setValueAtTime(2.5, audioCtx.currentTime);
    this.peak.gain.setValueAtTime(6.0, audioCtx.currentTime);

    // WaveShaper for mild analog grit
    this.shaper = audioCtx.createWaveShaper();
    this.updateDistortionCurve(this.paramValues.drive);

    this.wetGain = audioCtx.createGain();
    this.wetGain.gain.setValueAtTime(this.paramValues.mix, audioCtx.currentTime);

    this.dryDirect = audioCtx.createGain();
    this.dryDirect.gain.setValueAtTime(1.0 - this.paramValues.mix, audioCtx.currentTime);

    this.inputNode.connect(this.dryDirect);
    this.dryDirect.connect(this.wetGainNode);

    this.inputNode.connect(this.highpass);
    this.highpass.connect(this.peak);
    this.peak.connect(this.lowpass);
    this.lowpass.connect(this.shaper);
    this.shaper.connect(this.wetGain);
    this.wetGain.connect(this.wetGainNode);

    this.wetGainNode.connect(this.outputNode);
  }

  updateDistortionCurve(amount) {
    const k = amount * 12;
    const n_samples = 256;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    if (this.shaper) this.shaper.curve = curve;
  }

  onParamChange(paramId, value) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (paramId === 'freq' && this.lowpass) {
      this.lowpass.frequency.setTargetAtTime(value, now, 0.03);
    } else if (paramId === 'drive') {
      this.updateDistortionCurve(value);
    } else if (paramId === 'mix') {
      if (this.wetGain) this.wetGain.gain.setTargetAtTime(value, now, 0.03);
      if (this.dryDirect) this.dryDirect.gain.setTargetAtTime(1.0 - value, now, 0.03);
    }
  }
}

// ==========================================================================
// 4. OFFICIAL PLUGIN: Warm Tube Saturator
// ==========================================================================
class WarmTubeSaturatorPlugin extends NocturneAudioPlugin {
  constructor() {
    super({
      id: 'tube-saturator',
      name: 'Warm Tube Saturator',
      version: '1.0.0',
      author: 'Nocturne Acoustics',
      description: 'เพิ่มความอิ่มของฮาร์โมนิก (Tube Harmonics) ทำให้เสียงร้องหนา แน่น และพุ่งขึ้น',
      icon: '⚡',
      enabled: false,
      params: [
        { id: 'drive', label: 'Tube Drive', type: 'slider', min: 1.0, max: 4.0, step: 0.1, default: 1.8, unit: 'x' },
        { id: 'warmth', label: 'Low-Mid Body', type: 'slider', min: 0.0, max: 6.0, step: 0.5, default: 2.5, unit: 'dB' },
        { id: 'mix', label: 'Saturation Mix', type: 'slider', min: 0.0, max: 1.0, step: 0.05, default: 0.50, unit: '%' }
      ]
    });
  }

  setupAudioGraph(audioCtx) {
    this.preGain = audioCtx.createGain();
    this.preGain.gain.setValueAtTime(this.paramValues.drive, audioCtx.currentTime);

    this.shaper = audioCtx.createWaveShaper();
    this.updateSaturationCurve();

    this.warmthFilter = audioCtx.createBiquadFilter();
    this.warmthFilter.type = 'peaking';
    this.warmthFilter.frequency.setValueAtTime(320, audioCtx.currentTime);
    this.warmthFilter.Q.setValueAtTime(1.2, audioCtx.currentTime);
    this.warmthFilter.gain.setValueAtTime(this.paramValues.warmth, audioCtx.currentTime);

    this.wetGain = audioCtx.createGain();
    this.wetGain.gain.setValueAtTime(this.paramValues.mix, audioCtx.currentTime);

    this.dryDirect = audioCtx.createGain();
    this.dryDirect.gain.setValueAtTime(1.0 - (this.paramValues.mix * 0.4), audioCtx.currentTime);

    this.inputNode.connect(this.dryDirect);
    this.dryDirect.connect(this.wetGainNode);

    this.inputNode.connect(this.preGain);
    this.preGain.connect(this.shaper);
    this.shaper.connect(this.warmthFilter);
    this.warmthFilter.connect(this.wetGain);
    this.wetGain.connect(this.wetGainNode);

    this.wetGainNode.connect(this.outputNode);
  }

  updateSaturationCurve() {
    const n = 512;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // Soft saturation curve: tanh(x)
      curve[i] = Math.tanh(x * 1.5) / Math.tanh(1.5);
    }
    if (this.shaper) this.shaper.curve = curve;
  }

  onParamChange(paramId, value) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (paramId === 'drive' && this.preGain) {
      this.preGain.gain.setTargetAtTime(value, now, 0.03);
    } else if (paramId === 'warmth' && this.warmthFilter) {
      this.warmthFilter.gain.setTargetAtTime(value, now, 0.03);
    } else if (paramId === 'mix') {
      if (this.wetGain) this.wetGain.gain.setTargetAtTime(value, now, 0.03);
      if (this.dryDirect) this.dryDirect.gain.setTargetAtTime(1.0 - (value * 0.4), now, 0.03);
    }
  }
}

// ==========================================================================
// Nocturne Plugin Registry & Manager
// ==========================================================================
class NocturnePluginRegistry {
  constructor() {
    this.audioCtx = null;
    this.rackInput = null;
    this.rackOutput = null;

    // Available Classes (Catalog)
    this.availablePluginClasses = new Map([
      ['tape-delay', VintageTapeDelayPlugin],
      ['stereo-chorus', StereoChorusPlugin],
      ['radio-filter', RadioFilterPlugin],
      ['tube-saturator', WarmTubeSaturatorPlugin]
    ]);

    // Active Loaded Plugin Instances
    this.activePlugins = [];
    this.listeners = [];
  }

  init(audioCtx, rackInput, rackOutput) {
    this.audioCtx = audioCtx;
    this.rackInput = rackInput;
    this.rackOutput = rackOutput;

    // Instantiate default 4 plugins into rack slots
    if (this.activePlugins.length === 0) {
      this.availablePluginClasses.forEach((PluginClass) => {
        const instance = new PluginClass();
        instance.init(audioCtx);
        this.activePlugins.push(instance);
      });
    } else {
      this.activePlugins.forEach(p => p.init(audioCtx));
    }

    this.rebuildAudioChain();
  }

  // Re-link audio nodes in series: rackInput -> Plugin 1 -> Plugin 2 -> ... -> rackOutput
  rebuildAudioChain() {
    if (!this.audioCtx || !this.rackInput || !this.rackOutput) return;

    try {
      this.rackInput.disconnect();
      this.activePlugins.forEach(p => {
        if (p.outputNode) p.outputNode.disconnect();
      });
    } catch (e) {}

    let currentSource = this.rackInput;

    this.activePlugins.forEach(plugin => {
      if (plugin.inputNode && plugin.outputNode) {
        currentSource.connect(plugin.inputNode);
        currentSource = plugin.outputNode;
      }
    });

    currentSource.connect(this.rackOutput);
    this.notifyListeners();
  }

  togglePlugin(pluginId, isEnabled) {
    const plugin = this.activePlugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.setEnabled(isEnabled);
      this.notifyListeners();
    }
  }

  setPluginParam(pluginId, paramId, value) {
    const plugin = this.activePlugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.setParam(paramId, value);
    }
  }

  registerCustomPluginClass(pluginId, PluginClass) {
    this.availablePluginClasses.set(pluginId, PluginClass);
    if (this.audioCtx) {
      const instance = new PluginClass();
      instance.init(this.audioCtx);
      this.activePlugins.push(instance);
      this.rebuildAudioChain();
    }
  }

  // Register external script from code string or URL
  async loadPluginFromCode(jsCode) {
    try {
      const blob = new Blob([jsCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const module = await import(url);
      const PluginClass = module.default || Object.values(module)[0];
      if (typeof PluginClass === 'function') {
        const dummy = new PluginClass();
        const pluginId = dummy.id || `custom-${Date.now()}`;
        this.registerCustomPluginClass(pluginId, PluginClass);
        URL.revokeObjectURL(url);
        return { success: true, name: dummy.name, id: pluginId };
      } else {
        throw new Error('Plugin file must export a class inheriting from NocturneAudioPlugin');
      }
    } catch (err) {
      console.error('Plugin load error:', err);
      return { success: false, error: err.message };
    }
  }

  getSerializedState() {
    return this.activePlugins.map(p => ({
      id: p.id,
      enabled: p.enabled,
      paramValues: { ...p.paramValues }
    }));
  }

  applySerializedState(stateList) {
    if (!Array.isArray(stateList)) return;
    stateList.forEach(saved => {
      const plugin = this.activePlugins.find(p => p.id === saved.id);
      if (plugin) {
        plugin.setEnabled(saved.enabled);
        if (saved.paramValues) {
          Object.entries(saved.paramValues).forEach(([k, v]) => {
            plugin.setParam(k, v);
          });
        }
      }
    });
    this.notifyListeners();
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.activePlugins));
  }
}

// Global Singleton Instance
window.NocturneAudioPlugin = NocturneAudioPlugin;
window.nocturnePlugins = new NocturnePluginRegistry();
