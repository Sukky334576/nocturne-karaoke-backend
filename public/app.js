// NOCTURNE STUDIO • Ultra-Resilient Haute Horlogerie Acoustics Engine
let audioCtx = null;
let pitchNode = null;
let autotuneNode = null;
let autotuneGain = null;
let recordMicGain = null;
let duckingGain = null;
let masterGain = null;
let headphoneGain = null;
let cableGain = null;
let cableSyncDelayNode = null;

// Vocal Dynamics Nodes
let noiseGateNode = null;
let vocalCompressorNode = null;
let isDynamicsEnabled = true;

let convolverNode = null;
let reverbInputGain = null;
let reverbGain = null;
let headphoneReverbGain = null;

let micSource = null;
let micAnalyser = null;

let headphoneAnalyser = null;
let cableAnalyser = null;

let destCable = null;
let destRecordTest = null;
let audioElCable = null;

let audioSourceElement = null;
let mediaElementSource = null;

// YouTube Iframe Player State
let ytPlayer = null;
let isYtReady = false;
let ytProgressInterval = null;
let isUsingDirectYtAudio = false;

// User Profile & App State
let currentUser = {
  username: 'tong3',
  isGuest: false,
  preset: {
    syncOffsetMs: 120,
    musicVol: 1.0,
    headphoneVol: 0.8,
    cableVol: 0.9,
    reverbMix: 0.25,
    reverbDecay: 1.8,
    roomSize: 2,
    autotuneEnabled: false,
    autotuneKey: 0,
    autotuneScale: 0,
    autotuneSpeed: 0.1,
    autotuneAmount: 1.0,
    noiseGateThreshold: -45,
    compressorRatio: 4,
    dynamicsEnabled: true,
    activePreset: 'pop'
  }
};

let isAudioInitialized = false;
let isDucked = false;
let currentSemitone = 0;
let isReverbEnabled = true;
let isAutotuneEnabled = false;
let queue = [];
let isPlaying = false;
let currentTrack = null;

let trackDurationSeconds = 0;
let streamOffsetSeconds = 0;
let isUserSeeking = false;
let cableSyncOffsetMs = 120;

// Metronome State
let isMetronomeRunning = false;
let metronomeTimer = null;
let currentBeat = 0;
let lastBeepAudioTime = 0;
let measuredSamples = [];
let calculatedAverageMs = 0;

// Record Test State
let mediaRecorder = null;
let recordedChunks = [];
let isRecordingTest = false;
let recordTimerInterval = null;
let recordSeconds = 0;

// SVG Icons
const SVG_PLAY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
const SVG_PAUSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

// DOM Elements
const audioInitBtn = document.getElementById('audioInitBtn');
const duckingBtn = document.getElementById('duckingBtn');
const duckingStatusText = document.getElementById('duckingStatusText');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const ytPlayerDiv = document.getElementById('ytPlayerDiv');

const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackArtist = document.getElementById('currentTrackArtist');
const musicVolSlider = document.getElementById('musicVolSlider');
const musicVolText = document.getElementById('musicVolText');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeText = document.getElementById('currentTime');
const totalDurationText = document.getElementById('totalDuration');

const pitchDisplay = document.getElementById('pitchDisplay');
const pitchSlider = document.getElementById('pitchSlider');
const pitchButtons = document.querySelectorAll('.pitch-btn');

// Vocal Dynamics DOM
const dynamicsToggle = document.getElementById('dynamicsToggle');
const noiseGateSlider = document.getElementById('noiseGateSlider');
const noiseGateText = document.getElementById('noiseGateText');
const gateLedIndicator = document.getElementById('gateLedIndicator');
const compressorSlider = document.getElementById('compressorSlider');
const compressorText = document.getElementById('compressorText');
const presetPills = document.querySelectorAll('.preset-pill');

// Auto-Tune DOM
const autotuneToggle = document.getElementById('autotuneToggle');
const atDetectedNote = document.getElementById('atDetectedNote');
const atTargetNote = document.getElementById('atTargetNote');
const autotuneKeySelect = document.getElementById('autotuneKeySelect');
const autotuneScaleSelect = document.getElementById('autotuneScaleSelect');
const atSpeed = document.getElementById('atSpeed');
const atSpeedText = document.getElementById('atSpeedText');
const atAmount = document.getElementById('atAmount');
const atAmountText = document.getElementById('atAmountText');

// Audio Routing & Vol
const headphoneSelect = document.getElementById('headphoneSelect');
const headphoneVol = document.getElementById('headphoneVol');
const headphoneVolText = document.getElementById('headphoneVolText');
const headphoneVuBar = document.getElementById('headphoneVuBar');

const virtualCableSelect = document.getElementById('virtualCableSelect');
const cableVol = document.getElementById('cableVol');
const cableVolText = document.getElementById('cableVolText');
const cableVuBar = document.getElementById('cableVuBar');

const cableSyncOffsetSlider = document.getElementById('cableSyncOffset');
const cableSyncOffsetText = document.getElementById('cableSyncOffsetText');

const micSelect = document.getElementById('micSelect');
const micVuBar = document.getElementById('micVuBar');
const reverbToggle = document.getElementById('reverbToggle');
const reverbMix = document.getElementById('reverbMix');
const reverbMixText = document.getElementById('reverbMixText');
const reverbDecay = document.getElementById('reverbDecay');
const reverbDecayText = document.getElementById('reverbDecayText');
const roomSize = document.getElementById('roomSize');
const roomSizeText = document.getElementById('roomSizeText');

const queueList = document.getElementById('queueList');
const clearQueueBtn = document.getElementById('clearQueueBtn');

// Setup Guide DOM
const openSetupGuideBtn = document.getElementById('openSetupGuideBtn');
const closeSetupGuideBtn = document.getElementById('closeSetupGuideBtn');
const setupGuideModal = document.getElementById('setupGuideModal');
const finishSetupGuideBtn = document.getElementById('finishSetupGuideBtn');

// User Auth DOM
const userProfileBtn = document.getElementById('userProfileBtn');
const userProfileLabel = document.getElementById('userProfileLabel');
const authModal = document.getElementById('authModal');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const authUsernameInput = document.getElementById('authUsernameInput');
const authPasswordInput = document.getElementById('authPasswordInput');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const guestAuthBtn = document.getElementById('guestAuthBtn');

// Metronome Modal Elements
const openSyncModalBtn = document.getElementById('openSyncModalBtn');
const closeSyncModalBtn = document.getElementById('closeSyncModalBtn');
const syncModal = document.getElementById('syncModal');
const toggleMetronomeBtn = document.getElementById('toggleMetronomeBtn');
const metroIndicator = document.getElementById('metroIndicator');
const metroBeatNum = document.getElementById('metroBeatNum');
const metroStatus = document.getElementById('metroStatus');
const outputBeepStatus = document.getElementById('outputBeepStatus');
const micDetectStatus = document.getElementById('micDetectStatus');
const measuredOffsetVal = document.getElementById('measuredOffsetVal');
const samplesListContainer = document.getElementById('samplesListContainer');
const resetSamplesBtn = document.getElementById('resetSamplesBtn');
const applyMeasuredOffsetBtn = document.getElementById('applyMeasuredOffsetBtn');

