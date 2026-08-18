/**
 * MaterialCard - 素材卡片组件
 * 展示素材缩略图/图标、标题、类型、操作按钮
 */
import React from 'react'
import type { Material } from '../../types'

interface MaterialCardProps {
  material: Material
  onPlay: () => void
  onDelete: () => void
}

/** 格式化文件大小 */
function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 获取素材类型标签 */
function getTypeBadge(type: string): { label: string; color: string } {
  switch (type) {
    case 'image':
      return { label: '图片', color: 'bg-green-100 text-green-700' }
    case 'video':
      return { label: '视频', color: 'bg-purple-100 text-purple-700' }
    case 'webpage':
      return { label: '网页', color: 'bg-blue-100 text-blue-700' }
    default:
      return { label: '未知', color: 'bg-gray-100 text-gray-700' }
  }
}

/** 获取素材预览 URL */
function getPreviewUrl(material: Material): string | null {
  if (material.type === 'image' && material.file_path) {
    return `/uploads/${material.file_path}`
  }
  return null
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, onPlay, onDelete }) => {
  const badge = getTypeBadge(material.type)
  const previewUrl = getPreviewUrl(material)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* 预览区域 */}
      <div className="h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={material.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-gray-400">
            <p className="text-4xl">
              {material.type === 'video' ? '🎬' : material.type === 'webpage' ? '🌐' : '📄'}
            </p>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-gray-800 truncate flex-1" title={material.title}>
            {material.title}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
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
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
          >
            ▶ 播放
          </button>
          <button
            onClick={() => {
              if (window.confirm(`确定删除「${material.title}」吗？`)) {
                onDelete()
              }
            }}
            className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-medium hover:bg-red-100 active:bg-red-200 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

export default MaterialCard
