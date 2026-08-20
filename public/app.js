// Karaoke Cloud Studio - NOCTURNE HAUTE HORLOGERIE ACOUSTICS ENGINE
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
let lastSyncTimestamp = 0;

// User Profile & App State
let currentUser = {
  username: 'tong3',
  isGuest: false,
  preset: {
    syncOffsetMs: 120,
    headphoneVol: 0.8,
    cableVol: 0.9,
    reverbMix: 0.25,
    reverbDecay: 1.8,
    roomSize: 2,
    autotuneEnabled: false,
    autotuneKey: 0,
    autotuneScale: 0,
    autotuneSpeed: 0.1,
    autotuneAmount: 1.0
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
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeText = document.getElementById('currentTime');
const totalDurationText = document.getElementById('totalDuration');

const pitchDisplay = document.getElementById('pitchDisplay');
const pitchSlider = document.getElementById('pitchSlider');
const pitchButtons = document.querySelectorAll('.pitch-btn');

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
    headphoneVol: parseFloat(headphoneVol.value),
    cableVol: parseFloat(cableVol.value),
    reverbMix: parseFloat(reverbMix.value),
    reverbDecay: parseFloat(reverbDecay.value),
    roomSize: parseInt(roomSize.value),
    autotuneEnabled: isAutotuneEnabled,
    autotuneKey: parseInt(autotuneKeySelect.value),
    autotuneScale: parseInt(autotuneScaleSelect.value),
    autotuneSpeed: parseFloat(atSpeed.value),
    autotuneAmount: parseFloat(atAmount.value)
  };
  localStorage.setItem('karaoke_current_user', JSON.stringify(currentUser));
}

function applyUserPreset(preset) {
  if (!preset) return;
  setSyncOffset(preset.syncOffsetMs !== undefined ? preset.syncOffsetMs : 120);

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
}

function updateAuthUI() {
  if (currentUser.username) {
    userProfileLabel.innerHTML = `👤 <b>${currentUser.username}</b> (Offset: ${cableSyncOffsetMs}ms)`;
    userProfileBtn.style.borderColor = 'rgba(212, 175, 55, 0.4)';
    userProfileBtn.style.color = '#f3e5ab';
  } else {
    userProfileLabel.innerText = '👤 สมาชิก / Preset';
  }
}

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

// Scroll smoothly to Record Test Section when clicking navbar button
openRecordTestBtn.addEventListener('click', () => {
  initAudioEngine();
  if (embeddedRecordSection) {
    embeddedRecordSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    embeddedRecordSection.style.boxShadow = '0 0 25px rgba(212, 175, 55, 0.4)';
    setTimeout(() => {
      embeddedRecordSection.style.boxShadow = '';
    }, 1200);
  }
});

// Initialize YouTube Player
function initYtPlayer(videoId, startSec = 0) {
  if (!window.YT || !window.YT.Player) {
    ytPlayerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&start=${Math.floor(startSec)}&enablejsapi=1" class="video-iframe" frameborder="0" allow="autoplay"></iframe>`;
    return;
  }

  if (ytPlayer && ytPlayer.loadVideoById) {
    try {
      ytPlayer.loadVideoById({ videoId, startSeconds: Math.floor(startSec) });
      ytPlayer.mute();
      ytPlayer.setVolume(0);
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
        mute: 1,
        enablejsapi: 1,
        start: Math.floor(startSec)
      },
      events: {
        onReady: (e) => {
          isYtReady = true;
          e.target.mute();
          e.target.setVolume(0);
          e.target.playVideo();
        }
      }
    });
  }
}

