/**
 * PlayerPage - 播放端页面
 * 连接服务端 WebSocket，根据指令播放内容
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { Material, WsMessage, AppConfig } from '../types'
import StandbyScreen from '../components/StandbyScreen'
import ImagePlayer from '../components/ImagePlayer'
import VideoPlayer from '../components/VideoPlayer'
import WebpagePlayer from '../components/WebpagePlayer'

const PlayerPage: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('')
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 加载配置
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((config: AppConfig) => {
        setServerUrl(config.serverUrl)
      })
    } else {
      // 浏览器调试模式，使用当前页面地址
      setServerUrl(window.location.origin)
    }
  }, [])

  const { connected, lastMessage, sendMessage } = useWebSocket(serverUrl)

  // 处理 WebSocket 消息
  const handleMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'play':
        if (msg.material) {
          setCurrentMaterial(msg.material)
          setIsPlaying(true)
        }
        break
      case 'stop':
        setCurrentMaterial(null)
        setIsPlaying(false)
        break
      case 'refresh':
        // 刷新页面
        window.location.reload()
        break
    }
  }, [])

  useEffect(() => {
    if (lastMessage) {
      handleMessage(lastMessage)
    }
  }, [lastMessage, handleMessage])

  // 定期上报状态
  useEffect(() => {
    const interval = setInterval(() => {
      sendMessage({
        type: 'status',
        status: isPlaying ? 'playing' : 'idle',
        material_id: currentMaterial?.id
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [sendMessage, isPlaying, currentMaterial])

  // 获取素材播放 URL
  const getMediaUrl = (material: Material): string => {
    // 优先使用后端返回的 url 字段（已经是完整路径）
    if (material.url) {
      // 如果是相对路径（如 /uploads/xxx.mp4），拼接服务器地址
      if (material.url.startsWith('/')) {
        return `${serverUrl}${material.url}`
      }
      // 如果是完整 URL（如 http://... 或 https://...），直接返回
      return material.url
    }
    // 兼容旧逻辑：如果没有 url 字段，使用 file_path 拼接
    if (material.file_path) {
      return `${serverUrl}/uploads/${material.file_path}`
    }
    return ''
  }

  // 未连接时显示待机画面
  if (!connected) {
    return <StandbyScreen connected={connected} serverUrl={serverUrl} />
  }

  // 连接但未播放时显示待机画面
  if (!isPlaying || !currentMaterial) {
    return <StandbyScreen connected={connected} serverUrl={serverUrl} />
  }

  // 根据素材类型渲染播放器
  const mediaUrl = getMediaUrl(currentMaterial)

  switch (currentMaterial.type) {
    case 'image':
      return <ImagePlayer url={mediaUrl} title={currentMaterial.title} />
    case 'video':
      return <VideoPlayer url={mediaUrl} title={currentMaterial.title} />
    case 'webpage':
      return <WebpagePlayer url={mediaUrl} title={currentMaterial.title} />
    default:
      return <StandbyScreen connected={connected} serverUrl={serverUrl} />
  }
}

export default PlayerPage
