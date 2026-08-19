import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 基础配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: { serverUrl: string; deviceName: string }) => ipcRenderer.invoke('save-config', config),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),

  // 远程控制
  screenshot: () => ipcRenderer.invoke('screenshot'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  setVolume: (level: number) => ipcRenderer.invoke('set-volume', level),
  getVolume: () => ipcRenderer.invoke('get-volume'),

  // 日志
  writeLog: (line: string) => ipcRenderer.invoke('write-log', line),
})
