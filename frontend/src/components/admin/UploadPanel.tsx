/**
 * UploadPanel - 素材上传面板
 * 支持文件上传、URL 添加、扫描本地文件
 */
import React, { useState, useRef } from 'react'
import { scanLocalFiles } from '../../api/client'

interface UploadPanelProps {
  onUpload: (file: File, title?: string) => Promise<void>
  onAddUrl: (title: string, url: string) => Promise<void>
  onRefresh?: () => void
}

const UploadPanel: React.FC<UploadPanelProps> = ({ onUpload, onAddUrl, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'scan'>('file')
  const [urlTitle, setUrlTitle] = useState<string>('')
  const [urlAddress, setUrlAddress] = useState<string>('')
  const [uploading, setUploading] = useState<boolean>(false)
  const [scanning, setScanning] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** 处理文件选择 */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      await onUpload(file)
      setSuccess('上传成功')
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  /** 处理 URL 添加 */
  const handleAddUrl = async () => {
    if (!urlTitle.trim() || !urlAddress.trim()) {
      setError('请填写标题和 URL')
      return
    }
    if (!urlAddress.startsWith('http://') && !urlAddress.startsWith('https://')) {
      setError('URL 必须以 http:// 或 https:// 开头')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      await onAddUrl(urlTitle.trim(), urlAddress.trim())
      setUrlTitle('')
      setUrlAddress('')
      setSuccess('添加成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setUploading(false)
    }
  }

  /** 扫描本地文件 */
  const handleScanLocal = async () => {
    setScanning(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await scanLocalFiles()
      if (result.added_count > 0) {
        setSuccess(`扫描完成，新增 ${result.added_count} 个素材`)
        onRefresh?.()
      } else {
        setSuccess('扫描完成，没有发现新文件')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '扫描失败')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'file'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📁 上传文件
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'url'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔗 添加 URL
        </button>
        <button
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'scan'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔍 扫描本地
        </button>
      </div>

      {/* 文件上传区域 */}
      {activeTab === 'file' && (
        <div>
          <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.html,.htm"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="text-gray-500">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p>上传中...</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <p className="text-3xl mb-2">📤</p>
                <p className="text-sm">点击或拖拽文件到此处</p>
                <p className="text-xs text-gray-400 mt-1">
                  支持图片(JPG/PNG/GIF)、视频(MP4/AVI/MOV, 最大2GB)、网页(HTML)格式
                </p>
              </div>
            )}
          </label>
        </div>
      )}

      {/* URL 添加区域 */}
      {activeTab === 'url' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="素材标题"
            value={urlTitle}
            onChange={(e) => setUrlTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={uploading}
          />
          <input
            type="url"
            placeholder="https://example.com"
            value={urlAddress}
            onChange={(e) => setUrlAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={uploading}
          />
          <button
            onClick={handleAddUrl}
            disabled={uploading}
            className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? '添加中...' : '添加网页'}
          </button>
        </div>
      )}

      {/* 扫描本地文件区域 */}
      {activeTab === 'scan' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">📌 使用说明</p>
            <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
              <li>将视频文件通过 FTP/SFTP/共享文件夹 拷贝到服务器的 uploads 目录</li>
              <li>服务器路径：<code className="bg-yellow-100 px-1 rounded">/home/<YOUR_USER>/big-screen-assistant/uploads/</code></li>
              <li>点击下方"扫描并导入"按钮，系统会自动识别新文件</li>
            </ol>
          </div>
          <button
            onClick={handleScanLocal}
            disabled={scanning}
            className="w-full py-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {scanning ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                扫描中...
              </>
            ) : (
              '🔍 扫描并导入'
            )}
          </button>
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
          {success}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

export default UploadPanel
