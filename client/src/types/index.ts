/**
 * 全局类型定义（v3.0 增强版）
 */

/** 素材类型 */
export type MaterialType = 'image' | 'video' | 'webpage' | 'html'

/** 素材数据（v3.0 增加 tags/size/updated_at） */
export interface Material {
  id: number
  title: string
  type: MaterialType
  file_path: string | null
  url: string | null
  mime_type: string | null
  size: number | null
  hls_path: string | null
  tags: Tag[]
  created_at: string | null
  updated_at: string | null
}

/** 标签数据 */
export interface Tag {
  id: number
  name: string
  color: string
  created_at: string | null
}

/** 播放状态枚举 */
export type PlayerStatus = 'idle' | 'playing' | 'stopped'

/** 播放模式 */
export type PlayMode = 'sequential' | 'loop' | 'shuffle'

/** 播放状态数据 */
export interface PlayerState {
  id: number
  status: PlayerStatus
  current_material_id: number | null
  current_material: Material | null
  updated_at: string | null
}

/** 播放列表 */
export interface Playlist {
  id: number
  name: string
  play_mode: PlayMode
  scheduled_at: string | null
  items: PlaylistItem[]
  created_at: string | null
  updated_at: string | null
}

/** 播放列表条目 */
export interface PlaylistItem {
  id: number
  playlist_id: number
  material_id: number
  sort_order: number
  material: Material | null
}

/** WebSocket 消息类型 */
export type WsMessageType = 'play' | 'stop' | 'refresh' | 'ping' | 'command' | 'auth_error' | 'auth_pending' | 'auth_rejected' | 'command_result' | 'progress'

/** WebSocket 消息 */
export interface WsMessage {
  type: WsMessageType
  material?: {
    id: number
    type: string
    title: string
    url: string
    mime_type: string | null
    hls_path: string | null
  }
  playlist?: {
    id: number
    name: string
    play_mode: string
    items: { id: number; material_id: number; sort_order: number }[]
    current_index: number
  }
  /** 远程指令 */
  command?: string
  params?: Record<string, unknown>
}

/** 设备信息 */
export interface Device {
  id: number
  device_id: string
  device_name: string
  device_type: string
  status: string
  ip_address: string | null
  last_seen: string | null
  playing_material_id: number | null
  is_online: boolean
  created_at: string | null
  updated_at: string | null
}

/** 播放端配置 */
export interface AppConfig {
  serverUrl: string
  deviceName: string
}

/** 系统信息 */
export interface SystemInfo {
  version: string
  local_ip: string
  port: number
  admin_url: string
  player_url: string
  connected_players: number
}

/** 统一 API 响应 */
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

/** 设备注册错误 */
export interface RegisterError {
  type: 'auth_error' | 'auth_pending' | 'auth_rejected'
  message: string
}

/** Electron API 暴露给渲染进程的方法 */
export interface ElectronAPI {
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<void>
  getDeviceId: () => Promise<string>
  /** 远程控制：截屏 */
  screenshot: () => Promise<string | null>
  /** 远程控制：重启应用 */
  restartApp: () => Promise<void>
  /** 远程控制：设置音量 */
  setVolume: (level: number) => Promise<void>
  /** 远程控制：获取音量 */
  getVolume: () => Promise<number>
}