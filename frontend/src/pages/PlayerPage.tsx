/**
 * PlayerPage - 播放端页面
 * 根据 WebSocket 指令切换播放内容，支持列表播放
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { Material, WsMessage, WsPlayMessage, PlayMode } from '../types'
import StandbyScreen from '../components/player/StandbyScreen'
import ImagePlayer from '../components/player/ImagePlayer'
import VideoPlayer from '../components/player/VideoPlayer'
import WebpagePlayer from '../components/player/WebpagePlayer'
import HtmlPlayer from '../components/player/HtmlPlayer'

interface PlaylistInfo {
  id: number
  name: string
  play_mode: PlayMode
  items: { id: number; material_id: number; sort_order: number }[]
  current_index: number
}

const PlayerPage: React.FC = () => {
  const { connected, lastMessage } = useWebSocket('/api/player/ws/player')
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'stopped'>('idle')
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null)

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
          url: mat.type === 'webpage' ? mat.url :
               mat.type === 'html' ? (mat.file_path ? `/uploads/${mat.file_path}` : null) :
               mat.hls_path ? `/uploads/${mat.hls_path}/master.m3u8` :
               (mat.file_path ? `/uploads/${mat.file_path}` : null),
          mime_type: mat.mime_type,
          size: mat.size,
          hls_path: mat.hls_path,
          tags: mat.tags || [],
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
        const msg = lastMessage as WsPlayMessage
        setCurrentMaterial({
          id: msg.material.id,
          title: msg.material.title,
          type: msg.material.type,
          file_path: null,
          url: msg.material.url,
          mime_type: msg.material.mime_type,
          size: null,
          hls_path: msg.material.hls_path,
          tags: [],
          created_at: '',
          updated_at: '',
        })
        setStatus('playing')
        // 更新播放列表信息
        if (msg.playlist) {
          setPlaylist(msg.playlist)
        }
        break
      }
      case 'stop':
        setCurrentMaterial(null)
        setStatus('stopped')
        setPlaylist(null)
        break
      case 'refresh':
        window.location.reload()
        break
    }
  }, [lastMessage])

  // 素材播放结束后自动播放下一个
  const handleMediaEnded = useCallback(() => {
    if (!playlist) return
    // 通过 API 请求下一个
    fetch('/api/player/next', { method: 'POST' }).catch(() => {})
  }, [playlist])

  // 待机状态
  if (status === 'idle' || status === 'stopped' || !currentMaterial) {
    return <StandbyScreen connected={connected} />
  }

  // 根据素材类型渲染对应播放器
  switch (currentMaterial.type) {
    case 'image':
      return <ImagePlayer url={currentMaterial.url || ''} title={currentMaterial.title} />
    case 'video':
      return (
        <VideoPlayer
          url={currentMaterial.url || ''}
          title={currentMaterial.title}
          hlsPath={currentMaterial.hls_path}
        />
      )
    case 'html':
      return <HtmlPlayer url={currentMaterial.url || ''} title={currentMaterial.title} />
    case 'webpage':
      return <WebpagePlayer url={currentMaterial.url || ''} title={currentMaterial.title} />
    default:
      return <StandbyScreen connected={connected} />
  }
}

export default PlayerPage
