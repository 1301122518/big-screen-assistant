/**
 * ConfigPage - 服务器配置页面
 * 首次启动时显示，输入服务器地址后进入播放模式
 */
import React, { useState, useEffect } from 'react'
import type { AppConfig } from '../types'

const ConfigPage: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('')
  const [autoStart, setAutoStart] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 加载已保存的配置
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((config: AppConfig) => {
        setServerUrl(config.serverUrl)
        setAutoStart(config.autoStart)
      })
    }
  }, [])

  const handleSave = async () => {
    setError('')

    // 验证 URL
    let url = serverUrl.trim()
    if (!url) {
      setError('请输入服务器地址')
      return
    }

    // 自动补全协议
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url
    }

    // 验证 URL 格式
    try {
      new URL(url)
    } catch {
      setError('服务器地址格式不正确')
      return
    }

    setLoading(true)

    try {
      // 测试连接
      const response = await fetch(`${url}/api/system/info`, {
        method: 'GET',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.code !== 0) {
        throw new Error(data.message || '连接失败')
      }

      // 保存配置
      if (window.electronAPI) {
        await window.electronAPI.setConfig({ serverUrl: url, autoStart })
        await window.electronAPI.startPlayer()
      }
    } catch (err) {
      setError(`连接失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-gray-900">
      <div className="w-96 p-8 bg-gray-800 rounded-xl shadow-2xl">
        <h1 className="text-2xl font-bold text-center text-white mb-2">
          大屏操作助手
        </h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          请配置服务器地址
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              服务器地址
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="例如：192.168.1.100:8080"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoStart"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="autoStart" className="ml-2 text-sm text-gray-300">
              开机自动启动
            </label>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? '连接中...' : '连接并启动'}
          </button>
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          确保客户端与服务器在同一局域网内
        </p>
      </div>
    </div>
  )
}

export default ConfigPage
