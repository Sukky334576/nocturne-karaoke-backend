const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  isElectron: true,
  platform: process.platform,
  version: '2.0.0',
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  },
  ytSeek: (sec) => {
    ipcRenderer.send('yt-seek', sec);
  },
  ytPlay: () => {
    ipcRenderer.send('yt-play');
  },
  ytPause: () => {
    ipcRenderer.send('yt-pause');
  }
});
