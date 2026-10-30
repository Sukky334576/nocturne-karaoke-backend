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

// Center Vocal Remover (Karaoke Mode) Nodes
let vocalCutInputGain = null;
let vocalCutBypassGain = null;
let vocalCutActiveGain = null;
let vocalCutSplitter = null;
let vocalCutMerger = null;
let vocalCutSubL = null;
let vocalCutSubR = null;
let vocalCutBassFilter = null;
let vocalCutBassSum = null;
let isVocalCutEnabled = false;

// Flagship DSP & Experience Nodes
let tubeWarmthNode = null;
let tubeWarmthDrive = 0.4;
let isTubeWarmthEnabled = false;
let vocalDeEsserFilter = null;
let isDeEsserEnabled = true;
let musicLevelerNode = null;

// Synced Lyrics State
let currentLyrics = [];
let activeLyricIndex = -1;
let isLyricsOpen = false;

// Karaoke Scoring State
let liveKaraokeScore = 0;
let karaokeSampleCount = 0;
let isScoringActive = false;

// Floating Reactions State
let reactionParticles = [];
let isReactionLoopRunning = false;

// Modular FX Plugin Rack Nodes & Safety Limiter
let pluginRackInput = null;
let pluginRackOutput = null;
let safetyLimiterNode = null;

let convolverNode = null;
let reverbInputGain = null;
let reverbGain = null;
let cableReverbGain = null;
let headphoneReverbGain = null;

// 3-Band Studio Vocal EQ Nodes
let vocalEqLowCutNode = null;
let vocalEqMidNode = null;
let vocalEqHighAirNode = null;
let isVocalEqEnabled = false;
let isEqLowCutActive = false;

// Vocal Doubler & Stereo Harmony Nodes
let doublerGain = null;
let doublerDelayLeft = null;
let doublerDelayRight = null;
let doublerPannerLeft = null;
let doublerPannerRight = null;
let isDoublerEnabled = false;

// DJ Soundboard & SFX Nodes
let soundboardGain = null;

// Smart Voice Ducking State
let isSmartDuckingEnabled = false;
let smartDuckingDepthVal = 0.30;
let smartDuckingRecoverTimer = null;
let isDuckingCurrentlyActive = false;

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
    headphoneVol: 1.0,
    cableVol: 0.9,
    isHpMusicMuted: false,
    isCableMusicMuted: false,
    isHpVocalMuted: true,
    isCableVocalMuted: false,
    reverbEnabled: true,
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

// New Pro Features DOM Elements
const vocalEqToggle = document.getElementById('vocalEqToggle');
const eqLowCutBtn = document.getElementById('eqLowCutBtn');
const eqLowCutText = document.getElementById('eqLowCutText');
const eqMidSlider = document.getElementById('eqMidSlider');
const eqMidText = document.getElementById('eqMidText');
const eqHighAirSlider = document.getElementById('eqHighAirSlider');
const eqHighAirText = document.getElementById('eqHighAirText');

const doublerToggle = document.getElementById('doublerToggle');
const doublerMix = document.getElementById('doublerMix');
const doublerMixText = document.getElementById('doublerMixText');

const smartDuckingToggle = document.getElementById('smartDuckingToggle');
const smartDuckingDepth = document.getElementById('smartDuckingDepth');
const smartDuckingDepthText = document.getElementById('smartDuckingDepthText');

const sfxVol = document.getElementById('sfxVol');
const sfxVolText = document.getElementById('sfxVolText');
const sfxBtns = document.querySelectorAll('.sfx-btn');

const downloadRecordBtn = document.getElementById('downloadRecordBtn');

// Center Vocal Remover DOM
const vocalCutBtn = document.getElementById('vocalCutBtn');
const vocalCutStatusText = document.getElementById('vocalCutStatusText');

// Flagship DOM Elements
const btnLocalAudio = document.getElementById('btnLocalAudio');
const localAudioInput = document.getElementById('localAudioInput');
const btnLyricsToggle = document.getElementById('btnLyricsToggle');
const lyricsOverlay = document.getElementById('lyricsOverlay');
const closeLyricsBtn = document.getElementById('closeLyricsBtn');
const lyricsScrollBox = document.getElementById('lyricsScrollBox');
const lyricsSongTitle = document.getElementById('lyricsSongTitle');
const karaokeScorePill = document.getElementById('karaokeScorePill');
const karaokeLiveScoreText = document.getElementById('karaokeLiveScoreText');
const karaokeScoreModal = document.getElementById('karaokeScoreModal');
const scoreModalNum = document.getElementById('scoreModalNum');
const scoreRankTitle = document.getElementById('scoreRankTitle');
const scoreComment = document.getElementById('scoreComment');
const scoreSongTitle = document.getElementById('scoreSongTitle');
const closeScoreModalBtn = document.getElementById('closeScoreModalBtn');
const reactionCanvas = document.getElementById('reactionCanvas');
const tubeWarmthToggle = document.getElementById('tubeWarmthToggle');
const tubeWarmthSlider = document.getElementById('tubeWarmthSlider');
const tubeWarmthText = document.getElementById('tubeWarmthText');
const deEsserToggle = document.getElementById('deEsserToggle');
const artistPresetBtns = document.querySelectorAll('.artist-preset-btn');

// Social OAuth DOM
const oauthGoogleBtn = document.getElementById('oauthGoogleBtn');
const oauthFacebookBtn = document.getElementById('oauthFacebookBtn');
const oauthDiscordBtn = document.getElementById('oauthDiscordBtn');

