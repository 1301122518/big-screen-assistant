/**
 * UploadModal - 上传素材弹窗
 * 从侧边栏移到弹窗，支持文件上传、URL 添加、扫描本地文件
 */
import React, { useState, useRef, useEffect } from 'react'
import { scanLocalFiles } from '../../api/client'

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onUpload: (file: File, title?: string) => Promise<void>
  onAddUrl: (title: string, url: string) => Promise<void>
  onRefresh?: () => void
  darkMode?: boolean
}

const UploadModal: React.FC<UploadModalProps> = ({
  open,
  onClose,
  onUpload,
  onAddUrl,
  onRefresh,
  darkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'scan'>('file')
  const [urlTitle, setUrlTitle] = useState('')
  const [urlAddress, setUrlAddress] = useState('')
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  // 重置状态
  useEffect(() => {
    if (!open) {
      setSuccess(null)
      setError(null)
      setUrlTitle('')
      setUrlAddress('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      await onUpload(file)
      setSuccess(`「${file.name}」上传成功`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

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
      setSuccess(`「${urlTitle}」添加成功`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setUploading(false)
    }
  }

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">添加素材</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 px-6 pt-4">
          {[
            { key: 'file' as const, label: '上传文件', icon: '📁' },
            { key: 'url' as const, label: '添加 URL', icon: '🔗' },
            { key: 'scan' as const, label: '扫描本地', icon: '🔍' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setError(null); setSuccess(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="p-6">
          {/* 文件上传 */}
          {activeTab === 'file' && (
            <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
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
                  <div className="animate-spin w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="font-medium">上传中...</p>
                </div>
              ) : (
                <div className="text-gray-500">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="font-medium text-gray-700 mb-1">点击或拖拽文件到此处</p>
                  <p className="text-xs text-gray-400">
                    支持图片 (JPG/PNG/GIF)、视频 (MP4/AVI/MOV, 最大2GB)、网页 (HTML)
                  </p>
                </div>
              )}
            </label>
          )}

          {/* URL 添加 */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">素材标题</label>
                <input
                  type="text"
                  placeholder="输入素材标题"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">网页地址</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={urlAddress}
                  onChange={(e) => setUrlAddress(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
              </div>
              <button
                onClick={handleAddUrl}
                disabled={uploading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploading ? '添加中...' : '添加网页'}
              </button>
            </div>
          )}

          {/* 扫描本地 */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium mb-2">📌 使用说明</p>
                <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1.5">
                  <li>将视频文件通过 FTP/SFTP/共享文件夹拷贝到服务器的 uploads 目录</li>
                  <li>服务器路径：<code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">/home/<YOUR_USER>/big-screen-assistant/uploads/</code></li>
                  <li>点击下方"扫描并导入"按钮，系统会自动识别新文件</li>
                </ol>
              </div>
              <button
                onClick={handleScanLocal}
                disabled={scanning}
                className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {scanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    扫描中...
                  </span>
                ) : (
                  '🔍 扫描并导入'
                )}
              </button>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <span className="text-green-500">✓</span> {success}
            </div>
          )}
          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <span className="text-red-500">✕</span> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadModal
