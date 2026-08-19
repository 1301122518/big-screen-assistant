/**
 * PlayerPage - 播放端页面（v3.0 增强版）
 * 连接服务端 WebSocket，根据指令播放内容
 * 支持设备准入控制、远程指令、播放进度上报
 * v3.0.1 修复：启动时自动注册设备，再连接 WebSocket
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { WsMessage, AppConfig } from '../types'
import StandbyScreen from '../components/StandbyScreen'
import ImagePlayer from '../components/ImagePlayer'
import VideoPlayer, { VideoPlayerHandle } from '../components/VideoPlayer'
import WebpagePlayer from '../components/WebpagePlayer'
import DeviceWaitingPage from './DeviceWaitingPage'
import Logger from '../utils/logger'

const log = Logger.create('PlayerPage')

/** 设备注册状态 */
type DeviceRegStatus = 'idle' | 'registering' | 'pending' | 'approved' | 'rejected' | 'error'

const PlayerPage: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [deviceId, setDeviceId] = useState<string>('')
  const [currentMaterial, setCurrentMaterial] = useState<WsMessage['material'] | null>(null)
  const [playerStatus, setPlayerStatus] = useState<string>('idle')
  const [authError, setAuthError] = useState<{ type: string; message: string } | null>(null)
  const [regStatus, setRegStatus] = useState<DeviceRegStatus>('idle')
  const [regError, setRegError] = useState<{ type: string; message: string } | null>(null)
  const videoRef = useRef<VideoPlayerHandle>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 加载配置和设备 ID
  useEffect(() => {
    async function init() {
      try {
        const api = window.electronAPI
        const savedConfig = await api.getConfig()
        setConfig(savedConfig)
        const id = await api.getDeviceId()
        setDeviceId(id)
      } catch (err) {
        log.error('初始化失败', err)
      }
    }
    init()
  }, [])

  // 设备注册 + 轮询审批状态
  useEffect(() => {
    if (!config?.serverUrl || !deviceId) return

    let cancelled = false

    const registerDevice = async () => {
      setRegStatus('registering')
      log.info('注册设备', { deviceId, serverUrl: config.serverUrl })

      try {
        const response = await fetch(`${config.serverUrl}/api/devices/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            device_name: config.deviceName || '大屏客户端',
            device_type: 'electron',
          }),
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        if (data.code !== 0) {
          throw new Error(data.message || '注册失败')
        }

        const status = data.data?.status
        log.info('设备注册成功', { status })

        if (cancelled) return

        if (status === 'approved') {
          setRegStatus('approved')
        } else if (status === 'rejected') {
          setRegStatus('rejected')
        } else {
          // pending - 开始轮询
          setRegStatus('pending')
          startPolling()
        }
      } catch (e: any) {
        log.error('设备注册失败', { message: e.message })
        if (cancelled) return
        setRegStatus('error')
        setRegError({
          type: e.name === 'AbortError' || e.name === 'TimeoutError' ? 'network' : 'unknown',
          message: e.message || '未知错误',
        })
      }
    }

    const startPolling = () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      pollTimerRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${config.serverUrl}/api/devices/check/${deviceId}`)
          if (!response.ok) return
          const data = await response.json()
          if (cancelled) return
          const s = data.data?.status
          if (s === 'approved') {
            log.info('设备已批准')
            setRegStatus('approved')
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          } else if (s === 'rejected') {
            log.warn('设备被拒绝')
            setRegStatus('rejected')
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          }
        } catch (e: any) {
          log.debug('轮询网络错误', { message: e.message })
        }
      }, 3000)
    }

    registerDevice()

    return () => {
      cancelled = true
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [config?.serverUrl, deviceId])

  // WebSocket 消息处理
  const handleMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'play':
        if (msg.material) {
          setCurrentMaterial(msg.material)
          setPlayerStatus('playing')
        }
        break
      case 'stop':
        setCurrentMaterial(null)
        setPlayerStatus('stopped')
        break
      case 'refresh':
        window.location.reload()
        break
      case 'command':
        handleRemoteCommand(msg.command || '', msg.params || {})
        break
    }
  }, [])

  // 远程指令处理
  const handleRemoteCommand = useCallback(async (command: string, params: Record<string, unknown>) => {
    const api = window.electronAPI

    switch (command) {
      case 'screenshot':
        try {
          await api.screenshot()
        } catch (err) {
          log.error('截屏失败', err)
        }
        break
      case 'restart':
        await api.restartApp()
        break
      case 'volume':
        if (params.level !== undefined) {
          const level = Number(params.level)
          videoRef.current?.setVolume(level)
        }
        break
      case 'stop':
        setCurrentMaterial(null)
        setPlayerStatus('stopped')
        break
      default:
        log.warn(`未知指令: ${command}`)
    }
  }, [])

  // 进度上报回调
  const getProgress = useCallback(() => {
    if (playerStatus !== 'playing' || !currentMaterial) {
      return { currentTime: 0, duration: 0, materialId: null, status: playerStatus }
    }
    return {
      currentTime: videoRef.current?.getCurrentTime() ?? 0,
      duration: videoRef.current?.getDuration() ?? 0,
      materialId: currentMaterial.id,
      status: playerStatus,
    }
  }, [playerStatus, currentMaterial])

  // WebSocket 连接（仅在设备已注册并批准后）
  const wsEnabled = regStatus === 'approved'
  const { connected, sendMessage } = useWebSocket({
    serverUrl: wsEnabled ? (config?.serverUrl || '') : '',
    deviceId: wsEnabled ? deviceId : '',
    onMessage: handleMessage,
    getProgress,
    onAuthError: setAuthError,
  })

  // 暴露 sendMessage 供远程指令回传
  useEffect(() => {
    (window as any).wsSendMessage = sendMessage
    return () => { delete (window as any).wsSendMessage }
  }, [sendMessage])

  // 设备注册中 / 等待审批 / 注册失败
  if (regStatus === 'registering' || regStatus === 'pending') {
    return (
      <DeviceWaitingPage
        deviceName={config?.deviceName || '大屏客户端'}
        deviceId={deviceId}
        serverUrl={config?.serverUrl || ''}
        status="pending"
        onApproved={() => window.location.reload()}
      />
    )
  }

  if (regStatus === 'rejected') {
    return (
      <DeviceWaitingPage
        deviceName={config?.deviceName || '大屏客户端'}
        deviceId={deviceId}
        serverUrl={config?.serverUrl || ''}
        status="rejected"
        onReconfigure={() => window.location.reload()}
      />
    )
  }

  if (regStatus === 'error') {
    return (
      <DeviceWaitingPage
        deviceName={config?.deviceName || '大屏客户端'}
        deviceId={deviceId}
        serverUrl={config?.serverUrl || ''}
        status="not_found"
        errorType={regError?.type || 'unknown'}
        errorMessage={regError?.message || ''}
        onReconfigure={() => window.location.reload()}
      />
    )
  }

  // WebSocket 认证错误（连接后被服务端拒绝）
  if (authError) {
    if (authError.type === 'auth_pending' || authError.type === 'auth_rejected') {
      return (
        <DeviceWaitingPage
          deviceName={config?.deviceName || '大屏客户端'}
          deviceId={deviceId}
          serverUrl={config?.serverUrl || ''}
          status={authError.type === 'auth_pending' ? 'pending' : 'rejected'}
          onApproved={() => window.location.reload()}
        />
      )
    }
    if (authError.type === 'auth_error') {
      return (
        <DeviceWaitingPage
          deviceName={config?.deviceName || '大屏客户端'}
          deviceId={deviceId}
          serverUrl={config?.serverUrl || ''}
          status="not_found"
          errorType="unknown"
          errorMessage={authError.message || '设备未注册，请联系管理员'}
          onReconfigure={() => window.location.reload()}
        />
      )
    }
  }

  // 待机画面
  if (!currentMaterial || playerStatus === 'stopped' || playerStatus === 'idle') {
    return (
      <StandbyScreen
        connected={connected}
        serverUrl={config?.serverUrl || ''}
      />
    )
  }

  // 解析素材 URL：相对路径需要拼接服务器地址
  const resolveUrl = (url: string): string => {
    if (!url) return ''
    // 已经是完整 URL（http/https/file）则直接返回
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
      return url
    }
    // 相对路径（如 /uploads/xxx）需要拼接服务器地址
    if (url.startsWith('/') && config?.serverUrl) {
      return `${config.serverUrl}${url}`
    }
    return url
  }

  // 根据素材类型渲染播放器
  const renderPlayer = () => {
    if (!currentMaterial) return null

    const { type, url } = currentMaterial
    const title = currentMaterial.title || ''
    const resolvedUrl = resolveUrl(url || '')

    switch (type) {
      case 'image':
        return <ImagePlayer url={resolvedUrl} title={title} />
      case 'video':
        return <VideoPlayer ref={videoRef} url={resolvedUrl} />
      case 'webpage':
        return <WebpagePlayer url={resolvedUrl} title={title} />
      case 'html':
        return <WebpagePlayer url={resolvedUrl} title={title} />
      default:
        return <ImagePlayer url={resolvedUrl} title={title} />
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {renderPlayer()}
    </div>
  )
}

export default PlayerPage
