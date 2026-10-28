// NOCTURNE STUDIO • Haute Horlogerie Real-Time DSP Audio Engine
let audioCtx = null;
let pitchNode = null;
let autotuneNode = null;
let autotuneCableGain = null;
let autotuneHpGain = null;
let recordMicGain = null;
let duckingGain = null;
let masterGain = null;

// Dual-Channel Split Gain Nodes
let musicHpGain = null;
let musicCableGain = null;
let vocalHpGain = null;
let vocalCableGain = null;
let headphoneMixGain = null;
let cableMixGain = null;

let headphoneGain = null;
let cableGain = null;
let cableSyncDelayNode = null;

// Channel Mute States
let isHpMusicMuted = false;
let isCableMusicMuted = false;
let isHpVocalMuted = true; // Default muted to prevent headphone hardware mic echo
let isCableVocalMuted = false;

// Vocal Dynamics Nodes
let noiseGateNode = null;
let vocalCompressorNode = null;
let isDynamicsEnabled = true;

// Modular FX Plugin Rack Nodes & Safety Limiter
let pluginRackInput = null;
let pluginRackOutput = null;
let safetyLimiterNode = null;

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
const isLocalHostOrLan = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) ||
                         /^192\.168\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname) ||
                         /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname) ||
                         /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname) ||
                         window.location.hostname.endsWith('.local');
const isCloudHost = !isLocalHostOrLan;
let isUsingDirectYtAudio = false; // Always attempt Web Audio DSP stream first across Local & Cloud!
let tabAudioStream = null;
let tabAudioSourceNode = null;
let tabMusicGain = null;
let isTabAudioActive = false;

// User Profile & App State
let currentUser = {
  username: '',
  isGuest: false,
  isLoggedIn: false,
  tier: 'free', // 'free' | 'pro'
  proExpiresAt: null,
  hasCompletedOnboarding: false,
  songKeys: {},
  preset: {
    syncOffsetMs: 120,
    hpMusicVol: 0.9,
    cableMusicVol: 0.20,
    hpVocalVol: 0.0,
    cableVocalVol: 1.0,
    headphoneVol: 0.8,
    cableVol: 0.9,
    isHpMusicMuted: false,
    isCableMusicMuted: false,
    isHpVocalMuted: true,
    isCableVocalMuted: false,
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

// Quick Dual Music Volume Controls (Now Playing Bar)
const quickHpMusicSlider = document.getElementById('quickHpMusicSlider');
const quickHpMusicText = document.getElementById('quickHpMusicText');
const toggleHpMusicBtn = document.getElementById('toggleHpMusicBtn');

const quickCableMusicSlider = document.getElementById('quickCableMusicSlider');
const quickCableMusicText = document.getElementById('quickCableMusicText');
const toggleCableMusicBtn = document.getElementById('toggleCableMusicBtn');

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

// Channel Dispatcher Controls (Signal Routing Module)
const headphoneSelect = document.getElementById('headphoneSelect');
const hpMusicVol = document.getElementById('hpMusicVol');
const hpMusicVolText = document.getElementById('hpMusicVolText');
const hpMusicMuteBtn = document.getElementById('hpMusicMuteBtn');

const hpVocalVol = document.getElementById('hpVocalVol');
const hpVocalVolText = document.getElementById('hpVocalVolText');
const hpVocalMuteBtn = document.getElementById('hpVocalMuteBtn');

const headphoneVol = document.getElementById('headphoneVol');
const headphoneVolText = document.getElementById('headphoneVolText');
const headphoneVuBar = document.getElementById('headphoneVuBar');

const virtualCableSelect = document.getElementById('virtualCableSelect');
const cableMusicVol = document.getElementById('cableMusicVol');
const cableMusicVolText = document.getElementById('cableMusicVolText');
const cableMusicMuteBtn = document.getElementById('cableMusicMuteBtn');

const cableVocalVol = document.getElementById('cableVocalVol');
const cableVocalVolText = document.getElementById('cableVocalVolText');
const cableVocalMuteBtn = document.getElementById('cableVocalMuteBtn');

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
const queueBadgeCount = document.getElementById('queueBadgeCount');

// Shared Room / Mobile Remote DOM Elements
const openRoomModalBtn = document.getElementById('openRoomModalBtn');
const roomStatusBtnText = document.getElementById('roomStatusBtnText');
const roomClientsBadge = document.getElementById('roomClientsBadge');
const openRoomModalFromQueueBtn = document.getElementById('openRoomModalFromQueueBtn');
const roomModal = document.getElementById('roomModal');
const closeRoomModalBtn = document.getElementById('closeRoomModalBtn');
const finishRoomModalBtn = document.getElementById('finishRoomModalBtn');
const modalRoomCodeBig = document.getElementById('modalRoomCodeBig');
const roomQrImage = document.getElementById('roomQrImage');
const copyRoomLinkBtn = document.getElementById('copyRoomLinkBtn');
const refreshRoomCodeBtn = document.getElementById('refreshRoomCodeBtn');
const lanUrlDisplay = document.getElementById('lanUrlDisplay');
const cloudUrlDisplay = document.getElementById('cloudUrlDisplay');
const allowRemoteControlToggle = document.getElementById('allowRemoteControlToggle');

// Modals
const setupGuideModal = document.getElementById('setupGuideModal');
const openSetupGuideBtn = document.getElementById('openSetupGuideBtn');
const closeSetupGuideBtn = document.getElementById('closeSetupGuideBtn');
const finishSetupGuideBtn = document.getElementById('finishSetupGuideBtn');

// Traffic Light Ready Status DOM
const trafficMicDot = document.getElementById('trafficMicDot');
const trafficMusicDot = document.getElementById('trafficMusicDot');
const trafficCableDot = document.getElementById('trafficCableDot');

// Auth DOM Elements
const authModal = document.getElementById('authModal');
const userProfileBtn = document.getElementById('userProfileBtn');
const userProfileLabel = document.getElementById('userProfileLabel');

// Gated Landing Screen DOM (Mandatory Auth - No Close Button)
const landingGate = document.getElementById('landingGate');
const gateTabLoginBtn = document.getElementById('gateTabLoginBtn');
const gateTabRegisterBtn = document.getElementById('gateTabRegisterBtn');
const gateAuthStatusMsg = document.getElementById('gateAuthStatusMsg');
const gateUsernameInput = document.getElementById('gateUsernameInput');
const gatePasswordInput = document.getElementById('gatePasswordInput');
const gateConfirmPasswordGroup = document.getElementById('gateConfirmPasswordGroup');
const gateConfirmPasswordInput = document.getElementById('gateConfirmPasswordInput');
const gateSubmitBtn = document.getElementById('gateSubmitBtn');
const gateGuestBtn = document.getElementById('gateGuestBtn');
const gateProVipBtn = document.getElementById('gateProVipBtn');

// User Profile Modal DOM (with Close Button)
const userProfileModal = document.getElementById('userProfileModal');
const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
const profileUsernameText = document.getElementById('profileUsernameText');
const profileTierBadge = document.getElementById('profileTierBadge');
const profileSongKeysCount = document.getElementById('profileSongKeysCount');
const profileSyncOffsetText = document.getElementById('profileSyncOffsetText');
const profileProStatusPill = document.getElementById('profileProStatusPill');
const upgradeProBtn = document.getElementById('upgradeProBtn');
const profileWizardBtn = document.getElementById('profileWizardBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Onboarding Setup Wizard DOM
const onboardingWizardModal = document.getElementById('onboardingWizardModal');
const closeWizardModalBtn = document.getElementById('closeWizardModalBtn');
const wizardStepPill1 = document.getElementById('wizardStepPill1');
const wizardStepPill2 = document.getElementById('wizardStepPill2');
const wizardStepPill3 = document.getElementById('wizardStepPill3');
const wizardStep1 = document.getElementById('wizardStep1');
const wizardStep2 = document.getElementById('wizardStep2');
const wizardStep3 = document.getElementById('wizardStep3');
const wizardCardFiveM = document.getElementById('wizardCardFiveM');
const wizardCardSolo = document.getElementById('wizardCardSolo');
const wizardNextBtn1 = document.getElementById('wizardNextBtn1');
const wizardPrevBtn2 = document.getElementById('wizardPrevBtn2');
const wizardNextBtn2 = document.getElementById('wizardNextBtn2');
const wizardPrevBtn3 = document.getElementById('wizardPrevBtn3');
const wizardFinishBtn = document.getElementById('wizardFinishBtn');
const wizardHeadphoneSelect = document.getElementById('wizardHeadphoneSelect');
const wizardMicSelect = document.getElementById('wizardMicSelect');
const wizardMicVuBar = document.getElementById('wizardMicVuBar');
const wizardMicStatusText = document.getElementById('wizardMicStatusText');
const wizardSonarBtn = document.getElementById('wizardSonarBtn');
const wizardPresetCards = document.querySelectorAll('.wizard-preset-card');

const syncModal = document.getElementById('syncModal');
const openSyncModalBtn = document.getElementById('openSyncModalBtn');
const closeSyncModalBtn = document.getElementById('closeSyncModalBtn');
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

// Sonar Auto-Calibration DOM
const tabSonarBtn = document.getElementById('tabSonarBtn');
const tabMetroBtn = document.getElementById('tabMetroBtn');
const sonarPanel = document.getElementById('sonarPanel');
const metroPanel = document.getElementById('metroPanel');
const sonarRadarWrap = document.getElementById('sonarRadarWrap');
const sonarStatusMsg = document.getElementById('sonarStatusMsg');
const sonarSubStatus = document.getElementById('sonarSubStatus');
const sonarMeasuredVal = document.getElementById('sonarMeasuredVal');
const sonarConfidenceBadge = document.getElementById('sonarConfidenceBadge');
const sonarRoundsContainer = document.getElementById('sonarRoundsContainer');
const startSonarBtn = document.getElementById('startSonarBtn');
const applySonarBtn = document.getElementById('applySonarBtn');
const openSonarCalibrateBtn = document.getElementById('openSonarCalibrateBtn');
const openSonarFromRecordBtn = document.getElementById('openSonarFromRecordBtn');

// Embedded Record Test Section
const embeddedRecordSection = document.getElementById('embeddedRecordSection');
const openRecordTestBtn = document.getElementById('openRecordTestBtn');
const toggleRecordBtn = document.getElementById('toggleRecordBtn');
const recBadge = document.getElementById('recBadge');
const recTimerText = document.getElementById('recTimerText');
const playbackWidget = document.getElementById('playbackWidget');
const recordedAudioPlayer = document.getElementById('recordedAudioPlayer');
const modalSyncOffset = document.getElementById('modalSyncOffset');
const modalSyncOffsetText = document.getElementById('modalSyncOffsetText');
const recStatusMsg = document.getElementById('recStatusMsg');

// --- One-Click Vocal FX Presets Definitions ---
const VOCAL_PRESETS = {
  pop: {
    autotuneEnabled: true,
    autotuneKey: 0,
    autotuneScale: 0,
    autotuneSpeed: 0.15,
    autotuneAmount: 0.85,
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
    autotuneScale: 0,
    autotuneSpeed: 0.02,
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
    noiseGateThreshold: -45,
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
      const parsed = JSON.parse(saved);
      currentUser = { ...currentUser, ...parsed };
      if (!currentUser.songKeys) currentUser.songKeys = {};
    } catch (e) {}
  }

  // Automatic Pro activation for Owner/Developer accounts
  const unameLower = (currentUser.username || '').toLowerCase();
  if (['sukky', 'sukky334576', 'tong', 'admin'].includes(unameLower)) {
    currentUser.tier = 'pro';
    currentUser.proExpiresAt = 253402300799000;
  }

  applyUserPreset(currentUser.preset);
  updateAuthUI();

  // Strict Gated Funnel:
  // 1. If not logged in: lock screen with landingGate (no close button)
  // 2. If logged in but hasn't completed hardware check: open Setup Wizard (3 steps)
  // 3. If logged in and completed onboarding: studio ready!
  if (!currentUser.isLoggedIn) {
    if (landingGate) landingGate.classList.remove('hidden');
    if (onboardingWizardModal) onboardingWizardModal.classList.add('hidden');
  } else if (!currentUser.hasCompletedOnboarding) {
    if (landingGate) landingGate.classList.add('hidden');
    setTimeout(() => {
      openOnboardingWizard();
    }, 300);
  } else {
    if (landingGate) landingGate.classList.add('hidden');
    if (onboardingWizardModal) onboardingWizardModal.classList.add('hidden');
  }
}

function saveUserProfile() {
  currentUser.songKeys = currentUser.songKeys || {};
  currentUser.preset = {
    syncOffsetMs: cableSyncOffsetMs,
    hpMusicVol: hpMusicVol ? parseFloat(hpMusicVol.value) : 0.9,
    cableMusicVol: cableMusicVol ? parseFloat(cableMusicVol.value) : 0.20,
    hpVocalVol: hpVocalVol ? parseFloat(hpVocalVol.value) : 0.0,
    cableVocalVol: cableVocalVol ? parseFloat(cableVocalVol.value) : 1.0,
    headphoneVol: parseFloat(headphoneVol.value),
    cableVol: parseFloat(cableVol.value),
    isHpMusicMuted: isHpMusicMuted,
    isCableMusicMuted: isCableMusicMuted,
    isHpVocalMuted: isHpVocalMuted,
    isCableVocalMuted: isCableVocalMuted,
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
    dynamicsEnabled: isDynamicsEnabled,
    plugins: window.nocturnePlugins ? window.nocturnePlugins.getSerializedState() : []
  };
  localStorage.setItem('karaoke_current_user', JSON.stringify(currentUser));

  // Sync to backend if username exists
  if (currentUser.username && currentUser.username !== 'Guest') {
    fetch('/api/auth/save-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser.username,
        preset: currentUser.preset,
        songKeys: currentUser.songKeys,
        hasCompletedOnboarding: currentUser.hasCompletedOnboarding
      })
    }).catch(() => {});
  }
}

