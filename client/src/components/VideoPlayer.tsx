/**
 * VideoPlayer - 视频播放组件
 * 自动静音循环播放
 */
import React, { useRef, useState, useEffect } from 'react'

interface VideoPlayerProps {
  url: string
  title: string
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // 自动播放
    const playPromise = video.play()
    if (playPromise) {
      playPromise.catch(() => {
        // 自动播放被阻止，尝试静音后播放
        video.muted = true
        video.play().catch(() => {})
      })
    }
  }, [url])

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-red-500 text-lg mb-2">视频加载失败</div>
          <div className="text-gray-600 text-sm">{title}</div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={url}
          muted
          loop
          playsInline
          autoPlay
          onError={() => setError(true)}
          className="max-w-full max-h-full object-contain"
        />
      )}
    </div>
  )
}

export default VideoPlayer
