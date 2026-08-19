/**
 * DeviceWaitingPage - 设备等待审批页面
 * 当设备已注册但未被管理员批准时显示
 */
import React, { useState, useEffect } from 'react'
import Logger from '../utils/logger'

const log = Logger.create('DeviceWaitingPage')

interface DeviceWaitingPageProps {
  deviceName: string
  deviceId: string
  serverUrl: string
  status: 'pending' | 'rejected' | 'not_found'
  errorType?: string | null
  errorMessage?: string
  onApproved?: () => void
  onReconfigure?: () => void
}

const DeviceWaitingPage: React.FC<DeviceWaitingPageProps> = ({
  deviceName,
  deviceId,
  serverUrl,
  status,
  errorType,
  errorMessage,
  onApproved,
  onReconfigure,
}) => {
  const [time, setTime] = useState(new Date())
  const [pollingMessage, setPollingMessage] = useState('正在等待管理员审批...')

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 轮询设备状态
  useEffect(() => {
    if (status !== 'pending') return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${serverUrl}/api/devices/check/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.data?.status === 'approved') {
            log.info('设备已批准')
            setPollingMessage('设备已批准，正在连接...')
            clearInterval(pollInterval)
            setTimeout(() => onApproved?.(), 1000)
          } else if (data.data?.status === 'rejected') {
            log.warn('设备被拒绝')
            setPollingMessage('设备已被管理员拒绝')
          }
        }
      } catch (e: any) {
        log.debug('轮询网络错误，继续轮询', { message: e.message })
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [status, deviceId, serverUrl, onApproved])

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('zh-CN', { hour12: false })
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const getStatusContent = () => {
    switch (status) {
      case 'pending':
        return (
          <>
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">等待管理员审批</h2>
            <p className="text-gray-400 text-sm mb-4">{pollingMessage}</p>
            <div className="bg-gray-800 rounded-lg p-4 text-left max-w-sm">
              <p className="text-gray-400 text-xs mb-2">设备信息：</p>
              <p className="text-white text-sm">名称：{deviceName}</p>
              <p className="text-gray-500 text-xs mt-1 break-all">ID：{deviceId}</p>
            </div>
            <p className="text-gray-600 text-xs mt-6">
              请联系管理员在后台审批此设备
            </p>
          </>
        )
      case 'rejected':
        return (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">设备已被拒绝</h2>
            <p className="text-gray-400 text-sm">管理员已拒绝此设备的接入请求</p>
            <p className="text-gray-600 text-xs mt-6">
              请联系管理员了解详情
            </p>
          </>
        )
      case 'not_found':
        return (
          <>
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">设备注册失败</h2>
            <p className="text-gray-400 text-sm mb-2">
              {errorType === 'network' && '无法连接到服务器'}
              {errorType === 'server' && '服务器响应异常'}
              {errorType === 'config' && '配置不完整'}
              {(!errorType || errorType === 'unknown') && '无法注册设备到服务器'}
            </p>
            {errorMessage && (
              <p className="text-gray-500 text-xs mb-4 bg-gray-800 px-4 py-2 rounded-lg">
                {errorMessage}
              </p>
            )}
            <div className="bg-gray-800 rounded-lg p-4 text-left max-w-sm mb-4">
              <p className="text-gray-400 text-xs mb-2">设备信息：</p>
              <p className="text-white text-sm">名称：{deviceName}</p>
              <p className="text-gray-500 text-xs mt-1 break-all">ID：{deviceId}</p>
              <p className="text-gray-500 text-xs mt-1">服务器：{serverUrl}</p>
            </div>
            <div className="flex space-x-3">
              {onReconfigure && (
                <button
                  onClick={onReconfigure}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                >
                  重新配置
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                重试
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-4">
              {errorType === 'network' && '请检查网络连接和服务器地址是否正确'}
              {errorType === 'server' && '请确认服务器正在运行'}
              {(!errorType || errorType === 'unknown' || errorType === 'config') && '请检查服务器地址是否正确'}
            </p>
          </>
        )
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900">
      {/* 时间 */}
      <div className="absolute top-8 left-8">
        <div className="text-4xl font-light text-white/30 tracking-wider">
          {formatTime(time)}
        </div>
        <div className="text-sm text-gray-600">
          {formatDate(time)}
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex flex-col items-center">
        {getStatusContent()}
      </div>

      {/* 底部服务器信息 */}
      <div className="absolute bottom-8 text-center">
        <p className="text-gray-600 text-xs">
          服务器：{serverUrl}
        </p>
      </div>
    </div>
  )
}

export default DeviceWaitingPage
