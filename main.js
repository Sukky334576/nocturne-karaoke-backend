const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');
const http = require('http');

// Global Desktop Chrome User-Agent to bypass YouTube bot/Electron embed restrictions
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
if (app && typeof app.userAgentFallback !== 'undefined') {
  app.userAgentFallback = CHROME_UA;
}

// Chromium command line switches for flawless video decoding & zero-gesture autoplay
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;
let tray = null;
let serverInstance = null;

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Start embedded Express engine on port 3300
function startLocalServer() {
  return new Promise((resolve) => {
    try {
      if (app && typeof app.getPath === 'function') {
        process.env.NOCTURNE_DATA_DIR = path.join(app.getPath('userData'), 'data');
      }
      // Check if server is already running on port 3300
      const req = http.get('http://127.0.0.1:3300/api/ping', { timeout: 1200 }, (res) => {
        if (res.statusCode === 200) {
          console.log('⚡ Local Karaoke engine already active on port 3300');
          return resolve();
        } else {
          console.log('🚀 Spawning embedded Nocturne Audio Server on port 3300...');
          process.env.PORT = '3300';
          serverInstance = require('./server.js');
          setTimeout(resolve, 800);
        }
      });
      req.on('error', () => {
        // Port not occupied: start embedded server
        console.log('🚀 Spawning embedded Nocturne Audio Server on port 3300...');
        process.env.PORT = '3300';
        serverInstance = require('./server.js');
        setTimeout(resolve, 800);
      });
      req.on('timeout', () => {
        req.destroy();
        serverInstance = require('./server.js');
        setTimeout(resolve, 800);
      });
    } catch (e) {
      console.warn('Server initialization note:', e.message);
      resolve();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0a0b10',
    title: 'NOCTURNE STUDIO • Precision Karaoke & Vocal Engine',
    icon: path.join(__dirname, 'resources', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Invariant: Never throttle Web Audio DSP when minimized or behind FiveM/Discord
      autoplayPolicy: 'no-user-gesture-required', // Immediate audio playback
      webSecurity: false // Disable web security so Electron Chromium allows all embeds and cross-origin frames without restriction
    }
  });

  // Automatically grant media permissions (Microphone & Audio Sinks)
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media' || permission === 'mediaKeySystem' || permission === 'audio-capture') {
      return true;
    }
    return true;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    return true;
  });

  // Enable YouTube embed playback for restricted music videos (override Referer, Origin, User-Agent & strip CSP/X-Frame-Options/CORP)
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

  const setupWebRequestBypass = (sess) => {
    if (!sess || !sess.webRequest) return;
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
  };

  setupWebRequestBypass(mainWindow.webContents.session);
  const { session } = require('electron');
  if (session && session.defaultSession && session.defaultSession !== mainWindow.webContents.session) {
    setupWebRequestBypass(session.defaultSession);
  }

  // Load local UI directly from embedded server with auto-retry
  const loadApp = () => {
    mainWindow.loadURL('http://127.0.0.1:3300').catch((err) => {
      console.warn('Initial loadURL note, retrying...', err.message);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://127.0.0.1:3300').catch(() => {});
        }
      }, 1000);
    });
  };
  loadApp();

  // Handle external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Hardware accelerated YouTube player direct control IPC handlers
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

ipcMain.on('yt-play', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  for (const frame of mainWindow.webContents.mainFrame.frames) {
    if (frame.url.includes('youtube.com/embed') || frame.url.includes('youtube-nocookie.com/embed')) {
      frame.executeJavaScript(`
        (() => {
          const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          if (player && typeof player.playVideo === 'function') {
            player.playVideo();
            return;
          }
          const v = document.querySelector('video');
          if (v && v.paused) v.play().catch(() => {});
        })()
      `).catch(() => {});
    }
  }
});

ipcMain.on('yt-pause', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  for (const frame of mainWindow.webContents.mainFrame.frames) {
    if (frame.url.includes('youtube.com/embed') || frame.url.includes('youtube-nocookie.com/embed')) {
      frame.executeJavaScript(`
        (() => {
          const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
            return;
          }
          const v = document.querySelector('video');
          if (v && !v.paused) v.pause();
        })()
      `).catch(() => {});
    }
  }
});

// Secure IPC handler for opening external URLs
ipcMain.on('open-external', (event, url) => {
  if (url && typeof url === 'string') {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch (_) {}
  }
});

app.whenReady().then(async () => {
  await startLocalServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    try { serverInstance.close(); } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