// Initialize Web Audio Engine
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

    // Gain Nodes
    duckingGain = audioCtx.createGain();
    duckingGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

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

    // Headphone Reverb Gain (Boosted so singer clearly hears their lush reverb tail!)
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

    // Request Microphone
    await initMicrophoneStream();

    setupAudioElementEvents();
    startVuMeters();

    await enumerateAudioDevices();

    isAudioInitialized = true;
    audioInitBtn.innerHTML = '<span>✦ ENGINE ACTIVE</span>';
    audioInitBtn.classList.remove('glow-btn');
    audioInitBtn.style.background = 'rgba(212, 175, 55, 0.15)';
    audioInitBtn.style.color = '#f3e5ab';
    audioInitBtn.style.border = '1px solid #d4af37';

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

// Initialize Microphone Stream with Auto-Tune & Reverb
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

    if (reverbInputGain) {
      micSource.connect(reverbInputGain);
    }

    if (autotuneNode) {
      micSource.connect(autotuneNode);
    }

    if (recordMicGain) {
      micSource.connect(recordMicGain);
    }
  } catch (err) {
    console.warn('Microphone access note:', err.message);
  }
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
  if (speed <= 0.15) {
    atSpeedText.innerText = `T-Pain (${speed.toFixed(2)})`;
  } else if (speed <= 0.5) {
    atSpeedText.innerText = `Pop (${speed.toFixed(2)})`;
  } else {
    atSpeedText.innerText = `Natural (${speed.toFixed(2)})`;
  }
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
      micVuBar.style.width = percent + '%';

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
      headphoneVuBar.style.width = percent + '%';
    }

    if (cableAnalyser && cableVuBar) {
      cableAnalyser.getByteFrequencyData(cbData);
      let sum = 0;
      for (let i = 0; i < cbData.length; i++) sum += cbData[i];
      const percent = Math.min(100, Math.round((sum / cbData.length / 128) * 100));
      cableVuBar.style.width = percent + '%';
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
  recIndicator.classList.add('recording');
  toggleRecordBtn.innerText = '⏹️ หยุดอัด & ฟังเสียงย้อนหลัง';
  toggleRecordBtn.style.background = 'var(--emerald-gradient)';
  toggleRecordBtn.style.color = '#fff';

  recordTimerInterval = setInterval(() => {
    recordSeconds++;
    const m = Math.floor(recordSeconds / 60);
    const s = recordSeconds % 60;
    recTimerText.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }, 1000);
}

function stopRecordingTest() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecordingTest = false;
  clearInterval(recordTimerInterval);
  recIndicator.classList.remove('recording');
  toggleRecordBtn.innerText = '🔴 เริ่มอัดเสียงทดสอบใหม่ (Record Again)';
  toggleRecordBtn.style.background = 'var(--ruby-gradient)';
  toggleRecordBtn.style.color = '#fff';
}

toggleRecordBtn.addEventListener('click', () => {
  if (isRecordingTest) {
    stopRecordingTest();
  } else {
    startRecordingTest();
  }
});

// Sync Offset Setter
function setSyncOffset(val) {
  cableSyncOffsetMs = parseInt(val);
  cableSyncOffsetSlider.value = cableSyncOffsetMs;
  cableSyncOffsetText.innerText = cableSyncOffsetMs + ' ms';
  modalSyncOffset.value = cableSyncOffsetMs;
  modalSyncOffsetText.innerText = cableSyncOffsetMs + ' ms';

  if (cableSyncDelayNode && audioCtx) {
    cableSyncDelayNode.delayTime.setValueAtTime(cableSyncOffsetMs / 1000, audioCtx.currentTime);
  }
  updateAuthUI();
  saveUserProfile();
}

cableSyncOffsetSlider.addEventListener('input', (e) => setSyncOffset(e.target.value));
modalSyncOffset.addEventListener('input', (e) => setSyncOffset(e.target.value));

// Auth Modal Actions
userProfileBtn.addEventListener('click', () => {
  authModal.classList.remove('hidden');
});

closeAuthModalBtn.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

tabLoginBtn.addEventListener('click', () => {
  tabLoginBtn.classList.add('active');
  tabRegisterBtn.classList.remove('active');
  submitAuthBtn.innerText = 'เข้าสู่ระบบ (Login)';
});

