/**
 * PlaylistPanel - 播放列表管理组件（增强版）
 * 支持拖拽排序、自定义删除弹窗、更好的视觉效果
 */
import React, { useState, useRef } from 'react'
import type { Playlist, Material } from '../../types'
import { usePlaylists } from '../../hooks/usePlaylists'
import { playPlaylist } from '../../api/client'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

interface Props {
  materials: Material[]
  darkMode?: boolean
}

const PLAY_MODE_LABELS: Record<string, { label: string; icon: string }> = {
  sequential: { label: '顺序播放', icon: '➡️' },
  loop: { label: '列表循环', icon: '🔁' },
  shuffle: { label: '随机播放', icon: '🔀' },
}

const PlaylistPanel: React.FC<Props> = ({ materials, darkMode = false }) => {
  const { playlists, loading, error, create, remove, addItem, removeItem, update, reorder } = usePlaylists()
  const { success, error: toastError } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMode, setNewMode] = useState('sequential')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showAddMaterial, setShowAddMaterial] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'playlist' | 'item'; playlist?: Playlist; itemId?: number; name?: string } | null>(null)

  // 拖拽状态
  const dragItem = useRef<{ playlistId: number; itemId: number; index: number } | null>(null)
  const dragOverItem = useRef<{ index: number } | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await create(newName.trim(), newMode)
      setNewName('')
      setShowCreate(false)
      success('播放列表已创建')
    } catch { /* error handled in hook */ }
  }

  const handlePlay = async (id: number) => {
    try {
      await playPlaylist(id)
      success('已开始播放列表')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '播放失败')
    }
  }

  const handleAddMaterial = async (playlistId: number, materialId: number) => {
    try {
      await addItem(playlistId, materialId)
    } catch { /* error handled in hook */ }
  }

  const handleRemoveItem = async (playlistId: number, itemId: number) => {
    try {
      await removeItem(playlistId, itemId)
    } catch { /* error handled in hook */ }
  }

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return
    try {
      await update(id, { name: editName.trim() })
      setEditingId(null)
      success('已更新名称')
    } catch { /* error handled in hook */ }
  }

  const handleModeChange = async (id: number, mode: string) => {
    try {
      await update(id, { play_mode: mode })
    } catch { /* error handled in hook */ }
  }

  /** 拖拽开始 */
  const handleDragStart = (playlistId: number, itemId: number, index: number) => {
    dragItem.current = { playlistId, itemId, index }
  }

  /** 拖拽经过 */
  const handleDragEnter = (index: number) => {
    dragOverItem.current = { index }
  }

  /** 拖拽结束 - 执行排序 */
  const handleDragEnd = async (playlist: Playlist) => {
    if (!dragItem.current || !dragOverItem.current) return
    if (dragItem.current.index === dragOverItem.current.index) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    const items = [...playlist.items]
    const draggedIdx = dragItem.current.index
    const targetIdx = dragOverItem.current.index

    // 重新排列
    const [removed] = items.splice(draggedIdx, 1)
    items.splice(targetIdx, 0, removed)

    dragItem.current = null
    dragOverItem.current = null

    // 调用 API 保存顺序
    try {
      await reorder(playlist.id, items.map(i => i.id))
    } catch { /* error handled in hook */ }
  }

  /** 确认删除 */
  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'playlist' && deleteTarget.playlist) {
      remove(deleteTarget.playlist.id)
      success('播放列表已删除')
    } else if (deleteTarget.type === 'item' && deleteTarget.playlist && deleteTarget.itemId !== undefined) {
      handleRemoveItem(deleteTarget.playlist.id, deleteTarget.itemId)
    }
    setDeleteTarget(null)
  }

  // 可添加到列表的素材（排除已在列表中的）
  const getAvailableMaterials = (playlist: Playlist) => {
    const existingIds = new Set(playlist.items.map(i => i.material_id))
    return materials.filter(m => !existingIds.has(m.id))
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">加载中...</p>
      </div>
    )
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建列表
        </button>
      </div>

      {/* 创建表单 */}
      {showCreate && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3 animate-slide-up">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="输入列表名称"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <select
            value={newMode}
            onChange={(e) => setNewMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="sequential">➡️ 顺序播放</option>
            <option value="loop">🔁 列表循环</option>
            <option value="shuffle">🔀 随机播放</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
            >
              创建
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {playlists.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📋</span>
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-1">暂无播放列表</h3>
          <p className="text-sm text-gray-400 mb-4">创建播放列表，将素材按顺序编排自动播放</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            创建第一个列表
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* 列表头部 */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 展开/折叠 */}
                  <button
                    onClick={() => setExpandedId(expandedId === playlist.id ? null : playlist.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                      expandedId === playlist.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <svg className={`w-4 h-4 transition-transform ${expandedId === playlist.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    {editingId === playlist.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 border border-blue-300 rounded text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(playlist.id); if (e.key === 'Escape') setEditingId(null) }}
                        onBlur={() => handleSaveEdit(playlist.id)}
                      />
                    ) : (
                      <h3 className="font-medium text-gray-800 truncate">{playlist.name}</h3>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{playlist.items.length} 个素材</span>
                      <select
                        value={playlist.play_mode}
                        onChange={(e) => handleModeChange(playlist.id, e.target.value)}
                        className="text-xs text-gray-500 border-none bg-transparent p-0 focus:ring-0 cursor-pointer"
                      >
                        {Object.entries(PLAY_MODE_LABELS).map(([key, { label, icon }]) => (
                          <option key={key} value={key}>{icon} {label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => handlePlay(playlist.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    播放
                  </button>
                  <button
                    onClick={() => { setExpandedId(playlist.id); setShowAddMaterial(playlist.id) }}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded-lg transition"
                  >
                    + 素材
                  </button>
                  <button
                    onClick={() => { setEditingId(playlist.id); setEditName(playlist.name) }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'playlist', playlist, name: playlist.name })}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 展开的内容 */}
              {expandedId === playlist.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {/* 添加素材面板 */}
                  {showAddMaterial === playlist.id && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">从素材库添加：</span>
                        <button onClick={() => setShowAddMaterial(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                      </div>
                      {materials.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-3">素材库为空，请先上传素材</p>
                      ) : getAvailableMaterials(playlist).length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-3">所有素材已添加</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {getAvailableMaterials(playlist).map((m) => (
                            <button
                              key={m.id}
                              onClick={() => handleAddMaterial(playlist.id, m.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-100 rounded-lg transition flex items-center gap-2 bg-white border border-gray-200"
                            >
                              <span className="text-lg">
                                {m.type === 'video' ? '🎬' : m.type === 'image' ? '🖼️' : m.type === 'html' ? '📄' : '🌐'}
                              </span>
                              <span className="truncate flex-1">{m.title}</span>
                              <span className="text-blue-600 text-xs font-medium">+ 添加</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 列表项 */}
                  {playlist.items.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400 mb-3">列表为空</p>
                      <button
                        onClick={() => setShowAddMaterial(playlist.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                      >
                        + 添加素材
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-1">
                      {playlist.items.map((item, idx) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(playlist.id, item.id, idx)}
                          onDragEnter={() => handleDragEnter(idx)}
                          onDragEnd={() => handleDragEnd(playlist)}
                          onDragOver={(e) => e.preventDefault()}
                          className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition cursor-grab active:cursor-grabbing group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* 拖拽手柄 */}
                            <span className="text-gray-300 group-hover:text-gray-400 transition">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                              </svg>
                            </span>
                            <span className="text-xs text-gray-400 w-5 font-mono text-center">{idx + 1}</span>
                            <span className="text-base">
                              {item.material?.type === 'video' ? '🎬' :
                               item.material?.type === 'image' ? '🖼️' :
                               item.material?.type === 'html' ? '📄' : '🌐'}
                            </span>
                            <span className="text-sm text-gray-700 truncate">
                              {item.material?.title || `素材 #${item.material_id}`}
                            </span>
                          </div>
                          <button
                            onClick={() => setDeleteTarget({
                              type: 'item',
                              playlist,
                              itemId: item.id,
                              name: item.material?.title || `素材 #${item.material_id}`,
                            })}
                            className="text-gray-300 hover:text-red-500 text-xs ml-2 p-1 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100"
                            title="移除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowAddMaterial(showAddMaterial === playlist.id ? null : playlist.id)}
                        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-400 hover:text-blue-600 transition"
                      >
                        + 添加更多素材
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.type === 'playlist' ? '删除播放列表' : '移除素材'}
        message={
          deleteTarget?.type === 'playlist'
            ? `确定要删除「${deleteTarget?.name}」吗？列表中的所有素材也会被移除。`
            : `确定要从列表中移除「${deleteTarget?.name}」吗？`
        }
        confirmText={deleteTarget?.type === 'playlist' ? '删除' : '移除'}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default PlaylistPanel