// Record Test Elements (Embedded)
const openRecordTestBtn = document.getElementById('openRecordTestBtn');
const embeddedRecordSection = document.getElementById('embeddedRecordSection');
const toggleRecordBtn = document.getElementById('toggleRecordBtn');
const recIndicator = document.getElementById('recIndicator');
const recTimerText = document.getElementById('recTimerText');
const recStatusMsg = document.getElementById('recStatusMsg');
const playbackWidget = document.getElementById('playbackWidget');
const recordedAudioPlayer = document.getElementById('recordedAudioPlayer');
const modalSyncOffset = document.getElementById('modalSyncOffset');
const modalSyncOffsetText = document.getElementById('modalSyncOffsetText');

// --- Vocal Presets Configuration ---
const VOCAL_PRESETS = {
  pop: {
    autotuneEnabled: true,
    autotuneKey: 0,
    autotuneScale: 0,
    autotuneSpeed: 0.10,
    autotuneAmount: 1.0,
    reverbEnabled: true,
    reverbMix: 0.25,
    reverbDecay: 1.8,
    roomSize: 2,
    noiseGateThreshold: -45,
    compressorRatio: 4,
    dynamicsEnabled: true
  },
  tpain: {
    autotuneEnabled: true,
    autotuneKey: 0,
    autotuneScale: 1, // Minor
    autotuneSpeed: 0.0,
    autotuneAmount: 1.0,
    reverbEnabled: true,
    reverbMix: 0.35,
    reverbDecay: 2.2,
    roomSize: 3,
    noiseGateThreshold: -40,
    compressorRatio: 6,
    dynamicsEnabled: true
  },
  rock: {
    autotuneEnabled: false,
    reverbEnabled: true,
    reverbMix: 0.40,
    reverbDecay: 2.8,
    roomSize: 4,
    noiseGateThreshold: -48,
    compressorRatio: 5,
    dynamicsEnabled: true
  },
  lofi: {
    autotuneEnabled: false,
    reverbEnabled: true,
    reverbMix: 0.20,
    reverbDecay: 1.2,
    roomSize: 1,
    noiseGateThreshold: -50,
    compressorRatio: 2.5,
    dynamicsEnabled: true
  },
  talk: {
    autotuneEnabled: false,
    reverbEnabled: false,
    reverbMix: 0.0,
    reverbDecay: 1.0,
    roomSize: 1,
    noiseGateThreshold: -40,
    compressorRatio: 3,
    dynamicsEnabled: true
  }
};

// --- User Profile & Preset Storage ---
function loadUserProfile() {
  const saved = localStorage.getItem('karaoke_current_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch (e) {}
  }
  applyUserPreset(currentUser.preset);
  updateAuthUI();
}

function saveUserProfile() {
  currentUser.preset = {
    syncOffsetMs: cableSyncOffsetMs,
    musicVol: musicVolSlider ? parseFloat(musicVolSlider.value) : 1.0,
    headphoneVol: parseFloat(headphoneVol.value),
    cableVol: parseFloat(cableVol.value),
    reverbMix: parseFloat(reverbMix.value),
    reverbDecay: parseFloat(reverbDecay.value),
    roomSize: parseInt(roomSize.value),
    autotuneEnabled: isAutotuneEnabled,
    autotuneKey: parseInt(autotuneKeySelect.value),
    autotuneScale: parseInt(autotuneScaleSelect.value),
    autotuneSpeed: parseFloat(atSpeed.value),
    autotuneAmount: parseFloat(atAmount.value),
    noiseGateThreshold: noiseGateSlider ? parseFloat(noiseGateSlider.value) : -45,
    compressorRatio: compressorSlider ? parseFloat(compressorSlider.value) : 4,
    dynamicsEnabled: isDynamicsEnabled
  };
  localStorage.setItem('karaoke_current_user', JSON.stringify(currentUser));
}

function applyUserPreset(preset) {
  if (!preset) return;
  setSyncOffset(preset.syncOffsetMs !== undefined ? preset.syncOffsetMs : 120);

  if (preset.musicVol !== undefined && musicVolSlider) {
    musicVolSlider.value = preset.musicVol;
    musicVolText.innerText = Math.round(preset.musicVol * 100) + '%';
    if (masterGain && audioCtx) masterGain.gain.setValueAtTime(preset.musicVol, audioCtx.currentTime);
  }

  if (preset.autotuneKey !== undefined) autotuneKeySelect.value = preset.autotuneKey;
  if (preset.autotuneScale !== undefined) autotuneScaleSelect.value = preset.autotuneScale;
  if (preset.autotuneSpeed !== undefined) {
    atSpeed.value = preset.autotuneSpeed;
    updateAutotuneSpeedDisplay(preset.autotuneSpeed);
  }
  if (preset.autotuneAmount !== undefined) {
    atAmount.value = preset.autotuneAmount;
    atAmountText.innerText = Math.round(preset.autotuneAmount * 100) + '%';
  }

  if (preset.noiseGateThreshold !== undefined && noiseGateSlider) {
    noiseGateSlider.value = preset.noiseGateThreshold;
    noiseGateText.innerText = preset.noiseGateThreshold + ' dB';
  }

  if (preset.compressorRatio !== undefined && compressorSlider) {
    compressorSlider.value = preset.compressorRatio;
    compressorText.innerText = preset.compressorRatio + ':1 Ratio';
  }

  if (preset.dynamicsEnabled !== undefined && dynamicsToggle) {
    dynamicsToggle.checked = preset.dynamicsEnabled;
    isDynamicsEnabled = preset.dynamicsEnabled;
  }
}

