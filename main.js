const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');
const http = require('http');

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
      autoplayPolicy: 'no-user-gesture-required' // Immediate audio playback
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

  // Enable YouTube embed playback for restricted music videos (override Referer & X-Frame-Options)
  const ytFilter = {
    urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*']
  };

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(ytFilter, (details, callback) => {
    details.requestHeaders['Referer'] = 'https://www.youtube.com/';
    details.requestHeaders['Origin'] = 'https://www.youtube.com';
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived(ytFilter, (details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    callback({ cancel: false, responseHeaders });
  });

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
