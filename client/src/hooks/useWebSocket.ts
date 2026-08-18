/**
 * useWebSocket Hook - WebSocket 连接管理
 * 支持断线自动重连（指数退避）
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { WsMessage } from '../types'

interface UseWebSocketReturn {
  connected: boolean
  lastMessage: WsMessage | null
  sendMessage: (msg: unknown) => void
  reconnect: () => void
}

export function useWebSocket(serverUrl: string): UseWebSocketReturn {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const mountedRef = useRef(true)

  const MAX_RETRY_DELAY = 30000 // 最大重连间隔 30 秒

  /** 计算重连延迟（指数退避） */
  const getRetryDelay = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), MAX_RETRY_DELAY)
    retryCountRef.current++
    return delay
  }, [])

  /** 建立 WebSocket 连接 */
  const connect = useCallback(() => {
    if (!mountedRef.current || !serverUrl) return

    // 清理之前的连接
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // 构建 WebSocket URL
    let wsUrl = serverUrl.replace(/\/$/, '')
    if (wsUrl.startsWith('http://')) {
      wsUrl = 'ws://' + wsUrl.slice(7)
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = 'wss://' + wsUrl.slice(8)
    }
    wsUrl += '/api/player/ws/player'

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        retryCountRef.current = 0 // 重置重试计数
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
      }

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data as string) as WsMessage
          setLastMessage(data)
        } catch {
          // 忽略非 JSON 消息
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        wsRef.current = null
        // 自动重连
        const delay = getRetryDelay()
        reconnectTimerRef.current = setTimeout(() => {
          connect()
        }, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      const delay = getRetryDelay()
      reconnectTimerRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [serverUrl, getRetryDelay])

  /** 手动重连 */
  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    connect()
  }, [connect])

  /** 发送消息 */
  const sendMessage = useCallback((msg: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { connected, lastMessage, sendMessage, reconnect }
}
