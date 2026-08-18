/**
 * 全局类型定义
 */

/** 素材类型 */
export type MaterialType = 'image' | 'video' | 'webpage'

/** 素材数据 */
export interface Material {
  id: number
  title: string
  type: MaterialType
  file_path: string | null
  url: string | null
  mime_type: string | null
}

/** WebSocket 消息 */
export interface WsMessage {
  type: 'play' | 'stop' | 'refresh' | 'status'
  material?: Material
  status?: 'idle' | 'playing'
  material_id?: number
}

/** 配置 */
export interface AppConfig {
  serverUrl: string
  autoStart: boolean
}

/** Electron API */
export interface ElectronAPI {
  getConfig: () => Promise<AppConfig>
  setConfig: (config: AppConfig) => Promise<{ success: boolean }>
  startPlayer: () => Promise<{ success: boolean }>
  showConfig: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
