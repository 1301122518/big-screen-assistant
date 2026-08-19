/**
 * DevicePanel - 设备管理面板（增强版）
 * 骨架屏加载、自定义删除弹窗、Toast 通知
 */
import React, { useState, useEffect, useCallback } from 'react'
import { fetchDevices, approveDevice, rejectDevice, deleteDevice, updateDeviceAlias } from '../../api/client'
import type { Device } from '../../types'
import { SkeletonDeviceList } from '../ui/Skeleton'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

interface DevicePanelProps {
  darkMode?: boolean
}

const DevicePanel: React.FC<DevicePanelProps> = ({ darkMode = false }) => {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  // 编辑别名
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAlias, setEditAlias] = useState('')

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      setLoading(false) // 首次加载后不再显示骨架屏
      setError(null)
      const data = await fetchDevices()
      setDevices(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载设备列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDevices()
    const timer = setInterval(loadDevices, 5000)
    return () => clearInterval(timer)
  }, [loadDevices])

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

  // 首次加载骨架屏
  if (loading && devices.length === 0) {
    return <SkeletonDeviceList count={4} />
  }

  const onlineCount = devices.filter(d => d.status === 'approved' && d.is_online).length

  return (
    <div>
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{devices.length}</div>
          <div className="text-xs text-gray-500">总设备</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
          <div className="text-xs text-gray-500">在线</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{devices.filter(d => d.status === 'pending').length}</div>
          <div className="text-xs text-gray-500">待审批</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{devices.filter(d => d.status === 'rejected').length}</div>
          <div className="text-xs text-gray-500">已拒绝</div>
        </div>
      </div>

      {/* 设备列表 */}
      {devices.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📱</span>
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-1">暂无设备</h3>
          <p className="text-sm text-gray-400">客户端启动后会自动注册</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map(device => (
            <div
              key={device.id}
              className={`bg-white rounded-xl border p-4 transition shadow-sm hover:shadow-md ${
                device.status === 'pending'
                  ? 'border-yellow-200'
                  : device.status === 'approved' && device.is_online
                  ? 'border-green-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
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
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除设备"
        message={`确定要删除设备「${deleteTarget?.device_name}」吗？删除后需要重新注册。`}
        confirmText="删除"
        danger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default DevicePanel
