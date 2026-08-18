# 大屏操作助手

本地大屏播放控制系统，通过 PC 连接大屏展示内容，手机/平板/电脑远程控制播放。

## 功能特性

- 📁 **素材管理**：上传图片、视频，添加网页 URL
- 🖥️ **大屏播放**：全屏展示图片、视频、网页内容
- 📱 **远程控制**：手机/平板/电脑通过浏览器控制播放
- 🔄 **实时通信**：WebSocket 实时推送播放指令
- 🌐 **局域网部署**：一键启动，无需服务器

## 技术栈

- **后端**：FastAPI + SQLite + SQLAlchemy 2.0 (async)
- **前端**：React 18 + TypeScript + Vite 5 + Tailwind CSS 3
- **实时通信**：FastAPI WebSocket
- **部署**：Windows 本地，.bat 一键启动

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- Windows 10/11

### 一键启动

双击运行 `scripts/start.bat`，自动完成：
1. 安装后端依赖
2. 安装前端依赖
3. 构建前端
4. 启动服务

启动成功后访问：
- **管理端**：http://localhost:8080/admin
- **播放端**：http://localhost:8080/player

### 手动启动

#### 后端

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```

#### 前端（开发模式）

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发模式下访问：
- **管理端**：http://localhost:5173/admin
- **播放端**：http://localhost:5173/player

## 使用指南

### 1. 启动播放端

在大屏连接的 PC 上打开浏览器，访问：
```
http://<你的IP>:8080/player
```

建议按 F11 进入全屏模式。

### 2. 打开管理端

在手机、平板或另一台电脑上访问：
```
http://<你的IP>:8080/admin
```

### 3. 上传素材

在管理端可以：
- **上传文件**：点击上传区域选择图片或视频文件
- **添加 URL**：切换到"添加 URL"标签，输入标题和网页地址

### 4. 控制播放

- 点击素材卡片的 **▶ 播放** 按钮，大屏立即播放该素材
- 点击 **⏹ 停止** 按钮，大屏回到待机画面
- 点击 **🔄 刷新** 按钮，刷新大屏页面

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/materials/upload | 上传图片/视频 |
| POST | /api/materials/url | 添加网页 URL |
| GET | /api/materials | 获取素材列表 |
| PUT | /api/materials/{id} | 修改素材 |
| DELETE | /api/materials/{id} | 删除素材 |
| POST | /api/player/play/{id} | 播放指定素材 |
| POST | /api/player/stop | 停止播放 |
| POST | /api/player/refresh | 刷新播放端 |
| GET | /api/player/status | 获取播放状态 |
| GET | /api/system/info | 系统信息 |

## WebSocket 协议

播放端通过 WebSocket 接收实时指令：

**连接地址**：`ws://<你的IP>:8080/ws/player`

**消息格式**：
```json
// 播放指令
{"type": "play", "material": {"id": 1, "type": "image", "url": "/uploads/xxx.jpg"}}

// 停止指令
{"type": "stop"}

// 刷新指令
{"type": "refresh"}
```

## 项目结构

```
big-screen-assistant/
├── backend/                # 后端代码
│   ├── routers/           # API 路由
│   ├── services/          # 业务逻辑
│   ├── utils/             # 工具函数
│   ├── config.py          # 配置
│   ├── database.py        # 数据库
│   ├── models.py          # 数据模型
│   ├── schemas.py         # Pydantic 模式
│   ├── websocket_hub.py   # WebSocket 管理
│   └── main.py            # 主入口
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── api/          # API 客户端
│   │   ├── components/   # React 组件
│   │   ├── hooks/        # 自定义 Hooks
│   │   ├── pages/        # 页面
│   │   └── types/        # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── start.bat         # 一键启动脚本
├── uploads/              # 上传文件存储
├── requirements.txt      # Python 依赖
└── README.md
```

## 配置说明

### 端口配置

默认端口 8080，可通过环境变量修改：

```bash
# Windows
set PORT=9090
python -m uvicorn backend.main:app --host 0.0.0.0 --port %PORT%

# Linux/Mac
export PORT=9090
python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

### 文件上传限制

- 最大文件大小：500MB
- 支持的图片格式：JPG、PNG、GIF、BMP、WEBP
- 支持的视频格式：MP4、AVI、MOV、MKV、WEBM

## 常见问题

### Q: 播放端无法连接？
A: 确保播放端和管理端在同一局域网，检查防火墙设置。

### Q: 视频无法自动播放？
A: 浏览器安全策略可能阻止自动播放，建议先点击页面任意位置后再操作。

### Q: 如何修改端口？
A: 设置环境变量 `PORT`，或修改 `scripts/start.bat` 中的端口号。

## 许可证

MIT License

## 技术支持

如有问题或建议，请联系开发团队。