function applyVocalPreset(presetKey) {
  const cfg = VOCAL_PRESETS[presetKey];
  if (!cfg) return;

  // Highlight Active Pill
  presetPills.forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-preset') === presetKey);
  });

  // Apply Auto-Tune
  isAutotuneEnabled = cfg.autotuneEnabled;
  autotuneToggle.checked = cfg.autotuneEnabled;
  if (cfg.autotuneKey !== undefined) autotuneKeySelect.value = cfg.autotuneKey;
  if (cfg.autotuneScale !== undefined) autotuneScaleSelect.value = cfg.autotuneScale;
  if (cfg.autotuneSpeed !== undefined) {
    atSpeed.value = cfg.autotuneSpeed;
    updateAutotuneSpeedDisplay(cfg.autotuneSpeed);
  }
  if (cfg.autotuneAmount !== undefined) {
    atAmount.value = cfg.autotuneAmount;
    atAmountText.innerText = Math.round(cfg.autotuneAmount * 100) + '%';
  }

  // Apply Reverb
  isReverbEnabled = cfg.reverbEnabled;
  reverbToggle.checked = cfg.reverbEnabled;
  if (cfg.reverbMix !== undefined) {
    reverbMix.value = cfg.reverbMix;
    reverbMixText.innerText = Math.round(cfg.reverbMix * 100) + '%';
  }
  if (cfg.reverbDecay !== undefined) {
    reverbDecay.value = cfg.reverbDecay;
    reverbDecayText.innerText = cfg.reverbDecay.toFixed(1) + 's';
  }
  if (cfg.roomSize !== undefined) {
    roomSize.value = cfg.roomSize;
    updateRoomSizeText(cfg.roomSize);
  }

  // Apply Dynamics
  if (cfg.noiseGateThreshold !== undefined && noiseGateSlider) {
    noiseGateSlider.value = cfg.noiseGateThreshold;
    noiseGateText.innerText = cfg.noiseGateThreshold + ' dB';
  }
  if (cfg.compressorRatio !== undefined && compressorSlider) {
    compressorSlider.value = cfg.compressorRatio;
    compressorText.innerText = cfg.compressorRatio + ':1 Ratio';
  }
  if (cfg.dynamicsEnabled !== undefined && dynamicsToggle) {
    dynamicsToggle.checked = cfg.dynamicsEnabled;
    isDynamicsEnabled = cfg.dynamicsEnabled;
  }

  // Sync to Audio Nodes
  updateAutotuneParams();
  updateReverbImpulse();
  updateDynamicsParams();
  saveUserProfile();
}

function updateAuthUI() {
  if (currentUser.username) {
    userProfileLabel.innerHTML = `<b>${currentUser.username}</b> (${cableSyncOffsetMs}ms)`;
    userProfileBtn.style.borderColor = 'rgba(216, 177, 93, 0.4)';
    userProfileBtn.style.color = '#f4e6c3';
  } else {
    userProfileLabel.innerText = 'สมาชิก / Preset';
  }
}

// Preset Pills Listeners
presetPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const key = pill.getAttribute('data-preset');
    applyVocalPreset(key);
  });
});

// Setup Guide Modal Listeners
openSetupGuideBtn.addEventListener('click', () => {
  setupGuideModal.classList.remove('hidden');
});
closeSetupGuideBtn.addEventListener('click', () => {
  setupGuideModal.classList.add('hidden');
});
finishSetupGuideBtn.addEventListener('click', () => {
  setupGuideModal.classList.add('hidden');
  initAudioEngine();
});

// Auth Modal Listeners
userProfileBtn.addEventListener('click', () => {
  authModal.classList.remove('hidden');
});
closeAuthModalBtn.addEventListener('click', () => {
  authModal.classList.add('hidden');
});
guestAuthBtn.addEventListener('click', () => {
  authModal.classList.add('hidden');
});
submitAuthBtn.addEventListener('click', () => {
  const uname = authUsernameInput.value.trim();
  if (uname) {
    currentUser.username = uname;
    saveUserProfile();
    updateAuthUI();
    authModal.classList.add('hidden');
  }
});

// Scroll smoothly to Record Test Section
openRecordTestBtn.addEventListener('click', () => {
  initAudioEngine();
  if (embeddedRecordSection) {
    embeddedRecordSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    embeddedRecordSection.style.boxShadow = '0 0 25px rgba(216, 177, 93, 0.4)';
    setTimeout(() => {
      embeddedRecordSection.style.boxShadow = '';
    }, 1200);
  }
});

// Initialize YouTube Player
function initYtPlayer(videoId, startSec = 0) {
  const origin = window.location.origin;
  if (!window.YT || !window.YT.Player) {
    ytPlayerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&mute=1&start=${Math.floor(startSec)}&enablejsapi=1&origin=${encodeURIComponent(origin)}" class="video-iframe" frameborder="0" allow="autoplay"></iframe>`;
    return;
  }

  if (ytPlayer && ytPlayer.loadVideoById) {
    try {
      ytPlayer.loadVideoById({ videoId, startSeconds: Math.floor(startSec) });
      if (ytPlayer.mute) ytPlayer.mute();
      ytPlayer.playVideo();
    } catch (e) {
      console.warn('YT load error:', e);
    }
  } else {
    ytPlayerDiv.innerHTML = '';
    ytPlayer = new YT.Player('ytPlayerDiv', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        mute: 1, // ALWAYS MUTED: only Web Audio DSP feeds sound
        enablejsapi: 1,
        origin: origin,
        start: Math.floor(startSec)
      },
      events: {
        onReady: (e) => {
          isYtReady = true;
          if (e.target && e.target.mute) e.target.mute();
          e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            if (ytPlayer && ytPlayer.mute) ytPlayer.mute();
            playPauseBtn.innerHTML = SVG_PAUSE;
            startYtProgressTracker();
          } else if (e.data === YT.PlayerState.PAUSED) {
            isPlaying = false;
            playPauseBtn.innerHTML = SVG_PLAY;
          } else if (e.data === YT.PlayerState.ENDED) {
            playNextInQueue();
          }
        }
      }
    });
  }
  startYtProgressTracker();
}

function startYtProgressTracker() {
  if (ytProgressInterval) clearInterval(ytProgressInterval);
  ytProgressInterval = setInterval(() => {
    if (!isPlaying || isUserSeeking) return;

    // 1. Resolve true duration
    let dur = trackDurationSeconds;
    if (ytPlayer && typeof ytPlayer.getDuration === 'function') {
      const ytDur = ytPlayer.getDuration();
      if (ytDur && isFinite(ytDur) && ytDur > 0) {
        dur = ytDur;
        trackDurationSeconds = ytDur;
      }
    }

    // 2. Resolve true current position
    let curr = 0;
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const ytCurr = ytPlayer.getCurrentTime();
      if (ytCurr !== undefined && isFinite(ytCurr) && ytCurr >= 0) {
        curr = ytCurr;
      }
    } else if (audioSourceElement && !audioSourceElement.paused) {
      curr = streamOffsetSeconds + (audioSourceElement.currentTime || 0);
    }

    if (dur > 0 && isFinite(dur)) {
      currentTimeText.innerText = formatTime(curr);
      totalDurationText.innerText = formatTime(dur);
      const pct = Math.min(100, Math.max(0, (curr / dur) * 100));
      progressBar.value = pct;
    }
  }, 250);
}

