/**
 * useWebSocket Hook - WebSocket 连接管理（播放端使用）
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { WsMessage } from '../types'

interface UseWebSocketReturn {
  connected: boolean
  lastMessage: WsMessage | null
  sendMessage: (msg: unknown) => void
}

export function useWebSocket(path: string = '/api/player/ws/player'): UseWebSocketReturn {
  const [connected, setConnected] = useState<boolean>(false)
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef<boolean>(true)

  /** 建立 WebSocket 连接 */
  const connect = useCallback(() => {
    if (!mountedRef.current) return

    // 根据当前协议自动选择 ws/wss
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}${path}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
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
        // 自动重连，3 秒后
        reconnectTimerRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = () => {
        // onerror 后会自动触发 onclose
        ws.close()
      }
    } catch {
      // 连接失败，延迟重连
      reconnectTimerRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }
  }, [path])

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

  return { connected, lastMessage, sendMessage }
}