tabRegisterBtn.addEventListener('click', () => {
  tabRegisterBtn.classList.add('active');
  tabLoginBtn.classList.remove('active');
  submitAuthBtn.innerText = 'สมัครสมาชิกใหม่ (Register)';
});

submitAuthBtn.addEventListener('click', () => {
  const username = authUsernameInput.value.trim() || 'tong3';
  currentUser.username = username;
  currentUser.isGuest = false;
  saveUserProfile();
  updateAuthUI();
  authModal.classList.add('hidden');
  alert(`ยินดีต้อนรับคุณ ${username}! ระบบบันทึกค่า Preset 120ms และการตั้งค่าเรียบร้อยแล้ว`);
});

guestAuthBtn.addEventListener('click', () => {
  currentUser.username = 'Guest User';
  currentUser.isGuest = true;
  updateAuthUI();
  authModal.classList.add('hidden');
});

// Sync Modal Open / Close
openSyncModalBtn.addEventListener('click', async () => {
  await initAudioEngine();
  syncModal.classList.remove('hidden');
});

closeSyncModalBtn.addEventListener('click', () => {
  syncModal.classList.add('hidden');
  stopMetronomeTester();
});

// Enumerate Output & Input Audio Devices
async function enumerateAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    headphoneSelect.innerHTML = '';
    virtualCableSelect.innerHTML = '';
    micSelect.innerHTML = '';

    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `${device.kind} (${device.deviceId.slice(0, 5)})`;

      if (device.kind === 'audiooutput') {
        headphoneSelect.appendChild(option.cloneNode(true));
        virtualCableSelect.appendChild(option.cloneNode(true));
      } else if (device.kind === 'audioinput') {
        micSelect.appendChild(option.cloneNode(true));
      }
    });

    Array.from(headphoneSelect.options).forEach(opt => {
      const text = opt.text.toLowerCase();
      if (text.includes('maono') || text.includes('fairy') || text.includes('headphones') || text.includes('speakers')) {
        headphoneSelect.value = opt.value;
      }
    });

    Array.from(virtualCableSelect.options).forEach(opt => {
      const text = opt.text.toLowerCase();
      if (text.includes('cable') || text.includes('vb-audio')) {
        virtualCableSelect.value = opt.value;
      }
    });

    Array.from(micSelect.options).forEach(opt => {
      const text = opt.text.toLowerCase();
      if (text.includes('maono') || text.includes('fairy') || text.includes('microphone')) {
        micSelect.value = opt.value;
      }
    });

    await applyAudioSinkRouting();
  } catch (err) {
    console.error('Device enumeration error:', err);
  }
}

// Apply Sink ID routing to outputs
async function applyAudioSinkRouting() {
  if (audioElCable && typeof audioElCable.setSinkId === 'function' && virtualCableSelect.value) {
    try {
      await audioElCable.setSinkId(virtualCableSelect.value);
      await audioElCable.play().catch(() => {});
      console.log('🎙️ Backing track connected to CABLE Input:', virtualCableSelect.value);
    } catch (e) { console.warn('Cable setSinkId error:', e); }
  }
}

// Event Listeners for Devices & Sliders
headphoneSelect.addEventListener('change', applyAudioSinkRouting);
virtualCableSelect.addEventListener('change', applyAudioSinkRouting);
micSelect.addEventListener('change', () => initMicrophoneStream(micSelect.value));

headphoneVol.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  headphoneVolText.innerText = Math.round(val * 100) + '%';
  if (headphoneGain && audioCtx) headphoneGain.gain.setValueAtTime(val, audioCtx.currentTime);
  saveUserProfile();
});

cableVol.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  cableVolText.innerText = Math.round(val * 100) + '%';
  if (cableGain && audioCtx) cableGain.gain.setValueAtTime(val, audioCtx.currentTime);
  saveUserProfile();
});

