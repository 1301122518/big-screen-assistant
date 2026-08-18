import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config: { serverUrl: string; autoStart: boolean }) =>
    ipcRenderer.invoke('set-config', config),
  startPlayer: () => ipcRenderer.invoke('start-player'),
  showConfig: () => ipcRenderer.invoke('show-config')
})