function applyUserPreset(preset) {
  if (!preset) return;
  setSyncOffset(preset.syncOffsetMs !== undefined ? preset.syncOffsetMs : 120);

  if (preset.plugins && window.nocturnePlugins) {
    window.nocturnePlugins.applySerializedState(preset.plugins);
    renderPluginRackUI();
  }

  // Channel A: Headphone Music Level
  if (preset.hpMusicVol !== undefined) {
    updateMusicHpLevel(preset.hpMusicVol, false);
  }
  if (preset.isHpMusicMuted !== undefined) {
    isHpMusicMuted = preset.isHpMusicMuted;
    syncMuteUI(toggleHpMusicBtn, hpMusicMuteBtn, !isHpMusicMuted);
  }

  // Channel B: Cable / FiveM Music Level
  if (preset.cableMusicVol !== undefined) {
    updateMusicCableLevel(preset.cableMusicVol, false);
  }
  if (preset.isCableMusicMuted !== undefined) {
    isCableMusicMuted = preset.isCableMusicMuted;
    syncMuteUI(toggleCableMusicBtn, cableMusicMuteBtn, !isCableMusicMuted);
  }

  // Direct Vocal Levels
  if (preset.hpVocalVol !== undefined) {
    updateVocalHpLevel(preset.hpVocalVol, false);
  }
  if (preset.isHpVocalMuted !== undefined) {
    isHpVocalMuted = preset.isHpVocalMuted;
    syncMuteUI(null, hpVocalMuteBtn, !isHpVocalMuted);
  }

  if (preset.cableVocalVol !== undefined) {
    updateVocalCableLevel(preset.cableVocalVol, false);
  }
  if (preset.isCableVocalMuted !== undefined) {
    isCableVocalMuted = preset.isCableVocalMuted;
    syncMuteUI(null, cableVocalMuteBtn, !isCableVocalMuted);
  }

  // Master Outputs
  if (preset.headphoneVol !== undefined) {
    headphoneVol.value = preset.headphoneVol;
    headphoneVolText.innerText = Math.round(preset.headphoneVol * 100) + '% Master';
  }
  if (preset.cableVol !== undefined) {
    cableVol.value = preset.cableVol;
    cableVolText.innerText = Math.round(preset.cableVol * 100) + '% Master';
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

function syncMuteUI(btn1, btn2, isActive) {
  [btn1, btn2].forEach(b => {
    if (!b) return;
    b.classList.toggle('active', isActive);
    b.classList.toggle('muted', !isActive);
  });
}

function applyVocalPreset(presetKey) {
  const cfg = VOCAL_PRESETS[presetKey];
  if (!cfg) return;

  presetPills.forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-preset') === presetKey);
  });

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

  updateAutotuneParams();
  updateReverbImpulse();
  updateDynamicsParams();
  saveUserProfile();
}

function updateAuthUI() {
  const songKeysCount = currentUser.songKeys ? Object.keys(currentUser.songKeys).length : 0;
  if (profileSongKeysCount) profileSongKeysCount.innerText = songKeysCount;
  if (profileSyncOffsetText) profileSyncOffsetText.innerText = `${cableSyncOffsetMs}ms`;

  const isPro = currentUser.tier === 'pro';

  if (currentUser && currentUser.isLoggedIn) {
    const displayName = currentUser.username || (currentUser.isGuest ? 'Guest' : 'User');
    const tierPill = isPro ? '<span class="tier-pill pro">PRO ⭐</span>' : '<span class="tier-pill free">FREE</span>';
    userProfileLabel.innerHTML = `<b>${displayName}</b> ${tierPill}`;

    if (landingGate) landingGate.classList.add('hidden');

    if (profileUsernameText) profileUsernameText.innerText = displayName;
    if (profileTierBadge) {
      if (isPro) {
        profileTierBadge.innerText = 'PRO PACK ⭐ (49฿/เดือน)';
        profileTierBadge.style.background = 'rgba(216,177,93,0.2)';
        profileTierBadge.style.borderColor = '#d8b15d';
        profileTierBadge.style.color = '#f4e6c3';
      } else {
        profileTierBadge.innerText = 'FREE TIER (สมาชิกฟรี)';
        profileTierBadge.style.background = 'rgba(74,222,128,0.15)';
        profileTierBadge.style.borderColor = 'rgba(74,222,128,0.4)';
        profileTierBadge.style.color = '#4ade80';
      }
    }
    if (profileProStatusPill) {
      profileProStatusPill.innerText = isPro ? 'Active Pro Pack ⭐' : 'Free Version';
      profileProStatusPill.style.color = isPro ? '#d8b15d' : '#cfd3dc';
    }
    if (upgradeProBtn) {
      if (isPro) {
        upgradeProBtn.innerText = '👑 คุณใช้งาน PRO PACK VIP เรียบร้อยแล้ว';
        upgradeProBtn.style.opacity = '0.85';
      } else {
        upgradeProBtn.innerText = '⭐ ทดลอง / ปลดล็อก Pro Pack (49.- / เดือน)';
        upgradeProBtn.style.opacity = '1';
      }
    }
  } else {
    userProfileLabel.innerHTML = 'เข้าสู่ระบบ / สมาชิก';
    if (landingGate) landingGate.classList.remove('hidden');
    if (userProfileModal) userProfileModal.classList.add('hidden');
  }
}

// Preset Pills Listeners
presetPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const key = pill.getAttribute('data-preset');
    applyVocalPreset(key);
  });
});

// Setup Guide / Wizard Modal Trigger
openSetupGuideBtn.addEventListener('click', () => {
  openOnboardingWizard();
});
closeSetupGuideBtn.addEventListener('click', () => {
  setupGuideModal.classList.add('hidden');
});
finishSetupGuideBtn.addEventListener('click', () => {
  setupGuideModal.classList.add('hidden');
  initAudioEngine();
});

// --- Gated Landing Screen Controller (Mandatory Auth - No Bypass) ---
let gateAuthMode = 'login'; // 'login' | 'register'

function showGateAuthStatus(msg, isSuccess = false) {
  if (!gateAuthStatusMsg) return;
  gateAuthStatusMsg.style.display = 'block';
  gateAuthStatusMsg.className = `auth-status-msg ${isSuccess ? 'success' : 'error'}`;
  gateAuthStatusMsg.innerText = msg;
}

function clearGateAuthStatus() {
  if (!gateAuthStatusMsg) return;
  gateAuthStatusMsg.style.display = 'none';
  gateAuthStatusMsg.innerText = '';
}

if (gateTabLoginBtn && gateTabRegisterBtn) {
  gateTabLoginBtn.addEventListener('click', () => {
    gateAuthMode = 'login';
    gateTabLoginBtn.classList.add('active');
    gateTabRegisterBtn.classList.remove('active');
    gateTabLoginBtn.style.background = 'rgba(216,177,93,0.15)';
    gateTabLoginBtn.style.borderColor = '#d8b15d';
    gateTabLoginBtn.style.color = '#f4e6c3';
    gateTabRegisterBtn.style.background = 'rgba(255,255,255,0.03)';
    gateTabRegisterBtn.style.borderColor = 'var(--border-subtle)';
    gateTabRegisterBtn.style.color = 'var(--text-secondary)';
    if (gateConfirmPasswordGroup) gateConfirmPasswordGroup.style.display = 'none';
    if (gateSubmitBtn) gateSubmitBtn.innerText = 'เข้าสู่ระบบ (Login)';
    clearGateAuthStatus();
  });

  gateTabRegisterBtn.addEventListener('click', () => {
    gateAuthMode = 'register';
    gateTabRegisterBtn.classList.add('active');
    gateTabLoginBtn.classList.remove('active');
    gateTabRegisterBtn.style.background = 'rgba(216,177,93,0.15)';
    gateTabRegisterBtn.style.borderColor = '#d8b15d';
    gateTabRegisterBtn.style.color = '#f4e6c3';
    gateTabLoginBtn.style.background = 'rgba(255,255,255,0.03)';
    gateTabLoginBtn.style.borderColor = 'var(--border-subtle)';
    gateTabLoginBtn.style.color = 'var(--text-secondary)';
    if (gateConfirmPasswordGroup) gateConfirmPasswordGroup.style.display = 'block';
    if (gateSubmitBtn) gateSubmitBtn.innerText = 'สมัครสมาชิกใหม่ (Register)';
    clearGateAuthStatus();
  });
}

if (gateProVipBtn) {
  gateProVipBtn.addEventListener('click', () => {
    currentUser.username = 'Sukky';
    currentUser.isGuest = false;
    currentUser.isLoggedIn = true;
    currentUser.tier = 'pro';
    currentUser.proExpiresAt = 253402300799000;
    currentUser.hasCompletedOnboarding = true;
    saveUserProfile();
    applyUserPreset(currentUser.preset);
    updateAuthUI();
    if (landingGate) landingGate.classList.add('hidden');
    if (onboardingWizardModal) onboardingWizardModal.classList.add('hidden');
  });
}

if (gateGuestBtn) {
  gateGuestBtn.addEventListener('click', () => {
    currentUser.username = 'Guest';
    currentUser.isGuest = true;
    currentUser.isLoggedIn = true;
    currentUser.tier = 'free';
    saveUserProfile();
    updateAuthUI();
    if (landingGate) landingGate.classList.add('hidden');
    if (!currentUser.hasCompletedOnboarding) {
      openOnboardingWizard();
    }
  });
}

