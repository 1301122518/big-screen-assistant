/**
 * 全局类型定义（v3.0 增强版）
 */

/** 素材类型枚举 */
export type MaterialType = 'image' | 'video' | 'html' | 'webpage'

/** 播放状态枚举 */
export type PlayerStatus = 'idle' | 'playing' | 'stopped'

/** 播放模式 */
export type PlayMode = 'sequential' | 'loop' | 'shuffle'

/** 标签 */
export interface Tag {
  id: number
  name: string
  color: string
  created_at?: string
}

/** 素材数据模型 */
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

/** 播放列表条目 */
export interface PlaylistItem {
  id: number
  material_id: number
  sort_order: number
  material: Material | null
}

/** 播放列表 */
export interface Playlist {
  id: number
  name: string
  play_mode: PlayMode
  scheduled_at: string | null
  items: PlaylistItem[]
  created_at: string
  updated_at: string
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

/** Dashboard 统计数据 */
export interface DashboardStats {
  materials: { total: number; today_uploads: number }
  devices: { total: number; approved: number; online: number }
  playlists: { total: number }
  storage: { total: number; used: number; free: number }
  today_plays: number
}

/** 审计日志 */
export interface AuditLog {
  id: number
  user: string
  action: string
  target_type: string | null
  target_id: number | null
  detail: string | null
  ip_address: string | null
  created_at: string
}

/** 上传进度 */
export interface UploadProgress {
  name: string
  size: number
  status: 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  material_id?: number
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
    hls_path: string | null
  }
  playlist?: {
    id: number
    name: string
    play_mode: PlayMode
    items: { id: number; material_id: number; sort_order: number }[]
    current_index: number
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

/** 设备状态 */
export type DeviceStatus = 'pending' | 'approved' | 'rejected'

/** 设备数据模型 */
export interface Device {
  id: number
  device_id: string
  device_name: string
  device_type: string
  status: DeviceStatus
  ip_address: string | null
  last_seen: string | null
  playing_material_id: number | null
  created_at: string | null
  updated_at: string | null
  is_online?: boolean
}

/** 批量操作结果 */
export interface BatchResult {
  success_count: number
  fail_count: number
  total: number
}

/** 分页设备列表 */
export interface PaginatedDevices {
  items: Device[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/** 状态筛选选项 */
export type DeviceFilterStatus = 'all' | 'pending' | 'approved' | 'rejected'