// Reverb Controls
reverbToggle.addEventListener('change', (e) => {
  isReverbEnabled = e.target.checked;
  if (!reverbGain || !audioCtx) return;
  if (isReverbEnabled) {
    reverbGain.gain.setValueAtTime(parseFloat(reverbMix.value), audioCtx.currentTime);
  } else {
    reverbGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
  }
});

reverbMix.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  reverbMixText.innerText = Math.round(val * 100) + '%';
  if (reverbGain && audioCtx && isReverbEnabled) {
    reverbGain.gain.setValueAtTime(val, audioCtx.currentTime);
  }
  saveUserProfile();
});

reverbDecay.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  reverbDecayText.innerText = val.toFixed(1) + 's';
  updateReverbImpulse();
  saveUserProfile();
});

roomSize.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  const names = ['', 'Room', 'Studio', 'Hall', 'Arena'];
  roomSizeText.innerText = names[val] || 'Studio';
  updateReverbImpulse();
  saveUserProfile();
});

// Metronome Beep Generator
function playMetronomeBeep(time, isDownbeat) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(isDownbeat ? 1000 : 600, time);

  gain.gain.setValueAtTime(0.6, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

  osc.connect(gain);
  if (masterGain) {
    gain.connect(masterGain);
  } else if (audioCtx.destination) {
    gain.connect(audioCtx.destination);
  }

  osc.start(time);
  osc.stop(time + 0.07);
}

async function startMetronomeTester() {
  if (!audioCtx || !isAudioInitialized) {
    await initAudioEngine();
  }
  isMetronomeRunning = true;
  currentBeat = 0;
  toggleMetronomeBtn.innerText = '⏹️ หยุดเคาะจังหวะ (Stop)';
  toggleMetronomeBtn.style.background = 'var(--ruby-gradient)';
  metroStatus.innerText = '🔊 กำลังเคาะจังหวะ... ให้ปรบมือ หรือ ร้อง "ต๊อก" ตามจังหวะไฟกระพริบ';

  const beatIntervalMs = 600;

  metronomeTimer = setInterval(() => {
    currentBeat = (currentBeat % 4) + 1;
    const isDownbeat = currentBeat === 1;

    lastBeepAudioTime = audioCtx ? audioCtx.currentTime : 0;
    playMetronomeBeep(lastBeepAudioTime, isDownbeat);

    outputBeepStatus.innerText = `ปล่อยเสียงเคาะจังหวะ ${currentBeat}`;
    metroBeatNum.innerText = currentBeat;

    metroIndicator.className = 'metro-circle ' + (isDownbeat ? 'flash-downbeat' : 'flash-beat');
    setTimeout(() => {
      metroIndicator.className = 'metro-circle';
    }, 120);

  }, beatIntervalMs);
}

function stopMetronomeTester() {
  isMetronomeRunning = false;
  if (metronomeTimer) clearInterval(metronomeTimer);
  toggleMetronomeBtn.innerText = '🔊 เริ่มเคาะจังหวะ (Start Metronome)';
  toggleMetronomeBtn.style.background = '';
  metroStatus.innerText = 'หยุดการเคาะจังหวะแล้ว';
  outputBeepStatus.innerText = 'รอสัญญาณ';
}

toggleMetronomeBtn.addEventListener('click', () => {
  if (isMetronomeRunning) {
    stopMetronomeTester();
  } else {
    startMetronomeTester();
  }
});

applyMeasuredOffsetBtn.addEventListener('click', () => {
  if (calculatedAverageMs > 0) {
    setSyncOffset(calculatedAverageMs);
    alert(`นำค่าความหน่วงเฉลี่ย +${calculatedAverageMs} ms ไปปรับชดเชยเรียบร้อยแล้ว!`);
    syncModal.classList.add('hidden');
    stopMetronomeTester();
  } else {
    alert('ยังไม่ได้วัดค่าดีเลย์ กรุณากดเริ่มเคาะจังหวะแล้วปรบมือ 3-5 ครั้งก่อนครับ');
  }
});

