/**
 * PlayerPage - 播放端页面
 * 根据 WebSocket 指令切换播放内容
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { Material, WsMessage } from '../types'
import StandbyScreen from '../components/player/StandbyScreen'
import ImagePlayer from '../components/player/ImagePlayer'
import VideoPlayer from '../components/player/VideoPlayer'
import WebpagePlayer from '../components/player/WebpagePlayer'

const PlayerPage: React.FC = () => {
  const { connected, lastMessage } = useWebSocket('/api/player/ws/player')
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'stopped'>('idle')

  /** 页面加载时从 API 恢复当前播放状态 */
  const loadCurrentState = useCallback(async () => {
    try {
      const res = await fetch('/api/player/status')
      if (!res.ok) return
      const json = await res.json()
      if (json.code === 0 && json.data?.status === 'playing' && json.data?.current_material) {
        const mat = json.data.current_material
        setCurrentMaterial({
          id: mat.id,
          title: mat.title,
          type: mat.type,
          file_path: mat.file_path,
          url: mat.type === 'webpage' ? mat.url : (mat.file_path ? `/uploads/${mat.file_path}` : null),
          mime_type: mat.mime_type,
          size: mat.size,
          created_at: mat.created_at,
          updated_at: mat.updated_at,
        })
        setStatus('playing')
      }
    } catch {
      // 静默失败
    }
  }, [])

  useEffect(() => {
    loadCurrentState()
  }, [loadCurrentState])

  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'play': {
        const msg = lastMessage as Extract<WsMessage, { type: 'play' }>
        setCurrentMaterial({
          id: msg.material.id,
          title: msg.material.title,
          type: msg.material.type,
          file_path: null,
          url: msg.material.url,
          mime_type: msg.material.mime_type,
          size: null,
          created_at: '',
          updated_at: '',
        })
        setStatus('playing')
        break
      }
      case 'stop':
        setCurrentMaterial(null)
        setStatus('stopped')
        break
      case 'refresh':
        window.location.reload()
        break
    }
  }, [lastMessage])

  // 待机状态
  if (status === 'idle' || status === 'stopped' || !currentMaterial) {
    return <StandbyScreen connected={connected} />
  }

  // 根据素材类型渲染对应播放器
  switch (currentMaterial.type) {
    case 'image':
      return <ImagePlayer url={currentMaterial.url || ''} title={currentMaterial.title} />
    case 'video':
      return <VideoPlayer url={currentMaterial.url || ''} title={currentMaterial.title} />
    case 'webpage':
      return <WebpagePlayer url={currentMaterial.url || ''} title={currentMaterial.title} />
    default:
      return <StandbyScreen connected={connected} />
  }
}

export default PlayerPage
