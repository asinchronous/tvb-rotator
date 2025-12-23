const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  onLoadStream: (cb) => ipcRenderer.on('load-stream', (_, url) => cb(url)),
  requestNextChannel: () => ipcRenderer.send('request-next-channel')
});