// --- Initialize Web Audio Graph ---
async function initAudioEngine() {
  if (isAudioInitialized) {
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    return;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    try {
      const initialStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initialStream.getTracks().forEach(t => t.stop());
    } catch (e) {
      console.warn('Mic permission note:', e.message);
    }

    // Load Pitch Shifter Worklet (Backing Track)
    try {
      await audioCtx.audioWorklet.addModule('pitch-shifter-processor.js');
      pitchNode = new AudioWorkletNode(audioCtx, 'pitch-shifter-processor');
    } catch (e) {
      console.warn('Pitch Shifter Worklet note:', e);
    }

    // Load Noise Gate AudioWorklet
    try {
      await audioCtx.audioWorklet.addModule('noise-gate-processor.js');
      noiseGateNode = new AudioWorkletNode(audioCtx, 'noise-gate-processor');
      noiseGateNode.port.onmessage = (e) => {
        if (e.data && gateLedIndicator) {
          if (e.data.isOpen) {
            gateLedIndicator.innerText = 'OPEN';
            gateLedIndicator.className = 'gate-led open';
          } else {
            gateLedIndicator.innerText = 'MUTED';
            gateLedIndicator.className = 'gate-led gate';
          }
        }
      };
    } catch (e) {
      console.warn('Noise Gate Worklet note:', e);
    }

    // Create Studio Vocal Compressor / Limiter
    vocalCompressorNode = audioCtx.createDynamicsCompressor();
    vocalCompressorNode.threshold.setValueAtTime(-24, audioCtx.currentTime);
    vocalCompressorNode.knee.setValueAtTime(30, audioCtx.currentTime);
    vocalCompressorNode.ratio.setValueAtTime(compressorSlider ? parseFloat(compressorSlider.value) : 4, audioCtx.currentTime);
    vocalCompressorNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
    vocalCompressorNode.release.setValueAtTime(0.25, audioCtx.currentTime);

    // Gain Nodes
    duckingGain = audioCtx.createGain();
    duckingGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    masterGain = audioCtx.createGain();
    const initialMusicVol = musicVolSlider ? parseFloat(musicVolSlider.value) : 1.0;
    masterGain.gain.setValueAtTime(initialMusicVol, audioCtx.currentTime);

    headphoneGain = audioCtx.createGain();
    headphoneGain.gain.setValueAtTime(parseFloat(headphoneVol.value), audioCtx.currentTime);

    cableSyncDelayNode = audioCtx.createDelay(1.0);
    cableSyncDelayNode.delayTime.setValueAtTime(cableSyncOffsetMs / 1000, audioCtx.currentTime);

    cableGain = audioCtx.createGain();
    cableGain.gain.setValueAtTime(parseFloat(cableVol.value), audioCtx.currentTime);

    // Auto-Tune Dedicated Gain (Feeds tuned voice to Discord)
    autotuneGain = audioCtx.createGain();
    autotuneGain.gain.setValueAtTime(isAutotuneEnabled ? 1.0 : 0.0, audioCtx.currentTime);

    // Record Test Mic Gain (Feeds dry/untuned voice into Test Recorder when Auto-Tune is off)
    recordMicGain = audioCtx.createGain();
    recordMicGain.gain.setValueAtTime(isAutotuneEnabled ? 0.0 : 1.0, audioCtx.currentTime);

    // Reverb System: Isolated from music, feeds ONLY to Vocal Reverb
    convolverNode = audioCtx.createConvolver();
    reverbInputGain = audioCtx.createGain();
    reverbInputGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    reverbGain = audioCtx.createGain();
    reverbGain.gain.setValueAtTime(isReverbEnabled ? parseFloat(reverbMix.value) : 0.0, audioCtx.currentTime);

    // Headphone Reverb Gain
    headphoneReverbGain = audioCtx.createGain();
    headphoneReverbGain.gain.setValueAtTime(1.3, audioCtx.currentTime);

    updateReverbImpulse();

    // Analysers
    micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 64;

    headphoneAnalyser = audioCtx.createAnalyser();
    headphoneAnalyser.fftSize = 64;

    cableAnalyser = audioCtx.createAnalyser();
    cableAnalyser.fftSize = 64;

    // Media Destinations for Virtual Cable and Record Test
    destCable = audioCtx.createMediaStreamDestination();
    destRecordTest = audioCtx.createMediaStreamDestination();

    // Safely get or create audioElCable
    audioElCable = document.getElementById('sinkCable');
    if (!audioElCable) {
      audioElCable = new Audio();
      audioElCable.id = 'sinkCable';
      audioElCable.className = 'hidden';
      document.body.appendChild(audioElCable);
    }
    audioElCable.srcObject = destCable.stream;

    // --- Audio Graph Wiring ---
    if (pitchNode) {
      duckingGain.connect(pitchNode);
      pitchNode.connect(masterGain);
    } else {
      duckingGain.connect(masterGain);
    }

    // 1. BACKING TRACK ROUTING:
    masterGain.connect(headphoneGain);
    headphoneGain.connect(headphoneAnalyser);
    headphoneGain.connect(audioCtx.destination);

    // Backing track to Discord with 120ms Sync Delay
    masterGain.connect(cableSyncDelayNode);
    cableSyncDelayNode.connect(cableGain);
    cableGain.connect(cableAnalyser);
    cableAnalyser.connect(destCable);

    // 2. REVERB VOCAL ROUTING:
    reverbInputGain.connect(convolverNode);
    convolverNode.connect(reverbGain);

    // Reverb Tail to Discord
    reverbGain.connect(destCable);

    // Reverb Tail to Singer's Headphones
    reverbGain.connect(headphoneReverbGain);
    headphoneReverbGain.connect(audioCtx.destination);

    // 3. AUTO-TUNE VOCAL ROUTING:
    autotuneGain.connect(destCable);

    // 4. TEST RECORDER DESTINATION:
    cableGain.connect(destRecordTest);      // Synced Backing Track
    reverbGain.connect(destRecordTest);     // Reverb Tail
    autotuneGain.connect(destRecordTest);   // Tuned Voice (when ON)
    recordMicGain.connect(destRecordTest);  // Real Direct Voice (when AutoTune OFF)

    // Load Auto-Tune Worklet
    try {
      await audioCtx.audioWorklet.addModule('autotune-processor.js');
      autotuneNode = new AudioWorkletNode(audioCtx, 'autotune-processor');
      autotuneNode.port.onmessage = (e) => {
        if (e.data && isAutotuneEnabled) {
          atDetectedNote.innerText = `${e.data.detectedNote} (${e.data.detectedFreq}Hz)`;
          atTargetNote.innerText = e.data.targetNote;
        }
      };
      autotuneNode.connect(autotuneGain);
      updateAutotuneParams();
    } catch (e) {
      console.warn('AutoTune Worklet note:', e);
    }

    // Start Audio Elements
    await audioElCable.play().catch(() => {});

    // Create Backing Track Audio Source
    audioSourceElement = new Audio();
    audioSourceElement.crossOrigin = 'anonymous';
    mediaElementSource = audioCtx.createMediaElementSource(audioSourceElement);
    mediaElementSource.connect(duckingGain);

    // Request Microphone & wire through Dynamics Chain
    await initMicrophoneStream();

    setupAudioElementEvents();
    startVuMeters();
    updateDynamicsParams();

    await enumerateAudioDevices();

    isAudioInitialized = true;
    audioInitBtn.innerHTML = '<span>✦ ENGINE ACTIVE</span>';
    audioInitBtn.classList.remove('glow-btn');
    audioInitBtn.style.background = 'rgba(216, 177, 93, 0.15)';
    audioInitBtn.style.color = '#f4e6c3';
    audioInitBtn.style.border = '1px solid #d8b15d';

    console.log('⚡ Audio Engine Initialized Successfully');
  } catch (err) {
    console.error('Audio engine init error:', err);
  }
}

