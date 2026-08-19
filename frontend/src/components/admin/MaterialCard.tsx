/**
 * MaterialCard - 素材卡片组件（v3.0 增强版）
 * 新增：编辑/重命名、批量选择、深色模式、视频缩略图
 */
import React, { useState } from 'react'
import type { Material, Tag } from '../../types'

interface MaterialCardProps {
  material: Material
  onPlay: () => void
  onDelete: () => void
  onUpdate: (data: { title?: string; url?: string }) => void
  darkMode: boolean
  batchMode: boolean
  selected: boolean
  onToggleSelect: () => void
}

/** 格式化文件大小 */
function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** 获取素材类型标签 */
function getTypeBadge(type: string): { label: string; color: string; icon: string } {
  switch (type) {
    case 'image': return { label: '图片', color: 'bg-emerald-100 text-emerald-700', icon: '🖼️' }
    case 'video': return { label: '视频', color: 'bg-purple-100 text-purple-700', icon: '🎬' }
    case 'html': return { label: '网页文件', color: 'bg-orange-100 text-orange-700', icon: '📄' }
    case 'webpage': return { label: '网页链接', color: 'bg-blue-100 text-blue-700', icon: '🌐' }
    default: return { label: '未知', color: 'bg-gray-100 text-gray-700', icon: '📄' }
  }
}

/** 获取预览 URL */
function getPreviewUrl(material: Material): string | null {
  if (material.type === 'image' && material.file_path) {
    return `/uploads/${material.file_path}`
  }
  // 视频如果有 HLS 缩略图
  if (material.type === 'video' && material.hls_path) {
    return `/uploads/${material.hls_path}/thumbnail001.jpg`
  }
  return null
}

/** 获取占位符背景 */
function getPlaceholderBg(type: string, darkMode: boolean): string {
  if (darkMode) {
    switch (type) {
      case 'video': return 'from-purple-900/30 to-purple-800/10'
      case 'html': return 'from-orange-900/30 to-orange-800/10'
      case 'webpage': return 'from-blue-900/30 to-blue-800/10'
      default: return 'from-gray-800 to-gray-900'
    }
  }
  switch (type) {
    case 'video': return 'from-purple-100 to-purple-50'
    case 'html': return 'from-orange-100 to-orange-50'
    case 'webpage': return 'from-blue-100 to-blue-50'
    default: return 'from-gray-100 to-gray-50'
  }
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  onPlay,
  onDelete,
  onUpdate,
  darkMode,
  batchMode,
  selected,
  onToggleSelect,
}) => {
  const badge = getTypeBadge(material.type)
  const previewUrl = getPreviewUrl(material)

  // 编辑状态
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(material.title)
  const [editUrl, setEditUrl] = useState(material.url || '')

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return
    const data: { title?: string; url?: string } = {}
    if (editTitle.trim() !== material.title) data.title = editTitle.trim()
    if (material.type === 'webpage' && editUrl !== (material.url || '')) data.url = editUrl
    if (Object.keys(data).length > 0) {
      onUpdate(data)
    }
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(material.title)
    setEditUrl(material.url || '')
    setEditing(false)
  }

  const cardClass = `group rounded-xl border overflow-hidden transition-all duration-200 ${
    selected
      ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
      : darkMode
        ? 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-lg'
        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
  }`

  return (
    <div className={cardClass}>
      {/* 预览区域 */}
      <div
        className={`relative h-40 bg-gradient-to-br ${getPlaceholderBg(material.type, darkMode)} flex items-center justify-center overflow-hidden`}
        onClick={batchMode ? onToggleSelect : undefined}
      >
        {/* 批量选择复选框 */}
        {batchMode && (
          <div className="absolute top-2 right-2 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}

        {previewUrl ? (
          <img
            src={previewUrl}
            alt={material.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : material.type === 'webpage' && material.url ? (
          // 网页预览 iframe
          <iframe
            src={material.url}
            className="w-full h-full border-0 pointer-events-none"
            sandbox=""
            title={material.title}
          />
        ) : (
          <div className="text-center">
            <span className="text-5xl opacity-60">{badge.icon}</span>
          </div>
        )}

        {/* 类型标签 */}
        <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
          {badge.label}
        </span>

        {/* Hover 播放按钮 */}
        {!batchMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => { e.stopPropagation(); onPlay() }}
              className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition transform scale-75 group-hover:scale-100"
            >
              <svg className="w-5 h-5 text-blue-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="p-3">
        {editing ? (
          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`w-full px-2 py-1 border rounded text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit() }}
            />
            {material.type === 'webpage' && (
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="URL"
                className={`w-full px-2 py-1 border rounded text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            )}
            <div className="flex gap-1.5">
              <button onClick={handleSaveEdit} className="flex-1 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">保存</button>
              <button onClick={handleCancelEdit} className={`flex-1 py-1 text-xs rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>取消</button>
            </div>
          </div>
        ) : (
          <>
            <h3 className={`text-sm font-medium truncate mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`} title={material.title}>
              {material.title}
            </h3>

            {/* 标签 */}
            {material.tags && material.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {material.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            <div className={`flex items-center justify-between text-xs mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>{formatSize(material.size)}</span>
              <span>
                {material.created_at
                  ? new Date(material.created_at).toLocaleDateString('zh-CN')
                  : ''}
              </span>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={onPlay}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                播放
              </button>
              <button
                onClick={() => { setEditing(true); setEditTitle(material.title); setEditUrl(material.url || '') }}
                className={`px-2.5 py-2 rounded-lg text-sm transition ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-500'
                }`}
                title="编辑"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className={`px-3 py-2 rounded-lg text-sm transition ${
                  darkMode ? 'bg-gray-700 text-gray-400 hover:bg-red-900 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                }`}
                title="删除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MaterialCard
