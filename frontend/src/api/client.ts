/**
 * API 客户端 - 封装 HTTP 请求（v3.0 增强版）
 */
import type { ApiResponse, Material, PlayerState, SystemInfo, Playlist, Device, Tag, DashboardStats, AuditLog, UploadProgress } from '../types'

const BASE_URL = ''

/** 获取存储的 JWT Token */
function getToken(): string | null {
  return localStorage.getItem('token')
}

/** 设置 JWT Token */
export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

/** 清除 Token */
export function clearToken(): void {
  localStorage.removeItem('token')
}

/** 是否已登录 */
export function isAuthenticated(): boolean {
  return !!getToken()
}

/**
 * 通用请求函数（自动附加 JWT Token）
 */
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('认证已过期，请重新登录')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.detail || errorData.message || '请求失败')
  }

  return response.json()
}

/** GET 请求 */
export async function get<T>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'GET' })
}

/** POST 请求（JSON body） */
export async function post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/** PUT 请求（JSON body） */
export async function put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/** DELETE 请求 */
export async function del<T>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'DELETE' })
}

/** 上传文件（FormData，支持进度回调） */
export async function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const token = getToken()

    xhr.open('POST', `${BASE_URL}${url}`)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 401) {
        clearToken()
        window.location.href = '/login'
        reject(new Error('认证已过期，请重新登录'))
        return
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('解析响应失败'))
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText)
          reject(new Error(errorData.detail || errorData.message || '上传失败'))
        } catch {
          reject(new Error('上传失败'))
        }
      }
    }

    xhr.onerror = () => reject(new Error('网络错误'))
    xhr.send(formData)
  })
}

/** 上传文件（FormData） */
export async function upload<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (response.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('认证已过期，请重新登录')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.detail || errorData.message || '上传失败')
  }

  return response.json()
}

// ============ 认证 API ============

/** 登录 */
export async function login(username: string, password: string): Promise<{ token: string; mustChangePassword: boolean }> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.detail || '登录失败')
  }
  const res = await response.json()
  if (res.code !== 0) {
    throw new Error(res.message || '登录失败')
  }
  const token = res.data.access_token
  setToken(token)
  return { token, mustChangePassword: res.data.must_change_password || false }
}

/** 修改密码 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await post<{ access_token: string }>('/api/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
  if (res.data?.access_token) {
    setToken(res.data.access_token)
  }
}

/** 登出 */
export function logout(): void {
  clearToken()
  window.location.href = '/login'
}

// ============ 素材管理 API ============

/** 获取素材列表（支持搜索、排序、标签筛选） */
export async function fetchMaterials(params?: {
  q?: string
  sort_by?: string
  sort_order?: string
  tag_id?: number
}): Promise<Material[]> {
  let url = '/api/materials'
  const searchParams = new URLSearchParams()
  if (params?.q) searchParams.set('q', params.q)
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by)
  if (params?.sort_order) searchParams.set('sort_order', params.sort_order)
  if (params?.tag_id) searchParams.set('tag_id', String(params.tag_id))
  const qs = searchParams.toString()
  if (qs) url += `?${qs}`
  const res = await get<Material[]>(url)
  return res.data
}

/** 上传多个文件（带进度） */
export async function uploadMaterials(
  files: File[],
  onProgress?: (progress: number) => void,
): Promise<{ task_id: string; materials: Material[]; count: number }> {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  const res = await uploadWithProgress<{ task_id: string; materials: Material[]; count: number }>(
    '/api/materials/upload',
    formData,
    onProgress,
  )
  return res.data
}

/** 上传文件素材 */
export async function uploadMaterial(file: File, title?: string): Promise<Material> {
  const formData = new FormData()
  formData.append('files', file)
  if (title) {
    formData.append('titles', title)
  }
  const res = await upload<{ task_id: string; materials: Material[]; count: number }>('/api/materials/upload', formData)
  return res.data.materials[0]
}

/** 添加 URL 素材 */
export async function addUrlMaterial(title: string, url: string): Promise<Material> {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('url', url)
  const res = await upload<Material>('/api/materials/url', formData)
  return res.data
}

/** 删除素材 */
export async function deleteMaterial(id: number): Promise<void> {
  await del(`/api/materials/${id}`)
}

/** 批量删除素材 */
export async function batchDeleteMaterials(ids: number[]): Promise<{ deleted: number }> {
  const res = await post<{ deleted: number }>('/api/materials/batch-delete', ids)
  return res.data
}

/** 扫描本地文件 */
export async function scanLocalFiles(): Promise<{ added_count: number; materials: Material[] }> {
  const res = await post<{ added_count: number; materials: Material[] }>('/api/materials/scan-local')
  return res.data
}

// ============ 标签 API ============

/** 获取所有标签 */
export async function fetchTags(): Promise<Tag[]> {
  const res = await get<Tag[]>('/api/tags')
  return res.data
}

/** 创建标签 */
export async function createTag(name: string, color: string = '#3B82F6'): Promise<Tag> {
  const res = await post<Tag>('/api/tags', { name, color })
  return res.data
}

/** 删除标签 */
export async function deleteTag(id: number): Promise<void> {
  await del(`/api/tags/${id}`)
}

/** 为素材添加标签 */
export async function addMaterialTag(materialId: number, tagId: number): Promise<void> {
  await post(`/api/tags/materials/${materialId}/tags?tag_id=${tagId}`)
}

