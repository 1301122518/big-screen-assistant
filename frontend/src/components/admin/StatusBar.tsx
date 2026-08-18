/**
 * StatusBar - 管理端顶部状态栏
 * 显示标题、播放端在线数量、局域网 IP
 */
import React from 'react'
import type { SystemInfo } from '../../types'

interface StatusBarProps {
  systemInfo: SystemInfo | null
  connectedPlayers: number
}

const StatusBar: React.FC<StatusBarProps> = ({ systemInfo, connectedPlayers }) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-800">🖥️ 大屏操作助手</h1>
        <span className="text-xs text-gray-400">v{systemInfo?.version || '1.0.0'}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connectedPlayers > 0 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          <span className="text-gray-600">
            播放端 {connectedPlayers > 0 ? `在线 (${connectedPlayers})` : '离线'}
          </span>
        </div>
        {systemInfo && (
          <span className="text-gray-400 text-xs">
            {systemInfo.local_ip}:{systemInfo.port}
          </span>
        )}
      </div>
    </div>
  )
}

export default StatusBar
