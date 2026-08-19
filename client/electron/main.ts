import { app, BrowserWindow, ipcMain, screen } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'
import Store from 'electron-store'

// 设置应用名称（影响 userData 目录名）
app.setName('大屏操作助手')

// 应用配置存储
interface AppConfig {
  serverUrl: string
  deviceName: string
}

const DEFAULT_CONFIG: AppConfig = {
  serverUrl: 'http://<YOUR_SERVER_IP>:8787',
  deviceName: os.hostname() || '大屏客户端',
}

// 日志配置
const LOG_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const LOG_MAX_FILES = 10 // 最多保留 10 个日志文件

let store: any
let mainWindow: BrowserWindow | null = null
let logDir: string = ''
let currentLogFile: string = ''
let currentLogSize: number = 0

/** 获取日志目录（安装目录下的 logs 文件夹） */
function getLogDir(): string {
  if (logDir) return logDir
  const exePath = app.getPath('exe')
  logDir = path.join(path.dirname(exePath), 'logs')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

/** 获取当前日志文件路径（按日期命名） */
function getCurrentLogFile(): string {
  const dir = getLogDir()
  const dateStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return path.join(dir, `app-${dateStr}.log`)
}

/** 检查日志文件大小，必要时轮转 */
function checkLogRotation(): void {
  const logFile = getCurrentLogFile()
  
  // 如果当前文件变了（跨天），重置计数
  if (logFile !== currentLogFile) {
    currentLogFile = logFile
    currentLogSize = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0
    return
  }
  
  // 检查当前文件大小
  if (currentLogSize >= LOG_MAX_SIZE) {
    // 找到当前文件的最大序号
    const dir = getLogDir()
    const baseName = path.basename(currentLogFile, '.log')
    let maxIndex = 0
    
    try {
      const files = fs.readdirSync(dir)
      for (const f of files) {
        const match = f.match(new RegExp(`^${baseName}-(\d+)\.log$`))
        if (match) {
          const idx = parseInt(match[1], 10)
          if (idx > maxIndex) maxIndex = idx
        }
      }
    } catch { /* ignore */ }
    
    // 重命名当前文件为带序号的文件
    const newIndex = maxIndex + 1
    const rotatedFile = path.join(dir, `${baseName}-${newIndex}.log`)
    try {
      fs.renameSync(currentLogFile, rotatedFile)
    } catch { /* ignore */ }
    
    // 清理旧日志文件（保留最新的 LOG_MAX_FILES 个）
    cleanupOldLogs()
    
    // 重置当前文件
    currentLogFile = logFile
    currentLogSize = 0
  }
}

/** 清理旧日志文件 */
function cleanupOldLogs(): void {
  const dir = getLogDir()
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(dir, f),
        mtime: fs.statSync(path.join(dir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime) // 最新的在前
    
    // 删除超出数量限制的文件
    if (files.length > LOG_MAX_FILES) {
      for (const file of files.slice(LOG_MAX_FILES)) {
        try {
          fs.unlinkSync(file.path)
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

/** 写入日志 */
function writeLog(line: string): void {
  try {
    checkLogRotation()
    const logLine = line + '\n'
    fs.appendFileSync(currentLogFile, logLine, 'utf-8')
    currentLogSize += Buffer.byteLength(logLine, 'utf-8')
  } catch (err) {
    console.error('写入日志失败:', err)
  }
}

function initStore(): void {
  store = new Store({
    name: 'config',
    defaults: {
      deviceId: uuidv4(),
      config: DEFAULT_CONFIG,
    },
  })
}

function getDeviceId(): string {
  return store.get('deviceId', uuidv4()) as string
}

function getConfig(): AppConfig {
  return store.get('config', DEFAULT_CONFIG) as AppConfig
}

function saveConfig(config: AppConfig): void {
  store.set('config', config)
}

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    frame: false,
    resizable: false,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 加载前端页面
  const indexPath = path.join(__dirname, '../dist/index.html')
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath)
  } else {
    // 开发模式
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  }
}

// 注册 IPC 处理器
function registerIpcHandlers(): void {
  // 获取设备 ID
  ipcMain.handle('get-device-id', () => {
    return getDeviceId()
  })

  // 获取配置
  ipcMain.handle('get-config', () => {
    return getConfig()
  })

  // 保存配置
  ipcMain.handle('save-config', (_event, config: AppConfig) => {
    saveConfig(config)
  })

  // 截屏：使用 Electron desktopCapturer
  ipcMain.handle('screenshot', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow() || mainWindow
      if (!win) return null

      const image = await win.webContents.capturePage()
      const dataUrl = image.toDataURL()
      return dataUrl
    } catch (err) {
      console.error('截屏失败:', err)
      return null
    }
  })

  // 重启应用
  ipcMain.handle('restart-app', () => {
    app.relaunch()
    app.exit(0)
  })

  // 设置音量
  ipcMain.handle('set-volume', (_event, level: number) => {
    if (mainWindow) {
      mainWindow.webContents.setAudioMuted(false)
      mainWindow.webContents.setZoomLevel(0)
      // 音量控制通过渲染进程的 HTMLVideoElement 实现
    }
  })

  // 获取音量（当前始终返回 1.0，实际由 VideoPlayer 组件维护）
  ipcMain.handle('get-volume', () => {
    return 1.0
  })

  // 写入日志（渲染进程通过 IPC 调用）
  ipcMain.handle('write-log', (_event, line: string) => {
    writeLog(line)
  })
}

app.whenReady().then(() => {
  initStore()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
