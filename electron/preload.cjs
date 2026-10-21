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
});