// Pitch Shifter Handling (Backing Track)
function setSemitone(semi) {
  currentSemitone = parseInt(semi);
  pitchSlider.value = currentSemitone;
  pitchDisplay.innerText = currentSemitone === 0 ? 'ORIGINAL (0)' : (currentSemitone > 0 ? `+${currentSemitone} SEMI` : `${currentSemitone} SEMI`);

  pitchButtons.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.semi) === currentSemitone);
  });

  const ratio = Math.pow(2, currentSemitone / 12);
  if (pitchNode && audioCtx) {
    const param = pitchNode.parameters.get('pitchRatio');
    if (param) param.setValueAtTime(ratio, audioCtx.currentTime);
  }
}

pitchButtons.forEach(btn => {
  btn.addEventListener('click', () => setSemitone(btn.dataset.semi));
});

pitchSlider.addEventListener('input', (e) => setSemitone(e.target.value));

// Ducking / Talk Mode Toggle
function toggleDucking() {
  isDucked = !isDucked;
  if (isDucked) {
    duckingBtn.classList.add('ducked');
    duckingStatusText.innerText = '🎤 TALK MODE (Ducked)';
    if (duckingGain && audioCtx) {
      duckingGain.gain.setTargetAtTime(0.2, audioCtx.currentTime, 0.05);
    }
  } else {
    duckingBtn.classList.remove('ducked');
    duckingStatusText.innerText = '🎵 SINGING MODE';
    if (duckingGain && audioCtx) {
      duckingGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.05);
    }
  }
}

duckingBtn.addEventListener('click', toggleDucking);

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (document.activeElement === searchInput || document.activeElement === authUsernameInput || document.activeElement === authPasswordInput) return;

  if (e.key === 'F8' || e.code === 'NumpadSubtract' || e.key === '`') {
    e.preventDefault();
    toggleDucking();
  } else if (e.code === 'Space') {
    e.preventDefault();
    togglePlayPause();
  }
});

// Search & Stream URL Resolvers (Unified Cloud Proxy Streaming)
function getSearchApiUrl(query) {
  return `/api/search?q=${encodeURIComponent(query)}`;
}

function getAudioStreamUrl(trackId, seekSeconds = 0) {
  return `/api/audio?id=${encodeURIComponent(trackId)}&t=${seekSeconds}`;
}



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

  searchBtn.innerText = '⏳ ค้นหา...';
  try {
    let res = await fetch(getSearchApiUrl(q)).catch(() => null);
    if (!res || !res.ok) {
      // Fallback to relative /api/search
      res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    }
    const data = await res.json();
    renderSearchResults(data.videos || []);
  } catch (err) {
    alert('ค้นหาไม่สำเร็จ: ' + err.message);
  } finally {
    searchBtn.innerText = '🔍 ค้นหา';
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
      <img src="${v.thumbnail}" alt="">
      <div class="search-item-info">
        <div class="search-item-title">${v.title}</div>
        <div class="search-item-meta">${v.author} • ${v.duration}</div>
      </div>
      <button class="btn btn-luxury-gold add-q-btn" style="padding: 4px 10px; font-size: 0.72rem;">+ คิว</button>
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
  if (!e.target.closest('.search-box')) {
    searchResults.classList.add('hidden');
  }
});

// Audio Stream URL Resolver (Smart Tunnel Fallback)
function getAudioStreamUrl(trackId, seekSeconds = 0) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('trycloudflare.com')) {
    return `/api/audio?id=${encodeURIComponent(trackId)}&t=${seekSeconds}`;
  }
  return `https://surge-buy-covering-favors.trycloudflare.com/api/audio?id=${encodeURIComponent(trackId)}&t=${seekSeconds}`;
}

