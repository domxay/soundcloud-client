const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openLoginWindow: () => ipcRenderer.invoke('sc:open-login'),
  downloadTrack: (trackData) => ipcRenderer.invoke('sc:download-track', trackData),
  openDownloadsFolder: () => ipcRenderer.invoke('sc:open-downloads-folder'),
  minimizeWindow: () => ipcRenderer.invoke('sc:window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('sc:window-maximize'),
  closeWindow: () => ipcRenderer.invoke('sc:window-close'),
  selectSaveFile: (defaultName) => ipcRenderer.invoke('sc:select-save-file', defaultName),
  selectDownloadFolder: () => ipcRenderer.invoke('sc:select-download-folder'),
  selectBackgroundFile: () => ipcRenderer.invoke('sc:select-background-file'),
});
