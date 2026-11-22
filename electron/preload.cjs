const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kronikiDesktop', {
  isDesktopClient: true,
  platform: process.platform,
  getLiveServerUrl: () => ipcRenderer.invoke('live:get-url'),
  setLiveServerUrl: (url) => ipcRenderer.invoke('live:set-url', url),
  reloadFresh: () => ipcRenderer.invoke('live:reload-fresh'),
});