// Play Track (Smooth YouTube visuals with Web Audio)
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

  // Load YouTube Visuals
  initYtPlayer(track.id, seekSeconds);

  // Play Backing Track Audio Stream through Web Audio
  audioSourceElement.src = getAudioStreamUrl(track.id, seekSeconds);
  try {
    await audioSourceElement.play();
    isPlaying = true;
    playPauseBtn.innerText = '⏸️';
  } catch (err) {
    console.error('Play error:', err);
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
    initYtPlayer(videoId, 0);
  }

  currentTrackTitle.innerText = 'กำลังโหลดเพลงจาก URL...';
  currentTrackArtist.innerText = 'YouTube';

  audioSourceElement.src = getAudioStreamUrl(videoId, 0);
  try {
    await audioSourceElement.play();
    isPlaying = true;
    playPauseBtn.innerText = '⏸️';
    currentTrackTitle.innerText = 'YouTube Track';
  } catch (e) {
    console.warn('Play error:', e);
  }
}

// Precision Seek Function
function seekToSeconds(seconds) {
  if (!currentTrack) return;
  const clamped = Math.max(0, Math.min(seconds, trackDurationSeconds));
  streamOffsetSeconds = clamped;
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(clamped, true);
  }
  playTrack(currentTrack, clamped);
}

// Playback Controls
function togglePlayPause() {
  if (!audioSourceElement || !audioSourceElement.src) return;
  if (isPlaying) {
    audioSourceElement.pause();
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    isPlaying = false;
    playPauseBtn.innerText = '▶️';
  } else {
    audioSourceElement.play();
    if (ytPlayer && ytPlayer.playVideo) {
      ytPlayer.playVideo();
    }
    isPlaying = true;
    playPauseBtn.innerText = '⏸️';
  }
}

playPauseBtn.addEventListener('click', togglePlayPause);

function setupAudioElementEvents() {
  // Sync when audio begins outputting
  audioSourceElement.addEventListener('playing', () => {
    const currentAudioTime = streamOffsetSeconds + audioSourceElement.currentTime;
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(currentAudioTime, true);
      ytPlayer.playVideo();
    }
  });

  // Progress Bar & Time Update
  audioSourceElement.addEventListener('timeupdate', () => {
    if (isUserSeeking || trackDurationSeconds === 0) return;
    const currentTotal = streamOffsetSeconds + audioSourceElement.currentTime;

    if (currentTotal >= trackDurationSeconds) {
      playNextInQueue();
      return;
    }

    progressBar.value = (currentTotal / trackDurationSeconds) * 100;
    currentTimeText.innerText = formatTime(currentTotal);
    totalDurationText.innerText = formatTime(trackDurationSeconds);

    // Occasional gentle sync check (Cooldown 3 seconds, only if drift > 1.5s)
    const now = Date.now();
    if (isPlaying && ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && now - lastSyncTimestamp > 3000) {
      const ytCurrent = ytPlayer.getCurrentTime();
      const drift = Math.abs(ytCurrent - currentTotal);
      if (drift > 1.5) {
        lastSyncTimestamp = now;
        ytPlayer.seekTo(currentTotal, true);
      }
    }
  });

  audioSourceElement.addEventListener('ended', () => {
    playNextInQueue();
  });

  progressBar.addEventListener('mousedown', () => { isUserSeeking = true; });
  progressBar.addEventListener('touchstart', () => { isUserSeeking = true; });

  progressBar.addEventListener('input', (e) => {
    if (trackDurationSeconds === 0) return;
    const targetSeconds = (e.target.value / 100) * trackDurationSeconds;
    currentTimeText.innerText = formatTime(targetSeconds);
  });

  progressBar.addEventListener('change', (e) => {
    isUserSeeking = false;
    if (trackDurationSeconds === 0) return;
    const targetSeconds = (e.target.value / 100) * trackDurationSeconds;
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
      <button class="btn-link" onclick="removeFromQueue(${idx})" style="color: #e74c3c;">✖</button>
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