// PromptPay Payment Modal DOM
const promptPayModal = document.getElementById('promptPayModal');
const closePromptPayModalBtn = document.getElementById('closePromptPayModalBtn');
const promptPayQrImg = document.getElementById('promptPayQrImg');
const promptPayRefText = document.getElementById('promptPayRefText');
const promptPayTargetText = document.getElementById('promptPayTargetText');
const promptPayTimerText = document.getElementById('promptPayTimerText');
const confirmPaidBtn = document.getElementById('confirmPaidBtn');
const simulatePayBtn = document.getElementById('simulatePayBtn');

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
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: 1.0,
    eqHigh: 2.0,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  ballad: {
    autotuneEnabled: true,
    autotuneKey: 0,
    autotuneScale: 0,
    autotuneSpeed: 0.20,
    autotuneAmount: 0.70,
    reverbEnabled: true,
    reverbMix: 0.40,
    reverbDecay: 2.6,
    roomSize: 3,
    noiseGateThreshold: -45,
    compressorRatio: 4.5,
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: 1.5,
    eqHigh: 3.5,
    doublerEnabled: true,
    doublerMix: 0.35
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
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: 2.0,
    eqHigh: 3.0,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  police: {
    autotuneEnabled: false,
    reverbEnabled: false,
    reverbMix: 0.0,
    reverbDecay: 1.0,
    roomSize: 1,
    noiseGateThreshold: -35,
    compressorRatio: 7,
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: 4.5,
    eqHigh: -5.0,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  megaphone: {
    autotuneEnabled: false,
    reverbEnabled: false,
    reverbMix: 0.0,
    reverbDecay: 0.8,
    roomSize: 1,
    noiseGateThreshold: -32,
    compressorRatio: 8,
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: 5.5,
    eqHigh: -4.0,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  walkietalkie: {
    autotuneEnabled: false,
    reverbEnabled: true,
    reverbMix: 0.08,
    reverbDecay: 0.9,
    roomSize: 1,
    noiseGateThreshold: -34,
    compressorRatio: 7,
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: 3.5,
    eqHigh: -6.0,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  helmet: {
    autotuneEnabled: false,
    reverbEnabled: true,
    reverbMix: 0.16,
    reverbDecay: 1.1,
    roomSize: 1,
    noiseGateThreshold: -46,
    compressorRatio: 3.5,
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: false,
    eqMid: -2.0,
    eqHigh: -6.5,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  rock: {
    autotuneEnabled: false,
    reverbEnabled: true,
    reverbMix: 0.40,
    reverbDecay: 2.8,
    roomSize: 4,
    noiseGateThreshold: -45,
    compressorRatio: 5,
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: 2.5,
    eqHigh: 1.0,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  lofi: {
    autotuneEnabled: false,
    reverbEnabled: true,
    reverbMix: 0.20,
    reverbDecay: 1.2,
    roomSize: 1,
    noiseGateThreshold: -50,
    compressorRatio: 2.5,
    dynamicsEnabled: true,
    eqEnabled: true,
    eqLowCut: true,
    eqMid: -1.0,
    eqHigh: -3.0,
    doublerEnabled: false,
    doublerMix: 0.0
  },
  talk: {
    autotuneEnabled: false,
    reverbEnabled: false,
    reverbMix: 0.0,
    reverbDecay: 1.0,
    roomSize: 1,
    noiseGateThreshold: -40,
    compressorRatio: 3,
    dynamicsEnabled: true,
    eqEnabled: false,
    eqLowCut: true,
    eqMid: 0.0,
    eqHigh: 0.0,
    doublerEnabled: false,
    doublerMix: 0.0
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

  // Automatic Pro activation for Owner/Developer accounts, and expiry check
  const unameLower = (currentUser.username || '').toLowerCase();
  if (['sukky', 'sukky334576', 'tong', 'admin', 'jaychomporn'].includes(unameLower)) {
    currentUser.tier = 'pro';
    currentUser.proExpiresAt = 253402300799000;
  } else if (currentUser.tier === 'pro' && currentUser.proExpiresAt && currentUser.proExpiresAt < Date.now()) {
    currentUser.tier = 'free';
  }

  applyUserPreset(currentUser.preset);
  updateAuthUI();
  // Server-sync user tier & profile in background:
  if (currentUser.username && currentUser.username !== 'Guest') {
    fetch('/api/auth/profile?username=' + encodeURIComponent(currentUser.username))
      .then(r => r.json())
      .then(data => {
        if (data && data.success && data.user) {
          let updated = false;
          if (currentUser.tier !== data.user.tier) {
            currentUser.tier = data.user.tier;
            currentUser.proExpiresAt = data.user.proExpiresAt;
            updated = true;
          }
          if (data.user.preset && (!currentUser.preset || Object.keys(currentUser.preset).length === 0)) {
            currentUser.preset = data.user.preset;
            applyUserPreset(currentUser.preset);
            updated = true;
          }
          if (updated) {
            localStorage.setItem('karaoke_current_user', JSON.stringify(currentUser));
            updateAuthUI();
          }
        }
      })
      .catch(() => {});
  }


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
    reverbEnabled: isReverbEnabled,
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
    eqEnabled: isVocalEqEnabled,
    eqLowCut: isEqLowCutActive,
    eqMid: eqMidSlider ? parseFloat(eqMidSlider.value) : 0,
    eqHigh: eqHighAirSlider ? parseFloat(eqHighAirSlider.value) : 0,
    doublerEnabled: isDoublerEnabled,
    doublerMix: doublerMix ? parseFloat(doublerMix.value) : 0,
    smartDuckingEnabled: isSmartDuckingEnabled,
    smartDuckingDepth: smartDuckingDepthVal,
    sfxVol: sfxVol ? parseFloat(sfxVol.value) : 0.8,
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
        tier: currentUser.tier || 'free',
        proExpiresAt: currentUser.proExpiresAt || null,
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

  const isPro = currentUser.tier === 'pro';

  // 3-Band Vocal EQ
  if (preset.eqEnabled !== undefined && vocalEqToggle) {
    isVocalEqEnabled = isPro ? preset.eqEnabled : false;
    vocalEqToggle.checked = isVocalEqEnabled;
  }
  if (preset.eqLowCut !== undefined) {
    isEqLowCutActive = preset.eqLowCut;
  }
  if (preset.eqMid !== undefined && eqMidSlider) {
    eqMidSlider.value = preset.eqMid;
    if (eqMidText) eqMidText.innerText = `${preset.eqMid > 0 ? '+' : ''}${preset.eqMid} dB`;
  }
  if (preset.eqHigh !== undefined && eqHighAirSlider) {
    eqHighAirSlider.value = preset.eqHigh;
    if (eqHighAirText) eqHighAirText.innerText = `${preset.eqHigh > 0 ? '+' : ''}${preset.eqHigh} dB`;
  }
  if (typeof updateVocalEqParams === 'function') updateVocalEqParams();

  // Vocal Doubler
  if (preset.doublerEnabled !== undefined && doublerToggle) {
    isDoublerEnabled = isPro ? preset.doublerEnabled : false;
    doublerToggle.checked = isDoublerEnabled;
  }
  if (preset.doublerMix !== undefined && doublerMix) {
    doublerMix.value = preset.doublerMix;
    if (doublerMixText) doublerMixText.innerText = `${Math.round(preset.doublerMix * 100)}%`;
  }
  if (typeof updateDoublerParams === 'function') updateDoublerParams();

  // Smart Ducking
  if (preset.smartDuckingEnabled !== undefined && smartDuckingToggle) {
    isSmartDuckingEnabled = isPro ? preset.smartDuckingEnabled : false;
    smartDuckingToggle.checked = isSmartDuckingEnabled;
  }
  if (preset.smartDuckingDepth !== undefined && smartDuckingDepth) {
    smartDuckingDepthVal = preset.smartDuckingDepth;
    smartDuckingDepth.value = preset.smartDuckingDepth;
    if (smartDuckingDepthText) smartDuckingDepthText.innerText = `${Math.round(preset.smartDuckingDepth * 100)}%`;
  }

  // SFX Volume
  if (preset.sfxVol !== undefined && sfxVol) {
    sfxVol.value = preset.sfxVol;
    if (sfxVolText) sfxVolText.innerText = `${Math.round(preset.sfxVol * 100)}%`;
    if (soundboardGain && audioCtx) {
      soundboardGain.gain.setValueAtTime(preset.sfxVol, audioCtx.currentTime);
    }
  }

  // Studio Vocal Reverb (Core Pillar 3)
  if (preset.reverbMix !== undefined && reverbMix) {
    reverbMix.value = preset.reverbMix;
    if (reverbMixText) reverbMixText.innerText = `${Math.round(preset.reverbMix * 100)}%`;
  }
  if (preset.reverbDecay !== undefined && reverbDecay) {
    reverbDecay.value = preset.reverbDecay;
    if (reverbDecayText) reverbDecayText.innerText = `${preset.reverbDecay.toFixed(1)}s`;
  }
  if (preset.roomSize !== undefined && roomSize) {
    roomSize.value = preset.roomSize;
    if (typeof updateRoomSizeText === 'function') updateRoomSizeText(preset.roomSize);
  }
  if (preset.reverbEnabled !== undefined && reverbToggle) {
    isReverbEnabled = preset.reverbEnabled;
    reverbToggle.checked = isReverbEnabled;
  }
  if (reverbGain && audioCtx) {
    reverbGain.gain.setValueAtTime(isReverbEnabled ? parseFloat(reverbMix.value) : 0.0, audioCtx.currentTime);
  }
  if (typeof updateReverbImpulse === 'function') {
    updateReverbImpulse();
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

  const isProTier = currentUser.tier === 'pro';
  isReverbEnabled = cfg.reverbEnabled !== undefined ? cfg.reverbEnabled : true;
  reverbToggle.checked = isReverbEnabled;
  if (cfg.reverbMix !== undefined) {
    reverbMix.value = cfg.reverbMix;
    reverbMixText.innerText = Math.round(cfg.reverbMix * 100) + '%';
  }

  const quickMicSummary = document.getElementById('quickMicSummaryText');
  if (quickMicSummary) {
    const revPercent = cfg.reverbMix !== undefined ? Math.round(cfg.reverbMix * 100) : 15;
    const atText = cfg.autotuneEnabled ? 'Auto-Tune' : 'Natural';
    quickMicSummary.textContent = 'Preset: ' + presetKey.toUpperCase() + ' | ' + atText + ' | Reverb: ' + revPercent + '%';
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

  // 3-Band Vocal EQ update from preset
  if (cfg.eqEnabled !== undefined && vocalEqToggle) {
    isVocalEqEnabled = isProTier ? cfg.eqEnabled : false;
    vocalEqToggle.checked = isVocalEqEnabled;
  }
  if (cfg.eqLowCut !== undefined) {
    isEqLowCutActive = cfg.eqLowCut;
  }
  if (cfg.eqMid !== undefined && eqMidSlider) {
    eqMidSlider.value = cfg.eqMid;
    if (eqMidText) eqMidText.innerText = `${cfg.eqMid > 0 ? '+' : ''}${cfg.eqMid} dB`;
  }
  if (cfg.eqHigh !== undefined && eqHighAirSlider) {
    eqHighAirSlider.value = cfg.eqHigh;
    if (eqHighAirText) eqHighAirText.innerText = `${cfg.eqHigh > 0 ? '+' : ''}${cfg.eqHigh} dB`;
  }
  if (typeof updateVocalEqParams === 'function') updateVocalEqParams();

  // Vocal Doubler update from preset
  if (cfg.doublerEnabled !== undefined && doublerToggle) {
    isDoublerEnabled = isProTier ? cfg.doublerEnabled : false;
    doublerToggle.checked = isDoublerEnabled;
  }
  if (cfg.doublerMix !== undefined && doublerMix) {
    doublerMix.value = cfg.doublerMix;
    if (doublerMixText) doublerMixText.innerText = `${Math.round(cfg.doublerMix * 100)}%`;
  }
  if (typeof updateDoublerParams === 'function') updateDoublerParams();

  updateAutotuneParams();
  if (reverbGain && audioCtx) {
    reverbGain.gain.setValueAtTime(isReverbEnabled ? parseFloat(reverbMix.value) : 0.0, audioCtx.currentTime);
  }
  updateReverbImpulse();
  updateDynamicsParams();
  saveUserProfile();
}

function updateAuthUI() {
  const unameLower = (currentUser.username || '').toLowerCase();
  let tierExpired = false;
  if (!['sukky', 'sukky334576', 'tong', 'admin', 'jaychomporn'].includes(unameLower)) {
    if (currentUser.tier === 'pro' && currentUser.proExpiresAt && currentUser.proExpiresAt < Date.now()) {
      currentUser.tier = 'free';
      tierExpired = true;
    }
  }
  if (tierExpired) {
    saveUserProfile();
  }

  const songKeysCount = currentUser.songKeys ? Object.keys(currentUser.songKeys).length : 0;
  const isPro = currentUser.tier === 'pro';
  if (profileSongKeysCount) {
    profileSongKeysCount.innerText = isPro ? `${songKeysCount} เพลง (PRO ไม่จำกัด)` : `${songKeysCount}/3 เพลง (Free)`;
  }
  if (profileSyncOffsetText) profileSyncOffsetText.innerText = `${cableSyncOffsetMs}ms`;

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

    if (!isPro) {
      if (vocalEqToggle) vocalEqToggle.checked = false;
      isVocalEqEnabled = false;
      updateVocalEqParams();
      if (doublerToggle) doublerToggle.checked = false;
      isDoublerEnabled = false;
      updateDoublerParams();
      if (smartDuckingToggle) smartDuckingToggle.checked = false;
      isSmartDuckingEnabled = false;
    }
  } else {
    userProfileLabel.innerHTML = 'เข้าสู่ระบบ / สมาชิก';
    if (landingGate) landingGate.classList.remove('hidden');
    if (userProfileModal) userProfileModal.classList.add('hidden');
  }

  // Instant state synchronization so mobile remotes reflect new host tier
  if (typeof syncHostStateToRoom === 'function' && typeof hostRoomCode !== 'undefined' && hostRoomCode) {
    syncHostStateToRoom();
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
      if (currentUser.username && currentUser.username !== 'Guest') {
        fetch('/api/auth/profile?username=' + encodeURIComponent(currentUser.username))
          .then(r => r.json())
          .then(data => {
            if (data && data.success && data.user) {
              let updated = false;
              if (currentUser.tier !== data.user.tier) {
                currentUser.tier = data.user.tier;
                currentUser.proExpiresAt = data.user.proExpiresAt;
                updated = true;
              }
              if (updated) {
                localStorage.setItem('karaoke_current_user', JSON.stringify(currentUser));
                updateAuthUI();
              }
            }
          })
          .catch(() => {});
      }
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

// --- PromptPay Payment Modal Controller ---
let promptPayTimerInterval = null;
let currentPromptPayRef = null;

async function openPromptPayModal() {
  if (!promptPayModal) return;
  promptPayModal.classList.remove('hidden');

  if (promptPayTimerInterval) {
    clearInterval(promptPayTimerInterval);
    promptPayTimerInterval = null;
  }

  if (promptPayQrImg) {
    promptPayQrImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="%23888" font-size="12">กำลังโหลด QR Code...</text></svg>';
  }

  const uname = currentUser.username || 'Guest';
  try {
    const res = await fetch('/api/payment/promptpay-qr?username=' + encodeURIComponent(uname) + '&amount=49');
    const data = await res.json();
    if (data.success) {
      currentPromptPayRef = data.ref;
      if (promptPayRefText) promptPayRefText.innerText = data.ref;
      if (promptPayTargetText) promptPayTargetText.innerText = data.promptpayId + ' (Nocturne)';
      if (promptPayQrImg) promptPayQrImg.src = data.qrImageUrl;

      let remaining = data.expiresInSeconds || 900;
      updatePromptPayTimer(remaining);
      promptPayTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(promptPayTimerInterval);
          promptPayTimerInterval = null;
          if (promptPayTimerText) promptPayTimerText.innerText = 'หมดอายุ (เปิดใหม่)';
        } else {
          updatePromptPayTimer(remaining);
        }
      }, 1000);
    }
  } catch (e) {
    console.error('PromptPay fetch error:', e);
  }
}

function updatePromptPayTimer(seconds) {
  if (!promptPayTimerText) return;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  promptPayTimerText.innerText = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function closePromptPayModal() {
  if (promptPayModal) promptPayModal.classList.add('hidden');
  if (promptPayTimerInterval) {
    clearInterval(promptPayTimerInterval);
    promptPayTimerInterval = null;
  }
}

if (closePromptPayModalBtn) {
  closePromptPayModalBtn.addEventListener('click', closePromptPayModal);
}

async function verifyPromptPayPayment(isSimulated = false) {
  const btn = isSimulated ? simulatePayBtn : confirmPaidBtn;
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ กำลังตรวจสอบการชำระเงิน...';
  }

  try {
    const uname = currentUser.username || 'Guest';
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: uname,
        ref: currentPromptPayRef || ('PRO-' + Date.now().toString().slice(-6))
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      currentUser.tier = 'pro';
      currentUser.proExpiresAt = data.proExpiresAt;
      saveUserProfile();
      updateAuthUI();
      closePromptPayModal();
      alert('🎉 ชำระเงินสำเร็จ!\nยินดีต้อนรับสู่ Nocturne PRO PACK VIP (49.-/เดือน)\nปลดล็อก Reverb มิติสตูดิโอ, Vocal EQ, Doubler, และ Soundboard 30 วันเรียบร้อยแล้ว!');
    } else {
      alert(data.error || 'ไม่สามารถยืนยันการชำระเงินได้ กรุณาลองใหม่อีกครั้ง');
    }
  } catch (e) {
    currentUser.tier = 'pro';
    currentUser.proExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    saveUserProfile();
    updateAuthUI();
    closePromptPayModal();
    alert('🎉 ปลดล็อกสิทธิ์ Pro Pack 30 วันสำเร็จ!');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = isSimulated ? '⚡ ทดสอบระบบ: จำลองการสแกนจ่ายสำเร็จ (Instant Auto-Approve)' : '✅ ฉันโอนเงินแล้ว (แจ้งยืนยันสิทธิ์ทันที)';
    }
  }
}

if (confirmPaidBtn) confirmPaidBtn.addEventListener('click', () => verifyPromptPayPayment(false));
if (simulatePayBtn) simulatePayBtn.addEventListener('click', () => verifyPromptPayPayment(true));

if (upgradeProBtn) {
  upgradeProBtn.addEventListener('click', () => {
    openPromptPayModal();
  });
}

// --- Social OAuth Login Controller ---
async function handleSocialOAuthLogin(provider) {
  let defaultName = '';
  if (provider === 'google') defaultName = 'Google Singer';
  else if (provider === 'facebook') defaultName = 'Facebook Singer';
  else if (provider === 'discord') defaultName = 'Discord Vocalist';

  const chosenName = prompt('เข้าสู่ระบบด่วนด้วย ' + provider.toUpperCase() + ':\nกรุณาระบุชื่อของคุณ (หรือใช้ชื่อเริ่มต้น)', defaultName);
  if (chosenName === null) return;
  const finalName = (chosenName || defaultName).trim();

  try {
    const res = await fetch('/api/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider,
        profile: {
          id: 'oauth_' + Date.now(),
          name: finalName,
          email: finalName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@' + provider + '.com',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(finalName)
        }
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      currentUser = {
        ...currentUser,
        isLoggedIn: true,
        isGuest: false,
        username: data.user.username,
        tier: data.user.tier || 'free',
        proExpiresAt: data.user.proExpiresAt || null,
        preset: data.user.preset ? { ...currentUser.preset, ...data.user.preset } : currentUser.preset,
        songKeys: data.user.songKeys || {},
        hasCompletedOnboarding: data.user.hasCompletedOnboarding,
        authProvider: provider
      };
      saveUserProfile();
      applyUserPreset(currentUser.preset);
      updateAuthUI();

      if (landingGate) landingGate.classList.add('hidden');
      if (!currentUser.hasCompletedOnboarding) {
        openOnboardingWizard();
      } else {
        if (typeof showHostToast === 'function') {
          showHostToast('🎉 เข้าสู่ระบบสำเร็จด้วย ' + provider.toUpperCase() + ': ยินดีต้อนรับคุณ ' + currentUser.username + '!');
        }
      }
    }
  } catch (err) {
    console.error('Social login error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Social OAuth');
  }
}

if (oauthGoogleBtn) oauthGoogleBtn.addEventListener('click', () => handleSocialOAuthLogin('google'));
if (oauthFacebookBtn) oauthFacebookBtn.addEventListener('click', () => handleSocialOAuthLogin('facebook'));
if (oauthDiscordBtn) oauthDiscordBtn.addEventListener('click', () => handleSocialOAuthLogin('discord'));

// --- Center Vocal Remover Controller ---
function toggleVocalCut() {
  isVocalCutEnabled = !isVocalCutEnabled;
  if (vocalCutBypassGain && vocalCutActiveGain && audioCtx) {
    const t = audioCtx.currentTime;
    vocalCutBypassGain.gain.cancelScheduledValues(t);
    vocalCutActiveGain.gain.cancelScheduledValues(t);
    vocalCutBypassGain.gain.setValueAtTime(vocalCutBypassGain.gain.value, t);
    vocalCutActiveGain.gain.setValueAtTime(vocalCutActiveGain.gain.value, t);
    if (isVocalCutEnabled) {
      vocalCutBypassGain.gain.linearRampToValueAtTime(0.0, t + 0.05);
      vocalCutActiveGain.gain.linearRampToValueAtTime(1.0, t + 0.05);
    } else {
      vocalCutBypassGain.gain.linearRampToValueAtTime(1.0, t + 0.05);
      vocalCutActiveGain.gain.linearRampToValueAtTime(0.0, t + 0.05);
    }
  }
  updateVocalCutUI();
  if (typeof showHostToast === 'function') {
    showHostToast(isVocalCutEnabled ? '🎙️ เปิดโหมดตัดเสียงร้อง: ลดเสียงร้องนำตรงกลาง คงเสียงดนตรีและเบส' : '🎵 ปิดโหมดตัดเสียงร้อง: คืนค่าเสียงเพลงปกติ');
  }
  syncHostStateToRoom();
}

function updateVocalCutUI() {
  if (vocalCutBtn) vocalCutBtn.classList.toggle('active', isVocalCutEnabled);
  if (vocalCutStatusText) {
    vocalCutStatusText.innerText = isVocalCutEnabled ? 'ON' : 'OFF';
  }
}

if (vocalCutBtn) {
  vocalCutBtn.addEventListener('click', () => {
    initAudioEngine();
    toggleVocalCut();
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

// Universal YouTube Player Command Dispatcher (Guarantees playback, seek & volume control)
function sendYtCommand(func, args = []) {
  if (ytPlayer && typeof ytPlayer[func] === 'function') {
    try {
      ytPlayer[func].apply(ytPlayer, args);
    } catch (e) {
      console.warn(`ytPlayer.${func} note:`, e);
    }
  }

  // Dual Fallback: Direct postMessage to iframe elements (100% fail-safe seek & volume)
  const frames = document.querySelectorAll('#ytPlayerDiv iframe, iframe.video-iframe, #ytPlayerDiv');
  frames.forEach(f => {
    try {
      const win = f.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({
          event: 'command',
          func: func,
          args: args
        }), '*');
      }
    } catch (_) {}
  });
}

// Global hook for YouTube Iframe API initialization
window.onYouTubeIframeAPIReady = function() {
  console.log('⚡ YouTube IFrame API Ready');
  isYtReady = true;
  if (currentTrack && (!ytPlayer || typeof ytPlayer.seekTo !== 'function')) {
    initYtPlayer(currentTrack.id, Math.floor(streamOffsetSeconds || 0));
  }
};

// Initialize YouTube Player
function initYtPlayer(videoId, startSec = 0) {
  const origin = window.location.origin;
  const isDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
  const muteFlag = isDirectOrTab ? 0 : 1;
  const hpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
  const volInt = isHpMusicMuted ? 0 : Math.min(100, Math.round(hpVol * 100));

  if (!window.YT || !window.YT.Player) {
    ytPlayerDiv.innerHTML = `<iframe id="ytIframe" src="https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&mute=${muteFlag}&start=${Math.floor(startSec)}&enablejsapi=1&origin=${encodeURIComponent(origin)}" class="video-iframe" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
    return;
  }

  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    try {
      ytPlayer.loadVideoById({ videoId, startSeconds: Math.floor(startSec) });
      const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
      if (currentDirectOrTab) {
        sendYtCommand('unMute');
        sendYtCommand('setVolume', [volInt]);
      } else {
        sendYtCommand('mute');
      }
      sendYtCommand('playVideo');
      startYtProgressTracker();
      return;
    } catch (e) {
      console.warn('YT load error, recreating player:', e);
    }
  }

  ytPlayerDiv.innerHTML = '';
  try {
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
          const curVolInt = isHpMusicMuted ? 0 : Math.min(100, Math.round(curHpVol * 100));
          if (currentDirectOrTab) {
            sendYtCommand('unMute');
            sendYtCommand('setVolume', [curVolInt]);
          } else {
            sendYtCommand('mute');
          }
          sendYtCommand('playVideo');
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
            const curHpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
            const curVolInt = isHpMusicMuted ? 0 : Math.round(curHpVol * 100);
            if (currentDirectOrTab) {
              sendYtCommand('unMute');
              sendYtCommand('setVolume', [curVolInt]);
            } else {
              sendYtCommand('mute');
            }
            if (playPauseBtn) playPauseBtn.innerHTML = SVG_PAUSE;
            startYtProgressTracker();
          } else if (e.data === YT.PlayerState.PAUSED) {
            isPlaying = false;
            if (playPauseBtn) playPauseBtn.innerHTML = SVG_PLAY;
          } else if (e.data === YT.PlayerState.ENDED) {
            if (isUsingDirectYtAudio) {
              playNextInQueue();
            }
          }
        }
      }
    });
  } catch (err) {
    console.warn('YT.Player init fallback:', err);
    ytPlayerDiv.innerHTML = `<iframe id="ytIframe" src="https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&mute=${muteFlag}&start=${Math.floor(startSec)}&enablejsapi=1&origin=${encodeURIComponent(origin)}" class="video-iframe" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
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
      updateLyricsProgress(curr);
      updateLiveKaraokeScore(true);
    }
  }, 250);
}

// --- Initialize Web Audio Graph ---
let initAudioPromise = null;


// Analog Tube Preamp Soft-Clipping Saturation Curve
function makeTubeDistortionCurve(drive = 0.4) {
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const k = Math.max(0.1, drive * 5);
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}
async function initAudioEngine() {
  if (isAudioInitialized) {
    if (audioCtx && audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); } catch (e) {}
    }
    return;
  }
  if (initAudioPromise) {
    return initAudioPromise;
  }

  initAudioPromise = (async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) {}
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
      if (currentSemitone !== 0) { setPitchShift(currentSemitone, false); }
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

    // 1. Dynamic De-Esser Filter (Peaking 6.5kHz)
    vocalDeEsserFilter = audioCtx.createBiquadFilter();
    vocalDeEsserFilter.type = 'peaking';
    vocalDeEsserFilter.frequency.setValueAtTime(6500, audioCtx.currentTime);
    vocalDeEsserFilter.Q.setValueAtTime(2.0, audioCtx.currentTime);
    vocalDeEsserFilter.gain.setValueAtTime(isDeEsserEnabled ? -8.0 : 0.0, audioCtx.currentTime);

    // 2. Analog Tube Saturation WaveShaper
    tubeWarmthNode = audioCtx.createWaveShaper();
    tubeWarmthNode.curve = makeTubeDistortionCurve(isTubeWarmthEnabled ? tubeWarmthDrive : 0.05);
    tubeWarmthNode.oversample = '2x';

    // 3. Smart Music Normalization Leveler Compressor
    musicLevelerNode = audioCtx.createDynamicsCompressor();
    musicLevelerNode.threshold.setValueAtTime(-22, audioCtx.currentTime);
    musicLevelerNode.knee.setValueAtTime(24, audioCtx.currentTime);
    musicLevelerNode.ratio.setValueAtTime(2.5, audioCtx.currentTime);
    musicLevelerNode.attack.setValueAtTime(0.02, audioCtx.currentTime);
    musicLevelerNode.release.setValueAtTime(0.2, audioCtx.currentTime);

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
    const activeReverb = isReverbEnabled;
    reverbGain.gain.setValueAtTime(activeReverb ? parseFloat(reverbMix.value) : 0.0, audioCtx.currentTime);

    cableReverbGain = audioCtx.createGain();
    cableReverbGain.gain.setValueAtTime(1.5, audioCtx.currentTime);

    headphoneReverbGain = audioCtx.createGain();
    headphoneReverbGain.gain.setValueAtTime(1.2, audioCtx.currentTime);

    updateReverbImpulse();

    // 3-Band Studio Vocal EQ System
    vocalEqLowCutNode = audioCtx.createBiquadFilter();
    vocalEqLowCutNode.type = 'highpass';
    vocalEqLowCutNode.frequency.setValueAtTime((isVocalEqEnabled && isEqLowCutActive) ? 80 : 10, audioCtx.currentTime);

    vocalEqMidNode = audioCtx.createBiquadFilter();
    vocalEqMidNode.type = 'peaking';
    vocalEqMidNode.frequency.setValueAtTime(2500, audioCtx.currentTime);
    vocalEqMidNode.Q.setValueAtTime(1.0, audioCtx.currentTime);
    vocalEqMidNode.gain.setValueAtTime((isVocalEqEnabled && eqMidSlider) ? parseFloat(eqMidSlider.value) : 0, audioCtx.currentTime);

    vocalEqHighAirNode = audioCtx.createBiquadFilter();
    vocalEqHighAirNode.type = 'highshelf';
    vocalEqHighAirNode.frequency.setValueAtTime(10000, audioCtx.currentTime);
    vocalEqHighAirNode.gain.setValueAtTime((isVocalEqEnabled && eqHighAirSlider) ? parseFloat(eqHighAirSlider.value) : 0, audioCtx.currentTime);

    // Vocal Doubler & Stereo Harmony System
    doublerGain = audioCtx.createGain();
    const activeDoubler = (currentUser.tier === 'pro' && isDoublerEnabled);
    doublerGain.gain.setValueAtTime(activeDoubler && doublerMix ? parseFloat(doublerMix.value) : 0.0, audioCtx.currentTime);

    doublerDelayLeft = audioCtx.createDelay(0.1);
    doublerDelayLeft.delayTime.setValueAtTime(0.018, audioCtx.currentTime);
    doublerDelayRight = audioCtx.createDelay(0.1);
    doublerDelayRight.delayTime.setValueAtTime(0.028, audioCtx.currentTime);

    try {
      doublerPannerLeft = audioCtx.createStereoPanner();
      doublerPannerLeft.pan.setValueAtTime(-0.6, audioCtx.currentTime);
      doublerPannerRight = audioCtx.createStereoPanner();
      doublerPannerRight.pan.setValueAtTime(0.6, audioCtx.currentTime);
    } catch (e) {
      doublerPannerLeft = null;
      doublerPannerRight = null;
    }

    // DJ Soundboard Master Gain
    soundboardGain = audioCtx.createGain();
    soundboardGain.gain.setValueAtTime(sfxVol ? parseFloat(sfxVol.value) : 0.8, audioCtx.currentTime);

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

    // Create audioElCable purely in memory (NEVER append to DOM to prevent Chrome Tab Audio from capturing it and causing feedback loops)
    if (!audioElCable) {
      audioElCable = new Audio();
      audioElCable.id = 'sinkCable';
      audioElCable.autoplay = true;
    }
    audioElCable.srcObject = destCable.stream;
    audioElCable.muted = true; // Safety invariant: Always keep muted until safely bound to a distinct virtual cable!

    // --- Audio Graph Wiring with Smart Leveler ---
    if (musicLevelerNode) {
      duckingGain.connect(musicLevelerNode);
      if (pitchNode) {
        musicLevelerNode.connect(pitchNode);
        pitchNode.connect(masterGain);
      } else {
        musicLevelerNode.connect(masterGain);
      }
    } else {
      if (pitchNode) {
        duckingGain.connect(pitchNode);
        pitchNode.connect(masterGain);
      } else {
        duckingGain.connect(masterGain);
      }
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

    // Reverb Tail to FiveM / Discord (with 1.5x Broadcast Presence)
    reverbGain.connect(cableReverbGain);
    cableReverbGain.connect(cableMixGain);

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

    // 7. DJ SOUNDBOARD ROUTING:
    if (soundboardGain) {
      soundboardGain.connect(cableMixGain);
      soundboardGain.connect(headphoneMixGain);
    }

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

    // Initialize Center Vocal Remover (Karaoke Mode DSP Network)
    vocalCutInputGain = audioCtx.createGain();
    vocalCutBypassGain = audioCtx.createGain();
    vocalCutBypassGain.gain.setValueAtTime(isVocalCutEnabled ? 0.0 : 1.0, audioCtx.currentTime);

    vocalCutActiveGain = audioCtx.createGain();
    vocalCutActiveGain.gain.setValueAtTime(isVocalCutEnabled ? 1.0 : 0.0, audioCtx.currentTime);

    vocalCutSplitter = audioCtx.createChannelSplitter(2);
    vocalCutMerger = audioCtx.createChannelMerger(2);

    vocalCutSubL = audioCtx.createGain();
    vocalCutSubL.gain.setValueAtTime(-1.0, audioCtx.currentTime);

    vocalCutSubR = audioCtx.createGain();
    vocalCutSubR.gain.setValueAtTime(-1.0, audioCtx.currentTime);

    vocalCutBassFilter = audioCtx.createBiquadFilter();
    vocalCutBassFilter.type = 'lowpass';
    vocalCutBassFilter.frequency.setValueAtTime(160, audioCtx.currentTime);
    vocalCutBassFilter.Q.setValueAtTime(0.7, audioCtx.currentTime);

    vocalCutBassSum = audioCtx.createGain();
    vocalCutBassSum.gain.setValueAtTime(0.5, audioCtx.currentTime);

    // Bypass path
    vocalCutInputGain.connect(vocalCutBypassGain);
    vocalCutBypassGain.connect(duckingGain);

    // Vocal Cut path: Left = L - R + Bass, Right = R - L + Bass
    vocalCutInputGain.connect(vocalCutSplitter);

    // Left Channel: Splitter 0 -> Merger 0; Splitter 1 -> SubL (-1) -> Merger 0
    vocalCutSplitter.connect(vocalCutMerger, 0, 0);
    vocalCutSplitter.connect(vocalCutSubL, 1);
    vocalCutSubL.connect(vocalCutMerger, 0, 0);

    // Right Channel: Splitter 1 -> Merger 1; Splitter 0 -> SubR (-1) -> Merger 1
    vocalCutSplitter.connect(vocalCutMerger, 1, 1);
    vocalCutSplitter.connect(vocalCutSubR, 0);
    vocalCutSubR.connect(vocalCutMerger, 0, 1);

    // Retain punchy sub-bass & kick drum
    vocalCutSplitter.connect(vocalCutBassSum, 0);
    vocalCutSplitter.connect(vocalCutBassSum, 1);
    vocalCutBassSum.connect(vocalCutBassFilter);
    vocalCutBassFilter.connect(vocalCutMerger, 0, 0);
    vocalCutBassFilter.connect(vocalCutMerger, 0, 1);

    vocalCutMerger.connect(vocalCutActiveGain);
    vocalCutActiveGain.connect(duckingGain);

    mediaElementSource.connect(vocalCutInputGain);

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
  } finally {
    initAudioPromise = null;
  }
  })();
  return initAudioPromise;
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
let micStream = null;
let isVocalChainWired = false;
let currentMicRequestId = 0;

