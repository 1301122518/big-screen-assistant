/**
 * PlayerStatus - 播放状态组件（v3.0 深色模式支持）
 */
import React from 'react'
import type { PlayerState } from '../../types'

interface Props {
  playerState: PlayerState | null
  loading: boolean
  onStop: () => void
  onRefresh: () => void
  darkMode: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: '待机', color: 'text-gray-500', bg: 'bg-gray-100' },
  playing: { label: '播放中', color: 'text-green-700', bg: 'bg-green-100' },
  stopped: { label: '已停止', color: 'text-red-700', bg: 'bg-red-100' },
}

const PlayerStatus: React.FC<Props> = ({ playerState, loading, onStop, onRefresh, darkMode }) => {
  const status = playerState?.status || 'idle'
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.idle
  const materialTitle = playerState?.current_material?.title

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* 状态指示 */}
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
        {status === 'playing' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
        {statusInfo.label}
      </div>

      {/* 当前素材 */}
      {materialTitle && (
        <span className={`text-xs truncate max-w-[120px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} title={materialTitle}>
          {materialTitle}
        </span>
      )}

      {/* 操作按钮 */}
      {status === 'playing' && (
        <button
          onClick={onStop}
          className={`p-1 rounded transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
          title="停止播放"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      )}

      <button
        onClick={onRefresh}
        className={`p-1 rounded transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
        title="刷新"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  )
}

export default PlayerStatus
