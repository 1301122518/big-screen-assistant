/**
 * AdminPage - 管理端页面（v3.0 全面增强）
 * - Dashboard 概览页
 * - 深色模式切换
 * - 全局搜索（Ctrl+K）
 * - URL 状态持久化
 * - 素材编辑/重命名
 * - 批量操作
 * - 素材排序
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMaterials } from '../hooks/useMaterials'
import { usePlayerStatus } from '../hooks/usePlayerStatus'
import { playMaterial, stopPlayer, refreshPlayer, fetchSystemInfo, logout, fetchDashboardStats } from '../api/client'
import type { SystemInfo, DashboardStats, Material } from '../types'
import StatusBar from '../components/admin/StatusBar'
import MaterialList from '../components/admin/MaterialList'
import PlayerStatus from '../components/admin/PlayerStatus'
import PlaylistPanel from '../components/admin/PlaylistPanel'
import DevicePanel from '../components/admin/DevicePanel'
import DashboardPanel from '../components/admin/DashboardPanel'
import UploadModal from '../components/ui/UploadModal'
import SearchOverlay from '../components/ui/SearchOverlay'
import { ToastProvider, useToast } from '../components/ui/Toast'

/** 内部组件 - 使用 Toast */
const AdminContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { materials, loading, error, refresh: refreshMaterials, upload, addUrl, delete: deleteMaterial, update: updateMaterial } = useMaterials()
  const { playerState, refresh: refreshStatus } = usePlayerStatus()
  const { success, error: toastError } = useToast()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)

  // URL 状态持久化
  const activeTab = (searchParams.get('tab') || 'dashboard') as 'dashboard' | 'materials' | 'playlists' | 'devices'
  const setActiveTab = useCallback((tab: string) => {
    setSearchParams({ tab, ...(searchParams.get('q') ? { q: searchParams.get('q')! } : {}) })
  }, [searchParams, setSearchParams])

  // 深色模式
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  // 全局搜索快捷键 Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /** 加载系统信息 */
  const loadSystemInfo = useCallback(async () => {
    try {
      const info = await fetchSystemInfo()
      setSystemInfo(info)
    } catch { /* 静默 */ }
  }, [])

  /** 加载 Dashboard 统计 */
  const loadDashboardStats = useCallback(async () => {
    try {
      const stats = await fetchDashboardStats()
      setDashboardStats(stats)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => {
    loadSystemInfo()
    loadDashboardStats()
    const timer = setInterval(() => {
      loadSystemInfo()
      loadDashboardStats()
    }, 10000)
    return () => clearInterval(timer)
  }, [loadSystemInfo, loadDashboardStats])

  /** 监听全局错误 → Toast */
  useEffect(() => {
    if (error) toastError(error)
  }, [error, toastError])

  /** 播放素材 */
  const handlePlay = useCallback(async (id: number) => {
    try {
      await playMaterial(id)
      await refreshStatus()
      success('已开始播放')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '播放失败')
    }
  }, [refreshStatus, success, toastError])

  /** 停止播放 */
  const handleStop = useCallback(async () => {
    try {
      await stopPlayer()
      await refreshStatus()
      success('已停止播放')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '停止失败')
    }
  }, [refreshStatus, success, toastError])

  /** 刷新播放端 */
  const handleRefresh = useCallback(async () => {
    try {
      await refreshPlayer()
      success('已发送刷新指令')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '刷新失败')
    }
  }, [success, toastError])

  /** 删除素材 */
  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMaterial(id)
      success('素材已删除')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '删除失败')
    }
  }, [deleteMaterial, success, toastError])

  /** 编辑素材 */
  const handleUpdate = useCallback(async (id: number, data: { title?: string; url?: string }) => {
    try {
      await updateMaterial(id, data)
      success('素材已更新')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '更新失败')
    }
  }, [updateMaterial, success, toastError])

  /** 上传成功回调 */
  const handleUploadSuccess = useCallback(async (file: File, title?: string) => {
    await upload(file, title)
    success(`「${file.name}」上传成功`)
    loadDashboardStats()
  }, [upload, success, loadDashboardStats])

  const handleAddUrlSuccess = useCallback(async (title: string, url: string) => {
    await addUrl(title, url)
    success(`「${title}」添加成功`)
  }, [addUrl, success])

  /** 搜索跳转到素材 */
  const handleSearchSelect = useCallback((material: Material) => {
    setShowSearch(false)
    setActiveTab('materials')
    // 可以在这里实现滚动到对应素材
    if (material.type === 'video' || material.type === 'image') {
      handlePlay(material.id)
    }
  }, [setActiveTab, handlePlay])

  const tabs = [
    { key: 'dashboard' as const, label: '概览', icon: '📊' },
    { key: 'materials' as const, label: '素材库', icon: '📁', count: materials.length },
    { key: 'playlists' as const, label: '播放列表', icon: '📋' },
    { key: 'devices' as const, label: '设备管理', icon: '📱' },
  ]

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* 顶部状态栏 */}
      <StatusBar
        systemInfo={systemInfo}
        connectedPlayers={systemInfo?.connected_players || 0}
        onUpload={() => setShowUpload(true)}
        onLogout={logout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSearch={() => setShowSearch(true)}
      />

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Tab 切换 + 播放状态 */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex gap-1 rounded-xl p-1 shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1 sm:mr-1.5">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-blue-500 text-blue-100' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 播放状态紧凑显示 */}
          <PlayerStatus
            playerState={playerState}
            loading={false}
            onStop={handleStop}
            onRefresh={handleRefresh}
            darkMode={darkMode}
          />
        </div>

        {/* 内容区 */}
        {activeTab === 'dashboard' ? (
          <DashboardPanel stats={dashboardStats} onRefresh={loadDashboardStats} darkMode={darkMode} />
        ) : activeTab === 'materials' ? (
          <MaterialList
            materials={materials}
            loading={loading}
            onPlay={handlePlay}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            darkMode={darkMode}
          />
        ) : activeTab === 'playlists' ? (
          <PlaylistPanel materials={materials} darkMode={darkMode} />
        ) : (
          <DevicePanel darkMode={darkMode} />
        )}
      </div>

      {/* 上传弹窗 */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUploadSuccess}
        onAddUrl={handleAddUrlSuccess}
        onRefresh={refreshMaterials}
        darkMode={darkMode}
      />

      {/* 全局搜索浮层 */}
      <SearchOverlay
        open={showSearch}
        onClose={() => setShowSearch(false)}
        materials={materials}
        onSelect={handleSearchSelect}
        darkMode={darkMode}
      />
    </div>
  )
}

/** AdminPage - 包裹 ToastProvider */
const AdminPage: React.FC = () => (
  <ToastProvider>
    <AdminContent />
  </ToastProvider>
)

export default AdminPage
