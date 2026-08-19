/**
 * Logger - 客户端日志工具
 * 
 * 功能：
 * - 支持 info / warn / error / debug 四个级别
 * - Electron 环境：通过 IPC 写入安装目录下的 logs/ 文件夹
 * - 日志按文件大小自动拆分（每 5MB 一个文件）
 * - 浏览器环境：输出到 console + 内存缓存
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: unknown
}

class Logger {
  private module: string
  private static memoryLog: LogEntry[] = []
  private static MAX_MEMORY_ENTRIES = 5000

  constructor(module: string) {
    this.module = module
  }

  /** 创建带模块名的 logger 实例 */
  static create(module: string): Logger {
    return new Logger(module)
  }

  info(message: string, data?: unknown): void {
    this._log('INFO', message, data)
  }

  warn(message: string, data?: unknown): void {
    this._log('WARN', message, data)
  }

  error(message: string, data?: unknown): void {
    this._log('ERROR', message, data)
  }

  debug(message: string, data?: unknown): void {
    this._log('DEBUG', message, data)
  }

  private _log(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString()
    const entry: LogEntry = { timestamp, level, module: this.module, message, data }

    // 存入内存缓存
    Logger.memoryLog.push(entry)
    if (Logger.memoryLog.length > Logger.MAX_MEMORY_ENTRIES) {
      Logger.memoryLog = Logger.memoryLog.slice(-Logger.MAX_MEMORY_ENTRIES / 2)
    }

    // 格式化输出到 console
    const prefix = `[${timestamp}] [${level}] [${this.module}]`
    const consoleFn = level === 'ERROR' ? console.error
      : level === 'WARN' ? console.warn
      : level === 'DEBUG' ? console.debug
      : console.log

    if (data !== undefined) {
      consoleFn(`${prefix} ${message}`, data)
    } else {
      consoleFn(`${prefix} ${message}`)
    }

    // Electron 环境：通过 IPC 写入安装目录下的 logs/ 文件夹
    if (window.electronAPI?.writeLog) {
      const line = `${prefix} ${message}${data !== undefined ? ' ' + JSON.stringify(data) : ''}`
      window.electronAPI.writeLog(line)
    }
  }

  /** 获取内存中的全部日志（文本格式） */
  static getMemoryLog(): string {
    return Logger.memoryLog.map(e => {
      const base = `[${e.timestamp}] [${e.level}] [${e.module}] ${e.message}`
      return e.data !== undefined ? `${base} ${JSON.stringify(e.data)}` : base
    }).join('\n')
  }
}

export default Logger
