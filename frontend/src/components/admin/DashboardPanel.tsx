/**
 * DashboardPanel - 仪表盘概览页（v3.0 新增）
 * 显示系统概览：在线设备、素材统计、存储用量、最近操作
 */
import React, { useEffect, useState } from 'react'
import type { DashboardStats, AuditLog } from '../../types'
import { fetchRecentAuditLogs } from '../../api/client'

interface Props {
  stats: DashboardStats | null
  onRefresh: () => void
  darkMode: boolean
}

/** 格式化字节 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/** 操作类型图标 */
function getActionIcon(action: string): string {
  switch (action) {
    case 'upload': return '📤'
    case 'delete': return '🗑️'
    case 'play': return '▶️'
    case 'approve': return '✅'
    case 'reject': return '❌'
    case 'update': return '✏️'
    default: return '📝'
  }
}

const DashboardPanel: React.FC<Props> = ({ stats, onRefresh, darkMode }) => {
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    fetchRecentAuditLogs(10).then(setRecentLogs).catch(() => {})
  }, [])

  const cardClass = `rounded-xl border p-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800'
  const subtextClass = darkMode ? 'text-gray-400' : 'text-gray-500'

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className={`text-sm ${subtextClass}`}>加载中...</p>
      </div>
    )
  }

  const storagePercent = stats.storage.total > 0
    ? Math.round((stats.storage.used / stats.storage.total) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 在线设备 */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📱</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              stats.devices.online > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {stats.devices.online > 0 ? '在线' : '离线'}
            </span>
          </div>
          <p className={`text-2xl font-bold ${textClass}`}>{stats.devices.online}</p>
          <p className={`text-xs ${subtextClass} mt-1`}>
            / {stats.devices.approved} 台已授权
          </p>
        </div>

        {/* 素材总数 */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📁</span>
            {stats.materials.today_uploads > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                +{stats.materials.today_uploads} 今日
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold ${textClass}`}>{stats.materials.total}</p>
          <p className={`text-xs ${subtextClass} mt-1`}>素材总数</p>
        </div>

        {/* 存储空间 */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💾</span>
            <span className={`text-xs ${subtextClass}`}>{storagePercent}%</span>
          </div>
          <p className={`text-lg font-bold ${textClass}`}>{formatBytes(stats.storage.used)}</p>
          <div className={`w-full h-1.5 rounded-full mt-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className={`h-full rounded-full transition-all ${
                storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(storagePercent, 100)}%` }}
            />
          </div>
          <p className={`text-xs ${subtextClass} mt-1`}>/ {formatBytes(stats.storage.total)}</p>
        </div>

        {/* 今日播放 */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">▶️</span>
          </div>
          <p className={`text-2xl font-bold ${textClass}`}>{stats.today_plays}</p>
          <p className={`text-xs ${subtextClass} mt-1`}>今日播放次数</p>
        </div>
      </div>

      {/* 最近操作 */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold ${textClass}`}>最近操作</h3>
          <button
            onClick={onRefresh}
            className={`text-xs px-2 py-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            刷新
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <p className={`text-sm text-center py-6 ${subtextClass}`}>暂无操作记录</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div
                key={log.id}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
              >
                <span className="text-lg">{getActionIcon(log.action)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${textClass}`}>
                    <span className="font-medium">{log.user}</span>
                    {' '}
                    {log.detail || log.action}
                  </p>
                </div>
                <span className={`text-xs whitespace-nowrap ${subtextClass}`}>
                  {log.created_at ? new Date(log.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPanel
