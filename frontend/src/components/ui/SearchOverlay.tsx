/**
 * SearchOverlay - 全局搜索浮层（v3.0 新增）
 * Ctrl+K 唤起，类似 Spotlight 的搜索体验
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { Material } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  materials: Material[]
  onSelect: (material: Material) => void
  darkMode: boolean
}

/** 高亮匹配文本 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  )
}

/** 获取素材图标 */
function getMaterialIcon(type: string): string {
  switch (type) {
    case 'video': return '🎬'
    case 'image': return '🖼️'
    case 'html': return '📄'
    case 'webpage': return '🌐'
    default: return '📄'
  }
}

const SearchOverlay: React.FC<Props> = ({ open, onClose, materials, onSelect, darkMode }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 搜索结果
  const results = useMemo(() => {
    if (!query.trim()) return materials.slice(0, 10)
    const q = query.trim().toLowerCase()
    return materials
      .filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        (m.file_path && m.file_path.toLowerCase().includes(q))
      )
      .slice(0, 20)
  }, [query, materials])

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  // 滚动到选中项
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 搜索框 */}
      <div className={`relative w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden animate-scale-in ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* 输入区域 */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索素材、播放列表、设备..."
            className={`flex-1 bg-transparent outline-none text-sm ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'}`}
          />
          <kbd className={`hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border ${
            darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-400'
          }`}>
            ESC
          </kbd>
        </div>

        {/* 搜索结果 */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">没有找到匹配的素材</p>
            </div>
          ) : (
            <>
              {query && (
                <p className={`text-xs px-2 py-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  找到 {results.length} 个结果
                </p>
              )}
              {results.map((material, index) => (
                <button
                  key={material.id}
                  onClick={() => onSelect(material)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                    index === selectedIndex
                      ? darkMode ? 'bg-blue-600/20 text-white' : 'bg-blue-50 text-blue-900'
                      : darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-xl">{getMaterialIcon(material.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {highlightText(material.title, query)}
                    </p>
                    <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {material.type === 'video' ? '视频' : material.type === 'image' ? '图片' : material.type === 'html' ? '网页文件' : '网页链接'}
                      {material.size ? ` · ${(material.size / 1024 / 1024).toFixed(1)} MB` : ''}
                    </p>
                  </div>
                  {index === selectedIndex && (
                    <kbd className={`text-[10px] px-1.5 py-0.5 rounded ${
                      darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                    }`}>
                      ↵
                    </kbd>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* 底部提示 */}
        <div className={`flex items-center gap-4 px-4 py-2 border-t text-[10px] ${
          darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'
        }`}>
          <span>↑↓ 导航</span>
          <span>↵ 选择</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  )
}

export default SearchOverlay
