/**
 * usePlayerStatus Hook - 播放状态轮询（管理端使用）
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { PlayerState } from '../types'
import { fetchPlayerStatus } from '../api/client'

const POLL_INTERVAL = 3000 // 轮询间隔 3 秒

export function usePlayerStatus() {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 获取最新播放状态 */
  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchPlayerStatus()
      setPlayerState(data)
    } catch {
      // 静默失败，保留上次状态
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()

    // 启动轮询
    timerRef.current = setInterval(() => {
      loadStatus()
    }, POLL_INTERVAL)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [loadStatus])

  return {
    playerState,
    loading,
    refresh: loadStatus,
  }
}
