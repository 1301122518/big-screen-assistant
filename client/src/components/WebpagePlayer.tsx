/**
 * WebpagePlayer - 网页播放组件
 * 使用 iframe 全屏展示网页
 */
import React, { useState } from 'react'

interface WebpagePlayerProps {
  url: string
  title: string
}

const WebpagePlayer: React.FC<WebpagePlayerProps> = ({ url, title }) => {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full h-full bg-black">
      {/* 加载状态 */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black">
          <div className="text-gray-500 text-lg">加载中...</div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-red-500 text-lg mb-2">网页加载失败</div>
          <div className="text-gray-600 text-sm mb-4">{title}</div>
          <div className="text-gray-700 text-xs">{url}</div>
        </div>
      )}

      {/* iframe */}
      <iframe
        src={url}
        title={title}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full border-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="autoplay; fullscreen"
      />
    </div>
  )
}

export default WebpagePlayer
