/**
 * Skeleton - 骨架屏加载组件
 */
import React from 'react'

/** 骨架屏卡片 */
export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
    <div className="h-36 bg-gray-200" />
    <div className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded-full w-12" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-8 bg-gray-200 rounded-lg flex-1" />
        <div className="h-8 bg-gray-200 rounded-lg w-10" />
      </div>
    </div>
  </div>
)

/** 骨架屏列表 - 素材卡片网格 */
export const SkeletonMaterialGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

/** 骨架屏行 - 设备/列表项 */
export const SkeletonRow: React.FC = () => (
  <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-200 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-16" />
    </div>
  </div>
)

/** 骨架屏设备列表 */
export const SkeletonDeviceList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
)
