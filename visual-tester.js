const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const OUTPUT_DIR = 'C:\\Users\\tong3\\.gemini\\antigravity\\brain\\c738d2a2-5b97-4277-b9e2-11f940df0eed\\visual_test_results';
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let serverProcess = null;
let mainWindow = null;
const consoleLogs = [];

function logMsg(...args) {
  const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  console.log('[VisualTester]', line);
  consoleLogs.push({ time: new Date().toISOString(), message: line });
}

async function takeScreenshot(name) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const img = await mainWindow.capturePage();
    const filePath = path.join(OUTPUT_DIR, `${name}.png`);
    fs.writeFileSync(filePath, img.toPNG());
    logMsg(`📸 Screenshot saved: ${name}.png (${img.getSize().width}x${img.getSize().height})`);
    return filePath;
  } catch (err) {
    logMsg(`❌ Screenshot error (${name}):`, err.message);
  }
}

async function startServerIfNeeded() {
  const isRunning = await new Promise(resolve => {
    const req = http.get('http://127.0.0.1:3300/api/network-info', res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.abort(); resolve(false); });
  });

  if (isRunning) {
    logMsg('Local server already listening on 3300');
    return;
  }

  logMsg('Starting local backend server...');
  const { fork } = require('child_process');
  serverProcess = fork(path.join(__dirname, 'server.js'), [], { silent: true });
  await new Promise(r => setTimeout(r, 2000));
}