// Global click listener to unlock suspended AudioContext immediately
window.addEventListener('click', async () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
});

// Update Reverb Impulse Response
function updateReverbImpulse() {
  if (!audioCtx || !convolverNode) return;
  const decayVal = parseFloat(reverbDecay.value);
  const roomVal = parseFloat(roomSize.value);
  const ir = ReverbGenerator.createImpulseResponse(audioCtx, {
    duration: decayVal,
    decay: roomVal * 0.8,
    preDelay: 0.02
  });
  convolverNode.buffer = ir;
}

// Initialize Microphone Stream with Vocal Dynamics Chain
async function initMicrophoneStream(deviceId) {
  try {
    const constraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        latency: 0.005
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (micSource) micSource.disconnect();

    micSource = audioCtx.createMediaStreamSource(stream);
    micSource.connect(micAnalyser);

    // Connect through Vocal Dynamics Chain (Noise Gate -> Compressor -> FX)
    let vocalChainSource = micSource;

    if (noiseGateNode && vocalCompressorNode) {
      micSource.connect(noiseGateNode);
      noiseGateNode.connect(vocalCompressorNode);
      vocalChainSource = vocalCompressorNode;
    }

    if (reverbInputGain) {
      vocalChainSource.connect(reverbInputGain);
    }

    if (autotuneNode) {
      vocalChainSource.connect(autotuneNode);
    }

    if (recordMicGain) {
      vocalChainSource.connect(recordMicGain);
    }
  } catch (err) {
    console.warn('Microphone access note:', err.message);
  }
}

// Update Vocal Dynamics (Gate & Compressor)
function updateDynamicsParams() {
  if (!audioCtx) return;

  if (noiseGateNode) {
    const pEnabled = noiseGateNode.parameters.get('enabled');
    const pThreshold = noiseGateNode.parameters.get('threshold');
    if (pEnabled) pEnabled.setValueAtTime(isDynamicsEnabled ? 1 : 0, audioCtx.currentTime);
    if (pThreshold && noiseGateSlider) pThreshold.setValueAtTime(parseFloat(noiseGateSlider.value), audioCtx.currentTime);
  }

  if (vocalCompressorNode && compressorSlider) {
    const ratioVal = isDynamicsEnabled ? parseFloat(compressorSlider.value) : 1;
    vocalCompressorNode.ratio.setValueAtTime(ratioVal, audioCtx.currentTime);
  }

  saveUserProfile();
}

// Update Auto-Tune AudioWorklet Parameters
function updateAutotuneParams() {
  if (!audioCtx) return;

  if (autotuneGain) {
    autotuneGain.gain.setValueAtTime(isAutotuneEnabled ? 1.0 : 0.0, audioCtx.currentTime);
  }

  if (recordMicGain) {
    recordMicGain.gain.setValueAtTime(isAutotuneEnabled ? 0.0 : 1.0, audioCtx.currentTime);
  }

  if (autotuneNode) {
    const pEnabled = autotuneNode.parameters.get('enabled');
    const pKey = autotuneNode.parameters.get('rootKey');
    const pScale = autotuneNode.parameters.get('scaleType');
    const pSpeed = autotuneNode.parameters.get('retuneSpeed');
    const pAmount = autotuneNode.parameters.get('correctionAmount');

    if (pEnabled) pEnabled.setValueAtTime(isAutotuneEnabled ? 1 : 0, audioCtx.currentTime);
    if (pKey) pKey.setValueAtTime(parseInt(autotuneKeySelect.value), audioCtx.currentTime);
    if (pScale) pScale.setValueAtTime(parseInt(autotuneScaleSelect.value), audioCtx.currentTime);
    if (pSpeed) pSpeed.setValueAtTime(parseFloat(atSpeed.value), audioCtx.currentTime);
    if (pAmount) pAmount.setValueAtTime(parseFloat(atAmount.value), audioCtx.currentTime);
  }

  saveUserProfile();
}

function updateAutotuneSpeedDisplay(val) {
  const speed = parseFloat(val);
  if (speed <= 0.05) {
    atSpeedText.innerText = `T-Pain (${speed.toFixed(2)})`;
  } else if (speed <= 0.3) {
    atSpeedText.innerText = `Pop (${speed.toFixed(2)})`;
  } else {
    atSpeedText.innerText = `Natural (${speed.toFixed(2)})`;
  }
}

function updateRoomSizeText(val) {
  const s = parseInt(val);
  const names = ['Room', 'Studio', 'Hall', 'Arena'];
  roomSizeText.innerText = names[s - 1] || 'Studio';
}

// Music Volume Slider Listener (Controls Web Audio DSP masterGain ONLY, never unmutes YouTube)
if (musicVolSlider) {
  musicVolSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    musicVolText.innerText = Math.round(val * 100) + '%';
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(val, audioCtx.currentTime);
    }
    // Strict isolation: ensure YouTube video remains permanently muted
    if (ytPlayer && typeof ytPlayer.mute === 'function') {
      ytPlayer.mute();
    }
    saveUserProfile();
  });
}

// Dynamics Sliders Listeners
if (dynamicsToggle) {
  dynamicsToggle.addEventListener('change', (e) => {
    isDynamicsEnabled = e.target.checked;
    updateDynamicsParams();
  });
}

if (noiseGateSlider) {
  noiseGateSlider.addEventListener('input', (e) => {
    noiseGateText.innerText = e.target.value + ' dB';
    updateDynamicsParams();
  });
}

if (compressorSlider) {
  compressorSlider.addEventListener('input', (e) => {
    compressorText.innerText = e.target.value + ':1 Ratio';
    updateDynamicsParams();
  });
}

autotuneToggle.addEventListener('change', (e) => {
  isAutotuneEnabled = e.target.checked;
  if (!isAutotuneEnabled) {
    atDetectedNote.innerText = '-';
    atTargetNote.innerText = '-';
  }
  updateAutotuneParams();
});

autotuneKeySelect.addEventListener('change', updateAutotuneParams);
autotuneScaleSelect.addEventListener('change', updateAutotuneParams);

atSpeed.addEventListener('input', (e) => {
  updateAutotuneSpeedDisplay(e.target.value);
  updateAutotuneParams();
});

atAmount.addEventListener('input', (e) => {
  atAmountText.innerText = Math.round(parseFloat(e.target.value) * 100) + '%';
  updateAutotuneParams();
});