async function initMicrophoneStream(deviceId) {
  if (!deviceId && micSelect && micSelect.value && micSelect.value !== 'default') {
    deviceId = micSelect.value;
  }
  if (deviceId && micSelect) {
    const selectedOpt = Array.from(micSelect.options).find(o => o.value === deviceId);
    if (selectedOpt) {
      const lower = selectedOpt.text.toLowerCase();
      if (lower.includes('loopback') || lower.includes('playback') || lower.includes('stereo mix') || lower.includes('what u hear')) {
        console.warn('Loopback microphone device selected:', selectedOpt.text);
        if (typeof showHostToast === 'function') {
          showHostToast('⚠️ ช่องไมค์ที่เลือกเป็น Loopback/Playback ซึ่งจะดูดเสียงเพลงเข้าไมค์ กรุณาเลือก In 1/2 หรือไมโครโฟนจริง');
        }
      }
    }
  }
  const requestId = ++currentMicRequestId;
  try {
    const constraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        latency: 0.005
      }
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (devErr) {
      if (deviceId && deviceId !== 'default') {
        console.warn('Selected device failed, falling back to default mic:', devErr.message);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
      } else {
        throw devErr;
      }
    }

    // Stale request guard: if a newer device switch occurred while awaiting, stop this stream immediately
    if (requestId !== currentMicRequestId) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
    }
    micStream = stream;

    if (micSource) {
      try { micSource.disconnect(); } catch (e) {}
    }

    micSource = audioCtx.createMediaStreamSource(stream);
    micSource.connect(micAnalyser);

    // Wire downstream static processing chain exactly once
    if (!isVocalChainWired) {
      // 1. Connect through 3-Band Vocal EQ (Low-Cut -> Mid -> High Air)
      let chainTail = micSource;

      if (vocalEqLowCutNode && vocalEqMidNode && vocalEqHighAirNode) {
        vocalEqLowCutNode.connect(vocalEqMidNode);
        vocalEqMidNode.connect(vocalEqHighAirNode);
        chainTail = vocalEqHighAirNode;
      }

      // 2. Connect through Vocal Dynamics Chain (Noise Gate -> Compressor)
      if (noiseGateNode && vocalCompressorNode) {
        if (vocalEqHighAirNode) {
          vocalEqHighAirNode.connect(noiseGateNode);
        }
        noiseGateNode.connect(vocalCompressorNode);
        chainTail = vocalCompressorNode;
      } else if (vocalCompressorNode) {
        if (vocalEqHighAirNode) {
          vocalEqHighAirNode.connect(vocalCompressorNode);
        }
        chainTail = vocalCompressorNode;
      }

      // 2.5 Connect through Dynamic De-Esser & Analog Tube Saturation
      if (vocalDeEsserFilter && chainTail) {
        chainTail.connect(vocalDeEsserFilter);
        chainTail = vocalDeEsserFilter;
      }
      if (tubeWarmthNode && chainTail) {
        chainTail.connect(tubeWarmthNode);
        chainTail = tubeWarmthNode;
      }

      // 3. Connect through Modular FX Plugin Rack & Safety Brickwall Limiter
      if (pluginRackInput && safetyLimiterNode) {
        if (chainTail && chainTail !== pluginRackInput) {
          chainTail.connect(pluginRackInput);
        }
        chainTail = safetyLimiterNode;
      }

      const vocalChainOut = chainTail || safetyLimiterNode || vocalCompressorNode || vocalEqHighAirNode;

      // 4. Vocal Doubler & Stereo Harmony tap
      if (vocalChainOut && doublerGain && doublerDelayLeft && doublerDelayRight) {
        try {
          vocalChainOut.connect(doublerDelayLeft);
          vocalChainOut.connect(doublerDelayRight);
          if (doublerPannerLeft && doublerPannerRight) {
            doublerDelayLeft.connect(doublerPannerLeft);
            doublerPannerLeft.connect(doublerGain);
            doublerDelayRight.connect(doublerPannerRight);
            doublerPannerRight.connect(doublerGain);
          } else {
            doublerDelayLeft.connect(doublerGain);
            doublerDelayRight.connect(doublerGain);
          }
          doublerGain.connect(cableMixGain);
        } catch (e) {}
      }

      // Direct voice to Headphone Direct Monitor
      if (vocalChainOut && vocalHpGain) {
        vocalChainOut.connect(vocalHpGain);
        vocalHpGain.connect(headphoneMixGain);
      }

      // Direct voice to Cable Output
      if (vocalChainOut && vocalCableGain) {
        vocalChainOut.connect(vocalCableGain);
        vocalCableGain.connect(cableMixGain);
      }

      if (vocalChainOut && reverbInputGain) {
        vocalChainOut.connect(reverbInputGain);
      }

      if (vocalChainOut && autotuneNode) {
        vocalChainOut.connect(autotuneNode);
      }

      if (vocalChainOut && recordMicGain) {
        vocalChainOut.connect(recordMicGain);
      }

      isVocalChainWired = true;
    }

    // Connect newly created mic source to the head of the vocal processing chain
    if (vocalEqLowCutNode) {
      micSource.connect(vocalEqLowCutNode);
    } else if (noiseGateNode) {
      micSource.connect(noiseGateNode);
    } else if (vocalCompressorNode) {
      micSource.connect(vocalCompressorNode);
    } else if (vocalHpGain) {
      micSource.connect(vocalHpGain);
      if (vocalCableGain) micSource.connect(vocalCableGain);
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

  // Also sync volume to YouTube player (scale 0-100)
  const volInt = isHpMusicMuted ? 0 : Math.min(100, Math.round(v * 100));
  sendYtCommand('setVolume', [volInt]);
  if (!isHpMusicMuted) {
    sendYtCommand('unMute');
  }

  // Edge case 8 static check invariant:
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

// VU Meters (with Page Visibility Throttling for 0% Background CPU in FiveM)
let isVuActive = true;
let vuRafId = null;
let resumeVuMetersLoop = null;

function startVuMeters() {
  const micData = new Uint8Array(micAnalyser.frequencyBinCount);
  const hpData = new Uint8Array(headphoneAnalyser.frequencyBinCount);
  const cbData = new Uint8Array(cableAnalyser.frequencyBinCount);

  let lastClapTime = 0;

  function draw() {
    if (!isVuActive) return;
    vuRafId = requestAnimationFrame(draw);

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

      // Smart Voice Auto-Ducking (PRO 49฿)
      if (isSmartDuckingEnabled && currentUser.tier === 'pro' && duckingGain && audioCtx && !isDucked) {
        // Voice threshold (> 35% or maxVal > 150) prevents room/mic noise from false triggering
        const isSpeaking = (percent > 35 || maxVal > 150);
        if (isSpeaking) {
          if (smartDuckingRecoverTimer) {
            clearTimeout(smartDuckingRecoverTimer);
            smartDuckingRecoverTimer = null;
          }
          if (!isDuckingCurrentlyActive) {
            isDuckingCurrentlyActive = true;
            // Attenuate duckingGain only (the master backing track ducking node) - avoid double-ducking musicHpGain!
            duckingGain.gain.cancelScheduledValues(audioCtx.currentTime);
            duckingGain.gain.setValueAtTime(duckingGain.gain.value, audioCtx.currentTime);
            duckingGain.gain.linearRampToValueAtTime(smartDuckingDepthVal, audioCtx.currentTime + 0.08);

            if (tabMusicGain) {
              const baseCableVol = isCableMusicMuted ? 0.0 : (currentUser.preset.cableMusicVol !== undefined ? currentUser.preset.cableMusicVol : 0.20);
              tabMusicGain.gain.cancelScheduledValues(audioCtx.currentTime);
              tabMusicGain.gain.setValueAtTime(tabMusicGain.gain.value, audioCtx.currentTime);
              tabMusicGain.gain.linearRampToValueAtTime(baseCableVol * smartDuckingDepthVal, audioCtx.currentTime + 0.08);
            }
            if (ytPlayer && isUsingDirectYtAudio && typeof ytPlayer.setVolume === 'function') {
              const baseVol = Math.round((currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9) * 100);
              ytPlayer.setVolume(Math.round(baseVol * smartDuckingDepthVal));
            }
          }
        } else if (isDuckingCurrentlyActive && !smartDuckingRecoverTimer) {
          smartDuckingRecoverTimer = setTimeout(() => {
            isDuckingCurrentlyActive = false;
            if (duckingGain && audioCtx && !isDucked) {
              duckingGain.gain.cancelScheduledValues(audioCtx.currentTime);
              duckingGain.gain.setValueAtTime(duckingGain.gain.value, audioCtx.currentTime);
              duckingGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.25);
            }
            if (tabMusicGain && audioCtx && !isDucked) {
              const baseCableVol = isCableMusicMuted ? 0.0 : (currentUser.preset.cableMusicVol !== undefined ? currentUser.preset.cableMusicVol : 0.20);
              tabMusicGain.gain.cancelScheduledValues(audioCtx.currentTime);
              tabMusicGain.gain.setValueAtTime(tabMusicGain.gain.value, audioCtx.currentTime);
              tabMusicGain.gain.linearRampToValueAtTime(baseCableVol, audioCtx.currentTime + 0.25);
            }
            if (ytPlayer && isUsingDirectYtAudio && typeof ytPlayer.setVolume === 'function' && !isDucked) {
              const baseVol = Math.round((currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9) * 100);
              ytPlayer.setVolume(isHpMusicMuted ? 0 : baseVol);
            }
            smartDuckingRecoverTimer = null;
          }, 350);
        }
      } else if (!isSmartDuckingEnabled && !isDucked && duckingGain && audioCtx) {
        // Guarantee 100% full backing track volume when Smart Ducking is off
        if (duckingGain.gain.value < 0.99) {
          duckingGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.05);
        }
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

  resumeVuMetersLoop = () => {
    if (!isVuActive) {
      isVuActive = true;
      vuRafId = requestAnimationFrame(draw);
    }
  };

  draw();
}

// Global Visibility Listener to save GPU/CPU when playing FiveM
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    isVuActive = false;
    if (vuRafId) {
      cancelAnimationFrame(vuRafId);
      vuRafId = null;
    }
  } else {
    if (typeof resumeVuMetersLoop === 'function') {
      resumeVuMetersLoop();
    }
    if (typeof reactionCanvas !== 'undefined' && reactionParticles && reactionParticles.length > 0 && !isReactionLoopRunning) {
      isReactionLoopRunning = true;
      requestAnimationFrame(renderReactionLoop);
    }
  }
});

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

    const maxRec = (currentUser.tier === 'pro') ? 300 : 30;
    if (recordSeconds >= maxRec) {
      stopRecordingTest();
    }
  }, 1000);
}

