/**
 * useWebSocket Hook - WebSocket 连接管理（v3.0 增强版）
 * 支持断线自动重连（指数退避）和设备准入控制
 * 新增：远程指令处理、播放进度上报
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { WsMessage } from '../types'
import Logger from '../utils/logger'

const log = Logger.create('WebSocket')

interface UseWebSocketOptions {
  serverUrl: string
  deviceId: string
  onMessage: (msg: WsMessage) => void
  /** 播放进度回调，返回 { currentTime, duration, materialId, status } */
  getProgress?: () => { currentTime: number; duration: number; materialId: number | null; status: string }
  onAuthError?: (error: { type: string; message: string }) => void
}

interface UseWebSocketReturn {
  connected: boolean
  sendMessage: (msg: object) => void
  reconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { serverUrl, deviceId, onMessage, getProgress, onAuthError } = options
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 50
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const manualDisconnect = useRef(false)

  const connect = useCallback(() => {
    // 前置条件：serverUrl 和 deviceId 必须有效
    if (!serverUrl || !deviceId) {
      log.debug('跳过连接：缺少 serverUrl 或 deviceId')
      return
    }

    // 构建 WebSocket URL
    const baseUrl = serverUrl.replace(/^http/, 'ws')
    const wsUrl = `${baseUrl}/api/player/ws/player?device_id=${deviceId}`

    try {
      manualDisconnect.current = false
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        log.info('WebSocket 已连接')
        setConnected(true)
        retryCountRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data)

          // 处理认证错误
          if (msg.type === 'auth_error' || msg.type === 'auth_pending' || msg.type === 'auth_rejected') {
            log.warn(`认证错误: ${msg.type}`)
            onAuthError?.({ type: msg.type, message: (msg as any).message || '' })
            return
          }

          if (msg.type === 'ping') {
            return
          }

          onMessage(msg)
        } catch (err) {
          log.error('消息解析失败', err)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!manualDisconnect.current) {
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        // onclose 会紧接着触发
      }
    } catch (err) {
      log.error('WebSocket 创建失败', err)
      scheduleReconnect()
    }
  }, [serverUrl, deviceId, onMessage, onAuthError])

  const scheduleReconnect = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      log.error('已达到最大重试次数')
      return
    }

    // 指数退避：2s, 4s, 8s, 16s, 最大 60s
    const delay = Math.min(2000 * Math.pow(1.5, retryCountRef.current), 60000)
    retryCountRef.current++

    log.info(`${delay / 1000}s 后重连 (第 ${retryCountRef.current} 次)`)
    reconnectTimerRef.current = setTimeout(() => {
      if (!manualDisconnect.current) {
        connect()
      }
    }, delay)
  }, [connect])

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    if (wsRef.current) {
      manualDisconnect.current = true
      wsRef.current.close()
    }
    retryCountRef.current = 0
    connect()
  }, [connect])

  // 连接生命周期
  useEffect(() => {
    connect()

    return () => {
      manualDisconnect.current = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  // 进度上报（每 5 秒）
  useEffect(() => {
    if (!getProgress || !connected) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      return
    }

    progressTimerRef.current = setInterval(() => {
      const progress = getProgress()
      if (progress && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'progress',
          material_id: progress.materialId,
          current_time: Math.round(progress.currentTime),
          duration: Math.round(progress.duration),
          status: progress.status,
        }))
      }
    }, 5000)

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
    }
  }, [connected, getProgress])

  return { connected, sendMessage, reconnect }
}
