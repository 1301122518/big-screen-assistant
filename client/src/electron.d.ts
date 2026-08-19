/**
 * Electron API 类型声明
 * 暴露在 window.electronAPI 上的安全桥接 API
 */
interface ElectronAPI {
  getConfig: () => Promise<{ serverUrl: string; deviceName: string }>
  saveConfig: (config: { serverUrl: string; deviceName: string }) => Promise<void>
  getDeviceId: () => Promise<string>
  screenshot: () => Promise<string | null>
  restartApp: () => Promise<void>
  setVolume: (level: number) => Promise<void>
  getVolume: () => Promise<number>
  writeLog?: (line: string) => Promise<void>
}

interface Window {
  electronAPI: ElectronAPI
  wsSendMessage?: (msg: object) => void
}