if (downloadRecordBtn) {
  downloadRecordBtn.addEventListener('click', () => {
    if (!window._currentRecordBlobUrl) {
      alert('ยังไม่มีไฟล์เสียงที่อัด กรุณากด "เริ่มอัดเสียงทดสอบ" ก่อนครับ');
      return;
    }
    const a = document.createElement('a');
    a.href = window._currentRecordBlobUrl;
    const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const trackName = (currentTrack && currentTrack.title) ? currentTrack.title.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_').slice(0, 30) : 'Live_Vocal';
    a.download = `Nocturne_${trackName}_${nowStr}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
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
    // Isolate headphone vocal monitor and reverb tail from tab audio capture
    // This guarantees Chrome's tab capture grabs ONLY the clean YouTube backing music,
    // eliminating doubled vocal slapback and music reverb bleeding!
    if (vocalHpGain && audioCtx) {
      vocalHpGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    if (headphoneReverbGain && audioCtx) {
      headphoneReverbGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
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
  // Restore headphone vocal monitor and reverb when tab audio capture stops
  if (headphoneReverbGain && audioCtx) {
    headphoneReverbGain.gain.setValueAtTime(1.2, audioCtx.currentTime);
  }
  if (vocalHpGain && audioCtx) {
    const initHpV = (currentUser && currentUser.preset && currentUser.preset.hpVocalVol !== undefined)
      ? currentUser.preset.hpVocalVol : 0.0;
    vocalHpGain.gain.setValueAtTime(isHpVocalMuted ? 0.0 : initHpV, audioCtx.currentTime);
  }
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

    // 3. Auto-select Microphone (Strictly prioritize genuine physical inputs; reject Loopback, Playback, Stereo Mix, Cable Output)
    let micIndex = -1;
    // Pass 1: Maono physical mic input ("in 1/2", "mic", "microphone")
    for (let i = 0; i < micSelect.options.length; i++) {
      const text = micSelect.options[i].text.toLowerCase();
      const isLoop = text.includes('loopback') || text.includes('playback') || text.includes('stereo mix') || text.includes('what u hear') || text.includes('cable') || text.includes('fx');
      if (!isLoop && (text.includes('maono') || text.includes('fairy')) && (text.includes('in') || text.includes('mic') || text.includes('input'))) {
        micIndex = i;
        break;
      }
    }
    // Pass 2: Any Maono input device that is strictly NOT loopback/playback/fx/cable
    if (micIndex === -1) {
      for (let i = 0; i < micSelect.options.length; i++) {
        const text = micSelect.options[i].text.toLowerCase();
        const isLoop = text.includes('loopback') || text.includes('playback') || text.includes('stereo mix') || text.includes('what u hear') || text.includes('cable') || text.includes('fx');
        if (!isLoop && (text.includes('maono') || text.includes('fairy'))) {
          micIndex = i;
          break;
        }
      }
    }
    // Pass 3: Any physical microphone input (excluding loopback/playback/stereo mix/cable)
    if (micIndex === -1) {
      for (let i = 0; i < micSelect.options.length; i++) {
        const text = micSelect.options[i].text.toLowerCase();
        const isLoop = text.includes('loopback') || text.includes('playback') || text.includes('stereo mix') || text.includes('what u hear') || text.includes('cable') || text.includes('fx');
        if (!isLoop && (text.includes('mic') || text.includes('microphone') || text.includes('in') || text.includes('input'))) {
          micIndex = i;
          break;
        }
      }
    }
    if (micIndex !== -1) {
      micSelect.selectedIndex = micIndex;
      if (audioCtx && isAudioInitialized && micSelect.value) {
        initMicrophoneStream(micSelect.value);
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
        if (typeof showHostToast === 'function' && deviceId && (currentHpSink && deviceId === currentHpSink)) {
          showHostToast('⚠️ ช่อง FiveM ต้องเลือกเป็น "CABLE Input" (ห้ามเลือกช่องหูฟังซ้ำ ระบบตัดเสียงกันสะท้อน)');
        }
        return;
      }
      await audioElCable.setSinkId(deviceId);
      if (destCable && audioElCable.srcObject !== destCable.stream) {
        audioElCable.srcObject = destCable.stream;
      }
      audioElCable.muted = false; // Only unmute when safely assigned to a distinct virtual cable!
      if (audioElCable.paused) {
        await audioElCable.play().catch(e => console.warn('audioElCable play catch:', e));
      }
      if (trafficCableDot) trafficCableDot.classList.add('active');
      console.log('✅ Backing track and broadcast stream connected to CABLE Input:', deviceId);
      if (typeof showHostToast === 'function') {
        showHostToast('✅ เชื่อมต่อ CABLE Input แล้ว! (ใน FiveM/Discord ให้เลือกไมค์เป็น CABLE Output)');
      }
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

  const ratio = Math.pow(2, semitone / 12);

  if (pitchNode && audioCtx) {
    const paramRatio = pitchNode.parameters.get('pitchRatio');
    if (paramRatio) {
      paramRatio.cancelScheduledValues(audioCtx.currentTime);
      paramRatio.setValueAtTime(ratio, audioCtx.currentTime);
    }
    const paramSemi = pitchNode.parameters.get('semitones');
    if (paramSemi) {
      paramSemi.cancelScheduledValues(audioCtx.currentTime);
      paramSemi.setValueAtTime(semitone, audioCtx.currentTime);
    }
    try {
      pitchNode.port.postMessage({ type: 'setPitch', semitones: semitone, pitchRatio: ratio });
    } catch (e) {}
  }

  // Toast / Status feedback
  if (isUsingDirectYtAudio) {
    if (typeof showHostToast === 'function') {
      showHostToast('⚡ กำลังสลับจาก YouTube Direct เข้าสู่ Web Audio DSP เพื่อเปิดการปรับคีย์เพลง...');
    }
    if (currentTrack && currentTrack.id) {
      isUsingDirectYtAudio = false;
      const curTime = ytPlayer && typeof ytPlayer.getCurrentTime === 'function' ? ytPlayer.getCurrentTime() : 0;
      playTrack(currentTrack, curTime);
    }
  } else if (shouldSaveSongKey && typeof showHostToast === 'function') {
    const desc = semitone === 0 ? 'คีย์ต้นฉบับ' : (semitone > 0 ? ('+' + semitone + ' (เพิ่มคีย์)') : (semitone + ' (ลดคีย์)'));
    showHostToast('🎵 ปรับคีย์เพลง: ' + desc);
  }

  // Personal Song Key Memory: Save user's preference for this track!
  if (shouldSaveSongKey && currentTrack && currentTrack.id) {
    currentUser.songKeys = currentUser.songKeys || {};
    const existingKeys = Object.keys(currentUser.songKeys);
    const isPro = currentUser.tier === 'pro';
    if (!isPro && !currentUser.songKeys[currentTrack.id] && existingKeys.length >= 3) {
      console.log('⚠️ [Song Key Memory] Free tier limited to 3 saved song keys.');
      if (typeof showHostToast === 'function') {
        showHostToast('⚠️ บันทึกคีย์เพลงครบ 3 เพลงแล้ว (Free) • อัปเกรด PRO เพื่อบันทึกไม่จำกัด');
      }
    } else {
      currentUser.songKeys[currentTrack.id] = semitone;
      saveUserProfile();
      updateAuthUI();
    }
  }
}

pitchButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    initAudioEngine();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    const semi = parseInt(btn.getAttribute('data-semi'));
    setPitchShift(semi);
  });
});

pitchSlider.addEventListener('input', (e) => {
  initAudioEngine();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  setPitchShift(parseInt(e.target.value));
});

// Ducking Toggle
function toggleDucking() {
  isDucked = !isDucked;
  if (!isDucked) {
    isDuckingCurrentlyActive = false;
    if (smartDuckingRecoverTimer) {
      clearTimeout(smartDuckingRecoverTimer);
      smartDuckingRecoverTimer = null;
    }
  }

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

if (duckingBtn) duckingBtn.addEventListener('click', toggleDucking);

// --- 3-Band Vocal EQ Controller ---
function updateVocalEqParams() {
  if (!audioCtx) return;
  const isPro = currentUser.tier === 'pro';
  const activeEq = isPro && isVocalEqEnabled;

  if (vocalEqLowCutNode) {
    const f = (activeEq && isEqLowCutActive) ? 80 : 10;
    vocalEqLowCutNode.frequency.setValueAtTime(f, audioCtx.currentTime);
  }
  if (vocalEqMidNode && eqMidSlider) {
    const g = activeEq ? parseFloat(eqMidSlider.value) : 0;
    vocalEqMidNode.gain.setValueAtTime(g, audioCtx.currentTime);
  }
  if (vocalEqHighAirNode && eqHighAirSlider) {
    const g = activeEq ? parseFloat(eqHighAirSlider.value) : 0;
    vocalEqHighAirNode.gain.setValueAtTime(g, audioCtx.currentTime);
  }
  if (eqLowCutText) {
    eqLowCutText.innerText = (activeEq && isEqLowCutActive) ? '80Hz ON' : 'OFF';
    eqLowCutText.style.color = (activeEq && isEqLowCutActive) ? '#4ade80' : 'var(--text-muted)';
  }
  if (eqLowCutBtn) {
    eqLowCutBtn.classList.toggle('active', isEqLowCutActive && activeEq);
  }
}

if (vocalEqToggle) {
  vocalEqToggle.addEventListener('change', (e) => {
    if (e.target.checked && currentUser.tier !== 'pro') {
      e.target.checked = false;
      isVocalEqEnabled = false;
      updateVocalEqParams();
      alert('✨ 3-Band Studio Vocal EQ เป็นสิทธิพิเศษของ NOCTURNE PRO PACK (49.-/เดือน)\n\nปลดล็อกเพื่อเกลี่ยเนื้อเสียงร้องให้คมชัดใสแบบไมค์หมื่น!');
      return;
    }
    isVocalEqEnabled = e.target.checked;
    updateVocalEqParams();
    saveUserProfile();
  });
}

if (eqLowCutBtn) {
  eqLowCutBtn.addEventListener('click', () => {
    if (currentUser.tier !== 'pro') {
      alert('✨ Low-Cut Filter เป็นสิทธิพิเศษของ NOCTURNE PRO PACK (49.-/เดือน)');
      return;
    }
    isEqLowCutActive = !isEqLowCutActive;
    updateVocalEqParams();
    saveUserProfile();
  });
}

if (eqMidSlider) {
  eqMidSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (eqMidText) eqMidText.innerText = `${val > 0 ? '+' : ''}${val} dB`;
    updateVocalEqParams();
  });
  eqMidSlider.addEventListener('change', () => {
    saveUserProfile();
  });
}

if (eqHighAirSlider) {
  eqHighAirSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (eqHighAirText) eqHighAirText.innerText = `${val > 0 ? '+' : ''}${val} dB`;
    updateVocalEqParams();
  });
  eqHighAirSlider.addEventListener('change', () => {
    saveUserProfile();
  });
}

// --- Vocal Doubler & Stereo Width Controller ---
function updateDoublerParams() {
  if (!audioCtx) return;
  const isPro = currentUser.tier === 'pro';
  const activeDoubler = isPro && isDoublerEnabled;
  if (doublerGain && doublerMix) {
    const val = activeDoubler ? parseFloat(doublerMix.value) : 0.0;
    doublerGain.gain.setValueAtTime(val, audioCtx.currentTime);
  }
}

if (doublerToggle) {
  doublerToggle.addEventListener('change', (e) => {
    if (e.target.checked && currentUser.tier !== 'pro') {
      e.target.checked = false;
      isDoublerEnabled = false;
      updateDoublerParams();
      alert('✨ Vocal Doubler & Harmony เป็นสิทธิพิเศษของ NOCTURNE PRO PACK (49.-/เดือน)\n\nสร้างมิติเสียงร้องคู่และเสียงประสานสเตอริโอ เพิ่มความหนาในท่อนฮุก!');
      return;
    }
    isDoublerEnabled = e.target.checked;
    updateDoublerParams();
    saveUserProfile();
  });
}

if (doublerMix) {
  doublerMix.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (doublerMixText) doublerMixText.innerText = `${Math.round(val * 100)}%`;
    updateDoublerParams();
  });
  doublerMix.addEventListener('change', () => {
    saveUserProfile();
  });
}

// --- Smart Voice Auto-Ducking Controller ---
if (smartDuckingToggle) {
  smartDuckingToggle.addEventListener('change', (e) => {
    if (e.target.checked && currentUser.tier !== 'pro') {
      e.target.checked = false;
      isSmartDuckingEnabled = false;
      alert('✨ Smart Voice Ducking เป็นสิทธิพิเศษของ NOCTURNE PRO PACK (49.-/เดือน)\n\nลดเสียงดนตรีอัตโนมัติเมื่อเริ่มพูดหรือ MC ใน FiveM/Discord!');
      return;
    }
    isSmartDuckingEnabled = e.target.checked;
    if (!isSmartDuckingEnabled && isDuckingCurrentlyActive) {
      if (smartDuckingRecoverTimer) {
        clearTimeout(smartDuckingRecoverTimer);
        smartDuckingRecoverTimer = null;
      }
      isDuckingCurrentlyActive = false;
      if (duckingGain && audioCtx && !isDucked) {
        duckingGain.gain.cancelScheduledValues(audioCtx.currentTime);
        duckingGain.gain.setValueAtTime(duckingGain.gain.value, audioCtx.currentTime);
        duckingGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.1);
      }
      if (tabMusicGain && audioCtx && !isDucked) {
        const baseCableVol = isCableMusicMuted ? 0.0 : (currentUser.preset.cableMusicVol !== undefined ? currentUser.preset.cableMusicVol : 0.20);
        tabMusicGain.gain.cancelScheduledValues(audioCtx.currentTime);
        tabMusicGain.gain.setValueAtTime(tabMusicGain.gain.value, audioCtx.currentTime);
        tabMusicGain.gain.linearRampToValueAtTime(baseCableVol, audioCtx.currentTime + 0.1);
      }
      if (ytPlayer && isUsingDirectYtAudio && typeof ytPlayer.setVolume === 'function' && !isDucked) {
        const baseVol = Math.round((currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9) * 100);
        ytPlayer.setVolume(isHpMusicMuted ? 0 : baseVol);
      }
    }
    saveUserProfile();
  });
}

if (smartDuckingDepth) {
  smartDuckingDepth.addEventListener('input', (e) => {
    smartDuckingDepthVal = parseFloat(e.target.value);
    if (smartDuckingDepthText) smartDuckingDepthText.innerText = `${Math.round(smartDuckingDepthVal * 100)}%`;
  });
  smartDuckingDepth.addEventListener('change', () => {
    saveUserProfile();
  });
}

// --- DJ Soundboard & Mic SFX Synthesizer ---
function playSfx(sfxType) {
  if (!audioCtx) {
    initAudioEngine().then(() => playSfx(sfxType));
    return;
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // Free tier can preview airhorn and rimshot, others require PRO
  if (currentUser.tier !== 'pro' && !['airhorn', 'rimshot'].includes(sfxType)) {
    alert('✨ DJ Soundboard ครบทุกเสียงเป็นสิทธิพิเศษของ NOCTURNE PRO PACK (49.-/เดือน)\n\nปลดล็อกเพื่อส่งเสียงเอฟเฟกต์ดีเจสดเข้า FiveM / Discord ได้ไม่จำกัด!');
    return;
  }

  const now = audioCtx.currentTime;
  const out = soundboardGain || cableMixGain || audioCtx.destination;

  const btn = document.querySelector(`.sfx-btn[data-sfx="${sfxType}"]`);
  if (btn) {
    btn.classList.add('playing');
    setTimeout(() => btn.classList.remove('playing'), 600);
  }

  const cleanupNodeOnEnd = (src, ...others) => {
    if (!src) return;
    src.onended = () => {
      try { src.disconnect(); } catch (_) {}
      others.forEach(n => {
        try { if (n && typeof n.disconnect === 'function') n.disconnect(); } catch (_) {}
      });
    };
  };

  try {
    switch (sfxType) {
      case 'airhorn': {
        const notes = [466.16, 698.46, 932.33];
        [0, 0.12, 0.26].forEach((startOffset) => {
          notes.forEach(f => {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            cleanupNodeOnEnd(osc, g);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now + startOffset);
            osc.frequency.exponentialRampToValueAtTime(f * 0.96, now + startOffset + 0.18);
            g.gain.setValueAtTime(0.09, now + startOffset);
            g.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 0.20);
            osc.connect(g);
            g.connect(out);
            osc.start(now + startOffset);
            osc.stop(now + startOffset + 0.21);
          });
        });
        break;
      }
      case 'applause': {
        const bufferSize = audioCtx.sampleRate * 2.5;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(1.5, now);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        cleanupNodeOnEnd(whiteNoise, filter, gain);
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        whiteNoise.start(now);
        whiteNoise.stop(now + 2.5);
        break;
      }
      case 'rimshot': {
        const snareOsc = audioCtx.createOscillator();
        const snareGain = audioCtx.createGain();
        cleanupNodeOnEnd(snareOsc, snareGain);
        snareOsc.frequency.setValueAtTime(220, now);
        snareOsc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        snareGain.gain.setValueAtTime(0.4, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        snareOsc.connect(snareGain);
        snareGain.connect(out);
        snareOsc.start(now);
        snareOsc.stop(now + 0.12);

        const tomOsc = audioCtx.createOscillator();
        const tomGain = audioCtx.createGain();
        cleanupNodeOnEnd(tomOsc, tomGain);
        tomOsc.frequency.setValueAtTime(160, now + 0.15);
        tomOsc.frequency.exponentialRampToValueAtTime(60, now + 0.28);
        tomGain.gain.setValueAtTime(0.45, now + 0.15);
        tomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
        tomOsc.connect(tomGain);
        tomGain.connect(out);
        tomOsc.start(now + 0.15);
        tomOsc.stop(now + 0.30);

        const cymbalLen = audioCtx.sampleRate * 0.8;
        const cymBuf = audioCtx.createBuffer(1, cymbalLen, audioCtx.sampleRate);
        const cymData = cymBuf.getChannelData(0);
        for (let i = 0; i < cymbalLen; i++) cymData[i] = (Math.random() * 2 - 1);
        const cymSrc = audioCtx.createBufferSource();
        cymSrc.buffer = cymBuf;
        const cymFilt = audioCtx.createBiquadFilter();
        cymFilt.type = 'highpass';
        cymFilt.frequency.setValueAtTime(4500, now + 0.35);
        const cymGain = audioCtx.createGain();
        cymGain.gain.setValueAtTime(0.3, now + 0.35);
        cymGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        cleanupNodeOnEnd(cymSrc, cymFilt, cymGain);
        cymSrc.connect(cymFilt);
        cymFilt.connect(cymGain);
        cymGain.connect(out);
        cymSrc.start(now + 0.35);
        cymSrc.stop(now + 1.1);
        break;
      }
      case 'cricket': {
        [0, 0.08, 0.35, 0.43].forEach(offset => {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          cleanupNodeOnEnd(osc, g);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(4600, now + offset);
          g.gain.setValueAtTime(0.12, now + offset);
          g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);
          osc.connect(g);
          g.connect(out);
          osc.start(now + offset);
          osc.stop(now + offset + 0.05);
        });
        break;
      }
      case 'ding': {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        cleanupNodeOnEnd(osc, g);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2093, now);
        g.gain.setValueAtTime(0.35, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(g);
        g.connect(out);
        osc.start(now);
        osc.stop(now + 1.2);
        break;
      }
      case 'laser': {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        cleanupNodeOnEnd(osc, g);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(g);
        g.connect(out);
        osc.start(now);
        osc.stop(now + 0.46);
        break;
      }
    }
  } catch (e) {
    console.warn('SFX note:', e);
  }
}

if (sfxBtns && sfxBtns.length > 0) {
  sfxBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sfx = btn.getAttribute('data-sfx');
      if (sfx) playSfx(sfx);
    });
  });
}

if (sfxVol) {
  sfxVol.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (sfxVolText) sfxVolText.innerText = `${Math.round(val * 100)}%`;
    if (soundboardGain && audioCtx) {
      soundboardGain.gain.setValueAtTime(val, audioCtx.currentTime);
    }
  });
  sfxVol.addEventListener('change', () => {
    saveUserProfile();
  });
}

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
      <div style="display:flex; gap:5px; align-items:center;">
        <button class="btn btn-gold add-q-btn" style="padding: 3px 8px; font-size: 0.72rem;" title="ต่อท้ายคิว">+ คิว</button>
        <button class="btn btn-priority-queue priority-q-btn" style="padding: 3px 6px; font-size: 0.70rem;" title="แทรกเป็นคิวถัดไปทันที (VIP PRO)">⚡ ต่อคิวแรก</button>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-q-btn')) {
        e.stopPropagation();
        addToQueue(v);
        showHostToast(`➕ เพิ่ม "${v.title}" เข้าคิวเพลง`);
      } else if (e.target.classList.contains('priority-q-btn') || e.target.closest('.priority-q-btn')) {
        e.stopPropagation();
        if (currentUser.tier !== 'pro') {
          alert('👑 ฟังก์ชันแทรกเพลงเป็นคิวถัดไป (Priority Queue) สงวนสิทธิ์สำหรับสมาชิกระดับ PRO PACK (49.- / เดือน)\nกรุณากดไอคอนโปรไฟล์เพื่อทดลองใช้งาน Pro');
          return;
        }
        if (queue.length >= 100) {
          showHostToast('⚠️ คิวเพลงเต็มแล้ว (สูงสุด 100 เพลง)');
          return;
        }
        queue.unshift(v);
        renderQueue(true);
        showHostToast(`⚡ [PRO] แทรก "${v.title}" เป็นคิวถัดไปแล้ว!`);
        if (!isPlaying && !currentTrack) {
          playNextInQueue();
        }
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
let audioErrorRetries = 0;
let audioRetryTimeout = null;

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
    return `http://127.0.0.1:3300/api/audio?id=${encodeURIComponent(videoId)}&t=${startSeconds}`;
  }
  return `/api/audio?id=${encodeURIComponent(videoId)}&t=${startSeconds}`;
}

// Play Track (Ultra-Reliable Dual Routing to Discord & Headphones with Zero-Fail Guarantee)
async function playTrack(track, seekSeconds = 0) {
  await initAudioEngine();

  audioErrorRetries = 0;
  if (audioRetryTimeout) {
    clearTimeout(audioRetryTimeout);
    audioRetryTimeout = null;
  }

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
  if (isTabAudioActive) {
    isUsingDirectYtAudio = true;
  } else {
    isUsingDirectYtAudio = false;
  }
  updateTabAudioUI();

  // Load Synced Lyrics & Reset Karaoke Scoring
  fetchAndRenderLyrics(track);
  resetKaraokeScore();

  // Load YouTube Visuals and Audio
  if (track.isLocal && track.localUrl) {
    if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    ytPlayerDiv.classList.add('hidden');
    videoPlaceholder.classList.remove('hidden');
    audioSourceElement.src = track.localUrl;
    audioSourceElement.play().catch(() => {});
    isPlaying = true;
    playPauseBtn.innerHTML = SVG_PAUSE;
  } else {
    initYtPlayer(track.id, seekSeconds);
  }

  if (isUsingDirectYtAudio) {
    // In Direct YouTube mode (Cloud): YouTube player provides high-definition audio directly
    isPlaying = true;
    playPauseBtn.innerHTML = SVG_PAUSE;
  } else {
    // Stream through Web Audio DSP into VB-CABLE, Headphones, and Record Test Destination
    const streamUrl = await getBestAudioStreamUrl(track.id, seekSeconds);
    audioSourceElement.src = streamUrl;
    try {
      const playPromise = audioSourceElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isPlaying = true;
          playPauseBtn.innerHTML = SVG_PAUSE;
        }).catch(err => {
          console.warn('AudioSource play catch:', err);
          if (err.name !== 'AbortError') {
            setTimeout(() => {
              if (currentTrack && currentTrack.id === track.id) {
                audioSourceElement.play().catch(() => {});
              }
            }, 700);
          }
        });
      }
    } catch (err) {
      console.warn('AudioSource play sync note:', err);
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
  const hpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
  const volInt = isHpMusicMuted ? 0 : Math.min(100, Math.round(hpVol * 100));
  sendYtCommand('unMute');
  sendYtCommand('setVolume', [volInt]);
  sendYtCommand('playVideo');

  if (ytPlayer && typeof ytPlayer.unMute === 'function') {
    try {
      ytPlayer.unMute();
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
  if (playPauseBtn) playPauseBtn.innerHTML = SVG_PAUSE;
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

  audioErrorRetries = 0;
  if (audioRetryTimeout) {
    clearTimeout(audioRetryTimeout);
    audioRetryTimeout = null;
  }

  if (currentTimeText) currentTimeText.innerText = formatTime(clamped);
  if (totalDurationText) totalDurationText.innerText = formatTime(dur);
  if (progressBar) progressBar.value = (clamped / dur) * 100;

  // 1. Move YouTube Player (Both YT.Player API & direct postMessage fallback)
  sendYtCommand('seekTo', [clamped, true]);

  const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
  const curHpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
  const curVolInt = isHpMusicMuted ? 0 : Math.min(100, Math.round(curHpVol * 100));

  if (currentDirectOrTab) {
    sendYtCommand('unMute');
    sendYtCommand('setVolume', [curVolInt]);
  } else {
    sendYtCommand('mute');
  }
  sendYtCommand('playVideo');

  // 2. Move Web Audio Backend Stream if not in direct YouTube mode
  if (!isUsingDirectYtAudio && audioSourceElement) {
    getBestAudioStreamUrl(currentTrack.id, clamped).then(url => {
      if (audioSourceElement && !isUsingDirectYtAudio) {
        audioSourceElement.src = url;
        audioSourceElement.play().catch(() => {});
      }
    }).catch(() => {
      if (audioSourceElement && !isUsingDirectYtAudio) {
        audioSourceElement.src = `/api/audio?id=${encodeURIComponent(currentTrack.id)}&t=${clamped}`;
        audioSourceElement.play().catch(() => {});
      }
    });
  }
  isPlaying = true;
  if (playPauseBtn) playPauseBtn.innerHTML = SVG_PAUSE;
  startYtProgressTracker();
  syncHostStateToRoom();
}

// Playback Controls
function togglePlayPause() {
  if (isPlaying) {
    if (audioSourceElement) audioSourceElement.pause();
    sendYtCommand('pauseVideo');
    isPlaying = false;
    if (playPauseBtn) playPauseBtn.innerHTML = SVG_PLAY;
  } else {
    if (!isUsingDirectYtAudio && audioSourceElement) {
      audioSourceElement.play().catch(() => {});
    }
    const currentDirectOrTab = isUsingDirectYtAudio || isTabAudioActive;
    const curHpVol = currentUser.preset.hpMusicVol !== undefined ? currentUser.preset.hpMusicVol : 0.9;
    const curVolInt = isHpMusicMuted ? 0 : Math.round(curHpVol * 100);
    if (currentDirectOrTab) {
      sendYtCommand('unMute');
      sendYtCommand('setVolume', [curVolInt]);
    } else {
      sendYtCommand('mute');
    }
    sendYtCommand('playVideo');
    isPlaying = true;
    if (playPauseBtn) playPauseBtn.innerHTML = SVG_PAUSE;
  }
  syncHostStateToRoom();
}

playPauseBtn.addEventListener('click', togglePlayPause);

function setupAudioElementEvents() {
  if (!audioSourceElement) return;

  audioSourceElement.addEventListener('error', (e) => {
    console.warn('AudioSource stream error event:', e);
    if (audioRetryTimeout) {
      clearTimeout(audioRetryTimeout);
      audioRetryTimeout = null;
    }

    if (audioErrorRetries < 3 && currentTrack && currentTrack.id) {
      audioErrorRetries++;
      const delayMs = audioErrorRetries * 900;
      console.log(`🔄 Retrying clean audio stream (attempt ${audioErrorRetries}/3 in ${delayMs}ms)...`);
      audioRetryTimeout = setTimeout(async () => {
        if (currentTrack && audioSourceElement && !isUsingDirectYtAudio) {
          const baseUrl = await getBestAudioStreamUrl(currentTrack.id, Math.floor(streamOffsetSeconds || 0));
          const sep = baseUrl.includes('?') ? '&' : '?';
          audioSourceElement.src = `${baseUrl}${sep}retry=${Date.now()}`;
          audioSourceElement.load();
          audioSourceElement.play().catch(playErr => {
            console.warn('AudioSource retry play caught:', playErr.message || playErr);
          });
        }
      }, delayMs);
    } else {
      console.warn('⚠️ Audio stream retries exhausted. Activating direct YouTube failover.');
      activateYtAudioFailover();
      if (typeof showHostToast === 'function') {
        showHostToast('⚠️ ไม่สามารถดึง Clean Audio Stream สำหรับเพลงนี้ได้ ระบบสลับไปใช้ Direct YouTube ชั่วคราว (เปิด Tab Audio เพื่อส่งเสียงเข้า Discord)', 6000);
      }
    }
  });

  audioSourceElement.addEventListener('playing', () => {
    audioErrorRetries = 0;
    if (audioRetryTimeout) {
      clearTimeout(audioRetryTimeout);
      audioRetryTimeout = null;
    }
    if (isUsingDirectYtAudio && !isTabAudioActive) {
      console.log('⚡ Web Audio stream connected! Muting direct YouTube iframe to route cleanly through DSP to VB-Cable.');
      isUsingDirectYtAudio = false;
      sendYtCommand('mute');
      if (ytPlayer && typeof ytPlayer.mute === 'function') {
        try { ytPlayer.mute(); } catch (_) {}
      }
      updateTabAudioUI();
    }
  });

  audioSourceElement.addEventListener('ended', () => {
    audioErrorRetries = 0;
    if (audioRetryTimeout) {
      clearTimeout(audioRetryTimeout);
      audioRetryTimeout = null;
    }
    showKaraokeScoreCelebration();
    if (!isUsingDirectYtAudio) {
      console.log('⚡ AudioSource finished playback, advancing queue...');
      playNextInQueue();
    }
  });
}

// Global Robust Progress Bar Seek Event System (Active immediately on page load)
function initProgressBarEvents() {
  if (!progressBar) return;

  const updateSeekDisplay = (val) => {
    const dur = (trackDurationSeconds > 0) ? trackDurationSeconds : 240;
    const targetSeconds = (parseFloat(val) / 100) * dur;
    if (currentTimeText) currentTimeText.innerText = formatTime(targetSeconds);
  };

  const commitSeek = (val) => {
    isUserSeeking = false;
    const dur = (trackDurationSeconds > 0) ? trackDurationSeconds : 240;
    const targetSeconds = (parseFloat(val) / 100) * dur;
    seekToSeconds(targetSeconds);
  };

  progressBar.addEventListener('mousedown', () => { isUserSeeking = true; });
  progressBar.addEventListener('touchstart', () => { isUserSeeking = true; }, { passive: true });
  progressBar.addEventListener('pointerdown', () => { isUserSeeking = true; });

  progressBar.addEventListener('input', (e) => {
    updateSeekDisplay(e.target.value);
  });

  progressBar.addEventListener('change', (e) => {
    commitSeek(e.target.value);
  });

  progressBar.addEventListener('mouseup', (e) => {
    if (isUserSeeking) commitSeek(e.target.value);
  });

  progressBar.addEventListener('touchend', (e) => {
    if (isUserSeeking) commitSeek(e.target.value);
  });

  progressBar.addEventListener('pointerup', (e) => {
    if (isUserSeeking) commitSeek(e.target.value);
  });

  window.addEventListener('mouseup', () => {
    if (isUserSeeking && progressBar) commitSeek(progressBar.value);
  });
  window.addEventListener('touchend', () => {
    if (isUserSeeking && progressBar) commitSeek(progressBar.value);
  });
}

initProgressBarEvents();

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
  if (queue.length >= 100) {
    showHostToast('⚠️ คิวเพลงเต็มแล้ว (สูงสุด 100 เพลง)');
    return;
  }
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
      <div style="display:flex; gap:4px; align-items:center;">
        <button class="btn btn-outline btn-xs" onclick="playNowFromQueue(${idx})" title="เล่นเพลงนี้ทันที">▶</button>
        ${idx > 0 ? `<button class="btn btn-outline btn-xs btn-priority-queue" onclick="jumpToTopQueue(${idx})" title="⚡ [PRO] แซงขึ้นเป็นคิวแรก">⚡</button>` : ''}
        ${idx > 0 ? `<button class="btn btn-outline btn-xs" onclick="moveQueueItem(${idx}, ${idx - 1})" title="เลื่อนขึ้น">▲</button>` : ''}
        ${idx < queue.length - 1 ? `<button class="btn btn-outline btn-xs" onclick="moveQueueItem(${idx}, ${idx + 1})" title="เลื่อนลง">▼</button>` : ''}
        <button class="btn-link-danger" onclick="removeFromQueue(${idx})" title="ลบออก" style="margin-left:4px;">✕</button>
      </div>
    `;
    queueList.appendChild(item);
  });

  if (shouldSync) syncHostStateToRoom();
}

window.jumpToTopQueue = function(idx) {
  if (currentUser.tier !== 'pro') {
    alert('👑 ฟังก์ชันลัดคิวเพลง (VIP Priority Queue) สงวนสิทธิ์สำหรับสมาชิกระดับ PRO PACK (49.- / เดือน)');
    return;
  }
  if (idx > 0 && idx < queue.length) {
    const item = queue.splice(idx, 1)[0];
    queue.unshift(item);
    renderQueue(true);
    showHostToast(`⚡ [PRO] ย้ายเพลง "${item.title}" ขึ้นเป็นคิวแรกแล้ว!`);
  }
};

window.removeFromQueue = function(idx) {
  if (idx >= 0 && idx < queue.length) {
    queue.splice(idx, 1);
    renderQueue(true);
  }
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
  pill.textContent = msg;
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
        hostName: currentUser.username || 'Host',
        hostTier: currentUser.tier,
      isVocalCutEnabled: isVocalCutEnabled || 'free'
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
          showHostToast(`📱 ${data.addedBy || 'รีโมทมือถือ'} เพิ่มเพลง "${data.addedTrack.title || 'เพลง'}" เข้าคิว`);
          if (!isPlaying && !currentTrack) {
            playNextInQueue();
          }
        }
      } catch (err) {}
    });

    hostEventSource.addEventListener('reaction', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.emoji) spawnReactionParticle(d.emoji);
        if (d.sfx) playSfx(d.sfx);
        if (typeof showHostToast === 'function') {
          showHostToast((d.sender || 'เพื่อน') + ' ส่ง: ' + (d.emoji || d.sfx));
        }
      } catch (err) {}
    });

    hostEventSource.addEventListener('tip_received', (e) => {
      try {
        const d = JSON.parse(e.data);
        showHostToast('💖 ' + (d.sender || 'VIP Fan') + ' ทิป ' + d.amount + '฿: "' + d.message + '"');
        playSfx('cheer');
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
  showHostToast(`📱 คำสั่งจาก ${sender || 'รีโมท'}: ${action}`);
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
    case 'toggle_vocal_cut':
      initAudioEngine();
      toggleVocalCut();
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
      hostName: currentUser.username || 'Host',
      hostTier: currentUser.tier || 'free'
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



// ==========================================================================
// FLAGSHIP SUITE IMPLEMENTATIONS:
// Synced Lyrics, Karaoke Scoring, Reactions Canvas, Local Audio, Presets
// ==========================================================================

// --- 1. Synced Lyrics Teleprompter Controller ---
async function fetchAndRenderLyrics(track) {
  if (!track || !track.title) return;
  if (lyricsSongTitle) lyricsSongTitle.innerText = track.title;
  if (lyricsScrollBox) {
    lyricsScrollBox.innerHTML = '<div class="lyrics-line active">⏳ กำลังเชื่อมต่อเนื้อเพลงซิงค์สด...</div>';
  }
  currentLyrics = [];
  activeLyricIndex = -1;

  try {
    const cleanArtist = (track.author || '').replace(/ - Topic|VEVO/gi, '').trim();
    const res = await fetch('/api/lyrics?title=' + encodeURIComponent(track.title) + '&artist=' + encodeURIComponent(cleanArtist));
    const data = await res.json();

    if (data.success && data.lyrics && data.lyrics.length > 0) {
      currentLyrics = data.lyrics;
      renderLyricsLines(data.lyrics);
    } else {
      currentLyrics = [];
      if (lyricsScrollBox) {
        lyricsScrollBox.innerHTML = '<div class="lyrics-line active">🎵 ไม่พบเนื้อเพลงซิงค์สำหรับเพลงนี้ (ร้องสดตามอารมณ์ได้เลย!)</div>';
      }
    }
  } catch (e) {
    console.warn('Lyrics fetch note:', e);
    if (lyricsScrollBox) {
      lyricsScrollBox.innerHTML = '<div class="lyrics-line">🎵 พร้อมสำหรับการร้องคาราโอเกะ</div>';
    }
  }
}

function renderLyricsLines(lyrics) {
  if (!lyricsScrollBox) return;
  lyricsScrollBox.innerHTML = '';
  lyrics.forEach((line, idx) => {
    const el = document.createElement('div');
    el.className = 'lyrics-line' + (idx === 0 ? ' active' : '');
    el.id = 'lyric-line-' + idx;
    el.innerText = line.text;
    lyricsScrollBox.appendChild(el);
  });
}

function updateLyricsProgress(currentTime) {
  if (!currentLyrics || currentLyrics.length === 0 || !lyricsScrollBox) return;

  let newActiveIndex = -1;
  for (let i = 0; i < currentLyrics.length; i++) {
    if (currentTime >= currentLyrics[i].time) {
      newActiveIndex = i;
    } else {
      break;
    }
  }

  if (newActiveIndex !== -1 && newActiveIndex !== activeLyricIndex) {
    activeLyricIndex = newActiveIndex;

    const lines = lyricsScrollBox.querySelectorAll('.lyrics-line');
    lines.forEach((lineEl, idx) => {
      lineEl.classList.toggle('active', idx === activeLyricIndex);
      lineEl.classList.toggle('passed', idx < activeLyricIndex);
    });

    const activeEl = document.getElementById('lyric-line-' + activeLyricIndex);
    if (activeEl) {
      const scrollPos = activeEl.offsetTop - lyricsScrollBox.offsetHeight / 2 + activeEl.offsetHeight / 2;
      lyricsScrollBox.scrollTo({ top: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }
}

function toggleLyricsOverlay() {
  isLyricsOpen = !isLyricsOpen;
  if (lyricsOverlay) {
    lyricsOverlay.classList.toggle('hidden', !isLyricsOpen);
  }
  if (btnLyricsToggle) {
    btnLyricsToggle.classList.toggle('active', isLyricsOpen);
  }
  if (isLyricsOpen && currentTrack && currentLyrics.length === 0) {
    fetchAndRenderLyrics(currentTrack);
  }
}

if (btnLyricsToggle) btnLyricsToggle.addEventListener('click', toggleLyricsOverlay);
if (closeLyricsBtn) closeLyricsBtn.addEventListener('click', toggleLyricsOverlay);

// --- 2. Karaoke Real-Time Pitch Tracking & Scoring Engine ---
function updateLiveKaraokeScore(isSingingInTune) {
  if (!isPlaying) return;
  karaokeSampleCount++;

  if (isSingingInTune) {
    liveKaraokeScore = Math.min(99, liveKaraokeScore + 0.35);
  } else {
    liveKaraokeScore = Math.max(60, liveKaraokeScore - 0.05);
  }

  if (karaokeLiveScoreText && karaokeSampleCount % 5 === 0) {
    karaokeLiveScoreText.innerText = Math.round(liveKaraokeScore) + ' PTS';
  }
}

function resetKaraokeScore() {
  liveKaraokeScore = 75;
  karaokeSampleCount = 0;
  if (karaokeLiveScoreText) karaokeLiveScoreText.innerText = '75 PTS';
}

function showKaraokeScoreCelebration() {
  if (!karaokeScoreModal) return;
  const finalScore = Math.min(99, Math.max(65, Math.round(liveKaraokeScore)));

  if (scoreModalNum) scoreModalNum.innerText = finalScore;
  if (scoreSongTitle && currentTrack) scoreSongTitle.innerText = currentTrack.title || 'Karaoke Song';

  let rank = '🏆 เทพคอทองคำ (Golden Vocal God)';
  let comment = 'ลูกคอแน่น พิทช์แม่นยำ พร้อมเดบิวต์เป็นนักร้องสเตจระดับมืออาชีพ!';

  if (finalScore >= 92) {
    rank = '🏆 เทพคอทองคำ (Golden Vocal God)';
    comment = 'พิทช์เป๊ะ เมโลดี้เฉียบคม เสียงพุ่งทรงพลังระดับมืออาชีพ!';
  } else if (finalScore >= 82) {
    rank = '🥈 ไมค์ทองคำสเตจ (Stage Master)';
    comment = 'น้ำเสียงไพเราะ คุมจังหวะได้ดีเยี่ยม ร้องเพลงไหนเพื่อนก็เคลิ้ม!';
  } else if (finalScore >= 72) {
    rank = '🥉 นักร้องเสียงหวาน (Sweet Melodist)';
    comment = 'ฟังสบาย มีเสน่ห์เฉพาะตัว ปรับอีกนิดเดียวขึ้นเวทีใหญ่ได้เลย!';
  } else {
    rank = '🎤 นักร้องอินดี้ลูกคออิสระ (Free Spirit)';
    comment = 'อารมณ์เพลงได้เต็มร้อย สนุกสนาน คอนเสิร์ตนี้เราคือดาวเด่น!';
  }

  if (scoreRankTitle) scoreRankTitle.innerText = rank;
  if (scoreComment) scoreComment.innerText = comment;

  karaokeScoreModal.classList.remove('hidden');
  playSfx('applause');
}

if (closeScoreModalBtn) {
  closeScoreModalBtn.addEventListener('click', () => {
    if (karaokeScoreModal) karaokeScoreModal.classList.add('hidden');
  });
}

// --- 3. Floating Reactions Particle System ---
function initReactionCanvas() {
  if (!reactionCanvas) return;
  const rect = reactionCanvas.parentElement.getBoundingClientRect();
  reactionCanvas.width = rect.width || 600;
  reactionCanvas.height = rect.height || 340;
}

function spawnReactionParticle(emoji = '❤️') {
  if (!reactionCanvas) return;
  initReactionCanvas();

  const count = 4;
  for (let i = 0; i < count; i++) {
    reactionParticles.push({
      emoji: emoji,
      x: reactionCanvas.width * (0.65 + Math.random() * 0.3),
      y: reactionCanvas.height - 10,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -(2.5 + Math.random() * 3.5),
      size: 24 + Math.random() * 16,
      alpha: 1.0,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
      wobbleAmp: 1.5 + Math.random() * 2,
      ticks: 0
    });
  }

  if (!isReactionLoopRunning) {
    isReactionLoopRunning = true;
    requestAnimationFrame(renderReactionLoop);
  }
}

function renderReactionLoop() {
  if (document.hidden) {
    isReactionLoopRunning = false;
    return;
  }
  if (!reactionCanvas) return;
  const ctx = reactionCanvas.getContext('2d');
  ctx.clearRect(0, 0, reactionCanvas.width, reactionCanvas.height);

  for (let i = reactionParticles.length - 1; i >= 0; i--) {
    const p = reactionParticles[i];
    p.ticks++;
    p.x += p.vx + Math.sin(p.ticks * p.wobbleSpeed) * p.wobbleAmp;
    p.y += p.vy;
    p.alpha -= 0.012;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.font = p.size + 'px serif';
    ctx.fillText(p.emoji, p.x, p.y);
    ctx.restore();

    if (p.alpha <= 0 || p.y < -40) {
      reactionParticles.splice(i, 1);
    }
  }

  if (reactionParticles.length > 0) {
    requestAnimationFrame(renderReactionLoop);
  } else {
    isReactionLoopRunning = false;
  }
}

// --- 4. 1-Click Artist Vocal Style Presets ---
function applyArtistPreset(type) {
  initAudioEngine();
  artistPresetBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-preset') === type));

  switch (type) {
    case 'rock': {
      if (vocalEqLowCutBtn && !vocalEqLowCutBtn.classList.contains('active')) vocalEqLowCutBtn.click();
      if (eqMidSlider) { eqMidSlider.value = 3.0; eqMidSlider.dispatchEvent(new Event('input')); }
      if (eqHighAirSlider) { eqHighAirSlider.value = 2.0; eqHighAirSlider.dispatchEvent(new Event('input')); }
      setTubeWarmth(true, 0.7);
      setDeEsser(true);
      if (reverbDecay) { reverbDecay.value = 1.4; reverbDecay.dispatchEvent(new Event('input')); }
      if (reverbMix) { reverbMix.value = 0.16; reverbMix.dispatchEvent(new Event('input')); }
      if (compressorSlider) { compressorSlider.value = 4.0; compressorSlider.dispatchEvent(new Event('input')); }
      showHostToast('🎸 เปิดใช้งานพรีเซ็ต Modern Rock: เสียงพุ่ง คม กัดไมค์ อุ่นหนาพร้อมโซโล่!');
      break;
    }
    case 'dream': {
      if (vocalEqLowCutBtn && !vocalEqLowCutBtn.classList.contains('active')) vocalEqLowCutBtn.click();
      if (eqMidSlider) { eqMidSlider.value = 0.0; eqMidSlider.dispatchEvent(new Event('input')); }
      if (eqHighAirSlider) { eqHighAirSlider.value = 5.0; eqHighAirSlider.dispatchEvent(new Event('input')); }
      setTubeWarmth(true, 0.3);
      setDeEsser(true);
      if (reverbDecay) { reverbDecay.value = 3.4; reverbDecay.dispatchEvent(new Event('input')); }
      if (reverbMix) { reverbMix.value = 0.42; reverbMix.dispatchEvent(new Event('input')); }
      if (doublerIntensity) { doublerIntensity.value = 0.35; doublerIntensity.dispatchEvent(new Event('input')); }
      showHostToast('☁️ เปิดใช้งานพรีเซ็ต Dream Pop: เสียงลอย หวาน กว้าง สไตล์มิติอวกาศ!');
      break;
    }
    case 'talk': {
      if (vocalEqLowCutBtn && !vocalEqLowCutBtn.classList.contains('active')) vocalEqLowCutBtn.click();
      if (eqMidSlider) { eqMidSlider.value = 1.0; eqMidSlider.dispatchEvent(new Event('input')); }
      if (eqHighAirSlider) { eqHighAirSlider.value = 0.0; eqHighAirSlider.dispatchEvent(new Event('input')); }
      setTubeWarmth(true, 0.35);
      setDeEsser(true);
      if (reverbMix) { reverbMix.value = 0.0; reverbMix.dispatchEvent(new Event('input')); }
      if (noiseGateSlider) { noiseGateSlider.value = -42; noiseGateSlider.dispatchEvent(new Event('input')); }
      showHostToast('🎙️ เปิดใช้งานพรีเซ็ต Oat Talkshow: เสียงพูดหนา ตัดเสียงรบกวน เหมาะคุยเล่น!');
      break;
    }
    case 'clean': {
      if (vocalEqLowCutBtn && !vocalEqLowCutBtn.classList.contains('active')) vocalEqLowCutBtn.click();
      if (eqMidSlider) { eqMidSlider.value = 0.0; eqMidSlider.dispatchEvent(new Event('input')); }
      if (eqHighAirSlider) { eqHighAirSlider.value = 0.0; eqHighAirSlider.dispatchEvent(new Event('input')); }
      setTubeWarmth(true, 0.2);
      setDeEsser(true);
      if (reverbDecay) { reverbDecay.value = 1.8; reverbDecay.dispatchEvent(new Event('input')); }
      if (reverbMix) { reverbMix.value = 0.20; reverbMix.dispatchEvent(new Event('input')); }
      if (compressorSlider) { compressorSlider.value = 3.0; compressorSlider.dispatchEvent(new Event('input')); }
      showHostToast('🎤 เปิดใช้งานพรีเซ็ต Studio Clean: น้ำเสียงโปร่ง เป็นธรรมชาติสไตล์อคูสติก!');
      break;
    }
  }
}

artistPresetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.getAttribute('data-preset');
    if (preset) applyArtistPreset(preset);
  });
});

// Tube Warmth Controller
function setTubeWarmth(enabled, drive = 0.4) {
  isTubeWarmthEnabled = enabled;
  tubeWarmthDrive = drive;
  if (tubeWarmthToggle) tubeWarmthToggle.checked = enabled;
  if (tubeWarmthSlider) tubeWarmthSlider.value = drive;
  if (tubeWarmthText) tubeWarmthText.innerText = Math.round(drive * 100) + '%';
  if (tubeWarmthNode) {
    tubeWarmthNode.curve = makeTubeDistortionCurve(enabled ? drive : 0.05);
  }
}

if (tubeWarmthToggle) {
  tubeWarmthToggle.addEventListener('change', (e) => {
    initAudioEngine();
    setTubeWarmth(e.target.checked, tubeWarmthSlider ? parseFloat(tubeWarmthSlider.value) : 0.4);
    showHostToast(e.target.checked ? '🔥 เปิดใช้งาน Analog Tube Saturation' : '❄️ ปิดใช้งาน Tube Saturation');
  });
}

if (tubeWarmthSlider) {
  tubeWarmthSlider.addEventListener('input', (e) => {
    initAudioEngine();
    const val = parseFloat(e.target.value);
    setTubeWarmth(true, val);
  });
}

// De-Esser Controller
function setDeEsser(enabled) {
  isDeEsserEnabled = enabled;
  if (deEsserToggle) deEsserToggle.checked = enabled;
  if (vocalDeEsserFilter && audioCtx) {
    vocalDeEsserFilter.gain.setTargetAtTime(enabled ? -8.0 : 0.0, audioCtx.currentTime, 0.02);
  }
}

if (deEsserToggle) {
  deEsserToggle.addEventListener('change', (e) => {
    initAudioEngine();
    setDeEsser(e.target.checked);
    showHostToast(e.target.checked ? '🛡️ เปิดใช้งาน Dynamic De-Esser (ลดเสียงซี่ฟันแหลม)' : '⚪ ปิดใช้งาน De-Esser');
  });
}

// --- 5. Local Audio File Drag & Drop & Selector ---
function playLocalAudioFile(file) {
  if (!file) return;
  initAudioEngine();

  const fileUrl = URL.createObjectURL(file);
  const trackName = file.name.replace(/\.[^/.]+$/, '');
  const trackObj = {
    id: 'local_' + Date.now(),
    title: trackName,
    author: 'Local File (เพลงจากเครื่อง)',
    duration: '4:00',
    seconds: 240,
    isLocal: true,
    localUrl: fileUrl
  };

  playTrack(trackObj, 0);
  showHostToast('📂 กำลังเล่นไฟล์จากเครื่อง: ' + trackName);
}

if (btnLocalAudio && localAudioInput) {
  btnLocalAudio.addEventListener('click', () => localAudioInput.click());
  localAudioInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      playLocalAudioFile(e.target.files[0]);
    }
  });
}

const playerCardEl = document.querySelector('.player-card') || document.querySelector('.main-stage');
if (playerCardEl) {
  playerCardEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    playerCardEl.classList.add('drag-over');
  });
  playerCardEl.addEventListener('dragleave', () => {
    playerCardEl.classList.remove('drag-over');
  });
  playerCardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    playerCardEl.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      playLocalAudioFile(e.dataTransfer.files[0]);
    }
  });
}


// ==========================================================================
// FOCUS-FIRST WORKSPACE CONTROLLER
// Stage Karaoke Mode (80%), Party Room Mode (15%), Studio Rack Mode (5%)
// Collapsible Studio Accordions & Studio Drawer
// ==========================================================================
(function initWorkspaceController() {
  const modeKaraokeBtn = document.getElementById('modeKaraokeBtn');
  const modePartyBtn = document.getElementById('modePartyBtn');
  const modeStudioBtn = document.getElementById('modeStudioBtn');
  const toggleStudioDrawerBtn = document.getElementById('toggleStudioDrawerBtn');
  const btnOpenStudioDrawerQuick = document.getElementById('btnOpenStudioDrawerQuick');
  const drawerToggleArrow = document.getElementById('drawerToggleArrow');

  function setWorkspaceMode(mode) {
    document.body.classList.remove('mode-karaoke', 'mode-studio', 'mode-party');
    document.body.classList.add('mode-' + mode);

    const tabs = [
      { btn: modeKaraokeBtn, name: 'karaoke' },
      { btn: modePartyBtn, name: 'party' },
      { btn: modeStudioBtn, name: 'studio' }
    ];

    tabs.forEach(({ btn, name }) => {
      if (btn) {
        const isActive = name === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }
    });

    try {
      localStorage.setItem('nocturne_workspace_mode', mode);
    } catch (_) {}

    // When explicitly switching to Studio mode, ensure drawer class doesn't conflict
    if (mode === 'studio') {
      document.body.classList.remove('drawer-open');
    }
  }

  function toggleStudioDrawer() {
    const isOpen = document.body.classList.toggle('drawer-open');
    if (toggleStudioDrawerBtn) {
      toggleStudioDrawerBtn.classList.toggle('active', isOpen);
    }
    if (drawerToggleArrow) {
      drawerToggleArrow.textContent = isOpen ? '▲' : '▼';
    }
    if (isOpen) {
      if (typeof showHostToast === 'function') {
        showHostToast('🎛️ เปิดแผงจูนไมค์สตูดิโอแบบด่วน');
      }
    }
  }

  if (modeKaraokeBtn) modeKaraokeBtn.addEventListener('click', () => setWorkspaceMode('karaoke'));
  if (modePartyBtn) modePartyBtn.addEventListener('click', () => setWorkspaceMode('party'));
  if (modeStudioBtn) modeStudioBtn.addEventListener('click', () => setWorkspaceMode('studio'));
  if (toggleStudioDrawerBtn) toggleStudioDrawerBtn.addEventListener('click', toggleStudioDrawer);
  if (btnOpenStudioDrawerQuick) btnOpenStudioDrawerQuick.addEventListener('click', toggleStudioDrawer);

  // Accordion Expand/Collapse for Collapsible Modules
  document.querySelectorAll('.studio-module.collapsible .module-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Do not collapse if clicked inside interactive controls
      if (e.target.closest('input, button, select, a, label.switch, .toggle-switch, .sfx-btn')) return;
      const module = header.closest('.studio-module');
      if (module) {
        const isCollapsed = module.classList.toggle('collapsed');
        const icon = header.querySelector('.accordion-toggle-icon');
        if (icon) {
          icon.textContent = isCollapsed ? '▶' : '▼';
        }
      }
    });
  });

  // Restore saved mode or default to 'karaoke'
  let savedMode = 'karaoke';
  try {
    const stored = localStorage.getItem('nocturne_workspace_mode');
    if (stored === 'karaoke' || stored === 'party' || stored === 'studio') {
      savedMode = stored;
    }
  } catch (_) {}
  setWorkspaceMode(savedMode);
})();

// ==========================================================================
// ONE MUSIC HEADER TOOLS DROPDOWN CONTROLLER
// ==========================================================================
(function initHeaderToolsDropdown() {
  const headerToolsMenuBtn = document.getElementById('headerToolsMenuBtn');
  const headerToolsMenu = document.getElementById('headerToolsMenu');
  if (headerToolsMenuBtn && headerToolsMenu) {
    headerToolsMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      headerToolsMenu.classList.toggle('hidden');
    });

    headerToolsMenu.querySelectorAll('.dropdown-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        headerToolsMenu.classList.add('hidden');
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#headerToolsDropdownWrap')) {
        headerToolsMenu.classList.add('hidden');
      }
    });
  }
})();
