/**
 * usePlaylists - 播放列表管理 Hook
 */
import { useState, useEffect, useCallback } from 'react'
import type { Playlist } from '../types'
import {
  fetchPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addPlaylistItem,
  removePlaylistItem,
  reorderPlaylistItems,
} from '../api/client'

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** 加载播放列表 */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPlaylists()
      setPlaylists(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载播放列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** 创建播放列表 */
  const create = useCallback(async (name: string, playMode: string = 'sequential') => {
    try {
      await createPlaylist(name, playMode)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
      throw err
    }
  }, [load])

  /** 更新播放列表 */
  const update = useCallback(async (id: number, data: { name?: string; play_mode?: string }) => {
    try {
      await updatePlaylist(id, data)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
      throw err
    }
  }, [load])

  /** 删除播放列表 */
  const remove = useCallback(async (id: number) => {
    try {
      await deletePlaylist(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
      throw err
    }
  }, [load])

  /** 添加素材到播放列表 */
  const addItem = useCallback(async (playlistId: number, materialId: number) => {
    try {
      await addPlaylistItem(playlistId, materialId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
      throw err
    }
  }, [load])

  /** 从播放列表移除素材 */
  const removeItem = useCallback(async (playlistId: number, itemId: number) => {
    try {
      await removePlaylistItem(playlistId, itemId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失败')
      throw err
    }
  }, [load])

  /** 重排序播放列表项 */
  const reorder = useCallback(async (playlistId: number, itemIds: number[]) => {
    try {
      await reorderPlaylistItems(playlistId, itemIds)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '排序失败')
      throw err
    }
  }, [load])

  return {
    playlists,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
    addItem,
    removeItem,
    reorder,
  }
}
