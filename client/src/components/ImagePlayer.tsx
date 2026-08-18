/**
 * ImagePlayer - 图片播放组件
 * 全屏展示图片，支持缩放
 */
import React, { useState } from 'react'

interface ImagePlayerProps {
  url: string
  title: string
}

const ImagePlayer: React.FC<ImagePlayerProps> = ({ url, title }) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {/* 加载状态 */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500 text-lg">加载中...</div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-red-500 text-lg mb-2">图片加载失败</div>
          <div className="text-gray-600 text-sm">{title}</div>
        </div>
      )}

      {/* 图片 */}
      <img
        src={url}
        alt={title}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ imageRendering: 'auto' }}
      />
    </div>
  )
}

export default ImagePlayer