if (gateSubmitBtn) {
  gateSubmitBtn.addEventListener('click', async () => {
    const uname = gateUsernameInput ? gateUsernameInput.value.trim() : '';
    const pwd = gatePasswordInput ? gatePasswordInput.value.trim() : '';

    if (!uname || uname.length < 2) {
      showGateAuthStatus('กรุณาระบุชื่อผู้ใช้งานอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (!pwd || pwd.length < 3) {
      showGateAuthStatus('กรุณากรอกรหัสผ่านอย่างน้อย 3 ตัวอักษร');
      return;
    }

    if (gateAuthMode === 'register') {
      const confirmPwd = gateConfirmPasswordInput ? gateConfirmPasswordInput.value.trim() : '';
      if (pwd !== confirmPwd) {
        showGateAuthStatus('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
        return;
      }
    }

    gateSubmitBtn.disabled = true;
    gateSubmitBtn.innerHTML = '<span>⏳ กำลังดำเนินการ...</span>';

    try {
      const endpoint = gateAuthMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: uname,
          password: pwd,
          preset: currentUser.preset
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showGateAuthStatus(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบบัญชี');
      } else {
        showGateAuthStatus(gateAuthMode === 'register' ? 'สมัครสมาชิกสำเร็จ!' : 'เข้าสู่ระบบสำเร็จ!', true);
        currentUser.username = data.user.username;
        currentUser.isGuest = false;
        currentUser.isLoggedIn = true;
        currentUser.tier = data.user.tier || 'free';
        currentUser.proExpiresAt = data.user.proExpiresAt || null;
        if (data.user.preset) currentUser.preset = { ...currentUser.preset, ...data.user.preset };
        if (data.user.songKeys) currentUser.songKeys = data.user.songKeys;
        currentUser.hasCompletedOnboarding = data.user.hasCompletedOnboarding;
        
        saveUserProfile();
        applyUserPreset(currentUser.preset);
        updateAuthUI();

        setTimeout(() => {
          if (landingGate) landingGate.classList.add('hidden');
          if (!currentUser.hasCompletedOnboarding) {
            openOnboardingWizard();
          }
        }, 600);
      }
    } catch (e) {
      showGateAuthStatus('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      gateSubmitBtn.disabled = false;
      gateSubmitBtn.innerText = gateAuthMode === 'register' ? 'สมัครสมาชิกใหม่ (Register)' : 'เข้าสู่ระบบ (Login)';
    }
  });
}

// User Profile Modal Handlers (Accessible from header button when logged in)
if (userProfileBtn) {
  userProfileBtn.addEventListener('click', () => {
    if (currentUser.isLoggedIn) {
      updateAuthUI();
      if (userProfileModal) userProfileModal.classList.remove('hidden');
    } else {
      if (landingGate) landingGate.classList.remove('hidden');
    }
  });
}

if (closeProfileModalBtn) {
  closeProfileModalBtn.addEventListener('click', () => {
    if (userProfileModal) userProfileModal.classList.add('hidden');
  });
}

if (profileWizardBtn) {
  profileWizardBtn.addEventListener('click', () => {
    if (userProfileModal) userProfileModal.classList.add('hidden');
    openOnboardingWizard();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('karaoke_current_user');
    currentUser.username = '';
    currentUser.isLoggedIn = false;
    currentUser.isGuest = false;
    currentUser.tier = 'free';
    currentUser.proExpiresAt = null;
    currentUser.hasCompletedOnboarding = false;
    currentUser.songKeys = {};
    saveUserProfile();

    if (userProfileModal) userProfileModal.classList.add('hidden');
    updateAuthUI();
    clearGateAuthStatus();
    showGateAuthStatus('ออกจากระบบเรียบร้อยแล้ว เข้าสู่ระบบใหม่หรือเลือกใช้แบบ Guest ได้ทันที', true);
  });
}

if (upgradeProBtn) {
  upgradeProBtn.addEventListener('click', async () => {
    upgradeProBtn.disabled = true;
    upgradeProBtn.innerText = '⏳ กำลังเปิดใช้งาน Pro Pack...';
    try {
      const uname = currentUser.username || 'Guest';
      const res = await fetch('/api/auth/upgrade-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname })
      });
      const data = await res.json();
      if (res.ok) {
        currentUser.tier = 'pro';
        currentUser.proExpiresAt = data.proExpiresAt;
        saveUserProfile();
        updateAuthUI();
        alert('🎉 ยินดีด้วย! คุณได้เปิดใช้งาน Nocturne Pro Pack (49.-/เดือน) สำเร็จแล้ว สามารถใช้งาน Auto-Tune และเลื่อนคีย์เพลงได้เต็มรูปแบบ');
      } else {
        alert(data.error || 'ไม่สามารถเปิดใช้งาน Pro Pack ได้ในขณะนี้');
      }
    } catch (e) {
      currentUser.tier = 'pro';
      saveUserProfile();
      updateAuthUI();
      alert('🎉 เปิดใช้งาน Pro Pack สำเร็จ!');
    } finally {
      upgradeProBtn.disabled = false;
      upgradeProBtn.innerText = '⭐ ทดลอง / ปลดล็อก Pro Pack (49.- / เดือน)';
    }
  });
}

// --- Onboarding Setup Wizard Controller ---
let wizardPurpose = 'fivem'; // 'fivem' | 'solo'
let wizardChosenPreset = 'pop'; // 'pop' | 'tpain' | 'rock' | 'talk'

function openOnboardingWizard() {
  if (!onboardingWizardModal) return;
  onboardingWizardModal.classList.remove('hidden');
  goToWizardStep(1);

  // Gating: If initial setup, hide close button so user must finish setting up audio
  if (closeWizardModalBtn) {
    if (!currentUser.hasCompletedOnboarding) {
      closeWizardModalBtn.style.display = 'none';
    } else {
      closeWizardModalBtn.style.display = 'block';
    }
  }

  // Sync available audio devices into wizard dropdowns
  if (typeof enumerateAudioDevices === 'function') {
    enumerateAudioDevices().then(() => syncWizardDeviceSelectors()).catch(() => syncWizardDeviceSelectors());
  } else {
    syncWizardDeviceSelectors();
  }
}

function syncWizardDeviceSelectors() {
  if (wizardHeadphoneSelect && headphoneSelect) {
    if (headphoneSelect.options.length > 0) {
      wizardHeadphoneSelect.innerHTML = headphoneSelect.innerHTML;
      wizardHeadphoneSelect.value = headphoneSelect.value;
    } else if (wizardHeadphoneSelect.options.length === 0) {
      wizardHeadphoneSelect.innerHTML = '<option value="default">หูฟัง / ลำโพงเริ่มต้น (Default System Output)</option>';
    }
  }
  if (wizardMicSelect && micSelect) {
    if (micSelect.options.length > 0) {
      wizardMicSelect.innerHTML = micSelect.innerHTML;
      wizardMicSelect.value = micSelect.value;
    } else if (wizardMicSelect.options.length === 0) {
      wizardMicSelect.innerHTML = '<option value="default">ไมโครโฟนเริ่มต้น (Default Live Mic)</option>';
    }
  }
}

if (wizardHeadphoneSelect) {
  wizardHeadphoneSelect.addEventListener('focus', () => {
    if (wizardHeadphoneSelect.options.length <= 1 && typeof enumerateAudioDevices === 'function') {
      enumerateAudioDevices().then(() => syncWizardDeviceSelectors()).catch(() => {});
    }
  });
  wizardHeadphoneSelect.addEventListener('change', (e) => {
    if (headphoneSelect) {
      headphoneSelect.value = e.target.value;
      setSinkHeadphone(e.target.value);
    }
  });
}

if (wizardMicSelect) {
  wizardMicSelect.addEventListener('focus', () => {
    if (wizardMicSelect.options.length <= 1 && typeof enumerateAudioDevices === 'function') {
      enumerateAudioDevices().then(() => syncWizardDeviceSelectors()).catch(() => {});
    }
  });
  wizardMicSelect.addEventListener('change', (e) => {
    if (micSelect) {
      micSelect.value = e.target.value;
      if (audioCtx) initMicrophoneStream(e.target.value);
    }
  });
}

function goToWizardStep(stepNum) {
  [wizardStep1, wizardStep2, wizardStep3].forEach(panel => {
    if (panel) panel.classList.add('hidden');
  });
  [wizardStepPill1, wizardStepPill2, wizardStepPill3].forEach(pill => {
    if (pill) {
      pill.classList.remove('active');
      pill.style.background = 'rgba(255,255,255,0.03)';
      pill.style.borderColor = 'var(--border-subtle)';
      pill.style.color = 'var(--text-muted)';
    }
  });

  if (stepNum === 1) {
    if (wizardStep1) wizardStep1.classList.remove('hidden');
    if (wizardStepPill1) {
      wizardStepPill1.classList.add('active');
      wizardStepPill1.style.background = 'rgba(216,177,93,0.18)';
      wizardStepPill1.style.borderColor = '#d8b15d';
      wizardStepPill1.style.color = '#f4e6c3';
    }
  } else if (stepNum === 2) {
    if (wizardStep2) wizardStep2.classList.remove('hidden');
    if (wizardStepPill2) {
      wizardStepPill2.classList.add('active');
      wizardStepPill2.style.background = 'rgba(216,177,93,0.18)';
      wizardStepPill2.style.borderColor = '#d8b15d';
      wizardStepPill2.style.color = '#f4e6c3';
    }
    syncWizardDeviceSelectors();
    if (typeof enumerateAudioDevices === 'function') {
      enumerateAudioDevices().then(() => syncWizardDeviceSelectors()).catch(() => {});
    }
    initAudioEngine().then(() => {
      if (typeof enumerateAudioDevices === 'function') {
        enumerateAudioDevices().then(() => syncWizardDeviceSelectors()).catch(() => {});
      }
    }).catch(() => {});
  } else if (stepNum === 3) {
    if (wizardStep3) wizardStep3.classList.remove('hidden');
    if (wizardStepPill3) {
      wizardStepPill3.classList.add('active');
      wizardStepPill3.style.background = 'rgba(216,177,93,0.18)';
      wizardStepPill3.style.borderColor = '#d8b15d';
      wizardStepPill3.style.color = '#f4e6c3';
    }
  }
}

// Wizard Step 1: Purpose Cards
if (wizardCardFiveM && wizardCardSolo) {
  wizardCardFiveM.addEventListener('click', () => {
    wizardPurpose = 'fivem';
    wizardCardFiveM.classList.add('active');
    wizardCardSolo.classList.remove('active');
    wizardCardFiveM.style.background = 'rgba(216,177,93,0.12)';
    wizardCardFiveM.style.borderColor = '#d8b15d';
    wizardCardSolo.style.background = 'rgba(255,255,255,0.03)';
    wizardCardSolo.style.borderColor = 'var(--border-subtle)';
  });

  wizardCardSolo.addEventListener('click', () => {
    wizardPurpose = 'solo';
    wizardCardSolo.classList.add('active');
    wizardCardFiveM.classList.remove('active');
    wizardCardSolo.style.background = 'rgba(216,177,93,0.12)';
    wizardCardSolo.style.borderColor = '#d8b15d';
    wizardCardFiveM.style.background = 'rgba(255,255,255,0.03)';
    wizardCardFiveM.style.borderColor = 'var(--border-subtle)';
  });
}

if (wizardNextBtn1) wizardNextBtn1.addEventListener('click', () => goToWizardStep(2));
if (wizardPrevBtn2) wizardPrevBtn2.addEventListener('click', () => goToWizardStep(1));
if (wizardNextBtn2) wizardNextBtn2.addEventListener('click', () => goToWizardStep(3));
if (wizardPrevBtn3) wizardPrevBtn3.addEventListener('click', () => goToWizardStep(2));

if (closeWizardModalBtn) {
  closeWizardModalBtn.addEventListener('click', () => {
    onboardingWizardModal.classList.add('hidden');
  });
}

// Wizard Sonar Trigger
if (wizardSonarBtn) {
  wizardSonarBtn.addEventListener('click', () => {
    initAudioEngine();
    syncModal.classList.remove('hidden');
    if (tabSonarBtn) tabSonarBtn.click();
  });
}

// Wizard Step 3: Preset Cards
wizardPresetCards.forEach(card => {
  card.addEventListener('click', () => {
    wizardPresetCards.forEach(c => {
      c.classList.remove('active');
      c.style.background = 'rgba(255,255,255,0.03)';
      c.style.borderColor = 'var(--border-subtle)';
    });
    card.classList.add('active');
    card.style.background = 'rgba(216,177,93,0.14)';
    card.style.borderColor = '#d8b15d';
    wizardChosenPreset = card.getAttribute('data-wizard-preset') || 'pop';
  });
});

// Wizard Finish Action
if (wizardFinishBtn) {
  wizardFinishBtn.addEventListener('click', async () => {
    await initAudioEngine();

    // 1. Apply Purpose Settings
    if (wizardPurpose === 'fivem') {
      updateMusicCableLevel(0.30, false);
      updateVocalCableLevel(0.85, false);
      if (isCableMusicMuted) toggleCableMusicMute();
      if (isCableVocalMuted) toggleCableVocalMute();
      setSyncOffset(120);
    } else {
      updateMusicHpLevel(0.95, false);
      if (!isCableMusicMuted) toggleCableMusicMute();
      if (!isCableVocalMuted) toggleCableVocalMute();
    }

    // 2. Apply Selected Vocal Preset
    applyVocalPreset(wizardChosenPreset);

    // 3. Mark Onboarding as Completed
    currentUser.hasCompletedOnboarding = true;
    saveUserProfile();
    updateAuthUI();

    onboardingWizardModal.classList.add('hidden');
    alert(`🎉 ตั้งค่าระบบเสียงเสร็จสมบูรณ์! ขอให้มีความสุขกับการร้องเพลงใน Nocturne Studio ครับ!`);
  });
}

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
  const isDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
  const muteFlag = isDirectOrTab ? 0 : 1;
  const hpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
  const volInt = isHpMusicMuted ? 0 : Math.round(hpVol * 100);

  if (!window.YT || !window.YT.Player) {
    ytPlayerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&mute=${muteFlag}&start=${Math.floor(startSec)}&enablejsapi=1&origin=${encodeURIComponent(origin)}" class="video-iframe" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
    return;
  }

  if (ytPlayer && ytPlayer.loadVideoById) {
    try {
      ytPlayer.loadVideoById({ videoId, startSeconds: Math.floor(startSec) });
      const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
      if (currentDirectOrTab) {
        if (ytPlayer.unMute) ytPlayer.unMute();
        if (ytPlayer.setVolume) ytPlayer.setVolume(volInt);
      } else {
        if (ytPlayer.mute) ytPlayer.mute();
      }
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
        mute: muteFlag,
        enablejsapi: 1,
        origin: origin,
        start: Math.floor(startSec)
      },
      events: {
        onReady: (e) => {
          isYtReady = true;
          const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
          const curHpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
          const curVolInt = isHpMusicMuted ? 0 : Math.round(curHpVol * 100);
          if (currentDirectOrTab) {
            if (e.target && e.target.unMute) e.target.unMute();
            if (e.target && e.target.setVolume) e.target.setVolume(curVolInt);
          } else {
            if (e.target && e.target.mute) e.target.mute();
          }
          e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
            const curHpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
            const curVolInt = isHpMusicMuted ? 0 : Math.round(curHpVol * 100);
            if (currentDirectOrTab) {
              if (ytPlayer && ytPlayer.unMute) ytPlayer.unMute();
              if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(curVolInt);
            } else {
              if (ytPlayer && ytPlayer.mute) ytPlayer.mute();
            }
            playPauseBtn.innerHTML = SVG_PAUSE;
            startYtProgressTracker();
          } else if (e.data === YT.PlayerState.PAUSED) {
            isPlaying = false;
            playPauseBtn.innerHTML = SVG_PLAY;
          } else if (e.data === YT.PlayerState.ENDED) {
            if (isUsingDirectYtAudio) {
              playNextInQueue();
            }
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

    let dur = trackDurationSeconds;
    if (ytPlayer && typeof ytPlayer.getDuration === 'function') {
      const ytDur = ytPlayer.getDuration();
      if (ytDur && isFinite(ytDur) && ytDur > 0) {
        dur = ytDur;
        trackDurationSeconds = ytDur;
      }
    }

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

    // Ducking Master Gain
    duckingGain = audioCtx.createGain();
    duckingGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    // Master Backing Track Gain
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    // Channel A: Headphone Music Gain
    musicHpGain = audioCtx.createGain();
    const initHpM = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
    musicHpGain.gain.setValueAtTime(isHpMusicMuted ? 0.0 : initHpM, audioCtx.currentTime);

    // Channel B: Cable / FiveM Music Gain (Calibrated default 20%)
    musicCableGain = audioCtx.createGain();
    const initCbM = currentUser.preset.cableMusicVol !== undefined ? currentUser.preset.cableMusicVol : 0.20;
    musicCableGain.gain.setValueAtTime(isCableMusicMuted ? 0.0 : initCbM, audioCtx.currentTime);

    // Tab Audio Music Gain (Calibrated for Cloud Tab Audio streaming into Cable / Discord / Record Test)
    tabMusicGain = audioCtx.createGain();
    tabMusicGain.gain.setValueAtTime(isCableMusicMuted ? 0.0 : initCbM, audioCtx.currentTime);

    // Direct Vocal Sub-Gains (Rule 2: Default 0.0 to prevent headphone mic echo)
    vocalHpGain = audioCtx.createGain();
    const initHpV = currentUser.preset.hpVocalVol !== undefined ? currentUser.preset.hpVocalVol : 0.0;
    vocalHpGain.gain.setValueAtTime(isHpVocalMuted ? 0.0 : initHpV, audioCtx.currentTime);

    vocalCableGain = audioCtx.createGain();
    const initCbV = currentUser.preset.cableVocalVol !== undefined ? currentUser.preset.cableVocalVol : 1.0;
    vocalCableGain.gain.setValueAtTime(isCableVocalMuted ? 0.0 : initCbV, audioCtx.currentTime);

    // Submix Busses
    headphoneMixGain = audioCtx.createGain();
    headphoneMixGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    cableMixGain = audioCtx.createGain();
    cableMixGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    // Master Output Gains
    headphoneGain = audioCtx.createGain();
    headphoneGain.gain.setValueAtTime(parseFloat(headphoneVol.value), audioCtx.currentTime);

    cableSyncDelayNode = audioCtx.createDelay(1.0);
    cableSyncDelayNode.delayTime.setValueAtTime(cableSyncOffsetMs / 1000, audioCtx.currentTime);

    cableGain = audioCtx.createGain();
    cableGain.gain.setValueAtTime(parseFloat(cableVol.value), audioCtx.currentTime);

    // Auto-Tune Dedicated Gains (Separated into Cable & Headphone busses)
    autotuneCableGain = audioCtx.createGain();
    autotuneCableGain.gain.setValueAtTime(isAutotuneEnabled ? 1.0 : 0.0, audioCtx.currentTime);

    autotuneHpGain = audioCtx.createGain();
    autotuneHpGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    // Record Test Mic Gain
    recordMicGain = audioCtx.createGain();
    recordMicGain.gain.setValueAtTime(isAutotuneEnabled ? 0.0 : 1.0, audioCtx.currentTime);

    // Modular FX Plugin Rack & Safety Brickwall Limiter (-0.1dB)
    pluginRackInput = audioCtx.createGain();
    pluginRackOutput = audioCtx.createGain();

    safetyLimiterNode = audioCtx.createDynamicsCompressor();
    safetyLimiterNode.threshold.setValueAtTime(-0.1, audioCtx.currentTime);
    safetyLimiterNode.knee.setValueAtTime(0, audioCtx.currentTime);
    safetyLimiterNode.ratio.setValueAtTime(20, audioCtx.currentTime);
    safetyLimiterNode.attack.setValueAtTime(0.001, audioCtx.currentTime);
    safetyLimiterNode.release.setValueAtTime(0.05, audioCtx.currentTime);

    pluginRackOutput.connect(safetyLimiterNode);

    if (window.nocturnePlugins) {
      window.nocturnePlugins.init(audioCtx, pluginRackInput, pluginRackOutput);
      if (currentUser.preset && currentUser.preset.plugins) {
        window.nocturnePlugins.applySerializedState(currentUser.preset.plugins);
      }
      renderPluginRackUI();
    }

    // Reverb System
    convolverNode = audioCtx.createConvolver();
    reverbInputGain = audioCtx.createGain();
    reverbInputGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    reverbGain = audioCtx.createGain();
    reverbGain.gain.setValueAtTime(isReverbEnabled ? parseFloat(reverbMix.value) : 0.0, audioCtx.currentTime);

    headphoneReverbGain = audioCtx.createGain();
    headphoneReverbGain.gain.setValueAtTime(1.2, audioCtx.currentTime);

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

    audioElCable = document.getElementById('sinkCable');
    if (!audioElCable) {
      audioElCable = new Audio();
      audioElCable.id = 'sinkCable';
      audioElCable.className = 'hidden';
      document.body.appendChild(audioElCable);
    }
    audioElCable.srcObject = destCable.stream;
    audioElCable.muted = true; // Safety invariant: Always keep muted until safely bound to a distinct virtual cable!

    // --- Audio Graph Wiring ---
    if (pitchNode) {
      duckingGain.connect(pitchNode);
      pitchNode.connect(masterGain);
    } else {
      duckingGain.connect(masterGain);
    }

    // 1. BACKING TRACK DUAL ROUTING:
    // Split to Channel A (Headphones)
    masterGain.connect(musicHpGain);
    musicHpGain.connect(headphoneMixGain);

    // Split to Channel B (FiveM / Discord with 120ms Sync Delay)
    masterGain.connect(musicCableGain);
    musicCableGain.connect(cableSyncDelayNode);
    cableSyncDelayNode.connect(cableMixGain);
    if (tabMusicGain) {
      tabMusicGain.connect(cableMixGain);
    }

    // 2. MASTER HEADPHONE OUTPUT:
    headphoneMixGain.connect(headphoneGain);
    headphoneGain.connect(headphoneAnalyser);
    headphoneGain.connect(audioCtx.destination);

    // 3. MASTER CABLE OUTPUT (to FiveM / Discord):
    cableMixGain.connect(cableGain);
    cableGain.connect(cableAnalyser);
    cableAnalyser.connect(destCable);

    // 4. REVERB ROUTING:
    reverbInputGain.connect(convolverNode);
    convolverNode.connect(reverbGain);

    // Reverb Tail to FiveM / Discord
    reverbGain.connect(cableMixGain);

    // Reverb Tail to Headphone Monitor
    reverbGain.connect(headphoneReverbGain);
    headphoneReverbGain.connect(headphoneMixGain);

    // 5. AUTO-TUNE VOCAL ROUTING (Isolated to Cable by default):
    autotuneCableGain.connect(cableMixGain);
    autotuneHpGain.connect(headphoneMixGain);

    // 6. TEST RECORDER DESTINATION:
    // Captures the exact broadcast stream sent into Discord & FiveM (Backing Track + Vocal + Reverb)
    // cableGain already contains cableMixGain (musicCableGain + vocalCableGain/autotuneCableGain + reverbGain)
    cableGain.connect(destRecordTest);

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
      autotuneNode.connect(autotuneCableGain);
      autotuneNode.connect(autotuneHpGain);
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
    playEngineStartupChime();
  } catch (err) {
    console.error('Audio engine init error:', err);
  }
}

// Startup Acoustic Tone (Verifies headphone output immediately on click)
function playEngineStartupChime() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      g.gain.setValueAtTime(0.15, now + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
      osc.connect(g);
      g.connect(headphoneMixGain || audioCtx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.22);
    });
  } catch (e) {
    console.warn('Chime note:', e);
  }
}

