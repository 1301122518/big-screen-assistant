/**
 * VideoPlayer - 视频播放组件（支持 HLS 流式播放）
 * 大文件通过 HLS 分片按需加载，避免卡顿
 * 自动循环播放（带声音），优化内存管理
 * v3.0: 通过 ref 暴露 currentTime/duration 用于进度上报
 */
import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
// @ts-ignore - hls.js has no type declarations
import Hls from 'hls.js'

export interface VideoPlayerHandle {
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (level: number) => void
}

interface VideoPlayerProps {
  url: string
  onEnded?: () => void
  onError?: (error: string) => void
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({ url, onEnded, onError }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hlsInstance, setHlsInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    getDuration: () => videoRef.current?.duration ?? 0,
    setVolume: (level: number) => {
      if (videoRef.current) {
        videoRef.current.volume = Math.max(0, Math.min(1, level))
      }
    },
  }))

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // 重置加载状态
    setLoading(true)

    // 清理旧实例
    if (hlsInstance) {
      hlsInstance.destroy()
      setHlsInstance(null)
    }

    // 加载状态事件处理
    const handleWaiting = () => setLoading(true)
    const handlePlaying = () => setLoading(false)
    const handleCanPlay = () => setLoading(false)

    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('canplay', handleCanPlay)

    // 检测是否为 HLS 流
    const isHls = url.endsWith('.m3u8')
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // 自动播放可能被浏览器阻止
        })
      })
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          onError?.('视频加载失败')
        }
      })
      setHlsInstance(hls)
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 原生 HLS 支持
      video.src = url
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {})
      })
    } else {
      // 普通视频
      video.src = url
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {})
      })
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy()
      }
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [url])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleEnded = () => {
      video.currentTime = 0
      video.play().catch(() => {})
      onEnded?.()
    }

    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [onEnded])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        autoPlay
        playsInline
        muted={false}
        controls={false}
      />
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer
