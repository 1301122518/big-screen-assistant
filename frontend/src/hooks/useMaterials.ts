/**
 * useMaterials Hook - 素材管理状态与操作
 */
import { useState, useEffect, useCallback } from 'react'
import type { Material } from '../types'
import {
  fetchMaterials,
  uploadMaterial,
  addUrlMaterial,
  deleteMaterial,
} from '../api/client'

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  /** 加载素材列表 */
  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchMaterials()
      setMaterials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载素材失败')
    } finally {
      setLoading(false)
    }
  }, [])

  /** 上传文件素材 */
  const handleUpload = useCallback(async (file: File, title?: string) => {
    try {
      setError(null)
      await uploadMaterial(file, title)
      await loadMaterials()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败'
      setError(msg)
      throw err
    }
  }, [loadMaterials])

  /** 添加 URL 素材 */
  const handleAddUrl = useCallback(async (title: string, url: string) => {
    try {
      setError(null)
      await addUrlMaterial(title, url)
      await loadMaterials()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '添加失败'
      setError(msg)
      throw err
    }
  }, [loadMaterials])

  /** 删除素材 */
  const handleDelete = useCallback(async (id: number) => {
    try {
      setError(null)
      await deleteMaterial(id)
      await loadMaterials()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败'
      setError(msg)
      throw err
    }
  }, [loadMaterials])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  return {
    materials,
    loading,
    error,
    refresh: loadMaterials,
    upload: handleUpload,
    addUrl: handleAddUrl,
    delete: handleDelete,
  }
}
