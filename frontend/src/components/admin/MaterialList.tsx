/**
 * MaterialList - 素材列表组件（v3.0 增强版）
 * 新增：批量操作、排序、深色模式、素材编辑
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react'
import type { Material, MaterialType } from '../../types'
import MaterialCard from './MaterialCard'
import { SkeletonMaterialGrid } from '../ui/Skeleton'
import ConfirmDialog from '../ui/ConfirmDialog'
import { batchDeleteMaterials } from '../../api/client'

interface MaterialListProps {
  materials: Material[]
  loading: boolean
  onPlay: (id: number) => void
  onDelete: (id: number) => void
  onUpdate: (id: number, data: { title?: string; url?: string }) => void
  darkMode: boolean
}

const TYPE_OPTIONS: { value: MaterialType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: '全部', icon: '📁' },
  { value: 'image', label: '图片', icon: '🖼️' },
  { value: 'video', label: '视频', icon: '🎬' },
  { value: 'html', label: '网页文件', icon: '📄' },
  { value: 'webpage', label: '网页链接', icon: '🌐' },
]

type SortField = 'created_at' | 'size' | 'title'
type SortOrder = 'asc' | 'desc'

const MaterialList: React.FC<MaterialListProps> = ({
  materials,
  loading,
  onPlay,
  onDelete,
  onUpdate,
  darkMode,
}) => {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MaterialType | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)

  // 批量操作
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  // 编辑状态
  const [editingId, setEditingId] = useState<number | null>(null)

  // URL 状态同步
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setSearch(q)
  }, [])

  /** 筛选 + 排序后的素材 */
  const filtered = useMemo(() => {
    let result = materials
    if (typeFilter !== 'all') {
      result = result.filter(m => m.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.file_path && m.file_path.toLowerCase().includes(q))
      )
    }
    // 排序
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'size':
          cmp = (a.size || 0) - (b.size || 0)
          break
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return result
  }, [materials, typeFilter, search, sortField, sortOrder])

  /** 统计各类型数量 */
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: materials.length }
    materials.forEach(m => { c[m.type] = (c[m.type] || 0) + 1 })
    return c
  }, [materials])

  /** 切换选择 */
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** 全选/取消全选 */
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)))
    }
  }, [filtered, selectedIds.size])

  /** 批量删除 */
  const handleBatchDelete = useCallback(async () => {
    setBatchDeleting(true)
    try {
      await batchDeleteMaterials(Array.from(selectedIds))
      setSelectedIds(new Set())
      setBatchMode(false)
      setShowBatchDeleteConfirm(false)
    } catch {
      // error handled elsewhere
    } finally {
      setBatchDeleting(false)
    }
  }, [selectedIds])

  /** 确认删除 */
  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  // 骨架屏
  if (loading) {
    return <SkeletonMaterialGrid count={8} />
  }

  // 空状态
  if (materials.length === 0) {
    return (
      <div className="text-center py-16">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <svg className={`w-12 h-12 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className={`text-lg font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>素材库为空</h3>
        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>点击上方「添加素材」按钮上传文件或添加 URL</p>
      </div>
    )
  }

  const inputClass = `w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
    darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'
  }`

  return (
    <div>
      {/* 搜索和筛选工具栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* 搜索框 */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索素材..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className={`absolute right-2 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ✕
            </button>
          )}
        </div>

        {/* 类型筛选 */}
        <div className="flex gap-1 flex-wrap">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                typeFilter === opt.value
                  ? 'bg-blue-100 text-blue-700'
                  : darkMode
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {opt.icon} {opt.label}
              {counts[opt.value] ? ` (${counts[opt.value]})` : ''}
            </button>
          ))}
        </div>

        {/* 排序 */}
        <div className="flex items-center gap-1.5">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className={`px-2 py-1.5 rounded-lg text-xs border ${
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <option value="created_at">按时间</option>
            <option value="size">按大小</option>
            <option value="title">按名称</option>
          </select>
          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            className={`p-1.5 rounded-lg text-xs border ${
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
            title={sortOrder === 'asc' ? '升序' : '降序'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* 批量操作按钮 */}
        <button
          onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()) }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
            batchMode
              ? 'bg-amber-100 text-amber-700'
              : darkMode
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          {batchMode ? '取消批量' : '批量操作'}
        </button>
      </div>

      {/* 批量操作工具栏 */}
      {batchMode && (
        <div className={`flex items-center gap-3 mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              全选 ({selectedIds.size}/{filtered.length})
            </span>
          </label>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition"
            >
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
      )}

      {/* 筛选结果提示 */}
      {search && (
        <div className={`mb-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          搜索「{search}」找到 {filtered.length} 个结果
          {typeFilter !== 'all' && `（${TYPE_OPTIONS.find(o => o.value === typeFilter)?.label}）`}
        </div>
      )}

      {/* 素材网格 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">🔍</p>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>没有找到匹配的素材</p>
          <button
            onClick={() => { setSearch(''); setTypeFilter('all') }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            清除筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onPlay={() => onPlay(material.id)}
              onDelete={() => setDeleteTarget(material)}
              onUpdate={(data) => onUpdate(material.id, data)}
              darkMode={darkMode}
              batchMode={batchMode}
              selected={selectedIds.has(material.id)}
              onToggleSelect={() => toggleSelect(material.id)}
            />
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除素材"
        message={`确定要删除「${deleteTarget?.title}」吗？此操作不可恢复。`}
        confirmText="删除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 批量删除确认弹窗 */}
      <ConfirmDialog
        open={showBatchDeleteConfirm}
        title="批量删除素材"
        message={`确定要删除选中的 ${selectedIds.size} 个素材吗？此操作不可恢复。`}
        confirmText="删除"
        danger
        onConfirm={handleBatchDelete}
        onCancel={() => setShowBatchDeleteConfirm(false)}
      />
    </div>
  )
}

export default MaterialList