// VU Meters & Multi-Sample Peak Detection
function startVuMeters() {
  const micData = new Uint8Array(micAnalyser.frequencyBinCount);
  const hpData = new Uint8Array(headphoneAnalyser.frequencyBinCount);
  const cbData = new Uint8Array(cableAnalyser.frequencyBinCount);

  let lastClapTime = 0;

  function draw() {
    requestAnimationFrame(draw);

    if (micAnalyser && micVuBar) {
      micAnalyser.getByteFrequencyData(micData);
      let sum = 0;
      let maxVal = 0;
      for (let i = 0; i < micData.length; i++) {
        sum += micData[i];
        if (micData[i] > maxVal) maxVal = micData[i];
      }
      const percent = Math.min(100, Math.round((sum / micData.length / 128) * 100));
      micVuBar.style.transform = `scaleX(${percent / 100})`;

      if (isMetronomeRunning && maxVal > 140 && (performance.now() - lastClapTime > 350)) {
        lastClapTime = performance.now();
        const nowSec = audioCtx ? audioCtx.currentTime : 0;
        const diffMs = Math.round((nowSec - lastBeepAudioTime) * 1000);

        if (diffMs >= 10 && diffMs <= 450) {
          addLatencySample(diffMs);
        }
      }
    }

    if (headphoneAnalyser && headphoneVuBar) {
      headphoneAnalyser.getByteFrequencyData(hpData);
      let sum = 0;
      for (let i = 0; i < hpData.length; i++) sum += hpData[i];
      const percent = Math.min(100, Math.round((sum / hpData.length / 128) * 100));
      headphoneVuBar.style.transform = `scaleX(${percent / 100})`;
    }

    if (cableAnalyser && cableVuBar) {
      cableAnalyser.getByteFrequencyData(cbData);
      let sum = 0;
      for (let i = 0; i < cbData.length; i++) sum += cbData[i];
      const percent = Math.min(100, Math.round((sum / cbData.length / 128) * 100));
      cableVuBar.style.transform = `scaleX(${percent / 100})`;
    }
  }
  draw();
}

// Add Latency Sample
function addLatencySample(ms) {
  measuredSamples.push(ms);
  if (measuredSamples.length > 8) measuredSamples.shift();

  const sum = measuredSamples.reduce((a, b) => a + b, 0);
  calculatedAverageMs = Math.round(sum / measuredSamples.length);

  micDetectStatus.innerText = `ตรวจจับเสียงครั้งที่ ${measuredSamples.length} (${ms} ms)`;
  measuredOffsetVal.innerText = `+${calculatedAverageMs} ms`;

  samplesListContainer.innerHTML = measuredSamples.map((s, idx) => 
    `<span class="sample-badge">รอบ ${idx + 1}: ${s}ms</span>`
  ).join('');

  metroStatus.innerText = `บันทึกแล้ว ${measuredSamples.length} ครั้ง (แนะนำ 3-5 ครั้งเพื่อความแม่นยำสูงสุด)`;
}

function resetSamples() {
  measuredSamples = [];
  calculatedAverageMs = 0;
  measuredOffsetVal.innerText = '0 ms';
  micDetectStatus.innerText = 'รอเสียงปรบมือ';
  samplesListContainer.innerHTML = '<span class="sample-badge empty">ยังไม่มีข้อมูล (ปรบมือ 3-5 ครั้ง)</span>';
  if (isMetronomeRunning) {
    metroStatus.innerText = 'รีเซ็ตค่าแล้ว ให้เริ่มปรบมือตามจังหวะใหม่ได้เลยครับ';
  }
}

resetSamplesBtn.addEventListener('click', resetSamples);

// --- Embedded Record Test & Playback Engine ---
function startRecordingTest() {
  if (!destRecordTest || !destRecordTest.stream) {
    alert('กรุณากด START ENGINE ก่อนเริ่มอัดเสียง');
    return;
  }

  recordedChunks = [];
  try {
    mediaRecorder = new MediaRecorder(destRecordTest.stream);
  } catch (e) {
    alert('บราวเซอร์ไม่รองรับ MediaRecorder: ' + e.message);
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(blob);
    recordedAudioPlayer.src = audioUrl;
    playbackWidget.classList.remove('hidden');
    recordedAudioPlayer.play().catch(() => {});
    recStatusMsg.innerText = '✅ อัดเสียงเสร็จสิ้น! กำลังเล่นเสียงย้อนหลังให้ฟัง';
  };

  mediaRecorder.start();
  isRecordingTest = true;
  recordSeconds = 0;
  recTimerText.innerText = '00:00';
  toggleRecordBtn.innerHTML = '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg> <span>หยุดอัดเสียง (Stop Recording)</span>';
  toggleRecordBtn.classList.add('recording');
  recIndicator.style.background = '#ff4757';

  recordTimerInterval = setInterval(() => {
    recordSeconds++;
    const m = Math.floor(recordSeconds / 60);
    const s = recordSeconds % 60;
    recTimerText.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }, 1000);
}

function stopRecordingTest() {
  if (mediaRecorder && isRecordingTest) {
    mediaRecorder.stop();
    isRecordingTest = false;
    if (recordTimerInterval) clearInterval(recordTimerInterval);
    toggleRecordBtn.innerHTML = '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg> <span>เริ่มอัดเสียงทดสอบ (Start Recording)</span>';
    toggleRecordBtn.classList.remove('recording');
    recIndicator.style.background = '#666';
  }
}

toggleRecordBtn.addEventListener('click', () => {
  if (!isRecordingTest) {
    startRecordingTest();
  } else {
    stopRecordingTest();
  }
});

// Modal Sync Offset Slider Listener
modalSyncOffset.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  setSyncOffset(val);
});

function setSyncOffset(val) {
  cableSyncOffsetMs = val;
  cableSyncOffsetSlider.value = val;
  modalSyncOffset.value = val;
  cableSyncOffsetText.innerText = val + ' ms';
  modalSyncOffsetText.innerText = val + ' ms';

  if (cableSyncDelayNode && audioCtx) {
    cableSyncDelayNode.delayTime.setValueAtTime(val / 1000, audioCtx.currentTime);
  }
  saveUserProfile();
}

cableSyncOffsetSlider.addEventListener('input', (e) => {
  setSyncOffset(parseInt(e.target.value));
});

// Metronome Beep Generator (1000Hz, 40ms Click)
function playMetronomeBeep() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.connect(destCable);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.05);

  lastBeepAudioTime = audioCtx.currentTime;
  outputBeepStatus.innerText = `ส่งเสียงแล้ว (รอบที่ ${currentBeat})`;

  metroIndicator.classList.add('flash-beep');
  setTimeout(() => {
    metroIndicator.classList.remove('flash-beep');
  }, 80);
}

function startMetronome() {
  if (!audioCtx) {
    initAudioEngine();
  }
  isMetronomeRunning = true;
  currentBeat = 0;
  toggleMetronomeBtn.innerText = 'หยุดเคาะจังหวะ (Stop Metronome)';
  toggleMetronomeBtn.classList.remove('btn-primary');
  toggleMetronomeBtn.classList.add('btn-garnet');
  metroStatus.innerText = 'กำลังส่งเสียงเคาะจังหวะ... ให้ปรบมือตามทันทีที่ได้ยิน';

  metronomeTimer = setInterval(() => {
    currentBeat = (currentBeat % 4) + 1;
    metroBeatNum.innerText = currentBeat;
    playMetronomeBeep();
  }, 1000);
}

