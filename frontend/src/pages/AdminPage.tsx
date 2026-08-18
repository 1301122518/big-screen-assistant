/**
 * AdminPage - 管理端页面
 * 素材管理、播放控制、状态监控
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useMaterials } from '../hooks/useMaterials'
import { usePlayerStatus } from '../hooks/usePlayerStatus'
import { playMaterial, stopPlayer, refreshPlayer, fetchSystemInfo } from '../api/client'
import type { SystemInfo } from '../types'
import StatusBar from '../components/admin/StatusBar'
import UploadPanel from '../components/admin/UploadPanel'
import MaterialList from '../components/admin/MaterialList'
import PlayerStatus from '../components/admin/PlayerStatus'

const AdminPage: React.FC = () => {
  const { materials, loading, error, upload, addUrl, delete: deleteMaterial } = useMaterials()
  const { playerState, refresh: refreshStatus } = usePlayerStatus()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  /** 加载系统信息 */
  const loadSystemInfo = useCallback(async () => {
    try {
      const info = await fetchSystemInfo()
      setSystemInfo(info)
    } catch {
      // 静默失败
    }
  }, [])

  useEffect(() => {
    loadSystemInfo()
    const timer = setInterval(loadSystemInfo, 5000)
    return () => clearInterval(timer)
  }, [loadSystemInfo])

  /** 播放素材 */
  const handlePlay = useCallback(async (id: number) => {
    try {
      setActionError(null)
      await playMaterial(id)
      await refreshStatus()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '播放失败')
    }
  }, [refreshStatus])

  /** 停止播放 */
  const handleStop = useCallback(async () => {
    try {
      setActionError(null)
      await stopPlayer()
      await refreshStatus()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '停止失败')
    }
  }, [refreshStatus])

  /** 刷新播放端 */
  const handleRefresh = useCallback(async () => {
    try {
      setActionError(null)
      await refreshPlayer()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '刷新失败')
    }
  }, [])

  /** 删除素材 */
  const handleDelete = useCallback(async (id: number) => {
    try {
      setActionError(null)
      await deleteMaterial(id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '删除失败')
    }
  }, [deleteMaterial])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <StatusBar
        systemInfo={systemInfo}
        connectedPlayers={systemInfo?.connected_players || 0}
      />

      {/* 主内容区 */}
      <div className="max-w-6xl mx-auto p-4">
        {/* 错误提示 */}
        {(error || actionError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error || actionError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 左侧：上传和播放控制 */}
          <div className="lg:col-span-1 space-y-4">
            <UploadPanel onUpload={upload} onAddUrl={addUrl} />
            <PlayerStatus
              playerState={playerState}
              loading={false}
              onStop={handleStop}
              onRefresh={handleRefresh}
            />
          </div>

          {/* 右侧：素材列表 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">素材库</h2>
                <span className="text-sm text-gray-400">共 {materials.length} 个素材</span>
              </div>
              <MaterialList
                materials={materials}
                loading={loading}
                onPlay={handlePlay}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