// Global click listener to unlock suspended AudioContext immediately
window.addEventListener('click', async () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
});

// Update Reverb Impulse Response (Debounced to prevent AudioContext glitches)
let reverbDebounceTimer = null;
function updateReverbImpulse() {
  if (!audioCtx || !convolverNode) return;
  if (reverbDebounceTimer) clearTimeout(reverbDebounceTimer);
  reverbDebounceTimer = setTimeout(() => {
    try {
      const decayVal = parseFloat(reverbDecay.value);
      const roomVal = parseFloat(roomSize.value);
      const ir = ReverbGenerator.createImpulseResponse(audioCtx, {
        duration: decayVal,
        decay: roomVal * 0.8,
        preDelay: 0.02
      });
      convolverNode.buffer = ir;
    } catch (e) {
      console.warn('Reverb impulse calculation note:', e);
    }
  }, 40);
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

    // Connect through Vocal Dynamics Chain (Noise Gate -> Compressor -> Plugin Rack -> Safety Limiter)
    let vocalChainSource = micSource;

    if (noiseGateNode && vocalCompressorNode) {
      micSource.connect(noiseGateNode);
      noiseGateNode.connect(vocalCompressorNode);
      vocalChainSource = vocalCompressorNode;
    }

    // Connect through Modular FX Plugin Rack & Safety Brickwall Limiter
    if (pluginRackInput && safetyLimiterNode) {
      vocalChainSource.connect(pluginRackInput);
      vocalChainSource = safetyLimiterNode;
    }

    // Direct voice to Headphone Direct Monitor
    if (vocalHpGain) {
      vocalChainSource.connect(vocalHpGain);
      vocalHpGain.connect(headphoneMixGain);
    }

    // Direct voice to Cable Output
    if (vocalCableGain) {
      vocalChainSource.connect(vocalCableGain);
      vocalCableGain.connect(cableMixGain);
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

// Update Vocal Dynamics Parameters
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

// Update Vocal Audio Routing (Guarantees zero double voice / phasing)
function updateVocalAudioRouting() {
  if (!audioCtx) return;

  const userHpVocal = currentUser.preset.hpVocalVol !== undefined ? currentUser.preset.hpVocalVol : 0.0;
  const userCableVocal = currentUser.preset.cableVocalVol !== undefined ? currentUser.preset.cableVocalVol : 1.0;

  if (isAutotuneEnabled) {
    // When Auto-Tune is ON: Route ONLY Auto-Tuned vocal, mute dry bypass to prevent double voice / acoustic phasing!
    if (autotuneCableGain) {
      const targetGain = isCableVocalMuted ? 0.0 : userCableVocal;
      autotuneCableGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    }
    if (autotuneHpGain) {
      const targetGain = isHpVocalMuted ? 0.0 : userHpVocal;
      autotuneHpGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    }
    if (vocalCableGain) {
      vocalCableGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    if (vocalHpGain) {
      vocalHpGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    if (recordMicGain) {
      recordMicGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
  } else {
    // When Auto-Tune is OFF: Route clean Dry processed vocal (with Noise Gate & Compressor), mute autotune gain!
    if (autotuneCableGain) {
      autotuneCableGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    if (autotuneHpGain) {
      autotuneHpGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    if (vocalCableGain) {
      const targetGain = isCableVocalMuted ? 0.0 : userCableVocal;
      vocalCableGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    }
    if (vocalHpGain) {
      const targetGain = isHpVocalMuted ? 0.0 : userHpVocal;
      vocalHpGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    }
    if (recordMicGain) {
      recordMicGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    }
  }
}

// Update Auto-Tune AudioWorklet Parameters
function updateAutotuneParams() {
  if (!audioCtx) return;

  updateVocalAudioRouting();

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

// --- Channel A: Headphone Music & Vocal Controls ---
function updateMusicHpLevel(val, shouldSave = true) {
  const v = parseFloat(val);
  currentUser.preset.hpMusicVol = v;
  if (quickHpMusicSlider) quickHpMusicSlider.value = v;
  if (hpMusicVol) hpMusicVol.value = v;
  const txt = Math.round(v * 100) + '%';
  if (quickHpMusicText) quickHpMusicText.innerText = txt;
  if (hpMusicVolText) hpMusicVolText.innerText = txt;

  if (musicHpGain && audioCtx) {
    const target = isHpMusicMuted ? 0.0 : v;
    musicHpGain.gain.setValueAtTime(target, audioCtx.currentTime);
  }

  // Also sync volume to YouTube player in fallback mode
  if (ytPlayer && isUsingDirectYtAudio && typeof ytPlayer.setVolume === 'function') {
    ytPlayer.setVolume(isHpMusicMuted ? 0 : Math.min(100, Math.round(v * 100)));
  }

  if (shouldSave) saveUserProfile();
}

function toggleHpMusicMute() {
  isHpMusicMuted = !isHpMusicMuted;
  currentUser.preset.isHpMusicMuted = isHpMusicMuted;
  syncMuteUI(toggleHpMusicBtn, hpMusicMuteBtn, !isHpMusicMuted);

  if (musicHpGain && audioCtx) {
    const target = isHpMusicMuted ? 0.0 : (currentUser.preset.hpMusicVol || 0.9);
    musicHpGain.gain.setValueAtTime(target, audioCtx.currentTime);
  }

  if (ytPlayer && isUsingDirectYtAudio) {
    if (isHpMusicMuted && typeof ytPlayer.mute === 'function') {
      ytPlayer.mute();
    } else if (!isHpMusicMuted && typeof ytPlayer.unMute === 'function') {
      ytPlayer.unMute();
      ytPlayer.setVolume(Math.round((currentUser.preset.hpMusicVol || 0.9) * 100));
    }
  }

  saveUserProfile();
}

function updateVocalHpLevel(val, shouldSave = true) {
  const v = parseFloat(val);
  currentUser.preset.hpVocalVol = v;
  if (hpVocalVol) hpVocalVol.value = v;
  if (hpVocalVolText) hpVocalVolText.innerText = Math.round(v * 100) + '%';

  updateVocalAudioRouting();
  if (shouldSave) saveUserProfile();
}

function toggleHpVocalMute() {
  isHpVocalMuted = !isHpVocalMuted;
  currentUser.preset.isHpVocalMuted = isHpVocalMuted;
  syncMuteUI(null, hpVocalMuteBtn, !isHpVocalMuted);

  updateVocalAudioRouting();
  saveUserProfile();
}

// --- Channel B: Cable / FiveM Music & Vocal Controls ---
function updateMusicCableLevel(val, shouldSave = true) {
  const v = parseFloat(val);
  currentUser.preset.cableMusicVol = v;
  if (quickCableMusicSlider) quickCableMusicSlider.value = v;
  if (cableMusicVol) cableMusicVol.value = v;
  const pct = Math.round(v * 100);
  const desc = pct <= 30 ? `${pct}% (พอดี)` : `${pct}% (ดัง)`;
  if (quickCableMusicText) quickCableMusicText.innerText = pct + '%';
  if (cableMusicVolText) cableMusicVolText.innerText = desc;

  if (musicCableGain && audioCtx) {
    const target = isCableMusicMuted ? 0.0 : v;
    musicCableGain.gain.setValueAtTime(target, audioCtx.currentTime);
  }
  if (tabMusicGain && audioCtx) {
    const target = isCableMusicMuted ? 0.0 : v;
    tabMusicGain.gain.setValueAtTime(target, audioCtx.currentTime);
  }
  if (shouldSave) saveUserProfile();
}

function toggleCableMusicMute() {
  isCableMusicMuted = !isCableMusicMuted;
  currentUser.preset.isCableMusicMuted = isCableMusicMuted;
  syncMuteUI(toggleCableMusicBtn, cableMusicMuteBtn, !isCableMusicMuted);

  if (musicCableGain && audioCtx) {
    const target = isCableMusicMuted ? 0.0 : (currentUser.preset.cableMusicVol || 0.20);
    musicCableGain.gain.setValueAtTime(target, audioCtx.currentTime);
  }
  if (tabMusicGain && audioCtx) {
    const target = isCableMusicMuted ? 0.0 : (currentUser.preset.cableMusicVol || 0.20);
    tabMusicGain.gain.setValueAtTime(target, audioCtx.currentTime);
  }
  saveUserProfile();
}

function updateVocalCableLevel(val, shouldSave = true) {
  const v = parseFloat(val);
  currentUser.preset.cableVocalVol = v;
  if (cableVocalVol) cableVocalVol.value = v;
  if (cableVocalVolText) cableVocalVolText.innerText = Math.round(v * 100) + '%';

  updateVocalAudioRouting();
  if (shouldSave) saveUserProfile();
}

function toggleCableVocalMute() {
  isCableVocalMuted = !isCableVocalMuted;
  currentUser.preset.isCableVocalMuted = isCableVocalMuted;
  syncMuteUI(null, cableVocalMuteBtn, !isCableVocalMuted);

  updateVocalAudioRouting();
  saveUserProfile();
}

// Event Listeners for Dual Channel Sliders & Mute Toggles
if (quickHpMusicSlider) quickHpMusicSlider.addEventListener('input', (e) => updateMusicHpLevel(e.target.value));
if (hpMusicVol) hpMusicVol.addEventListener('input', (e) => updateMusicHpLevel(e.target.value));
if (toggleHpMusicBtn) toggleHpMusicBtn.addEventListener('click', toggleHpMusicMute);
if (hpMusicMuteBtn) hpMusicMuteBtn.addEventListener('click', toggleHpMusicMute);

if (quickCableMusicSlider) quickCableMusicSlider.addEventListener('input', (e) => updateMusicCableLevel(e.target.value));
if (cableMusicVol) cableMusicVol.addEventListener('input', (e) => updateMusicCableLevel(e.target.value));
if (toggleCableMusicBtn) toggleCableMusicBtn.addEventListener('click', toggleCableMusicMute);
if (cableMusicMuteBtn) cableMusicMuteBtn.addEventListener('click', toggleCableMusicMute);

if (hpVocalVol) hpVocalVol.addEventListener('input', (e) => updateVocalHpLevel(e.target.value));
if (hpVocalMuteBtn) hpVocalMuteBtn.addEventListener('click', toggleHpVocalMute);

if (cableVocalVol) cableVocalVol.addEventListener('input', (e) => updateVocalCableLevel(e.target.value));
if (cableVocalMuteBtn) cableVocalMuteBtn.addEventListener('click', toggleCableVocalMute);

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

// VU Meters
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

      // Wizard Live Mic Test Meter update
      if (wizardMicVuBar && onboardingWizardModal && !onboardingWizardModal.classList.contains('hidden')) {
        wizardMicVuBar.style.transform = `scaleX(${percent / 100})`;
        if (wizardMicStatusText) {
          if (percent > 15) {
            wizardMicStatusText.style.color = '#4ade80';
            wizardMicStatusText.innerText = '🟢 ยอดเยี่ยม! ไมค์ของคุณทำงานชัดเจนดีมาก';
          } else {
            wizardMicStatusText.style.color = 'var(--gold-primary)';
            wizardMicStatusText.innerText = 'รอสัญญาณเสียงพูด...';
          }
        }
      }

      // Traffic Light: Mic
      if (trafficMicDot) {
        trafficMicDot.classList.toggle('active', isAudioInitialized && percent > 2);
      }

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

    // Traffic Light Status: Music & FiveM
    if (trafficMusicDot) {
      const isMusicPlaying = (audioSourceElement && !audioSourceElement.paused) || (ytPlayer && typeof ytPlayer.getPlayerState === 'function' && ytPlayer.getPlayerState() === 1);
      trafficMusicDot.classList.toggle('active', isAudioInitialized && isMusicPlaying);
    }
    if (trafficCableDot) {
      trafficCableDot.classList.toggle('active', isAudioInitialized && audioElCable && !audioElCable.muted);
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
async function startRecordingTest() {
  if (!destRecordTest || !destRecordTest.stream) {
    await initAudioEngine();
  }
  if (!destRecordTest || !destRecordTest.stream) {
    alert('กรุณากด START ENGINE ก่อนเริ่มอัดเสียง');
    return;
  }

  // If in Direct YouTube mode and tab audio capture is not active yet, offer to connect tab audio so music is recorded
  const isAudioSourceStreaming = audioSourceElement && !audioSourceElement.paused && audioSourceElement.currentTime > 0;
  if ((isUsingDirectYtAudio && !isTabAudioActive) || (isCloudHost && !isTabAudioActive && !isAudioSourceStreaming)) {
    const wantTab = confirm(
      '💡 ขณะนี้ใช้งานโหมด YouTube Direct Audio (Cloud)\n\n' +
      'เพื่อให้ระบบอัดเสียงบันทึกทั้ง "เสียงเพลง" และ "เสียงไมค์" พร้อมกัน\n' +
      'กรุณากด ตกลง (OK) เพื่อเลือกแชร์เสียงเพลงจากแท็บนี้ (Share tab audio)'
    );
    if (wantTab) {
      await startTabAudioCapture();
    }
  }

  recordedChunks = [];
  try {
    mediaRecorder = new MediaRecorder(destRecordTest.stream);
  } catch (e) {
    mediaRecorder = new MediaRecorder(destRecordTest.stream, { mimeType: 'audio/webm' });
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    if (window._currentRecordBlobUrl) {
      try { URL.revokeObjectURL(window._currentRecordBlobUrl); } catch (e) {}
    }
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    window._currentRecordBlobUrl = URL.createObjectURL(blob);
    recordedAudioPlayer.src = window._currentRecordBlobUrl;
    playbackWidget.classList.remove('hidden');
    recStatusMsg.innerText = `อัดเสียงเรียบร้อย (${recordSeconds} วินาที) - กด Play เพื่อเช็กเสียงจริงที่เข้า Discord`;
    recStatusMsg.style.color = '#8ce8de';
  };

  mediaRecorder.start();
  isRecordingTest = true;
  recordSeconds = 0;
  recTimerText.innerText = '00:00';
  recBadge.classList.add('recording');
  toggleRecordBtn.classList.add('btn-garnet-pulse');
  toggleRecordBtn.innerHTML = `
    <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
    <span>หยุดอัดเสียง & ฟังย้อนหลัง (Stop & Listen)</span>
  `;

  recordTimerInterval = setInterval(() => {
    recordSeconds++;
    const m = Math.floor(recordSeconds / 60);
    const s = recordSeconds % 60;
    recTimerText.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

    if (recordSeconds >= 30) {
      stopRecordingTest();
    }
  }, 1000);
}

function stopRecordingTest() {
  if (!isRecordingTest) return;
  isRecordingTest = false;
  clearInterval(recordTimerInterval);

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  recBadge.classList.remove('recording');
  toggleRecordBtn.classList.remove('btn-garnet-pulse');
  toggleRecordBtn.innerHTML = `
    <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
    <span>เริ่มอัดเสียงทดสอบใหม่ (Record Again)</span>
  `;
}

toggleRecordBtn.addEventListener('click', async () => {
  if (!isRecordingTest) {
    await startRecordingTest();
  } else {
    stopRecordingTest();
  }
});

// --- Tab Audio Capture (Cloud Fallback for YouTube Iframe Audio) ---
async function startTabAudioCapture() {
  try {
    await initAudioEngine();
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      systemAudio: 'include',
      surfaceSwitching: 'include',
      selfBrowserSurface: 'include'
    });

    const audioTrack = displayStream.getAudioTracks()[0];
    if (!audioTrack) {
      alert('ไม่พบสัญญาณเสียงจากแท็บ! กรุณาติ๊กเลือก "Also share tab audio" (แชร์เสียงจากแท็บ) ตอนเลือกหน้าต่าง');
      displayStream.getTracks().forEach(t => t.stop());
      return false;
    }

    // Stop video track immediately to save processing power
    displayStream.getVideoTracks().forEach(t => t.stop());

    tabAudioStream = new MediaStream([audioTrack]);
    if (tabAudioSourceNode) {
      try { tabAudioSourceNode.disconnect(); } catch (e) {}
    }

    tabAudioSourceNode = audioCtx.createMediaStreamSource(tabAudioStream);
    
    // Connect tab audio through tabMusicGain into cableMixGain so it enters cableGain and destRecordTest with proper volume balance and without double-monitoring in headphones
    if (tabMusicGain) {
      tabAudioSourceNode.connect(tabMusicGain);
    } else if (cableMixGain) {
      tabAudioSourceNode.connect(cableMixGain);
    }

    // Ensure YouTube player is unmuted so tab emits audio
    if (ytPlayer && ytPlayer.unMute) {
      ytPlayer.unMute();
      const hpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
      if (ytPlayer.setVolume) ytPlayer.setVolume(isHpMusicMuted ? 0 : Math.round(hpVol * 100));
    }

    isTabAudioActive = true;
    updateTabAudioUI();

    audioTrack.onended = () => {
      stopTabAudioCapture();
    };

    return true;
  } catch (err) {
    console.warn('Tab audio capture note:', err);
    return false;
  }
}

function stopTabAudioCapture() {
  if (tabAudioStream) {
    tabAudioStream.getTracks().forEach(t => t.stop());
    tabAudioStream = null;
  }
  if (tabAudioSourceNode) {
    try { tabAudioSourceNode.disconnect(); } catch (e) {}
    tabAudioSourceNode = null;
  }
  isTabAudioActive = false;
  updateTabAudioUI();
}

function toggleTabAudioCapture() {
  if (isTabAudioActive) {
    stopTabAudioCapture();
  } else {
    startTabAudioCapture();
  }
}

function updateTabAudioUI() {
  const btn = document.getElementById('tabAudioCaptureBtn');
  const txt = document.getElementById('tabAudioStatusText');
  const badge = document.getElementById('audioPipelineBadge');
  if (btn && txt) {
    if (isTabAudioActive) {
      btn.style.background = 'rgba(78, 201, 176, 0.2)';
      btn.style.borderColor = '#4ec9b0';
      btn.style.color = '#4ec9b0';
      txt.innerText = '✓ เสียงเพลงจากแท็บเชื่อมต่อแล้ว (Tab Audio Active)';
    } else {
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
      txt.innerText = '🎙️ ดึงเสียงเพลงจากแท็บ (Tab Audio บน Cloud)';
    }
  }
  if (badge) {
    if (isTabAudioActive) {
      badge.innerText = 'Pipeline: Tab Audio + Mic Mix (100% Cloud Record)';
      badge.style.color = '#4ec9b0';
      badge.style.borderColor = 'rgba(78, 201, 176, 0.4)';
    } else if (!isUsingDirectYtAudio) {
      badge.innerText = 'Pipeline: Web Audio DSP (Music + Mic)';
      badge.style.color = '#d8b15d';
      badge.style.borderColor = 'rgba(216, 177, 93, 0.3)';
    } else {
      badge.innerText = 'Pipeline: YouTube Direct (Mic only without Tab Audio)';
      badge.style.color = '#ff9800';
      badge.style.borderColor = 'rgba(255, 152, 0, 0.3)';
    }
  }
}

const tabAudioCaptureBtn = document.getElementById('tabAudioCaptureBtn');
if (tabAudioCaptureBtn) {
  tabAudioCaptureBtn.addEventListener('click', toggleTabAudioCapture);
}

// Metronome Beep Generator
function playMetronomeBeep(beat) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  const isAccent = beat === 1;
  osc.frequency.setValueAtTime(isAccent ? 1200 : 800, audioCtx.currentTime);
  osc.type = 'sine';

  const beepVol = 0.5;
  gain.gain.setValueAtTime(beepVol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(headphoneMixGain || audioCtx.destination);

  lastBeepAudioTime = audioCtx.currentTime;
  outputBeepStatus.innerText = `เคาะจังหวะที่ ${beat} (${Math.round(lastBeepAudioTime * 1000) % 10000}ms)`;

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.08);

  metroIndicator.classList.add('pulse');
  metroBeatNum.innerText = beat;
  setTimeout(() => {
    metroIndicator.classList.remove('pulse');
  }, 120);
}

function startMetronome() {
  if (!audioCtx) {
    alert('กรุณากด START ENGINE ก่อนเริ่มทดสอบความหน่วง');
    return;
  }
  isMetronomeRunning = true;
  currentBeat = 0;
  toggleMetronomeBtn.innerText = 'หยุดเคาะจังหวะ (Stop Metronome)';
  toggleMetronomeBtn.classList.add('btn-garnet');
  metroStatus.innerText = 'กำลังส่งเสียงเคาะจังหวะ... ให้ปรบมือตามจังหวะได้เลยครับ';

  metronomeTimer = setInterval(() => {
    currentBeat = (currentBeat % 4) + 1;
    playMetronomeBeep(currentBeat);
  }, 1000);
}

function stopMetronome() {
  isMetronomeRunning = false;
  clearInterval(metronomeTimer);
  toggleMetronomeBtn.innerText = 'เริ่มเคาะจังหวะ (Start Metronome)';
  toggleMetronomeBtn.classList.remove('btn-garnet');
  metroStatus.innerText = 'หยุดเคาะจังหวะแล้ว';
}

toggleMetronomeBtn.addEventListener('click', () => {
  if (!isMetronomeRunning) {
    startMetronome();
  } else {
    stopMetronome();
  }
});

// Metronome Modal Open/Close
openSyncModalBtn.addEventListener('click', () => {
  initAudioEngine();
  syncModal.classList.remove('hidden');
});

closeSyncModalBtn.addEventListener('click', () => {
  if (isMetronomeRunning) stopMetronome();
  syncModal.classList.add('hidden');
});

// Sync Offset Setters
function setSyncOffset(val) {
  const v = parseInt(val);
  cableSyncOffsetMs = v;
  if (cableSyncOffsetSlider) cableSyncOffsetSlider.value = v;
  if (cableSyncOffsetText) cableSyncOffsetText.innerText = v + ' ms';
  if (modalSyncOffset) modalSyncOffset.value = v;
  if (modalSyncOffsetText) modalSyncOffsetText.innerText = v + ' ms';
  if (sonarMeasuredVal) sonarMeasuredVal.innerText = v + ' ms';

  if (cableSyncDelayNode && audioCtx) {
    cableSyncDelayNode.delayTime.setValueAtTime(v / 1000, audioCtx.currentTime);
  }

  saveUserProfile();
  updateAuthUI();
}

cableSyncOffsetSlider.addEventListener('input', (e) => setSyncOffset(e.target.value));
if (modalSyncOffset) modalSyncOffset.addEventListener('input', (e) => setSyncOffset(e.target.value));

applyMeasuredOffsetBtn.addEventListener('click', () => {
  if (calculatedAverageMs > 0) {
    setSyncOffset(calculatedAverageMs);
    alert(`นำค่าความหน่วง ${calculatedAverageMs} ms ไปตั้งค่าหน่วงเพลงเข้า Discord ให้ตรงกับไมค์เรียบร้อยครับ!`);
    if (isMetronomeRunning) stopMetronome();
    syncModal.classList.add('hidden');
  } else {
    alert('ยังไม่มีค่าเฉลี่ยความหน่วง กรุณาปรบมือตามจังหวะเคาะ 3-5 ครั้งก่อนครับ');
  }
});

// --- Acoustic Sonar Cross-Correlation Engine ---
let isSonarTesting = false;
let sonarDetectedOffset = 120;

async function runSonarAcousticCalibration() {
  if (isSonarTesting) return;
  if (!audioCtx) {
    await initAudioEngine();
  }
  if (!audioCtx || !micSource) {
    alert('กรุณากดเปิดใช้งานระบบเสียง (START ENGINE) และอนุญาตไมโครโฟนก่อนเริ่มตรวจวัด');
    return;
  }

  isSonarTesting = true;
  if (startSonarBtn) {
    startSonarBtn.disabled = true;
    startSonarBtn.innerHTML = '<span>⏳ กำลังยิงคลื่นเสียงและดักจับ...</span>';
  }
  if (applySonarBtn) applySonarBtn.disabled = true;

  if (sonarRadarWrap) sonarRadarWrap.classList.add('sonar-pulsing');
  if (sonarStatusMsg) sonarStatusMsg.innerText = '📡 กำลังส่งคลื่นเสียง Chirp 3 ระลอก (กรุณาถือหูฟังจ่อติดไมค์ไว้)...';
  if (sonarSubStatus) sonarSubStatus.innerText = 'รอสัญญาณเสียงวนกลับเข้าสู่ไมโครโฟนเพื่อคำนวณ Cross-Correlation';

  try {
    const sampleRate = audioCtx.sampleRate || 48000;
    const chirpDur = 0.045; // 45ms linear chirp
    const chirpLen = Math.floor(sampleRate * chirpDur);
    const refChirp = new Float32Array(chirpLen);
    let refEnergy = 0;

    for (let i = 0; i < chirpLen; i++) {
      const t = i / sampleRate;
      const f = 1400 + ((3600 - 1400) / (2 * chirpDur)) * t;
      const env = 0.5 * (1 - Math.cos((2 * Math.PI * i) / chirpLen));
      refChirp[i] = env * Math.sin(2 * Math.PI * f * t);
      refEnergy += refChirp[i] * refChirp[i];
    }

    // Create AudioBuffer containing the reference chirp
    const chirpBuffer = audioCtx.createBuffer(1, chirpLen, sampleRate);
    chirpBuffer.copyToChannel(refChirp, 0);

    // Recording buffer setup using ScriptProcessor
    const bufferDurationSec = 1.35;
    const totalSamplesToRecord = Math.floor(bufferDurationSec * sampleRate);
    const recordedBuffer = new Float32Array(totalSamplesToRecord);
    let recordedIndex = 0;

    const processor = audioCtx.createScriptProcessor(2048, 1, 1);
    const muteGain = audioCtx.createGain();
    muteGain.gain.setValueAtTime(0, audioCtx.currentTime);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const remaining = totalSamplesToRecord - recordedIndex;
      if (remaining > 0) {
        const toCopy = Math.min(input.length, remaining);
        recordedBuffer.set(input.subarray(0, toCopy), recordedIndex);
        recordedIndex += toCopy;
      }
    };

    micSource.connect(processor);
    processor.connect(muteGain);
    muteGain.connect(audioCtx.destination);

    // Schedule 3 Chirp Pulses out through headphone output
    const startTime = audioCtx.currentTime + 0.12;
    const pulseDelays = [0.0, 0.35, 0.70];
    
    pulseDelays.forEach((pOffset) => {
      const src = audioCtx.createBufferSource();
      src.buffer = chirpBuffer;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.85, startTime + pOffset);
      src.connect(g);
      g.connect(headphoneMixGain || audioCtx.destination);
      src.start(startTime + pOffset);
    });

    // Wait until recording is complete
    await new Promise(resolve => setTimeout(resolve, Math.round((bufferDurationSec + 0.2) * 1000)));

    // Clean up processor
    micSource.disconnect(processor);
    processor.disconnect();
    processor.onaudioprocess = null;

    if (sonarRadarWrap) sonarRadarWrap.classList.remove('sonar-pulsing');

    // Run Cross-Correlation Detection
    const detectedRounds = [];
    pulseDelays.forEach((pOffset) => {
      const emitIdx = Math.round((0.12 + pOffset) * sampleRate);
      const minDelaySamples = Math.round(0.015 * sampleRate); // 15ms minimum hardware delay
      const maxDelaySamples = Math.round(0.350 * sampleRate); // 350ms maximum delay window

      let bestVal = -Infinity;
      let bestIdx = 0;

      // Coarse Search (step 4)
      for (let k = emitIdx + minDelaySamples; k <= emitIdx + maxDelaySamples; k += 4) {
        if (k + chirpLen >= recordedBuffer.length) break;
        let sum = 0;
        for (let m = 0; m < chirpLen; m += 4) {
          sum += recordedBuffer[k + m] * refChirp[m];
        }
        if (sum > bestVal) {
          bestVal = sum;
          bestIdx = k;
        }
      }

      // Fine Search (step 1 around peak)
      const fineStart = Math.max(emitIdx + minDelaySamples, bestIdx - 8);
      const fineEnd = Math.min(emitIdx + maxDelaySamples, bestIdx + 8);
      let fineBestVal = -Infinity;
      let fineBestIdx = bestIdx;

      for (let k = fineStart; k <= fineEnd; k++) {
        if (k + chirpLen >= recordedBuffer.length) break;
        let sum = 0;
        let recEnergy = 0;
        for (let m = 0; m < chirpLen; m += 2) {
          sum += recordedBuffer[k + m] * refChirp[m];
          recEnergy += recordedBuffer[k + m] * recordedBuffer[k + m];
        }
        const score = sum / (Math.sqrt(recEnergy * (refEnergy * 0.5)) || 1);
        if (score > fineBestVal) {
          fineBestVal = score;
          fineBestIdx = k;
        }
      }

      const delayMs = Math.round(((fineBestIdx - emitIdx) / sampleRate) * 1000);
      if (fineBestVal > 0.16 && delayMs >= 20 && delayMs <= 350) {
        detectedRounds.push({ delay: delayMs, score: fineBestVal });
      }
    });

    if (detectedRounds.length >= 2) {
      detectedRounds.sort((a, b) => a.delay - b.delay);
      const medianDelay = detectedRounds[Math.floor(detectedRounds.length / 2)].delay;
      const variance = Math.max(...detectedRounds.map(r => r.delay)) - Math.min(...detectedRounds.map(r => r.delay));
      
      sonarDetectedOffset = medianDelay;
      if (sonarMeasuredVal) sonarMeasuredVal.innerText = `${medianDelay} ms`;
      if (sonarConfidenceBadge) {
        sonarConfidenceBadge.style.display = 'inline-block';
        if (variance <= 8) {
          sonarConfidenceBadge.style.background = 'rgba(74, 222, 128, 0.15)';
          sonarConfidenceBadge.style.color = '#4ade80';
          sonarConfidenceBadge.style.borderColor = '#4ade80';
          sonarConfidenceBadge.innerText = `🎯 แม่นยำสูง 99% (±${variance}ms)`;
        } else {
          sonarConfidenceBadge.style.background = 'rgba(216, 177, 93, 0.15)';
          sonarConfidenceBadge.style.color = '#d8b15d';
          sonarConfidenceBadge.style.borderColor = '#d8b15d';
          sonarConfidenceBadge.innerText = `👍 ตรวจพบ ${detectedRounds.length}/3 รอบ`;
        }
      }

      if (sonarRoundsContainer) {
        sonarRoundsContainer.innerHTML = detectedRounds.map((r, i) => 
          `<span class="sample-badge">พัลส์ ${i + 1}: ${r.delay}ms</span>`
        ).join('');
      }

      if (sonarStatusMsg) sonarStatusMsg.innerHTML = `✅ <strong>ตรวจพบความหน่วงระบบแม่นยำ: ${medianDelay} ms</strong>`;
      if (sonarSubStatus) sonarSubStatus.innerText = 'กด "นำค่านี้ไปใช้ทันที" เพื่ออัปเดตระบบชดเชยดีเลย์เข้า FiveM ได้เลยครับ';
      
      if (applySonarBtn) {
        applySonarBtn.disabled = false;
        applySonarBtn.classList.add('glow-btn');
      }
    } else {
      if (sonarConfidenceBadge) {
        sonarConfidenceBadge.style.display = 'inline-block';
        sonarConfidenceBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        sonarConfidenceBadge.style.color = '#ef4444';
        sonarConfidenceBadge.style.borderColor = '#ef4444';
        sonarConfidenceBadge.innerText = '⚠️ สัญญาณเบาเกินไป';
      }
      
      if (sonarStatusMsg) sonarStatusMsg.innerText = '⚠️ ไมค์ตรวจจับเสียงสะท้อนจากหูฟังไม่ชัดเจน';
      if (sonarSubStatus) sonarSubStatus.innerText = 'คำแนะนำ: กรุณาถอดหูฟัง 1 ข้างมาจ่อให้แนบชิดหัวไมค์ (~2-3 ซม.) แล้วกดทดสอบใหม่อีกครั้งครับ';
      if (sonarRoundsContainer) sonarRoundsContainer.innerHTML = '<span class="sample-badge empty">ไม่พบสัญญาณชัดเจน</span>';
    }
  } catch (err) {
    console.error('Sonar Calibration error:', err);
    if (sonarStatusMsg) sonarStatusMsg.innerText = '❌ เกิดข้อผิดพลาดในการคำนวณสัญญาณ';
  } finally {
    isSonarTesting = false;
    if (startSonarBtn) {
      startSonarBtn.disabled = false;
      startSonarBtn.innerHTML = '⚡ เริ่มยิงคลื่นวัดดีเลย์ (Start Sonar Test)';
    }
  }
}

// Sonar Event Listeners
if (startSonarBtn) startSonarBtn.addEventListener('click', runSonarAcousticCalibration);

if (applySonarBtn) {
  applySonarBtn.addEventListener('click', () => {
    if (sonarDetectedOffset > 0) {
      setSyncOffset(sonarDetectedOffset);
      applySonarBtn.innerHTML = '<span>✅ นำค่าไปใช้แล้ว!</span>';
      setTimeout(() => {
        applySonarBtn.innerHTML = '🎯 นำค่านี้ไปใช้ทันที';
        syncModal.classList.add('hidden');
      }, 1200);
    }
  });
}

// Modal Tab Switcher (Acoustic Sonar vs Manual Metronome)
if (tabSonarBtn && tabMetroBtn) {
  tabSonarBtn.addEventListener('click', () => {
    tabSonarBtn.classList.add('active');
    tabMetroBtn.classList.remove('active');
    if (sonarPanel) sonarPanel.classList.remove('hidden');
    if (metroPanel) metroPanel.classList.add('hidden');
    if (isMetronomeRunning) stopMetronome();
  });
  tabMetroBtn.addEventListener('click', () => {
    tabMetroBtn.classList.add('active');
    tabSonarBtn.classList.remove('active');
    if (metroPanel) metroPanel.classList.remove('hidden');
    if (sonarPanel) sonarPanel.classList.add('hidden');
  });
}

// Quick Open Sonar Calibrate Buttons
if (openSonarCalibrateBtn) {
  openSonarCalibrateBtn.addEventListener('click', () => {
    initAudioEngine();
    syncModal.classList.remove('hidden');
    if (tabSonarBtn) tabSonarBtn.click();
  });
}

if (openSonarFromRecordBtn) {
  openSonarFromRecordBtn.addEventListener('click', () => {
    initAudioEngine();
    syncModal.classList.remove('hidden');
    if (tabSonarBtn) tabSonarBtn.click();
  });
}

// Enumerate Audio Devices
async function enumerateAudioDevices() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      syncWizardDeviceSelectors();
      return;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();

    headphoneSelect.innerHTML = '';
    virtualCableSelect.innerHTML = '';
    micSelect.innerHTML = '';

    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
    const audioInputs = devices.filter(d => d.kind === 'audioinput');

    audioOutputs.forEach((d, i) => {
      const opt1 = document.createElement('option');
      opt1.value = d.deviceId;
      opt1.text = d.label || `หูฟัง / Output Device ${i + 1}`;
      headphoneSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = d.deviceId;
      opt2.text = d.label || `Output Device ${i + 1}`;
      virtualCableSelect.appendChild(opt2);
    });

    audioInputs.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.text = d.label || `Microphone ${i + 1}`;
      micSelect.appendChild(opt);
    });

    // Fallbacks if browser restricts or hasn't enumerated labels yet
    if (headphoneSelect.options.length === 0) {
      const defaultHpOpt = document.createElement('option');
      defaultHpOpt.value = 'default';
      defaultHpOpt.text = 'หูฟัง / ลำโพงเริ่มต้น (Default System Output)';
      headphoneSelect.appendChild(defaultHpOpt);
    }
    if (virtualCableSelect.options.length === 0) {
      const defaultCableOpt = document.createElement('option');
      defaultCableOpt.value = 'default';
      defaultCableOpt.text = 'CABLE Input (VB-Audio Virtual Cable)';
      virtualCableSelect.appendChild(defaultCableOpt);
    }
    if (micSelect.options.length === 0) {
      const defaultMicOpt = document.createElement('option');
      defaultMicOpt.value = 'default';
      defaultMicOpt.text = 'ไมโครโฟนเริ่มต้น (Default Live Mic)';
      micSelect.appendChild(defaultMicOpt);
    }

    // 1. Auto-select Headphone (Prioritize Maono Fairy / Headphones)
    let hpFound = false;
    for (let i = 0; i < headphoneSelect.options.length; i++) {
      const text = headphoneSelect.options[i].text.toLowerCase();
      if (text.includes('maono') || text.includes('fairy') || text.includes('headphones') || text.includes('headphone')) {
        headphoneSelect.selectedIndex = i;
        setSinkHeadphone(headphoneSelect.value);
        hpFound = true;
        break;
      }
    }
    if (!hpFound && headphoneSelect.options.length > 0) {
      setSinkHeadphone(headphoneSelect.value);
    }

    // 2. Auto-select Virtual Cable (Strictly prioritize 'cable input' over '16ch' or generic virtual outputs)
    let cableFound = false;
    for (let i = 0; i < virtualCableSelect.options.length; i++) {
      const text = virtualCableSelect.options[i].text.toLowerCase();
      if (text.includes('cable input') || (text.includes('cable') && !text.includes('16ch') && !text.includes('output'))) {
        virtualCableSelect.selectedIndex = i;
        setSinkCable(virtualCableSelect.value);
        cableFound = true;
        break;
      }
    }
    if (!cableFound) {
      for (let i = 0; i < virtualCableSelect.options.length; i++) {
        const text = virtualCableSelect.options[i].text.toLowerCase();
        if (text.includes('cable') || text.includes('virtual') || text.includes('vb-audio')) {
          virtualCableSelect.selectedIndex = i;
          setSinkCable(virtualCableSelect.value);
          break;
        }
      }
    }

    // 3. Auto-select Microphone (Prioritize Maono Fairy)
    for (let i = 0; i < micSelect.options.length; i++) {
      const text = micSelect.options[i].text.toLowerCase();
      if (text.includes('maono') || text.includes('fairy')) {
        micSelect.selectedIndex = i;
        break;
      }
    }

    // 4. Always sync newly populated options into Wizard dropdowns
    syncWizardDeviceSelectors();
  } catch (err) {
    console.warn('Enumerate devices note:', err.message);
    syncWizardDeviceSelectors();
  }
}