function stopMetronome() {
  isMetronomeRunning = false;
  if (metronomeTimer) clearInterval(metronomeTimer);
  toggleMetronomeBtn.innerText = 'เริ่มเคาะจังหวะ (Start Metronome)';
  toggleMetronomeBtn.classList.add('btn-primary');
  toggleMetronomeBtn.classList.remove('btn-garnet');
  metroStatus.innerText = 'หยุดการทดสอบแล้ว';
}

toggleMetronomeBtn.addEventListener('click', () => {
  if (isMetronomeRunning) {
    stopMetronome();
  } else {
    startMetronome();
  }
});

applyMeasuredOffsetBtn.addEventListener('click', () => {
  if (calculatedAverageMs > 0) {
    setSyncOffset(calculatedAverageMs);
    alert(`นำค่าความหน่วงเฉลี่ย ${calculatedAverageMs} ms ไปบันทึกลงในระบบเรียบร้อยแล้ว!`);
    syncModal.classList.add('hidden');
    stopMetronome();
  } else {
    alert('ยังไม่มีข้อมูลการวัดค่า กรุณาปรบมือตามจังหวะเคาะ 3-5 ครั้งก่อนครับ');
  }
});

openSyncModalBtn.addEventListener('click', () => {
  initAudioEngine();
  syncModal.classList.remove('hidden');
});

closeSyncModalBtn.addEventListener('click', () => {
  syncModal.classList.add('hidden');
  stopMetronome();
});

// Enumerate Audio Devices & Set Sinks
async function enumerateAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    headphoneSelect.innerHTML = '';
    virtualCableSelect.innerHTML = '';
    micSelect.innerHTML = '';

    devices.forEach(device => {
      const opt = document.createElement('option');
      opt.value = device.deviceId;
      opt.text = device.label || `${device.kind} (${device.deviceId.slice(0, 5)})`;

      if (device.kind === 'audiooutput') {
        headphoneSelect.appendChild(opt.cloneNode(true));
        virtualCableSelect.appendChild(opt.cloneNode(true));
      } else if (device.kind === 'audioinput') {
        micSelect.appendChild(opt.cloneNode(true));
      }
    });

    for (let i = 0; i < virtualCableSelect.options.length; i++) {
      const opt = virtualCableSelect.options[i];
      if (opt.text.toLowerCase().includes('cable input') || opt.text.toLowerCase().includes('vb-audio')) {
        virtualCableSelect.selectedIndex = i;
        setSinkCable(opt.value);
        break;
      }
    }
  } catch (err) {
    console.warn('Enumerate audio devices note:', err);
  }
}

async function setSinkCable(deviceId) {
  if (audioElCable && typeof audioElCable.setSinkId === 'function') {
    try {
      await audioElCable.setSinkId(deviceId);
      console.log('✅ Backing track connected to CABLE Input:', deviceId);
    } catch (e) {
      console.warn('setSinkId CABLE error:', e);
    }
  }
}

virtualCableSelect.addEventListener('change', (e) => {
  setSinkCable(e.target.value);
});

micSelect.addEventListener('change', (e) => {
  if (audioCtx) {
    initMicrophoneStream(e.target.value);
  }
});

// Volume Sliders
headphoneVol.addEventListener('input', (e) => {
  headphoneVolText.innerText = Math.round(e.target.value * 100) + '%';
  if (headphoneGain && audioCtx) {
    headphoneGain.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
  }
  saveUserProfile();
});

cableVol.addEventListener('input', (e) => {
  cableVolText.innerText = Math.round(e.target.value * 100) + '%';
  if (cableGain && audioCtx) {
    cableGain.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
  }
  saveUserProfile();
});

// Reverb Sliders
reverbToggle.addEventListener('change', (e) => {
  isReverbEnabled = e.target.checked;
  if (reverbGain && audioCtx) {
    reverbGain.gain.setValueAtTime(isReverbEnabled ? parseFloat(reverbMix.value) : 0.0, audioCtx.currentTime);
  }
  saveUserProfile();
});

reverbMix.addEventListener('input', (e) => {
  reverbMixText.innerText = Math.round(e.target.value * 100) + '%';
  if (reverbGain && audioCtx && isReverbEnabled) {
    reverbGain.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
  }
  saveUserProfile();
});

reverbDecay.addEventListener('input', (e) => {
  reverbDecayText.innerText = parseFloat(e.target.value).toFixed(1) + 's';
  updateReverbImpulse();
  saveUserProfile();
});

roomSize.addEventListener('input', (e) => {
  updateRoomSizeText(e.target.value);
  updateReverbImpulse();
  saveUserProfile();
});

// Backing Track Key Shifter (Pitch Shift)
function setPitchShift(semitone) {
  currentSemitone = semitone;
  pitchDisplay.innerText = `${semitone > 0 ? '+' : ''}${semitone} SEMITONES`;
  pitchSlider.value = semitone;

  pitchButtons.forEach(btn => {
    const semi = parseInt(btn.getAttribute('data-semi'));
    btn.classList.toggle('active', semi === semitone);
  });

  if (pitchNode && audioCtx) {
    const param = pitchNode.parameters.get('semitones');
    if (param) {
      param.setValueAtTime(semitone, audioCtx.currentTime);
    }
  }
}

pitchButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const semi = parseInt(btn.getAttribute('data-semi'));
    setPitchShift(semi);
  });
});

pitchSlider.addEventListener('input', (e) => {
  setPitchShift(parseInt(e.target.value));
});

// Ducking Toggle
function toggleDucking() {
  if (!duckingGain || !audioCtx) return;
  isDucked = !isDucked;
  if (isDucked) {
    duckingGain.gain.setTargetAtTime(0.2, audioCtx.currentTime, 0.08);
    duckingBtn.classList.add('ducked');
    duckingStatusText.innerText = 'TALKING (DUCKED)';
  } else {
    duckingGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.12);
    duckingBtn.classList.remove('ducked');
    duckingStatusText.innerText = 'SINGING MODE';
  }
}

duckingBtn.addEventListener('click', toggleDucking);

// Global Hotkeys (F8, Numpad -, `)
window.addEventListener('keydown', (e) => {
  if (e.key === 'F8' || e.code === 'NumpadSubtract' || e.key === '`') {
    if (e.target.tagName !== 'INPUT') {
      e.preventDefault();
      toggleDucking();
    }
  }
});

// YouTube Search Handling
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performSearch();
});

