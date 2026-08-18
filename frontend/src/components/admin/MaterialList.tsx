/**
 * MaterialList - 素材列表组件
 */
import React from 'react'
import type { Material } from '../../types'
import MaterialCard from './MaterialCard'

interface MaterialListProps {
  materials: Material[]
  loading: boolean
  onPlay: (id: number) => void
  onDelete: (id: number) => void
}

const MaterialList: React.FC<MaterialListProps> = ({
  materials,
  loading,
  onPlay,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    )
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p>暂无素材，请上传文件或添加 URL</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {materials.map((material) => (
        <MaterialCard
          key={material.id}
          material={material}
          onPlay={() => onPlay(material.id)}
          onDelete={() => onDelete(material.id)}
        />
      ))}
    </div>
  )
}

export default MaterialList
