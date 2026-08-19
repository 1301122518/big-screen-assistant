/**
 * DevicePanel - 设备管理面板（批量管理增强版）
 * 支持：状态筛选、批量选择/全选、批量批准/拒绝/删除、分页
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchDevices, approveDevice, rejectDevice, deleteDevice, updateDeviceAlias,
  batchApproveDevices, batchRejectDevices, batchDeleteDevices,
} from '../../api/client'
import type { Device, PaginatedDevices, DeviceFilterStatus } from '../../types'
import { SkeletonDeviceList } from '../ui/Skeleton'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

interface DevicePanelProps {
  darkMode?: boolean
}

const PAGE_SIZE = 20

const STATUS_TABS: { key: DeviceFilterStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '已批准' },
  { key: 'rejected', label: '已拒绝' },
]

const DevicePanel: React.FC<DevicePanelProps> = ({ darkMode = false }) => {
  const [data, setData] = useState<PaginatedDevices | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<DeviceFilterStatus>('all')
  const [page, setPage] = useState(1)
  const { success, error: toastError } = useToast()

  // 多选
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // 编辑别名
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAlias, setEditAlias] = useState('')

  // 删除确认（单个）
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)
  // 批量操作确认
  const [batchAction, setBatchAction] = useState<{ type: 'approve' | 'reject' | 'delete'; ids: number[] } | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchDevices({ page, page_size: PAGE_SIZE, status: filterStatus })
      setData(result)
      // 切换页面或筛选时清空选择
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载设备列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  // 定期刷新
  useEffect(() => {
    const timer = setInterval(loadDevices, 5000)
    return () => clearInterval(timer)
  }, [loadDevices])

  // ============ 单设备操作 ============

  const handleApprove = async (id: number) => {
    try {
      await approveDevice(id)
      await loadDevices()
      success('设备已批准')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '操作失败')
    }
  }

  const handleReject = async (id: number) => {
    try {
      await rejectDevice(id)
      await loadDevices()
      success('设备已拒绝')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDevice(id)
      await loadDevices()
      success('设备已删除')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '操作失败')
    }
    setDeleteTarget(null)
  }

  const handleSaveAlias = async (device: Device) => {
    if (!editAlias.trim() || editAlias.trim() === device.device_name) {
      setEditingId(null)
      return
    }
    try {
      await updateDeviceAlias(device.device_id, editAlias.trim())
      await loadDevices()
      success('设备名称已更新')
    } catch (err) {
      toastError(err instanceof Error ? err.message : '更新失败')
    }
    setEditingId(null)
  }

  // ============ 批量操作 ============

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data) return
    if (selectedIds.size === data.items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.items.map(d => d.id)))
    }
  }

  const isAllSelected = data !== null && data.items.length > 0 && selectedIds.size === data.items.length

  const handleBatchApprove = async () => {
    if (!batchAction) return
    try {
      const result = await batchApproveDevices(batchAction.ids)
      await loadDevices()
      success(result.message || `批量批准成功（${result.success_count}/${result.total}）`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '批量操作失败')
    }
    setBatchAction(null)
  }

  const handleBatchReject = async () => {
    if (!batchAction) return
    try {
      const result = await batchRejectDevices(batchAction.ids)
      await loadDevices()
      success(result.message || `批量拒绝成功（${result.success_count}/${result.total}）`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '批量操作失败')
    }
    setBatchAction(null)
  }

  const handleBatchDelete = async () => {
    if (!batchAction) return
    try {
      const result = await batchDeleteDevices(batchAction.ids)
      await loadDevices()
      success(result.message || `批量删除成功（${result.success_count}/${result.total}）`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '批量操作失败')
    }
    setBatchAction(null)
  }

  // ============ 渲染辅助 ============

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            ✓ 已批准
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            ⏳ 待审批
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            ✗ 已拒绝
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        )
    }
  }

  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'electron': return '🖥️'
      case 'tv': return '📺'
      case 'web': return '🌐'
      default: return '📱'
    }
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const selectedCount = selectedIds.size

  // ============ 骨架屏 ============

  if (loading && (!data || data.items.length === 0)) {
    return <SkeletonDeviceList count={4} />
  }

  const devices = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.total_pages || 1

  return (
    <div>
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 统计卡 + 筛选标签 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-center">
            <span className="text-lg font-bold text-blue-600">{total}</span>
            <span className="text-xs text-gray-500 ml-1">设备</span>
          </div>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setFilterStatus(tab.key); setPage(1) }}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  filterStatus === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {selectedCount > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-700">
            已选 {selectedCount} 台设备
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setBatchAction({ type: 'approve', ids: Array.from(selectedIds) })}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition"
            >
              批量批准
            </button>
            <button
              onClick={() => setBatchAction({ type: 'reject', ids: Array.from(selectedIds) })}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition"
            >
              批量拒绝
            </button>
            <button
              onClick={() => setBatchAction({ type: 'delete', ids: Array.from(selectedIds) })}
              className="px-3 py-1.5 bg-white border border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition"
            >
              批量删除
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            取消选择
          </button>
        </div>
      )}

      {/* 设备列表 */}
      {devices.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📱</span>
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-1">
            {filterStatus === 'all' ? '暂无设备' : `暂无${STATUS_TABS.find(t => t.key === filterStatus)?.label}设备`}
          </h3>
          <p className="text-sm text-gray-400">客户端启动后会自动注册</p>
        </div>
      ) : (
        <>
          {/* 表头：全选 */}
          <div className="flex items-center px-1 py-1.5 mb-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 hover:text-gray-700">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              全选本页（{devices.length} 台）
            </label>
          </div>

          <div className="space-y-3">
            {devices.map(device => (
              <div
                key={device.id}
                className={`bg-white rounded-xl border p-4 transition shadow-sm hover:shadow-md ${
                  selectedIds.has(device.id) ? 'border-blue-400 ring-2 ring-blue-100' :
                  device.status === 'pending'
                    ? 'border-yellow-200'
                    : device.status === 'approved' && device.is_online
                    ? 'border-green-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* 复选框 */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(device.id)}
                      onChange={() => toggleSelect(device.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-2"
                    />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      device.status === 'approved' && device.is_online ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <span className="text-xl">{getDeviceTypeIcon(device.device_type)}</span>
                    </div>
                    <div>
                      {/* 设备名称（可编辑） */}
                      {editingId === device.id ? (
                        <input
                          type="text"
                          value={editAlias}
                          onChange={(e) => setEditAlias(e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveAlias(device)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={() => handleSaveAlias(device)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-800">{device.device_name}</h4>
                          {/* 在线状态 */}
                          {device.status === 'approved' && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              device.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${device.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                              {device.is_online ? '在线' : '离线'}
                            </div>
                          )}
                          <button
                            onClick={() => { setEditingId(device.id); setEditAlias(device.device_name) }}
                            className="text-gray-300 hover:text-blue-500 transition"
                            title="编辑名称"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {device.device_type} · ID: {device.device_id.substring(0, 8)}...
                      </p>
                      {device.ip_address && (
                        <p className="text-xs text-gray-400">IP: {device.ip_address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(device.status)}
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    <span>最后在线: {formatTime(device.last_seen)}</span>
                    <span className="mx-2">·</span>
                    <span>注册: {formatTime(device.created_at)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {device.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(device.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => handleReject(device.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition"
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    {device.status === 'rejected' && (
                      <button
                        onClick={() => handleApprove(device.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition"
                      >
                        重新批准
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(device)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 text-xs font-medium rounded-lg transition"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs text-gray-400">
                共 {total} 台设备，第 {page}/{totalPages} 页
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-xs font-medium rounded-lg transition ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 单个删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除设备"
        message={`确定要删除设备「${deleteTarget?.device_name}」吗？删除后需要重新注册。`}
        confirmText="删除"
        danger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 批量操作确认弹窗 */}
      <ConfirmDialog
        open={!!batchAction}
        title={
          batchAction?.type === 'approve' ? '批量批准设备' :
          batchAction?.type === 'reject' ? '批量拒绝设备' : '批量删除设备'
        }
        message={
          batchAction
            ? `确定要对选中的 ${batchAction.ids.length} 台设备执行「${
                batchAction.type === 'approve' ? '批量批准' :
                batchAction.type === 'reject' ? '批量拒绝' : '批量删除'
              }」操作吗？${batchAction.type === 'delete' ? '删除后设备需重新注册。' : ''}`
            : ''
        }
        confirmText={
          batchAction?.type === 'approve' ? '批量批准' :
          batchAction?.type === 'reject' ? '批量拒绝' : '批量删除'
        }
        danger={batchAction?.type === 'delete'}
        onConfirm={() => {
          if (!batchAction) return
          if (batchAction.type === 'approve') handleBatchApprove()
          else if (batchAction.type === 'reject') handleBatchReject()
          else handleBatchDelete()
        }}
        onCancel={() => setBatchAction(null)}
      />
    </div>
  )
}

export default DevicePanel