async function performSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  if (q.includes('youtube.com/') || q.includes('youtu.be/')) {
    playTrackFromUrl(q);
    return;
  }

  searchBtn.innerText = 'ค้นหา...';
  try {
    const searchUrl = await getBestSearchUrl(q);
    let res = await fetch(searchUrl).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    }
    const data = await res.json();
    renderSearchResults(data.videos || []);
  } catch (err) {
    alert('ค้นหาไม่สำเร็จ: ' + err.message);
  } finally {
    searchBtn.innerText = 'ค้นหา';
  }
}

function renderSearchResults(videos) {
  searchResults.innerHTML = '';
  if (videos.length === 0) {
    searchResults.innerHTML = '<div class="search-item">ไม่พบผลการค้นหา</div>';
    searchResults.classList.remove('hidden');
    return;
  }

  videos.forEach(v => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `
      <img src="${v.thumbnail}" alt="" class="search-item-thumb">
      <div class="search-item-info">
        <div class="search-item-title">${v.title}</div>
        <div class="search-item-meta">${v.author} • ${v.duration}</div>
      </div>
      <button class="btn btn-gold add-q-btn" style="padding: 3px 8px; font-size: 0.72rem;">+ คิว</button>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-q-btn')) {
        e.stopPropagation();
        addToQueue(v);
      } else {
        playTrack(v);
        searchResults.classList.add('hidden');
      }
    });

    searchResults.appendChild(item);
  });

  searchResults.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box') && !e.target.closest('.search-box-compact')) {
    searchResults.classList.add('hidden');
  }
});

// Audio Stream URL Resolver
async function getBestAudioStreamUrl(trackId, seekSeconds = 0) {
  return `/api/audio?id=${encodeURIComponent(trackId)}&t=${seekSeconds}`;
}

async function getBestSearchUrl(query) {
  return `/api/search?q=${encodeURIComponent(query)}`;
}

// Play Track (Ultra-Reliable Dual Routing to Discord & Headphones)
async function playTrack(track, seekSeconds = 0) {
  await initAudioEngine();
  currentTrack = track;
  trackDurationSeconds = track.seconds || parseTimeToSeconds(track.duration) || 240;
  streamOffsetSeconds = seekSeconds;

  currentTrackTitle.innerText = track.title;
  currentTrackArtist.innerText = track.author || '-';
  totalDurationText.innerText = formatTime(trackDurationSeconds);
  currentTimeText.innerText = formatTime(seekSeconds);
  progressBar.value = (seekSeconds / trackDurationSeconds) * 100;

  videoPlaceholder.classList.add('hidden');
  ytPlayerDiv.classList.remove('hidden');

  // Load YouTube Visuals (Muted so Web Audio handles master sound into Discord & Headphones)
  initYtPlayer(track.id, seekSeconds);

  const streamUrl = await getBestAudioStreamUrl(track.id, seekSeconds);
  audioSourceElement.src = streamUrl;
  try {
    await audioSourceElement.play();
    isPlaying = true;
    playPauseBtn.innerHTML = SVG_PAUSE;
  } catch (err) {
    console.warn('AudioSource play note:', err);
  }
}

async function playTrackFromUrl(url) {
  await initAudioEngine();
  videoPlaceholder.classList.add('hidden');
  ytPlayerDiv.classList.remove('hidden');

  let videoId = '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    videoId = match[1];
  } else if (url.includes('v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  }

  currentTrack = { id: videoId, title: 'YouTube Track', author: 'YouTube', seconds: 240, duration: '4:00' };
  trackDurationSeconds = 240;
  streamOffsetSeconds = 0;

  if (videoId) {
    playTrack(currentTrack, 0);
  }
}

// Precision Seek Function
function seekToSeconds(seconds) {
  if (!currentTrack) return;
  const dur = (trackDurationSeconds > 0) ? trackDurationSeconds : 240;
  const clamped = Math.max(0, Math.min(seconds, dur));
  streamOffsetSeconds = clamped;

  currentTimeText.innerText = formatTime(clamped);
  totalDurationText.innerText = formatTime(dur);
  progressBar.value = (clamped / dur) * 100;

  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(clamped, true);
    if (ytPlayer.mute) ytPlayer.mute();
    if (ytPlayer.playVideo) ytPlayer.playVideo();
  }
  if (audioSourceElement) {
    audioSourceElement.src = `/api/audio?id=${currentTrack.id}&t=${clamped}`;
    audioSourceElement.play().catch(() => {});
  }
  isPlaying = true;
  playPauseBtn.innerHTML = SVG_PAUSE;
  startYtProgressTracker();
}

// Playback Controls
function togglePlayPause() {
  if (isPlaying) {
    if (audioSourceElement) audioSourceElement.pause();
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    isPlaying = false;
    playPauseBtn.innerHTML = SVG_PLAY;
  } else {
    if (audioSourceElement) audioSourceElement.play().catch(() => {});
    if (ytPlayer && ytPlayer.playVideo) {
      if (ytPlayer.mute) ytPlayer.mute();
      ytPlayer.playVideo();
    }
    isPlaying = true;
    playPauseBtn.innerHTML = SVG_PAUSE;
  }
}

playPauseBtn.addEventListener('click', togglePlayPause);

function setupAudioElementEvents() {
  audioSourceElement.addEventListener('error', () => {
    console.warn('AudioSource stream error event');
  });

  progressBar.addEventListener('mousedown', () => { isUserSeeking = true; });
  progressBar.addEventListener('touchstart', () => { isUserSeeking = true; });

  progressBar.addEventListener('input', (e) => {
    const dur = (trackDurationSeconds > 0) ? trackDurationSeconds : 240;
    const targetSeconds = (parseFloat(e.target.value) / 100) * dur;
    currentTimeText.innerText = formatTime(targetSeconds);
  });

  progressBar.addEventListener('change', (e) => {
    isUserSeeking = false;
    const dur = (trackDurationSeconds > 0) ? trackDurationSeconds : 240;
    const targetSeconds = (parseFloat(e.target.value) / 100) * dur;
    seekToSeconds(targetSeconds);
  });
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Queue Management
function addToQueue(track) {
  queue.push(track);
  renderQueue();
}

function renderQueue() {
  if (queue.length === 0) {
    queueList.innerHTML = '<div class="empty-queue">ไม่มีเพลงในคิว</div>';
    return;
  }
  queueList.innerHTML = '';
  queue.forEach((track, idx) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.innerHTML = `
      <span class="queue-item-title">${idx + 1}. ${track.title}</span>
      <button class="btn-link-danger" onclick="removeFromQueue(${idx})">✕</button>
    `;
    queueList.appendChild(item);
  });
}

window.removeFromQueue = function(idx) {
  queue.splice(idx, 1);
  renderQueue();
};

clearQueueBtn.addEventListener('click', () => {
  queue = [];
  renderQueue();
});

function playNextInQueue() {
  if (queue.length > 0) {
    const nextTrack = queue.shift();
    renderQueue();
    playTrack(nextTrack);
  }
}

nextBtn.addEventListener('click', playNextInQueue);
audioInitBtn.addEventListener('click', initAudioEngine);

// Initialize User Profile on Page Load
loadUserProfile();