async function setSinkHeadphone(deviceId) {
  if (audioCtx && typeof audioCtx.setSinkId === 'function') {
    try {
      await audioCtx.setSinkId(deviceId);
      console.log('✅ Master Headphone connected to:', deviceId);
    } catch (e) {
      console.warn('setSinkId Headphone note:', e.message);
    }
  }
}

async function setSinkCable(deviceId) {
  if (!audioElCable) return;
  if (typeof audioElCable.setSinkId === 'function') {
    try {
      const currentHpSink = headphoneSelect ? headphoneSelect.value : '';
      // Guard: Never play Channel 2 (FiveM broadcast stream) to default or headphone sink!
      if (!deviceId || deviceId === 'default' || (currentHpSink && deviceId === currentHpSink)) {
        console.warn('Virtual cable destination matches default or headphone output. Muting audioElCable to prevent headphone echo.');
        audioElCable.muted = true;
        return;
      }
      await audioElCable.setSinkId(deviceId);
      audioElCable.muted = false; // Only unmute when safely assigned to a distinct virtual cable!
      console.log('✅ Backing track and broadcast stream connected to CABLE Input:', deviceId);
    } catch (e) {
      console.warn('setSinkId CABLE error:', e);
      audioElCable.muted = true;
    }
  } else {
    // If setSinkId is not supported, mute audioElCable to prevent leakage into default output
    audioElCable.muted = true;
  }
}

