/**
 * ImagePlayer - 图片播放组件
 * 居中等比全屏展示图片
 */
import React from 'react'

interface ImagePlayerProps {
  url: string
  title: string
}

const ImagePlayer: React.FC<ImagePlayerProps> = ({ url, title }) => {
  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      <img
        src={url}
        alt={title}
        className="max-w-full max-h-full object-contain"
        draggable={false}
      />
    </div>
  )
}

export default ImagePlayer
