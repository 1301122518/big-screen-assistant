import { app, BrowserWindow, ipcMain, screen } from 'electron'
import * as path from 'path'
import Store from 'electron-store'

// 配置存储
const store = new Store<{
  serverUrl: string
  autoStart: boolean
}>({
  defaults: {
    serverUrl: '',
    autoStart: true
  }
})

let mainWindow: BrowserWindow | null = null
let configWindow: BrowserWindow | null = null

function createConfigWindow() {
  configWindow = new BrowserWindow({
    width: 480,
    height: 360,
    resizable: false,
    frame: true,
    title: '服务器配置',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 开发模式加载 localhost，生产模式加载打包后的文件
  if (process.env.VITE_DEV_SERVER_URL) {
    configWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/#/config`)
  } else {
    configWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/config' })
  }

  configWindow.on('closed', () => {
    configWindow = null
  })
}

function createPlayerWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    kiosk: true,
    title: '大屏播放',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 开发模式加载 localhost，生产模式加载打包后的文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/#/player`)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/player' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 隐藏鼠标（3秒无操作后隐藏）
  let cursorTimer: ReturnType<typeof setTimeout> | null = null
  const hideCursor = () => {
    if (cursorTimer) clearTimeout(cursorTimer)
    cursorTimer = setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.insertCSS('body { cursor: none; }')
      }
    }, 3000)
  }
  mainWindow.webContents.on('cursor-updated' as any, hideCursor)
  mainWindow.webContents.session.webRequest.onBeforeRequest({ urls: [] }, (_details, cb) => cb({}))
  // Fallback: listen to mouse movement via globalShortcut is not ideal,
  // so we use a simpler approach - inject CSS after page loads
  mainWindow.webContents.on('did-finish-load', () => {
    hideCursor()
  })
}

// IPC 处理
ipcMain.handle('get-config', () => {
  return {
    serverUrl: store.get('serverUrl'),
    autoStart: store.get('autoStart')
  }
})

ipcMain.handle('set-config', (_event, config: { serverUrl: string; autoStart: boolean }) => {
  store.set('serverUrl', config.serverUrl)
  store.set('autoStart', config.autoStart)

  // 设置开机自启
  app.setLoginItemSettings({
    openAtLogin: config.autoStart,
    path: app.getPath('exe')
  })

  return { success: true }
})

ipcMain.handle('start-player', () => {
  if (configWindow) {
    configWindow.close()
  }
  createPlayerWindow()
  return { success: true }
})

ipcMain.handle('show-config', () => {
  if (mainWindow) {
    mainWindow.close()
  }
  createConfigWindow()
  return { success: true }
})

// 应用启动
app.whenReady().then(() => {
  const serverUrl = store.get('serverUrl')

  if (serverUrl) {
    // 已配置，直接进入播放模式
    createPlayerWindow()
  } else {
    // 未配置，显示配置窗口
    createConfigWindow()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const url = store.get('serverUrl')
      if (url) {
        createPlayerWindow()
      } else {
        createConfigWindow()
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
