/**
 * VideoPlayer - 视频播放器（支持 HLS 流）
 */
import React, { useRef, useEffect, useState } from 'react'
// @ts-ignore - hls.js has no type declarations
import Hls from 'hls.js'

interface Props {
  url: string
  title: string
  hlsPath?: string | null
}

const VideoPlayer: React.FC<Props> = ({ url, title, hlsPath }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setError(null)

    // 判断是否是 HLS 流
    const isHls = url.endsWith('.m3u8') || (hlsPath && url.includes('/hls/'))

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        })
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {})
        })
        hls.on(Hls.Events.ERROR, (_event: unknown, data: { fatal: boolean }) => {
          if (data.fatal) {
            // HLS 失败，尝试直接播放
            console.warn('HLS error, falling back to direct play:', data)
            hls.destroy()
            video.src = url.replace('/master.m3u8', '').replace(/\/hls\/[^/]+/, '')
            video.play().catch(() => {})
          }
        })
        return () => {
          hls.destroy()
        }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 原生支持 HLS
        video.src = url
        video.play().catch(() => {})
      } else {
        setError('浏览器不支持 HLS 播放')
      }
    } else {
      // 直接播放
      video.src = url
      video.play().catch(() => {})
    }
  }, [url, hlsPath])

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {error ? (
        <div className="text-white text-center">
          <p className="text-lg">{error}</p>
          <p className="text-sm text-gray-400 mt-2">{title}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="max-w-full max-h-full"
          controls={false}
          autoPlay
          playsInline
        />
      )}
      {/* 标题覆盖层 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
        <p className="text-white text-lg font-medium">{title}</p>
      </div>
    </div>
  )
}

export default VideoPlayer
