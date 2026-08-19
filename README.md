# 大屏操作助手 (Big Screen Assistant)

> 企业级大屏内容管理与远程播放控制系统

[![Build Android TV APK](https://github.com/<YOUR_GITHUB_USERNAME>/big-screen-assistant/actions/workflows/build-tv-apk.yml/badge.svg)](https://github.com/<YOUR_GITHUB_USERNAME>/big-screen-assistant/actions/workflows/build-tv-apk.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![Node.js](https://img.shields.io/badge/node-18+-green.svg)

## 📖 简介

大屏操作助手是一套完整的大屏播放控制解决方案，支持通过 Web 管理面板上传素材、编排播放列表，远程控制多台大屏设备播放图片、视频、网页等内容。

### 核心特性

- 📁 **素材管理** — 上传图片、视频（最大 2GB）、HTML 文件，添加网页 URL
- 📋 **播放列表** — 创建多个播放列表，支持拖拽排序、顺序/循环/随机播放
- 🖥️ **多客户端** — Windows Electron 桌面客户端 + Android TV 客户端
- 🎬 **HLS 流式播放** — 大视频自动转码为 HLS 分片，按需加载不卡顿
- 🔐 **安全认证** — JWT 登录认证 + 设备准入控制（注册审批机制）
- 📊 **实时监控** — 设备在线状态、播放进度、系统资源仪表盘
- 🏷️ **标签系统** — 素材标签分类管理，快速检索
- 🔄 **WebSocket 实时通信** — 毫秒级指令推送，支持心跳保活
- 🌙 **深色模式** — 管理面板支持明暗主题切换
- 📱 **响应式设计** — 手机/平板/电脑均可管理

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    管理面板 (Web)                         │
│         React 18 + TypeScript + Tailwind CSS            │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                  后端服务 (FastAPI)                       │
│   JWT 认证 │ WebSocket Hub │ HLS 转码 │ 设备管理         │
│                    SQLite + SQLAlchemy                   │
└───────┬──────────────────────────────────┬──────────────┘
        │ WebSocket                        │ HTTP
┌───────▼──────────┐            ┌──────────▼─────────────┐
│  Electron 客户端  │            │   Android TV 客户端     │
│  (Windows PC)    │            │   (Kotlin + WebView)    │
└──────────────────┘            └────────────────────────┘
```

## 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| **后端** | Python 3.10+ / FastAPI / SQLAlchemy 2.0 (async) / SQLite |
| **管理前端** | React 18 / TypeScript / Vite 5 / Tailwind CSS 3 / MUI Icons |
| **桌面客户端** | Electron / React / TypeScript / hls.js |
| **TV 客户端** | Kotlin / Android / WebView |
| **实时通信** | FastAPI WebSocket |
| **视频处理** | ffmpeg (HLS 转码) |
| **部署** | Docker / systemd |

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- ffmpeg（可选，用于 HLS 视频转码）

### 1. 克隆项目

```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/big-screen-assistant.git
cd big-screen-assistant
```

### 2. 启动后端

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务（默认端口 8080）
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```

### 3. 启动前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问

- **管理面板**：http://localhost:8080/admin（或 http://localhost:5173/admin 开发模式）
- **API 文档**：http://localhost:8080/docs

### 默认登录凭据

- 用户名：`admin`
- 密码：`admin123`（首次登录后强制修改）

> ⚠️ **生产环境务必修改默认密码**，通过环境变量设置：
> ```bash
> export ADMIN_PASSWORD="your-strong-password"
> export JWT_SECRET="your-random-secret-key"
> ```

## 📦 部署

### Docker 部署

```bash
docker-compose up -d
```

### 手动部署

```bash
# 构建前端
cd frontend && npm install && npm run build && cd ..

# 启动后端（服务前端静态文件）
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080
```

详细部署指南请参阅 [DEPLOY.md](DEPLOY.md)。

## 🖥️ 桌面客户端 (Electron)

适用于 Windows 10/11，连接服务端作为大屏播放终端。

### 构建

```bash
cd client
npm install
npm run build
npm run package:win
```

安装包输出在 `client/release/` 目录。

### 配置

修改 `client/config.json` 中的服务器地址：

```json
{
  "serverUrl": "http://<YOUR_SERVER_IP>:8080",
  "deviceName": "我的大屏"
}
```

## 📺 Android TV 客户端

适用于 Android TV 设备，通过 WebView 加载服务端播放页面。

### 构建

```bash
cd tv-client
./gradlew assembleDebug
```

APK 输出在 `tv-client/app/build/outputs/apk/debug/`。

也可通过 GitHub Actions 自动构建（push 到 main 分支自动触发）。

### 配置

修改 `tv-client/app/src/main/assets/config.json`：

```json
{
  "serverUrl": "http://<YOUR_SERVER_IP>:8080"
}
```

## 📡 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/change-password` | 修改密码 |
| GET | `/api/materials` | 获取素材列表 |
| POST | `/api/materials/upload` | 上传文件 |
| POST | `/api/materials/url` | 添加网页 URL |
| GET | `/api/playlists` | 获取播放列表 |
| POST | `/api/playlists` | 创建播放列表 |
| GET | `/api/devices` | 获取设备列表 |
| POST | `/api/devices/approve/{id}` | 审批设备 |
| GET | `/api/dashboard/stats` | 仪表盘统计 |
| GET | `/api/system/info` | 系统信息 |

完整 API 文档访问 `/docs`（Swagger UI）。

## 🔌 WebSocket 协议

播放端通过 WebSocket 接收实时指令：

**连接地址**：`ws://<YOUR_SERVER_IP>:8080/api/player/ws/player`

**消息格式**：
```json
// 播放指令
{"type": "play", "material": {"id": 1, "type": "video", "url": "/uploads/xxx.mp4"}}

// 播放列表
{"type": "playlist", "items": [...], "mode": "sequential"}

// 停止指令
{"type": "stop"}

// 刷新指令
{"type": "refresh"}
```

## 📁 项目结构

```
big-screen-assistant/
├── backend/                # 后端 (FastAPI)
│   ├── routers/           # API 路由
│   ├── services/          # 业务逻辑 (HLS/播放/素材/播放列表)
│   ├── utils/             # 工具函数
│   ├── config.py          # 配置
│   ├── database.py        # 数据库
│   ├── models.py          # 数据模型
│   ├── auth.py            # 认证逻辑
│   └── main.py            # 主入口
├── frontend/              # 管理面板 (React)
│   └── src/
│       ├── components/    # UI 组件 (admin/ui)
│       ├── hooks/         # 自定义 Hooks
│       ├── pages/         # 页面
│       └── types/         # TypeScript 类型
├── client/                # Electron 桌面客户端
│   ├── electron/          # Electron 主进程
│   └── src/               # React 播放端
├── tv-client/             # Android TV 客户端 (Kotlin)
│   └── app/src/main/
│       ├── java/          # Kotlin 源码
│       ├── res/           # 资源文件
│       └── assets/        # 配置 + Web 资源
├── scripts/               # 启动脚本
├── docker-compose.yml     # Docker 编排
├── Dockerfile             # Docker 镜像
└── requirements.txt       # Python 依赖
```

## 🔧 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 服务端口 |
| `JWT_SECRET` | 内置默认 | JWT 签名密钥（生产环境必须修改） |
| `JWT_EXPIRE_HOURS` | `24` | Token 有效期（小时） |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `admin123` | 管理员初始密码 |
| `HLS_TIMEOUT` | `1800` | HLS 转码超时（秒） |
| `MAX_UPLOAD_SIZE` | `2GB` | 最大上传文件大小 |

## 📝 开发计划

- [ ] 多屏分组管理
- [ ] 定时播放任务
- [ ] 素材预览缩略图自动生成
- [ ] 操作日志审计导出
- [ ] 国际化支持

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
