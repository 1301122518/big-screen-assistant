/**
 * SetupPage - 首次启动配置页面
 * 当 config.json 缺少 serverUrl 时显示，让用户输入服务器地址和设备名称
 */
import React, { useState, useEffect } from 'react'
import type { AppConfig } from '../types'
import Logger from '../utils/logger'

const log = Logger.create('SetupPage')

interface SetupPageProps {
  currentConfig: Partial<AppConfig>
  onConfigSaved: (newConfig: AppConfig) => void
}

const SetupPage: React.FC<SetupPageProps> = ({ currentConfig, onConfigSaved }) => {
  const [serverUrl, setServerUrl] = useState(currentConfig.serverUrl || '')
  const [deviceName, setDeviceName] = useState(currentConfig.deviceName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null)

  useEffect(() => {
    // 自动填充设备名称（如果为空）
    if (!deviceName && currentConfig.deviceName) {
      setDeviceName(currentConfig.deviceName)
    }
  }, [currentConfig])

  // 测试服务器连接
  const testConnection = async () => {
    if (!serverUrl.trim()) {
      setError('请输入服务器地址')
      return
    }

    setTesting(true)
    setTestResult(null)
    setError('')

    try {
      const url = normalizeUrl(serverUrl)
      log.info(`测试连接: ${url}/api/health`)
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 0) {
          log.info('连接测试成功', { version: data.data?.version })
          setTestResult('success')
          // 自动填充服务器地址（标准化后）
          setServerUrl(url)
        } else {
          log.warn('连接测试失败：服务器响应异常', data)
          setTestResult('fail')
          setError('服务器响应异常')
        }
      } else {
        log.warn(`连接测试失败：HTTP ${response.status}`)
        setTestResult('fail')
        setError(`服务器返回错误: ${response.status}`)
      }
    } catch (e: any) {
      log.error('连接测试异常', { name: e.name, message: e.message })
      setTestResult('fail')
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        setError('连接超时，请检查服务器地址和网络')
      } else {
        setError('无法连接到服务器，请检查地址是否正确')
      }
    } finally {
      setTesting(false)
    }
  }

  // 保存配置
  const saveConfig = async () => {
    const trimmedUrl = normalizeUrl(serverUrl)
    const trimmedName = deviceName.trim()

    if (!trimmedUrl) {
      setError('请输入服务器地址')
      return
    }
    if (!trimmedName) {
      setError('请输入设备名称')
      return
    }

    // URL 格式校验
    try {
      const url = new URL(trimmedUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        setError('服务器地址必须以 http:// 或 https:// 开头')
        return
      }
    } catch {
      setError('服务器地址格式不正确')
      return
    }

    setSaving(true)
    setError('')
    log.info(`保存配置: serverUrl=${trimmedUrl}, deviceName=${trimmedName}`)

    try {
      // 保存到本地（通过 Electron IPC）
      if (window.electronAPI?.saveConfig) {
        await window.electronAPI.saveConfig({
          serverUrl: trimmedUrl,
          deviceName: trimmedName,
        })
        log.info('配置保存成功')
      }

      // 通知父组件配置已保存
      onConfigSaved({
        serverUrl: trimmedUrl,
        deviceName: trimmedName,
      })
    } catch (e: any) {
      log.error('保存配置异常', { message: e.message })
      setError(`保存失败: ${e.message || '未知错误'}`)
    } finally {
      setSaving(false)
    }
  }

  const normalizeUrl = (url: string): string => {
    let normalized = url.trim()
    if (!normalized) return ''
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'http://' + normalized
    }
    // 去除末尾斜杠
    normalized = normalized.replace(/\/+$/, '')
    return normalized
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-gray-900">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">初始配置</h1>
          <p className="text-gray-400 text-sm">请配置服务器地址和设备信息</p>
        </div>

        {/* 服务器地址 */}
        <div className="mb-5">
          <label className="block text-gray-300 text-sm mb-2">
            服务器地址 <span className="text-red-400">*</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => { setServerUrl(e.target.value); setTestResult(null); setError('') }}
              placeholder="例如: http://<YOUR_SERVER_IP>:8787"
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              autoFocus
            />
            <button
              onClick={testConnection}
              disabled={testing || !serverUrl.trim()}
              className="px-4 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>
          {testResult === 'success' && (
            <p className="text-green-400 text-xs mt-2 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              连接成功
            </p>
          )}
          {testResult === 'fail' && (
            <p className="text-red-400 text-xs mt-2 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              连接失败
            </p>
          )}
        </div>

        {/* 设备名称 */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm mb-2">
            设备名称 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="例如: 会议室大屏"
            maxLength={64}
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saving) saveConfig()
            }}
          />
          <p className="text-gray-500 text-xs mt-1">用于在管理后台识别此设备</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={saveConfig}
          disabled={saving || !serverUrl.trim() || !deviceName.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? '保存中...' : '保存并连接'}
        </button>
      </div>
    </div>
  )
}

export default SetupPage