/**
 * HtmlPlayer - HTML 文件播放器
 * 使用 iframe 渲染上传的 HTML 文件，支持自动缩放适配屏幕
 */
import React, { useState, useEffect, useRef } from 'react'

interface Props {
  url: string
  title: string
}

const HtmlPlayer: React.FC<Props> = ({ url, title }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // 自动缩放：检测 iframe 内容尺寸并适配容器
  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current
      if (!container) return
      
      const iframe = container.querySelector('iframe')
      if (!iframe) return

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) return

        // 获取内容的实际尺寸
        const body = iframeDoc.body
        const scrollWidth = body?.scrollWidth || 1920
        const scrollHeight = body?.scrollHeight || 1080

        // 计算缩放比例
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight
        const scaleX = containerWidth / scrollWidth
        const scaleY = containerHeight / scrollHeight
        const newScale = Math.min(scaleX, scaleY)

        setScale(newScale)
      } catch {
        // 跨域时无法访问 iframe 内容，使用默认缩放
        setScale(1)
      }
    }

    // 初始缩放
    const timer = setTimeout(updateScale, 500)
    
    // 窗口大小变化时重新计算
    window.addEventListener('resize', updateScale)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateScale)
    }
  }, [url])

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center"
    >
      <iframe
        src={url}
        className="border-0 origin-center"
        title={title}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
        }}
        onLoad={() => {
          // iframe 加载完成后重新计算缩放
          setTimeout(() => {
            const container = containerRef.current
            if (!container) return
            const iframe = container.querySelector('iframe')
            if (!iframe) return
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
              if (!iframeDoc) return
              const body = iframeDoc.body
              const scrollWidth = body?.scrollWidth || 1920
              const scrollHeight = body?.scrollHeight || 1080
              const containerWidth = container.clientWidth
              const containerHeight = container.clientHeight
              const scaleX = containerWidth / scrollWidth
              const scaleY = containerHeight / scrollHeight
              setScale(Math.min(scaleX, scaleY))
            } catch {
              // 跨域时使用默认
            }
          }, 100)
        }}
      />
      {/* 标题覆盖层 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pointer-events-none">
        <p className="text-white text-sm font-medium">{title}</p>
      </div>
    </div>
  )
}

export default HtmlPlayer