app.whenReady().then(async () => {
  await startServerIfNeeded();

  const sess = session.defaultSession;
  const ytFilter = {
    urls: [
      '*://*.youtube.com/*',
      '*://youtube.com/*',
      '*://*.youtube-nocookie.com/*',
      '*://youtube-nocookie.com/*',
      '*://*.googlevideo.com/*',
      '*://googlevideo.com/*',
      '*://*.ytimg.com/*',
      '*://ytimg.com/*'
    ]
  };

  sess.webRequest.onBeforeSendHeaders(ytFilter, (details, callback) => {
    const reqHeaders = Object.assign({}, details.requestHeaders);
    for (const k of Object.keys(reqHeaders)) {
      const lower = k.toLowerCase();
      if (lower === 'referer' || lower === 'origin' || lower === 'user-agent') {
        delete reqHeaders[k];
      }
    }
    reqHeaders['Referer'] = 'https://www.google.com/';
    reqHeaders['Origin'] = 'https://www.google.com';
    reqHeaders['User-Agent'] = CHROME_UA;
    callback({ cancel: false, requestHeaders: reqHeaders });
  });

  sess.webRequest.onHeadersReceived(ytFilter, (details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    for (const key of Object.keys(responseHeaders)) {
      const lower = key.toLowerCase();
      if (
        lower === 'x-frame-options' ||
        lower === 'content-security-policy' ||
        lower === 'content-security-policy-report-only' ||
        lower === 'cross-origin-embedder-policy' ||
        lower === 'cross-origin-opener-policy' ||
        lower === 'cross-origin-resource-policy'
      ) {
        delete responseHeaders[key];
      }
    }
    callback({ cancel: false, responseHeaders });
  });

  // Setup IPC Handlers matching main.js
  ipcMain.on('yt-seek', (event, seekSec) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    for (const frame of mainWindow.webContents.mainFrame.frames) {
      if (frame.url.includes('youtube.com/embed') || frame.url.includes('youtube-nocookie.com/embed')) {
        frame.executeJavaScript(`
          (() => {
            const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            const isAd = player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
            if (isAd) return; // Invariant: Never seek directly during an active YouTube advertisement!
            if (player && typeof player.seekTo === 'function') {
              player.seekTo(${Number(seekSec)}, true);
              if (typeof player.playVideo === 'function') player.playVideo();
              return;
            }
            const v = document.querySelector('video');
            if (v && v.duration && ${Number(seekSec)} <= v.duration) {
              v.currentTime = ${Number(seekSec)};
              v.play().catch(() => {});
            }
          })()
        `).catch(() => {});
      }
    }
  });

  ipcMain.on('yt-set-mute', (event, muted) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    for (const frame of mainWindow.webContents.mainFrame.frames) {
      if (frame.url.includes('youtube.com/embed') || frame.url.includes('youtube-nocookie.com/embed')) {
        frame.executeJavaScript(`
          (() => {
            const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (player) {
              if (${Boolean(muted)} && typeof player.mute === 'function') player.mute();
              if (!${Boolean(muted)} && typeof player.unMute === 'function') player.unMute();
            }
            const v = document.querySelector('video');
            if (v) v.muted = ${Boolean(muted)};
          })()
        `).catch(() => {});
      }
    }
  });

  ipcMain.handle('yt-get-ad-state', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { isAd: false, duration: 0, currentTime: 0 };
    for (const frame of mainWindow.webContents.mainFrame.frames) {
      if (frame.url.includes('youtube.com/embed') || frame.url.includes('youtube-nocookie.com/embed')) {
        try {
          const state = await frame.executeJavaScript(`
            (() => {
              const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              const isAd = !!(player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')));
              const v = document.querySelector('video');
              return {
                isAd,
                duration: v ? v.duration : (player && player.getDuration ? player.getDuration() : 0),
                currentTime: v ? v.currentTime : (player && player.getCurrentTime ? player.getCurrentTime() : 0),
                paused: v ? v.paused : true
              };
            })()
          `);
          if (state) return state;
        } catch (_) {}
      }
    }
    return { isAd: false, duration: 0, currentTime: 0 };
  });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logMsg(`[Renderer] ${message}`);
  });

  mainWindow.webContents.on('crashed', (e) => logMsg('💥 Window crashed:', e));
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => logMsg('❌ Fail load:', code, desc));

  logMsg('Loading application UI http://127.0.0.1:3300 ...');
  await mainWindow.loadURL('http://127.0.0.1:3300');
  await new Promise(r => setTimeout(r, 2000));

  // Step 1: Handle Login & Wizard
  logMsg('Bypassing / clicking login as Sukky (VIP)...');
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const vipBtn = document.getElementById('gateProVipBtn');
      if (vipBtn) {
        vipBtn.click();
      } else {
        const guestBtn = document.getElementById('gateGuestBtn');
        if (guestBtn) guestBtn.click();
      }
      // If onboarding wizard modal is visible, close it
      const wizardModal = document.getElementById('onboardingWizardModal');
      if (wizardModal) wizardModal.classList.add('hidden');
      const authModal = document.getElementById('authModal');
      if (authModal) authModal.classList.add('hidden');

      // Explicitly set Nocturne Dark theme to match the user's reproduction environment
      if (typeof applyStudioTheme === 'function') {
        applyStudioTheme('nocturne-dark');
      }
    })()
  `);

  await new Promise(r => setTimeout(r, 1000));
  await takeScreenshot('01_dashboard_logged_in');

  // Step 2: Search for "เพลงรัก Three Man Down"
  logMsg('Testing: Typing search query "เพลงรัก Three Man Down" and clicking Search...');
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const input = document.getElementById('searchInput');
      const btn = document.getElementById('searchBtn');
      if (input) input.value = 'เพลงรัก Three Man Down';
      if (btn) btn.click();
    })()
  `);

  await new Promise(r => setTimeout(r, 2000));
  await takeScreenshot('02_search_results');

  // Step 3: Click the first search result card to play
  logMsg('Clicking the first song in search results...');
  const clickedTrack = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const firstItem = document.querySelector('#searchResults .search-item, .search-item');
      if (firstItem) {
        firstItem.click();
        return { clicked: true, title: firstItem.querySelector('.search-item-title')?.innerText };
      }
      // Fallback: direct playTrack if search didn't render item in time
      const track = {
        id: 'OYPiXBIgvJ8',
        title: 'เพลงรัก - Three Man Down [Official MV]',
        author: 'GeneLab',
        seconds: 276,
        duration: '4:36'
      };
      playTrack(track, 0);
      return { clicked: false, fallback: true, title: track.title };
    })()
  `);
  logMsg('Track selection result:', clickedTrack);

  await new Promise(r => setTimeout(r, 1500));
  await takeScreenshot('03_video_at_1s');

  // Step 4: Monitor video player over 10 seconds
  logMsg('Monitoring video player & ad status (seconds 2 - 10)...');
  const snapshots = [];
  for (let s = 2; s <= 10; s++) {
    await new Promise(r => setTimeout(r, 1000));
    const snap = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const isAd = isYouTubeAdCurrentlyShowing();
        const v = getYouTubeVideoElement();
        const ifr = document.querySelector('#ytPlayerWrapper iframe, #ytPlayerDiv iframe, iframe.video-iframe');
        const audioSrc = document.getElementById('audioSourceElement');
        const placeholder = document.getElementById('videoPlaceholder');
        const wrapper = document.getElementById('ytPlayerWrapper');
        
        let iframeDocTitle = null;
        let skipBtnPresent = false;
        let skipBtnText = null;
        let adText = null;
        let ytError = null;

        if (ifr) {
          try {
            const doc = ifr.contentDocument || ifr.contentWindow?.document;
            if (doc) {
              iframeDocTitle = doc.title;
              const skip = doc.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
              if (skip) {
                skipBtnPresent = true;
                skipBtnText = skip.innerText;
              }
              const adEl = doc.querySelector('.ytp-ad-preview-text, .ytp-ad-text, .ytp-ad-duration-remaining');
              if (adEl) adText = adEl.innerText;
              const err = doc.querySelector('.ytp-error');
              if (err) ytError = err.innerText;
            }
          } catch (_) {}
        }

        return {
          second: ${s},
          hasIframe: !!ifr,
          iframeVisible: ifr ? (ifr.offsetWidth > 0 && ifr.offsetHeight > 0) : false,
          isAdShowing: isAd,
          skipBtnPresent,
          skipBtnText,
          adText,
          ytError,
          videoTime: v ? v.currentTime : null,
          videoDuration: v ? v.duration : null,
          videoPaused: v ? v.paused : null,
          videoMuted: v ? v.muted : null,
          audioSrcPaused: audioSrc ? audioSrc.paused : null,
          audioSrcTime: audioSrc ? audioSrc.currentTime : null,
          currentTimeText: document.getElementById('currentTimeText')?.innerText,
          totalDurationText: document.getElementById('totalDurationText')?.innerText,
          progressBarVal: document.getElementById('progressBar')?.value
        };
      })()
    `);
    snapshots.push(snap);
    logMsg(`Snapshot at ${s}s:`, snap);

    if (s === 4) await takeScreenshot('04_video_at_4s');
    if (s === 7) await takeScreenshot('05_video_at_7s');
    if (s === 10) await takeScreenshot('06_video_at_10s');
  }

  // Step 5: Test Clicking Skip Ad if skip button is present
  logMsg('Attempting to click Skip Ad button if present...');
  const skipResult = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const ifr = document.querySelector('#ytPlayerWrapper iframe, #ytPlayerDiv iframe, iframe.video-iframe');
      if (ifr) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow?.document;
          if (doc) {
            const skip = doc.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
            if (skip) {
              skip.click();
              return { clicked: true, text: skip.innerText };
            }
          }
        } catch (e) {
          return { clicked: false, error: e.message };
        }
      }
      return { clicked: false, note: 'No skip button found' };
    })()
  `);
  logMsg('Skip click result:', skipResult);

  await new Promise(r => setTimeout(r, 1500));
  await takeScreenshot('07_video_post_skip_or_play');

  // Step 6: Test Seeking to 25 seconds
  logMsg('Simulating user seeking to 25 seconds...');
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      seekToSeconds(25);
    })()
  `);

  await new Promise(r => setTimeout(r, 1000));
  await takeScreenshot('08_video_after_seek_to_25s');

  // Step 7: Wait 3 seconds to verify video continues playing smoothly and is NOT black!
  await new Promise(r => setTimeout(r, 3000));
  await takeScreenshot('09_video_playback_stabilized_post_seek');

  // Step 8: Detailed inspection of DOM and video element
  const finalState = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const ifr = document.querySelector('#ytPlayerWrapper iframe, #ytPlayerDiv iframe, iframe.video-iframe');
      const wrapper = document.getElementById('ytPlayerWrapper');
      let videoTag = null;
      let ytError = null;

      if (ifr) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow?.document;
          if (doc) {
            const v = doc.querySelector('video');
            const err = doc.querySelector('.ytp-error');
            if (v) {
              videoTag = {
                videoWidth: v.videoWidth,
                videoHeight: v.videoHeight,
                currentTime: v.currentTime,
                duration: v.duration,
                paused: v.paused,
                muted: v.muted,
                error: v.error ? { code: v.error.code, msg: v.error.message } : null
              };
            }
            if (err) ytError = err.innerText;
          }
        } catch (_) {}
      }

      return {
        wrapper: wrapper ? {
          offsetWidth: wrapper.offsetWidth,
          offsetHeight: wrapper.offsetHeight,
          display: window.getComputedStyle(wrapper).display,
          background: window.getComputedStyle(wrapper).backgroundColor
        } : null,
        videoTag,
        ytError,
        currentTimeText: document.getElementById('currentTimeText')?.innerText,
        totalDurationText: document.getElementById('totalDurationText')?.innerText,
        isPlaying: isPlaying,
        isUsingDirectYtAudio: isUsingDirectYtAudio
      };
    })()
  `);

  logMsg('Final Player State Inspection:', finalState);

  // Write diagnostic report
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'visual_test_report.json'),
    JSON.stringify({ finalState, snapshots, consoleLogs }, null, 2)
  );
  logMsg('Visual test complete! Report saved.');

  mainWindow.close();
  if (serverProcess) {
    try { serverProcess.kill(); } catch (_) {}
  }
  app.quit();
});
