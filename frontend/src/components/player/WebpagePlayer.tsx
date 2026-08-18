/**
 * WebpagePlayer - 网页播放组件
 * 使用 iframe 全屏展示网页
 */
import React from 'react'

interface WebpagePlayerProps {
  url: string
  title: string
}

const WebpagePlayer: React.FC<WebpagePlayerProps> = ({ url, title }) => {
  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  )
}

export default WebpagePlayer
