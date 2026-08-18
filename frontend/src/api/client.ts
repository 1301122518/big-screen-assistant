/**
 * API 客户端 - 封装 HTTP 请求
 */
import type { ApiResponse, Material, PlayerState, SystemInfo } from '../types'

const BASE_URL = ''

/**
 * 通用请求函数
 */
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.detail || errorData.message || '请求失败')
  }

  return response.json()
}

/**
 * GET 请求
 */
export async function get<T>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'GET' })
}

/**
 * POST 请求（JSON body）
 */
export async function post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT 请求（JSON body）
 */
export async function put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE 请求
 */
export async function del<T>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'DELETE' })
}

/**
 * 上传文件（FormData）
 */
export async function upload<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.detail || errorData.message || '上传失败')
  }

  return response.json()
}

// ============ 素材管理 API ============

/** 获取素材列表 */
export async function fetchMaterials(): Promise<Material[]> {
  const res = await get<Material[]>('/api/materials')
  return res.data
}

/** 上传文件素材 */
export async function uploadMaterial(file: File, title?: string): Promise<Material> {
  const formData = new FormData()
  formData.append('file', file)
  if (title) {
    formData.append('title', title)
  }
  const res = await upload<Material>('/api/materials/upload', formData)
  return res.data
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

/** 停止播放 */
export async function stopPlayer(): Promise<void> {
  await post('/api/player/stop')
}

/** 刷新播放端 */
export async function refreshPlayer(): Promise<void> {
  await post('/api/player/refresh')
}

// ============ 系统信息 API ============

/** 获取系统信息 */
export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await get<SystemInfo>('/api/system/info')
  return res.data
}