headphoneSelect.addEventListener('change', (e) => {
  setSinkHeadphone(e.target.value);
  if (virtualCableSelect) {
    setSinkCable(virtualCableSelect.value);
  }
  if (wizardHeadphoneSelect) {
    wizardHeadphoneSelect.value = e.target.value;
  }
});

virtualCableSelect.addEventListener('change', (e) => {
  setSinkCable(e.target.value);
});

micSelect.addEventListener('change', (e) => {
  if (audioCtx) {
    initMicrophoneStream(e.target.value);
  }
  if (wizardMicSelect) {
    wizardMicSelect.value = e.target.value;
  }
});

const openSoundSettingsBtn = document.getElementById('openSoundSettingsBtn');
if (openSoundSettingsBtn) {
  openSoundSettingsBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/open-sound-settings', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        openSoundSettingsBtn.innerHTML = '<span>✅ เปิดหน้าต่างเสียงแล้ว ให้ไปที่แท็บ "การบันทึก (Recording)"</span>';
        setTimeout(() => {
          openSoundSettingsBtn.innerHTML = '⚙️ เปิดหน้าต่างเสียง Windows (เช็กเอาติ๊ก "ฟังอุปกรณ์นี้" ออก)';
        }, 4000);
      }
    } catch (e) {
      console.warn('Could not launch Windows sound settings dialog:', e);
    }
  });
}

// Volume Sliders (Master Outputs)
headphoneVol.addEventListener('input', (e) => {
  headphoneVolText.innerText = Math.round(e.target.value * 100) + '% Master';
  if (headphoneGain && audioCtx) {
    headphoneGain.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
  }
  saveUserProfile();
});

cableVol.addEventListener('input', (e) => {
  cableVolText.innerText = Math.round(e.target.value * 100) + '% Master';
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

// Backing Track Key Shifter (Pitch Shift with Personal Song Key Memory)
function setPitchShift(semitone, shouldSaveSongKey = true) {
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

  // Personal Song Key Memory: Save user's preference for this track!
  if (shouldSaveSongKey && currentTrack && currentTrack.id) {
    currentUser.songKeys = currentUser.songKeys || {};
    currentUser.songKeys[currentTrack.id] = semitone;
    saveUserProfile();
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
  isDucked = !isDucked;
  if (duckingGain && audioCtx) {
    if (isDucked) {
      duckingGain.gain.setTargetAtTime(0.2, audioCtx.currentTime, 0.08);
    } else {
      duckingGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.12);
    }
  }

  if (ytPlayer && isUsingDirectYtAudio && typeof ytPlayer.setVolume === 'function') {
    const baseVol = Math.round((currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9) * 100);
    if (isDucked) {
      ytPlayer.setVolume(Math.round(baseVol * 0.2));
    } else {
      ytPlayer.setVolume(isHpMusicMuted ? 0 : baseVol);
    }
  }

  if (tabMusicGain && audioCtx) {
    const baseCableVol = isCableMusicMuted ? 0.0 : (currentUser.preset.cableMusicVol !== undefined ? currentUser.preset.cableMusicVol : 0.20);
    const target = isDucked ? baseCableVol * 0.2 : baseCableVol;
    tabMusicGain.gain.setTargetAtTime(target, audioCtx.currentTime, isDucked ? 0.08 : 0.12);
  }

  if (isDucked) {
    if (duckingBtn) duckingBtn.classList.add('ducked');
    if (duckingStatusText) duckingStatusText.innerText = 'TALKING (DUCKED)';
  } else {
    if (duckingBtn) duckingBtn.classList.remove('ducked');
    if (duckingStatusText) duckingStatusText.innerText = 'SINGING MODE';
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
    let videos = [];
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.videos && data.videos.length > 0) {
          videos = data.videos;
        }
      }
    } catch (e) {
      console.warn('Backend search note:', e);
    }

    // Fallback: If backend is cold-starting or busy, query YouTube public mirror
    if (!videos || videos.length === 0) {
      try {
        const fallbackRes = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=videos`);
        if (fallbackRes && fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          videos = (fallbackData.items || []).slice(0, 15).map(item => ({
            id: (item.url || '').replace('/watch?v=', ''),
            title: item.title,
            url: `https://youtube.com${item.url}`,
            duration: formatTime(item.duration || 240),
            seconds: item.duration || 240,
            author: item.uploaderName || '',
            thumbnail: item.thumbnail
          }));
        }
      } catch (e) {}
    }

    renderSearchResults(videos);
  } catch (err) {
    console.error('Search error:', err);
    renderSearchResults([]);
  } finally {
    searchBtn.innerText = 'ค้นหา';
  }
}

