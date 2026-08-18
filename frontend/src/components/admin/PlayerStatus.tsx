/**
 * PlayerStatus - 播放状态面板
 * 显示当前播放状态和控制按钮
 */
import React from 'react'
import type { PlayerState } from '../../types'

interface PlayerStatusProps {
  playerState: PlayerState | null
  loading: boolean
  onStop: () => void
  onRefresh: () => void
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({
  playerState,
  loading,
  onStop,
  onRefresh,
}) => {
  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    idle: { label: '待机中', color: 'text-gray-500', icon: '💤' },
    playing: { label: '播放中', color: 'text-green-500', icon: '▶️' },
    stopped: { label: '已停止', color: 'text-red-500', icon: '⏹️' },
  }

  const status = playerState?.status || 'idle'
  const config = statusConfig[status] || statusConfig.idle

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-sm font-bold text-gray-700 mb-3">播放状态</h2>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* 状态显示 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{config.icon}</span>
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>

          {/* 当前播放素材 */}
          {playerState?.current_material && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">当前素材</p>
              <p className="text-sm text-gray-800 truncate">
                {playerState.current_material.title}
              </p>
              <p className="text-xs text-gray-400">
                {playerState.current_material.type === 'image'
                  ? '图片'
                  : playerState.current_material.type === 'video'
                  ? '视频'
                  : '网页'}
              </p>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="flex gap-2">
            <button
              onClick={onStop}
              disabled={status !== 'playing'}
              className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ⏹ 停止
            </button>
            <button
              onClick={onRefresh}
              className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              🔄 刷新
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default PlayerStatus
