const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openLoginWindow: () => ipcRenderer.invoke('sc:open-login'),
  syncSession: () => ipcRenderer.invoke('sc:sync-session'),
  getClientId: (forceRefresh) => ipcRenderer.invoke('sc:get-client-id', forceRefresh),
  downloadTrack: (trackData) => ipcRenderer.invoke('sc:download-track', trackData),
  openDownloadsFolder: () => ipcRenderer.invoke('sc:open-downloads-folder'),
  minimizeWindow: () => ipcRenderer.invoke('sc:window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('sc:window-maximize'),
  closeWindow: () => ipcRenderer.invoke('sc:window-close'),
  selectSaveFile: (defaultName) => ipcRenderer.invoke('sc:select-save-file', defaultName),
  selectDownloadFolder: () => ipcRenderer.invoke('sc:select-download-folder'),
  selectBackgroundFile: () => ipcRenderer.invoke('sc:select-background-file'),
  setProxy: (rule) => ipcRenderer.invoke('sc:set-proxy', rule),
  testProxy: (rule) => ipcRenderer.invoke('sc:test-proxy', rule),
  detectLocalProxy: () => ipcRenderer.invoke('sc:detect-local-proxy'),
  getNetworkSettings: () => ipcRenderer.invoke('sc:get-network-settings'),
  setDoh: (enabled) => ipcRenderer.invoke('sc:set-doh', enabled),
  builtinProxyStart: (port) => ipcRenderer.invoke('sc:builtin-proxy-start', port),
  builtinProxyStop: () => ipcRenderer.invoke('sc:builtin-proxy-stop'),
  builtinProxyStatus: () => ipcRenderer.invoke('sc:builtin-proxy-status'),
  relaunchApp: () => ipcRenderer.invoke('sc:relaunch-app'),

  // Desktop Floating Overlay IPC
  sendOverlayState: (state) => ipcRenderer.send('sc:overlay-sync-state', state),
  onOverlayState: (callback) => {
    const listener = (event, state) => callback(state);
    ipcRenderer.on('sc:overlay-state', listener);
    return () => ipcRenderer.removeListener('sc:overlay-state', listener);
  },
  sendOverlayAction: (action, payload) => ipcRenderer.send('sc:overlay-action', { action, payload }),
  onOverlayCommand: (callback) => {
    const listener = (event, cmd) => callback(cmd);
    ipcRenderer.on('sc:overlay-command', listener);
    return () => ipcRenderer.removeListener('sc:overlay-command', listener);
  },
  resizeOverlay: (width, height) => ipcRenderer.invoke('sc:resize-overlay', { width, height }),
  moveOverlay: (deltaX, deltaY) => ipcRenderer.send('sc:overlay-move', { deltaX, deltaY }),
  restoreMainWindow: () => ipcRenderer.invoke('sc:restore-main-window'),
  toggleOverlay: (show) => ipcRenderer.invoke('sc:toggle-overlay', show),
});