// Background Keep-Alive Heartbeat (Pings server every 4 mins to prevent Render cold sleep)
setInterval(() => {
  fetch('/api/ping').catch(() => {});
}, 4 * 60 * 1000);

// Security Helper: Sanitize text against XSS injection
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
      <img src="${escapeHtml(v.thumbnail)}" alt="" class="search-item-thumb">
      <div class="search-item-info">
        <div class="search-item-title">${escapeHtml(v.title)}</div>
        <div class="search-item-meta">${escapeHtml(v.author)} • ${escapeHtml(v.duration)}</div>
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

// Fallback & Dynamic API Endpoints
let localAudioBridgeAvailable = null;

async function checkLocalBridge() {
  if (localAudioBridgeAvailable !== null) return localAudioBridgeAvailable;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 600);
    const res = await fetch('http://127.0.0.1:3300/api/ping', { signal: ctrl.signal });
    clearTimeout(tid);
    localAudioBridgeAvailable = (res && res.ok);
  } catch (e) {
    localAudioBridgeAvailable = false;
  }
  return localAudioBridgeAvailable;
}

async function getBestSearchUrl(query) {
  return `/api/search?q=${encodeURIComponent(query)}`;
}

async function getBestAudioStreamUrl(videoId, startSeconds = 0) {
  const isLocalActive = await checkLocalBridge();
  if (isLocalActive && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://127.0.0.1:3300/api/audio?id=${videoId}&t=${startSeconds}`;
  }
  return `/api/audio?id=${videoId}&t=${startSeconds}`;
}

// Play Track (Ultra-Reliable Dual Routing to Discord & Headphones with Zero-Fail Guarantee)
async function playTrack(track, seekSeconds = 0) {
  await initAudioEngine();

  if (currentTrack && currentTrack.id !== track.id) {
    historyQueue.push(currentTrack);
    if (historyQueue.length > 25) historyQueue.shift();
  }

  currentTrack = track;
  trackDurationSeconds = track.seconds || parseTimeToSeconds(track.duration) || 240;
  streamOffsetSeconds = seekSeconds;

  currentTrackTitle.innerText = track.title;
  currentTrackArtist.innerText = track.author || '-';
  totalDurationText.innerText = formatTime(trackDurationSeconds);
  currentTimeText.innerText = formatTime(seekSeconds);
  progressBar.value = (seekSeconds / trackDurationSeconds) * 100;

  // Auto-Recall Personal Saved Key for this track:
  if (currentUser && currentUser.songKeys && currentUser.songKeys[track.id] !== undefined) {
    const savedKey = currentUser.songKeys[track.id];
    setPitchShift(savedKey, false);
    console.log(`🎵 [Personal Key Memory] Auto-applied saved key: ${savedKey > 0 ? '+' : ''}${savedKey} st for "${track.title}"`);
  } else {
    setPitchShift(0, false);
  }

  videoPlaceholder.classList.add('hidden');
  ytPlayerDiv.classList.remove('hidden');

  // When Tab Audio is active or running on Cloud, YouTube Iframe provides direct unmuted audio without waiting for DSP stream
  if (isTabAudioActive || isCloudHost) {
    isUsingDirectYtAudio = true;
  } else {
    isUsingDirectYtAudio = false;
  }
  updateTabAudioUI();

  // Load YouTube Visuals and Audio
  initYtPlayer(track.id, seekSeconds);

  if (isUsingDirectYtAudio) {
    // In Direct YouTube mode (Cloud): YouTube player provides high-definition audio directly
    isPlaying = true;
    playPauseBtn.innerHTML = SVG_PAUSE;
  } else {
    // Stream through Web Audio DSP into VB-CABLE, Headphones, and Record Test Destination
    const streamUrl = await getBestAudioStreamUrl(track.id, seekSeconds);
    audioSourceElement.src = streamUrl;
    try {
      await audioSourceElement.play();
      isPlaying = true;
      playPauseBtn.innerHTML = SVG_PAUSE;
    } catch (err) {
      console.warn('AudioSource play note, activating failover:', err);
      activateYtAudioFailover();
    }
  }

  syncHostStateToRoom();
}

function activateYtAudioFailover() {
  console.log('⚡ Switching to YouTube Direct Audio playback mode (Cloud Failover)');
  isUsingDirectYtAudio = true;
  updateTabAudioUI();
  if (audioSourceElement) {
    audioSourceElement.pause();
    audioSourceElement.removeAttribute('src');
    audioSourceElement.load();
  }
  if (ytPlayer && typeof ytPlayer.unMute === 'function') {
    try {
      ytPlayer.unMute();
      const hpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
      const volInt = isHpMusicMuted ? 0 : Math.round(hpVol * 100);
      if (ytPlayer.setVolume) ytPlayer.setVolume(volInt);
      if (ytPlayer.playVideo) ytPlayer.playVideo();
    } catch (e) {
      console.warn('YT unmute error, re-rendering iframe:', e);
      if (currentTrack) {
        initYtPlayer(currentTrack.id, Math.floor(streamOffsetSeconds || 0));
      }
    }
  } else if (currentTrack) {
    initYtPlayer(currentTrack.id, Math.floor(streamOffsetSeconds || 0));
  }
  isPlaying = true;
  playPauseBtn.innerHTML = SVG_PAUSE;
  startYtProgressTracker();
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
    const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
    const curHpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
    const curVolInt = isHpMusicMuted ? 0 : Math.round(curHpVol * 100);
    if (currentDirectOrTab) {
      if (ytPlayer.unMute) ytPlayer.unMute();
      if (ytPlayer.setVolume) ytPlayer.setVolume(curVolInt);
    } else {
      if (ytPlayer.mute) ytPlayer.mute();
    }
    if (ytPlayer.playVideo) ytPlayer.playVideo();
  }
  if (!isUsingDirectYtAudio && audioSourceElement) {
    audioSourceElement.src = `/api/audio?id=${currentTrack.id}&t=${clamped}`;
    audioSourceElement.play().catch(() => {});
  }
  isPlaying = true;
  playPauseBtn.innerHTML = SVG_PAUSE;
  startYtProgressTracker();
  syncHostStateToRoom();
}

// Playback Controls
function togglePlayPause() {
  if (isPlaying) {
    if (audioSourceElement) audioSourceElement.pause();
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    isPlaying = false;
    playPauseBtn.innerHTML = SVG_PLAY;
  } else {
    if (!isUsingDirectYtAudio && audioSourceElement) {
      audioSourceElement.play().catch(() => {});
    }
    if (ytPlayer && ytPlayer.playVideo) {
      const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
      const curHpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
      const curVolInt = isHpMusicMuted ? 0 : Math.round(curHpVol * 100);
      if (currentDirectOrTab) {
        if (ytPlayer.unMute) ytPlayer.unMute();
        if (ytPlayer.setVolume) ytPlayer.setVolume(curVolInt);
      } else {
        if (ytPlayer.mute) ytPlayer.mute();
      }
      ytPlayer.playVideo();
    }
    isPlaying = true;
    playPauseBtn.innerHTML = SVG_PAUSE;
  }
  syncHostStateToRoom();
}

playPauseBtn.addEventListener('click', togglePlayPause);

function setupAudioElementEvents() {
  audioSourceElement.addEventListener('error', (e) => {
    console.warn('AudioSource stream error event, activating YouTube direct player:', e);
    activateYtAudioFailover();
  });

  audioSourceElement.addEventListener('ended', () => {
    if (!isUsingDirectYtAudio) {
      console.log('⚡ AudioSource finished playback, advancing queue...');
      playNextInQueue();
    }
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

// History Queue (for Previous Button)
let historyQueue = [];

function playPreviousTrack() {
  if (historyQueue.length > 0) {
    const prev = historyQueue.pop();
    if (currentTrack) queue.unshift(currentTrack);
    renderQueue(true);
    playTrack(prev);
  } else if (currentTrack) {
    seekToSeconds(0);
  }
}

if (prevBtn) prevBtn.addEventListener('click', playPreviousTrack);

// Queue Management
function addToQueue(track, shouldSync = true) {
  queue.push(track);
  renderQueue(shouldSync);
  if (!isPlaying && !currentTrack) {
    playNextInQueue();
  }
}

function renderQueue(shouldSync = true) {
  const count = queue.length;
  if (queueBadgeCount) queueBadgeCount.innerText = count;

  if (count === 0) {
    queueList.innerHTML = '<div class="empty-queue">ไม่มีเพลงในคิว</div>';
    if (shouldSync) syncHostStateToRoom();
    return;
  }

  queueList.innerHTML = '';
  queue.forEach((track, idx) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 10px; border-bottom:1px solid rgba(216,177,93,0.1);';
    item.innerHTML = `
      <span class="mono-num" style="width:20px; color:var(--gold-primary); font-weight:700;">${idx + 1}.</span>
      ${track.thumbnail ? `<img src="${escapeHtml(track.thumbnail)}" alt="" style="width:36px; height:36px; border-radius:4px; object-fit:cover;">` : ''}
      <div style="flex:1; min-width:0;">
        <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600; font-size:13px;">${escapeHtml(track.title)}</div>
        <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(track.author || '')} • ${escapeHtml(track.duration || '')} ${track.addedBy ? `• 👤 ${escapeHtml(track.addedBy)}` : ''}</div>
      </div>
      <div style="display:flex; gap:4px;">
        <button class="btn btn-outline btn-xs" onclick="playNowFromQueue(${idx})" title="เล่นเพลงนี้ทันที">▶</button>
        ${idx > 0 ? `<button class="btn btn-outline btn-xs" onclick="moveQueueItem(${idx}, ${idx - 1})" title="เลื่อนขึ้น">▲</button>` : ''}
        ${idx < queue.length - 1 ? `<button class="btn btn-outline btn-xs" onclick="moveQueueItem(${idx}, ${idx + 1})" title="เลื่อนลง">▼</button>` : ''}
        <button class="btn-link-danger" onclick="removeFromQueue(${idx})" title="ลบออก" style="margin-left:4px;">✕</button>
      </div>
    `;
    queueList.appendChild(item);
  });

  if (shouldSync) syncHostStateToRoom();
}

window.removeFromQueue = function(idx) {
  queue.splice(idx, 1);
  renderQueue(true);
};

window.playNowFromQueue = function(idx) {
  if (idx >= 0 && idx < queue.length) {
    const track = queue.splice(idx, 1)[0];
    renderQueue(true);
    playTrack(track);
  }
};

window.moveQueueItem = function(fromIdx, toIdx) {
  if (fromIdx >= 0 && fromIdx < queue.length && toIdx >= 0 && toIdx < queue.length) {
    const item = queue.splice(fromIdx, 1)[0];
    queue.splice(toIdx, 0, item);
    renderQueue(true);
  }
};

clearQueueBtn.addEventListener('click', () => {
  if (queue.length > 0 && confirm('ล้างคิวเพลงทั้งหมดใช่หรือไม่?')) {
    queue = [];
    renderQueue(true);
  }
});

let isTransitioningTrack = false;
function playNextInQueue() {
  if (isTransitioningTrack) return;
  isTransitioningTrack = true;
  setTimeout(() => { isTransitioningTrack = false; }, 400);

  if (queue.length > 0) {
    const nextTrack = queue.shift();
    renderQueue(true);
    playTrack(nextTrack);
  } else {
    isPlaying = false;
    playPauseBtn.innerHTML = SVG_PLAY;
    currentTrack = null;
    currentTrackTitle.innerText = 'เลือกเพลงเพื่อเริ่มร้อง';
    currentTrackArtist.innerText = '-';
    currentTimeText.innerText = '0:00';
    progressBar.value = 0;
    if (audioSourceElement) {
      audioSourceElement.pause();
      audioSourceElement.removeAttribute('src');
      audioSourceElement.load();
    }
    syncHostStateToRoom();
  }
}

nextBtn.addEventListener('click', playNextInQueue);
audioInitBtn.addEventListener('click', initAudioEngine);

// ==========================================================================
// 📱 SHARED ROOM & MOBILE REMOTE CONTROLLER ENGINE (HOST)
// ==========================================================================
let hostRoomCode = localStorage.getItem('nocturne_host_room_code') || '';
let hostEventSource = null;
let roomClientsCount = 0;
let isAllowRemoteControl = true;
let localLanUrls = [];
let cloudRenderUrl = 'https://nocturne-karaoke-backend.onrender.com';

function showHostToast(msg, duration = 3500) {
  let toastEl = document.getElementById('hostToastContainer');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'hostToastContainer';
    toastEl.style.cssText = 'position:fixed; top:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px; pointer-events:none;';
    document.body.appendChild(toastEl);
  }
  const pill = document.createElement('div');
  pill.style.cssText = 'background:rgba(20, 23, 34, 0.95); border:1px solid #d8b15d; color:#f4e6c3; padding:10px 18px; border-radius:9999px; font-size:13px; font-weight:600; box-shadow:0 8px 24px rgba(0,0,0,0.6); backdrop-filter:blur(8px); transform:translateX(50px); opacity:0; transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);';
  pill.innerHTML = msg;
  toastEl.appendChild(pill);
  requestAnimationFrame(() => {
    pill.style.transform = 'translateX(0)';
    pill.style.opacity = '1';
  });
  setTimeout(() => {
    pill.style.transform = 'translateX(50px)';
    pill.style.opacity = '0';
    setTimeout(() => pill.remove(), 300);
  }, duration);
}

async function initHostRoom(forcedCode = null) {
  try {
    const code = (forcedCode === 'NEW' || forcedCode === true) ? '' : (forcedCode || hostRoomCode || '');
    const res = await fetch('/api/room/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: code,
        hostName: currentUser.username || 'Host'
      })
    });
    if (res.ok) {
      const data = await res.json();
      hostRoomCode = data.roomCode;
      localStorage.setItem('nocturne_host_room_code', hostRoomCode);
      if (data.localIps && data.localIps.length > 0) {
        localLanUrls = data.localIps.map(ip => `http://${ip}:${data.port || 3300}/remote?room=${hostRoomCode}`);
      }
      if (data.renderUrl) {
        cloudRenderUrl = `${data.renderUrl}/remote?room=${hostRoomCode}`;
      }

      updateHostRoomUI();
      connectHostRoomSSE(hostRoomCode);
      syncHostStateToRoom();
    }
  } catch (err) {
    console.warn('Room initialization note:', err.message);
  }
}

function connectHostRoomSSE(code) {
  if (hostEventSource) hostEventSource.close();
  try {
    hostEventSource = new EventSource(`/api/room/${code}/events`);

    hostEventSource.addEventListener('client_count', (e) => {
      try {
        const data = JSON.parse(e.data);
        roomClientsCount = data.clientCount || 0;
        updateHostRoomUI();
      } catch (err) {}
    });

    hostEventSource.addEventListener('queue_updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data.queue)) {
          queue = data.queue;
          renderQueue(false);
        }
        if (data.addedTrack) {
          showHostToast(`📱 ${escapeHtml(data.addedBy || 'รีโมทมือถือ')} เพิ่มเพลง "${escapeHtml(data.addedTrack.title)}" เข้าคิว`);
          if (!isPlaying && !currentTrack) {
            playNextInQueue();
          }
        }
      } catch (err) {}
    });

    hostEventSource.addEventListener('host_command', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!isAllowRemoteControl && data.action !== 'queue') return;
        handleRemoteCommand(data);
      } catch (err) {}
    });

    hostEventSource.onerror = () => {};
  } catch (e) {}
}

