/**
 * StandbyScreen - 播放端待机画面
 * 显示黑底 + 当前时间 + WebSocket 连接状态
 */
import React, { useState, useEffect } from 'react'

interface StandbyScreenProps {
  connected: boolean
}

const StandbyScreen: React.FC<StandbyScreenProps> = ({ connected }) => {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
      setDate(
        now.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })
      )
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white">
      {/* 当前时间 */}
      <div className="text-8xl font-thin tracking-wider mb-4">{time}</div>
      <div className="text-2xl text-gray-400 mb-12">{date}</div>

      {/* 连接状态指示 */}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-gray-500">
          {connected ? '已连接' : '未连接'}
        </span>
      </div>

      {/* 全屏提示 */}
      <div className="absolute bottom-8 text-xs text-gray-700">
        按 F11 进入全屏模式
      </div>
    </div>
  )
}

export default StandbyScreen