/** 移除素材标签 */
export async function removeMaterialTag(materialId: number, tagId: number): Promise<void> {
  await del(`/api/tags/materials/${materialId}/tags/${tagId}`)
}

// ============ Dashboard API ============

/** 获取 Dashboard 统计数据 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await get<DashboardStats>('/api/dashboard/stats')
  return res.data
}

// ============ 审计日志 API ============

/** 获取最近的审计日志 */
export async function fetchRecentAuditLogs(limit: number = 20): Promise<AuditLog[]> {
  const res = await get<AuditLog[]>(`/api/audit-logs/recent?limit=${limit}`)
  return res.data
}

/** 获取审计日志列表（分页） */
export async function fetchAuditLogs(page: number = 1, pageSize: number = 20): Promise<{
  items: AuditLog[]
  total: number
  page: number
  page_size: number
}> {
  const res = await get<{ items: AuditLog[]; total: number; page: number; page_size: number }>(
    `/api/audit-logs?page=${page}&page_size=${pageSize}`
  )
  return res.data
}

// ============ 播放控制 API ============

/** 获取播放状态 */
export async function fetchPlayerStatus(): Promise<PlayerState> {
  const res = await get<PlayerState>('/api/player/status')
  return res.data
}

/** 播放指定素材 */
export async function playMaterial(id: number): Promise<void> {
  await post(`/api/player/play/${id}`)
}

/** 播放播放列表 */
export async function playPlaylist(id: number): Promise<void> {
  await post(`/api/player/play-playlist/${id}`)
}

/** 播放下一个 */
export async function playNext(): Promise<void> {
  await post('/api/player/next')
}

/** 播放上一个 */
export async function playPrev(): Promise<void> {
  await post('/api/player/prev')
}

/** 停止播放 */
export async function stopPlayer(): Promise<void> {
  await post('/api/player/stop')
}

/** 刷新播放端 */
export async function refreshPlayer(): Promise<void> {
  await post('/api/player/refresh')
}

// ============ 播放列表 API ============

/** 获取播放列表 */
export async function fetchPlaylists(): Promise<Playlist[]> {
  const res = await get<Playlist[]>('/api/playlists')
  return res.data
}

/** 创建播放列表 */
export async function createPlaylist(name: string, playMode: string = 'sequential'): Promise<Playlist> {
  const res = await post<Playlist>('/api/playlists', { name, play_mode: playMode })
  return res.data
}

/** 更新播放列表 */
export async function updatePlaylist(id: number, data: { name?: string; play_mode?: string; scheduled_at?: string }): Promise<Playlist> {
  const res = await put<Playlist>(`/api/playlists/${id}`, data)
  return res.data
}

/** 删除播放列表 */
export async function deletePlaylist(id: number): Promise<void> {
  await del(`/api/playlists/${id}`)
}

/** 添加素材到播放列表 */
export async function addPlaylistItem(playlistId: number, materialId: number): Promise<void> {
  await post(`/api/playlists/${playlistId}/items`, { material_id: materialId })
}

/** 从播放列表移除素材 */
export async function removePlaylistItem(playlistId: number, itemId: number): Promise<void> {
  await del(`/api/playlists/${playlistId}/items/${itemId}`)
}

/** 重新排序播放列表 */
export async function reorderPlaylistItems(playlistId: number, itemIds: number[]): Promise<void> {
  await put(`/api/playlists/${playlistId}/items/reorder`, { item_ids: itemIds })
}

// ============ 系统信息 API ============

/** 获取系统信息 */
export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await get<SystemInfo>('/api/system/info')
  return res.data
}

// ============ 设备管理 API ============

/** 获取设备列表（分页+筛选） */
export async function fetchDevices(params?: {
  page?: number
  page_size?: number
  status?: string
}): Promise<PaginatedDevices> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
  const qs = searchParams.toString()
  const url = qs ? `/api/devices?${qs}` : '/api/devices'
  const res = await get<PaginatedDevices>(url)
  return res.data
}

/** 批准设备 */
export async function approveDevice(deviceDbId: number): Promise<void> {
  await put(`/api/devices/${deviceDbId}/status`, { status: 'approved' })
}

/** 拒绝设备 */
export async function rejectDevice(deviceDbId: number): Promise<void> {
  await put(`/api/devices/${deviceDbId}/status`, { status: 'rejected' })
}

/** 删除设备 */
export async function deleteDevice(deviceDbId: number): Promise<void> {
  await del(`/api/devices/${deviceDbId}`)
}

/** 更新设备别名 */
export async function updateDeviceAlias(deviceId: string, alias: string): Promise<void> {
  const res = await request<{ device_id: string }>(`/api/devices/${deviceId}/alias`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias }),
  })
  if (res.code !== 0) throw new Error(res.message || '更新失败')
}

/** 批量批准设备 */
export async function batchApproveDevices(ids: number[]): Promise<BatchResult> {
  const res = await post<BatchResult>('/api/devices/batch/status', { ids, status: 'approved' })
  return res.data
}

/** 批量拒绝设备 */
export async function batchRejectDevices(ids: number[]): Promise<BatchResult> {
  const res = await post<BatchResult>('/api/devices/batch/status', { ids, status: 'rejected' })
  return res.data
}

/** 批量删除设备 */
export async function batchDeleteDevices(ids: number[]): Promise<BatchResult> {
  const res = await post<BatchResult>('/api/devices/batch/delete', { ids })
  return res.data
}