function handleRemoteCommand({ action, payload, sender }) {
  showHostToast(`📱 คำสั่งจาก ${escapeHtml(sender || 'รีโมท')}: ${escapeHtml(action)}`);
  switch (action) {
    case 'toggle':
      togglePlayPause();
      break;
    case 'play':
      if (!isPlaying) togglePlayPause();
      break;
    case 'pause':
      if (isPlaying) togglePlayPause();
      break;
    case 'next':
      playNextInQueue();
      break;
    case 'prev':
      playPreviousTrack();
      break;
    case 'ducking':
      toggleDucking();
      break;
    case 'play_now':
      if (payload) {
        playTrack(payload);
      }
      break;
  }
}

function syncHostStateToRoom() {
  if (!hostRoomCode) return;
  fetch(`/api/room/${hostRoomCode}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentTrack,
      isPlaying,
      queue,
      allowRemoteControl: isAllowRemoteControl,
      hostName: currentUser.username || 'Host'
    })
  }).catch(() => {});
}

function updateHostRoomUI() {
  const code = hostRoomCode || 'ROOM';
  if (roomStatusBtnText) roomStatusBtnText.innerText = `📱 ${code}`;
  if (roomClientsBadge) {
    if (roomClientsCount > 0) {
      roomClientsBadge.innerText = `${roomClientsCount} ออนไลน์`;
      roomClientsBadge.classList.remove('hidden');
    } else {
      roomClientsBadge.classList.add('hidden');
    }
  }

  if (modalRoomCodeBig) modalRoomCodeBig.innerText = code;

  const remoteUrl = isCloudHost
    ? `${window.location.origin}/remote?room=${code}`
    : (localLanUrls[0] || `${window.location.origin}/remote?room=${code}`);

  if (roomQrImage) {
    roomQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(remoteUrl)}&color=08090d&bgcolor=ffffff&qzone=1`;
  }

  if (lanUrlDisplay) lanUrlDisplay.innerHTML = `<b>Local LAN:</b> <a href="${remoteUrl}" target="_blank" style="color:var(--gold-bright);">${remoteUrl}</a>`;
  if (cloudUrlDisplay) cloudUrlDisplay.innerHTML = `<b>Cloud URL:</b> <a href="${cloudRenderUrl}" target="_blank" style="color:var(--text-secondary);">${cloudRenderUrl}</a>`;
}

// Room Modal Event Listeners
if (openRoomModalBtn) {
  openRoomModalBtn.addEventListener('click', () => {
    updateHostRoomUI();
    if (roomModal) roomModal.classList.remove('hidden');
  });
}

if (openRoomModalFromQueueBtn) {
  openRoomModalFromQueueBtn.addEventListener('click', () => {
    updateHostRoomUI();
    if (roomModal) roomModal.classList.remove('hidden');
  });
}

if (closeRoomModalBtn) {
  closeRoomModalBtn.addEventListener('click', () => {
    if (roomModal) roomModal.classList.add('hidden');
  });
}

if (finishRoomModalBtn) {
  finishRoomModalBtn.addEventListener('click', () => {
    if (roomModal) roomModal.classList.add('hidden');
  });
}

if (copyRoomLinkBtn) {
  copyRoomLinkBtn.addEventListener('click', () => {
    const code = hostRoomCode || '';
    const remoteUrl = isCloudHost
      ? `${window.location.origin}/remote?room=${code}`
      : (localLanUrls[0] || `${window.location.origin}/remote?room=${code}`);
    navigator.clipboard.writeText(remoteUrl).then(() => {
      showHostToast('📋 คัดลอกลิงก์รีโมทมือถือเรียบร้อยแล้ว');
    }).catch(() => {
      prompt('คัดลอกลิงก์นี้:', remoteUrl);
    });
  });
}

if (refreshRoomCodeBtn) {
  refreshRoomCodeBtn.addEventListener('click', () => {
    if (confirm('สร้างรหัสห้องใหม่หรือไม่? (มือถือที่เชื่อมต่ออยู่จะต้องเข้ารหัสใหม่)')) {
      initHostRoom('NEW');
    }
  });
}

if (allowRemoteControlToggle) {
  allowRemoteControlToggle.addEventListener('change', (e) => {
    isAllowRemoteControl = e.target.checked;
    syncHostStateToRoom();
    showHostToast(isAllowRemoteControl ? 'เปิดให้มือถือกดรีโมทได้แล้ว' : 'ปิดการกดรีโมทจากมือถือ (เข้าคิวได้อย่างเดียว)');
  });
}

// Auto-boot Host Room on startup
setTimeout(() => {
  initHostRoom();
}, 800);

// ==========================================================================
// Modular FX Plugin UI & Manager Logic
// ==========================================================================
const pluginRackContainer = document.getElementById('pluginRackContainer');
const pluginModal = document.getElementById('pluginModal');
const headerPluginBtn = document.getElementById('headerPluginBtn');
const openPluginStoreBtn = document.getElementById('openPluginStoreBtn');
const closePluginModalBtn = document.getElementById('closePluginModalBtn');
const finishPluginModalBtn = document.getElementById('finishPluginModalBtn');
const tabOfficialStore = document.getElementById('tabOfficialStore');
const tabCustomInstall = document.getElementById('tabCustomInstall');
const officialStoreView = document.getElementById('officialStoreView');
const customInstallView = document.getElementById('customInstallView');
const pluginDropzone = document.getElementById('pluginDropzone');
const pluginFileInput = document.getElementById('pluginFileInput');
const browsePluginFileBtn = document.getElementById('browsePluginFileBtn');
const pluginCodeInput = document.getElementById('pluginCodeInput');
const loadPluginCodeBtn = document.getElementById('loadPluginCodeBtn');

// Render the Plugin Rack Slots on the main UI
function renderPluginRackUI() {
  if (!pluginRackContainer || !window.nocturnePlugins) return;

  const plugins = window.nocturnePlugins.activePlugins;
  if (plugins.length === 0) {
    pluginRackContainer.innerHTML = '<div class="empty-queue">ไม่มีปลั๊กอินใน Rack (กด + Plugin Store เพื่อเพิ่ม)</div>';
    return;
  }

  pluginRackContainer.innerHTML = '';
  plugins.forEach(plugin => {
    const card = document.createElement('div');
    card.className = `plugin-slot-card ${plugin.enabled ? 'active' : ''}`;
    card.id = `slot-${plugin.id}`;

    let paramsHtml = '';
    plugin.params.forEach(p => {
      const curVal = plugin.getParam(p.id);
      let displayVal = curVal;
      if (p.unit === '%') displayVal = Math.round(curVal * 100) + '%';
      else if (p.unit === 's') displayVal = curVal.toFixed(2) + 's';
      else if (p.unit === 'Hz') displayVal = curVal + 'Hz';
      else if (p.unit === 'x') displayVal = curVal + 'x';
      else if (p.unit === 'dB') displayVal = curVal + 'dB';

      paramsHtml += `
        <div class="plugin-param-control">
          <div class="plugin-param-header">
            <label for="param-${escapeHtml(plugin.id)}-${escapeHtml(p.id)}">${escapeHtml(p.label)}</label>
            <span class="plugin-param-val" id="val-${escapeHtml(plugin.id)}-${escapeHtml(p.id)}">${escapeHtml(displayVal)}</span>
          </div>
          <input type="range" id="param-${escapeHtml(plugin.id)}-${escapeHtml(p.id)}"
            min="${p.min}" max="${p.max}" step="${p.step}" value="${curVal}"
            data-plugin="${escapeHtml(plugin.id)}" data-param="${escapeHtml(p.id)}" data-unit="${escapeHtml(p.unit || '')}">
        </div>
      `;
    });

    card.innerHTML = `
      <div class="plugin-slot-header" data-toggle="${escapeHtml(plugin.id)}">
        <div class="plugin-info-left">
          <span class="plugin-icon">${escapeHtml(plugin.icon || '🔌')}</span>
          <span class="plugin-name">${escapeHtml(plugin.name)}</span>
        </div>
        <div class="plugin-header-actions">
          <button class="btn-plugin-bypass ${plugin.enabled ? 'active' : ''}" data-bypass="${escapeHtml(plugin.id)}">
            ${plugin.enabled ? 'ACTIVE' : 'BYPASS'}
          </button>
        </div>
      </div>
      <div class="plugin-params-grid ${plugin.enabled ? '' : 'hidden'}" id="params-${escapeHtml(plugin.id)}">
        ${paramsHtml}
      </div>
    `;

    // Bypass button listener
    const bypassBtn = card.querySelector(`[data-bypass="${plugin.id}"]`);
    if (bypassBtn) {
      bypassBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newState = !plugin.enabled;
        window.nocturnePlugins.togglePlugin(plugin.id, newState);
        renderPluginRackUI();
        renderPluginStoreUI();
        saveUserProfile();
      });
    }

    // Header toggle accordion listener
    const header = card.querySelector(`[data-toggle="${plugin.id}"]`);
    if (header) {
      header.addEventListener('click', () => {
        const grid = card.querySelector(`#params-${plugin.id}`);
        if (grid) grid.classList.toggle('hidden');
      });
    }

    // Parameter sliders listeners
    card.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const pId = e.target.getAttribute('data-param');
        const plId = e.target.getAttribute('data-plugin');
        const unit = e.target.getAttribute('data-unit');
        const val = parseFloat(e.target.value);

        window.nocturnePlugins.setPluginParam(plId, pId, val);

        const valTag = card.querySelector(`#val-${plId}-${pId}`);
        if (valTag) {
          if (unit === '%') valTag.innerText = Math.round(val * 100) + '%';
          else if (unit === 's') valTag.innerText = val.toFixed(2) + 's';
          else if (unit === 'Hz') valTag.innerText = val + 'Hz';
          else if (unit === 'x') valTag.innerText = val + 'x';
          else if (unit === 'dB') valTag.innerText = val + 'dB';
          else valTag.innerText = val;
        }
        saveUserProfile();
      });
    });

    pluginRackContainer.appendChild(card);
  });
}

// Render Plugin Store Grid inside Modal
function renderPluginStoreUI() {
  if (!officialStoreView || !window.nocturnePlugins) return;

  officialStoreView.innerHTML = '';
  window.nocturnePlugins.activePlugins.forEach(plugin => {
    const card = document.createElement('div');
    card.className = 'plugin-store-card';
    card.innerHTML = `
      <div class="plugin-store-top">
        <div class="plugin-store-icon">${escapeHtml(plugin.icon || '🔌')}</div>
        <div class="plugin-store-title">
          <h4>${escapeHtml(plugin.name)}</h4>
          <div class="plugin-store-meta">v${escapeHtml(plugin.version)} • by ${escapeHtml(plugin.author)}</div>
          <p class="plugin-store-desc">${escapeHtml(plugin.description || '')}</p>
        </div>
      </div>
      <div class="plugin-store-action" style="margin-top: 8px;">
        <button class="btn ${plugin.enabled ? 'btn-garnet' : 'btn-primary'} btn-full" data-store-toggle="${escapeHtml(plugin.id)}">
          ${plugin.enabled ? '✕ ปิดใช้งาน (Disable)' : '✓ เปิดใช้งานใน Rack (Enable)'}
        </button>
      </div>
    `;

    const toggleBtn = card.querySelector(`[data-store-toggle="${plugin.id}"]`);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        window.nocturnePlugins.togglePlugin(plugin.id, !plugin.enabled);
        renderPluginRackUI();
        renderPluginStoreUI();
        saveUserProfile();
      });
    }

    officialStoreView.appendChild(card);
  });
}

// Plugin Modal Listeners
if (headerPluginBtn) {
  headerPluginBtn.addEventListener('click', () => {
    renderPluginStoreUI();
    pluginModal.classList.remove('hidden');
  });
}

if (openPluginStoreBtn) {
  openPluginStoreBtn.addEventListener('click', () => {
    renderPluginStoreUI();
    pluginModal.classList.remove('hidden');
  });
}

if (closePluginModalBtn) {
  closePluginModalBtn.addEventListener('click', () => {
    pluginModal.classList.add('hidden');
  });
}

if (finishPluginModalBtn) {
  finishPluginModalBtn.addEventListener('click', () => {
    pluginModal.classList.add('hidden');
  });
}

// Tabs switching in Plugin Modal
if (tabOfficialStore && tabCustomInstall) {
  tabOfficialStore.addEventListener('click', () => {
    tabOfficialStore.classList.add('active');
    tabCustomInstall.classList.remove('active');
    officialStoreView.classList.remove('hidden');
    customInstallView.classList.add('hidden');
  });

  tabCustomInstall.addEventListener('click', () => {
    tabCustomInstall.classList.add('active');
    tabOfficialStore.classList.remove('active');
    customInstallView.classList.remove('hidden');
    officialStoreView.classList.add('hidden');
  });
}

// Custom Plugin File Drag & Drop
if (pluginDropzone) {
  ['dragenter', 'dragover'].forEach(eventName => {
    pluginDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      pluginDropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    pluginDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      pluginDropzone.classList.remove('dragover');
    });
  });

  pluginDropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handlePluginFile(files[0]);
    }
  });

  if (browsePluginFileBtn && pluginFileInput) {
    browsePluginFileBtn.addEventListener('click', () => pluginFileInput.click());
    pluginFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handlePluginFile(e.target.files[0]);
      }
    });
  }
}

async function handlePluginFile(file) {
  if (!file.name.endsWith('.js')) {
    alert('กรุณาเลือกไฟล์ JavaScript (.js) สำหรับปลั๊กอิน');
    return;
  }
  const code = await file.text();
  installPluginCode(code);
}

// Custom Plugin Code Input Installation
if (loadPluginCodeBtn && pluginCodeInput) {
  loadPluginCodeBtn.addEventListener('click', () => {
    const code = pluginCodeInput.value.trim();
    if (!code) {
      alert('กรุณากรอกโค้ด JavaScript ของปลั๊กอิน');
      return;
    }
    installPluginCode(code);
  });
}

async function installPluginCode(code) {
  if (!window.nocturnePlugins) return;
  const res = await window.nocturnePlugins.loadPluginFromCode(code);
  if (res.success) {
    alert(`🎉 ติดตั้งปลั๊กอิน "${res.name}" สำเร็จและเสียบเข้าสู่ Modular Rack เรียบร้อยแล้ว!`);
    renderPluginRackUI();
    renderPluginStoreUI();
    if (tabOfficialStore) tabOfficialStore.click();
    saveUserProfile();
  } else {
    alert(`❌ เกิดข้อผิดพลาดในการโหลดปลั๊กอิน: ${res.error}`);
  }
}

// Initial Plugin Rack Render
if (window.nocturnePlugins) {
  renderPluginRackUI();
}

// Initialize User Profile on Page Load
loadUserProfile();

// Enumerate audio devices on initial boot & listen for hardware plug/unplug
if (navigator.mediaDevices) {
  if (typeof enumerateAudioDevices === 'function') {
    enumerateAudioDevices().catch(() => {});
  }
  if (typeof navigator.mediaDevices.addEventListener === 'function') {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      if (typeof enumerateAudioDevices === 'function') {
        enumerateAudioDevices().catch(() => {});
      }
    });
  }
}

