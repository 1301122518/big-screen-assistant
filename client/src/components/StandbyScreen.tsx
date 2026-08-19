/**
 * StandbyScreen - 待机画面
 * 显示连接状态和当前时间
 */
import React, { useState, useEffect } from 'react'

interface StandbyScreenProps {
  connected: boolean
  serverUrl: string
  deviceName?: string
}

const StandbyScreen: React.FC<StandbyScreenProps> = ({ connected, serverUrl, deviceName }) => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('zh-CN', { hour12: false })
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black relative">
      {/* 时间 */}
      <div className="text-8xl font-light text-white mb-4 tracking-wider">
        {formatTime(time)}
      </div>

      {/* 日期 */}
      <div className="text-2xl text-gray-400 mb-12">
        {formatDate(time)}
      </div>

      {/* 连接状态 */}
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
        <span className="text-gray-500 text-sm">
          {connected ? '已连接' : '未连接'}
          {serverUrl && connected && ` · ${serverUrl}`}
        </span>
      </div>

      {/* 设备名称 */}
      {deviceName && (
        <p className="text-gray-600 text-xs mt-2">
          设备：{deviceName}
        </p>
      )}

      {/* 提示 */}
      {!connected && (
        <p className="text-gray-600 text-xs mt-4">
          正在尝试连接服务器...
        </p>
      )}
    </div>
  )
}

export default StandbyScreen
