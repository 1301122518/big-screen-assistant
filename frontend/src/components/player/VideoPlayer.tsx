/**
 * VideoPlayer - 视频播放组件
 * 自动静音循环播放视频
 */
import React, { useRef, useEffect } from 'react'

interface VideoPlayerProps {
  url: string
  title: string
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // 自动播放
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 浏览器可能阻止自动播放，忽略错误
      })
    }
  }, [url])

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={url}
        title={title}
        autoPlay
        muted
        loop
        playsInline
        className="max-w-full max-h-full object-contain"
      />
    </div>
  )
}

export default VideoPlayer
