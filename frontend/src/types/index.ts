/**
 * 全局类型定义
 */

/** 素材类型枚举 */
export type MaterialType = 'image' | 'video' | 'webpage'

/** 播放状态枚举 */
export type PlayerStatus = 'idle' | 'playing' | 'stopped'

/** 素材数据模型 */
export interface Material {
  id: number
  title: string
  type: MaterialType
  file_path: string | null
  url: string | null
  mime_type: string | null
  size: number | null
  created_at: string
  updated_at: string
}

/** 播放状态数据模型 */
export interface PlayerState {
  id: number
  current_material_id: number | null
  status: PlayerStatus
  updated_at: string
  current_material: Material | null
}

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
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

/** WebSocket 播放指令 */
export interface WsPlayMessage {
  type: 'play'
  material: {
    id: number
    type: MaterialType
    title: string
    url: string
    mime_type: string | null
  }
}

/** WebSocket 停止指令 */
export interface WsStopMessage {
  type: 'stop'
}

/** WebSocket 刷新指令 */
export interface WsRefreshMessage {
  type: 'refresh'
}

/** WebSocket 消息联合类型 */
export type WsMessage = WsPlayMessage | WsStopMessage | WsRefreshMessage
