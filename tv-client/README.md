# 大屏操作助手 TV 版

Android TV 纯播放端 APP，连接到服务端后可全屏播放图片、视频、网页素材。

## 架构说明

采用与 Windows 客户端相同的架构思路：

```
┌─────────────────────────────────────────────────────────────┐
│                    Android TV APP                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Android 原生壳 (Kotlin)                     ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │              WebView 容器                            │││
│  │  │  ┌─────────────────────────────────────────────────┐│││
│  │  │  │         Web 前端播放器 (React)                   ││││
│  │  │  │  - WebSocket 连接管理                           ││││
│  │  │  │  - 视频/图片/HTML 播放                          ││││
│  │  │  │  - 与服务端通信                                 ││││
│  │  │  └─────────────────────────────────────────────────┘│││
│  │  └─────────────────────────────────────────────────────┘││
│  │  - D-pad 遥控支持                                       ││
│  │  - 全屏沉浸式                                           ││
│  │  - 配置存储                                             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket / HTTP
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    服务端 (FastAPI)                          │
│  - 素材管理                                                  │
│  - 播放控制                                                  │
│  - WebSocket 推送                                            │
└─────────────────────────────────────────────────────────────┘
```

### 与 Windows 客户端的对比

| 特性 | Windows 客户端 | Android TV 版 |
|------|---------------|---------------|
| 外壳 | Electron | Android 原生 |
| 渲染 | Chromium WebView | Android WebView |
| 前端 | React (复用) | React (复用) |
| 输入 | 鼠标/键盘 | D-pad 遥控器 |
| 部署 | exe 安装包 | APK 安装 |

## 功能特性

- ✅ 连接服务端播放素材
- ✅ 支持图片、视频、HTML 网页播放
- ✅ WebSocket 实时通信
- ✅ D-pad 遥控器操作支持
- ✅ 全屏沉浸式播放
- ✅ 自动重连机制
- ✅ 配置持久化存储
- ✅ 屏幕常亮

## 构建说明

### 环境要求

- Android Studio Hedgehog (2023.1.1) 或更高版本
- JDK 17
- Android SDK 34
- Gradle 8.5

### 构建步骤

#### 方法一：使用 Android Studio（推荐）

1. 用 Android Studio 打开 `tv-client` 目录
2. 等待 Gradle 同步完成
3. 点击 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
4. APK 生成在 `app/build/outputs/apk/debug/` 目录

#### 方法二：使用命令行

```bash
# 进入项目目录
cd tv-client

# Windows
gradlew.bat assembleDebug

# Linux/Mac
./gradlew assembleDebug

# APK 位置
# app/build/outputs/apk/debug/app-debug.apk
```

### 构建 Release 版本

```bash
# 需要先配置签名（见下方签名配置）
gradlew.bat assembleRelease
```

### 签名配置

在 `app/build.gradle` 中添加签名配置：

```groovy
android {
    signingConfigs {
        release {
            storeFile file('your-keystore.jks')
            storePassword 'your-password'
            keyAlias 'your-alias'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

## 安装到 TV

### 方法一：ADB 安装

```bash
# 连接 TV（确保 TV 开启了 ADB 调试）
adb connect <TV-IP>

# 安装 APK
adb install app-debug.apk
```

### 方法二：U 盘安装

1. 将 APK 复制到 U 盘
2. 插入 TV 的 USB 口
3. 用文件管理器找到 APK 并安装

### 方法三：应用商店

将 APK 上传到 TV 应用商店（如当贝市场）进行分发。

## 使用说明

1. 首次启动进入配置页面
2. 输入服务端地址（如 `192.168.1.100:8080`）
3. 点击「测试连接」验证
4. 点击「连接并播放」进入播放模式
5. 使用遥控器操作：
   - **方向键**：导航
   - **确认键**：选择/确认
   - **返回键**：返回/退出
   - **菜单键**：调试菜单

## 项目结构

```
tv-client/
├── app/
│   ├── build.gradle                 # 应用构建配置
│   ├── proguard-rules.pro           # 混淆规则
│   └── src/main/
│       ├── AndroidManifest.xml      # 应用清单
│       ├── java/com/bigscreentv/
│       │   ├── BigScreenTVApp.kt    # Application 类
│       │   ├── ConfigActivity.kt    # 配置页面
│       │   ├── WebViewActivity.kt   # WebView 播放页
│       │   └── PlayerActivity.kt    # 原生播放页（备用）
│       ├── res/
│       │   ├── layout/              # 布局文件
│       │   ├── values/              # 字符串、颜色、样式
│       │   ├── drawable/            # 图形资源
│       │   └── xml/                 # 配置文件
│       └── assets/web/              # Web 前端资源（可选）
├── build.gradle                     # 项目构建配置
├── settings.gradle                  # 项目设置
├── gradle.properties                # Gradle 属性
├── gradlew                          # Gradle 包装器（Unix）
└── gradlew.bat                      # Gradle 包装器（Windows）
```

## 技术栈

- **语言**: Kotlin
- **最低 SDK**: 21 (Android 5.0)
- **目标 SDK**: 34 (Android 14)
- **WebView**: AndroidX WebKit
- **网络**: OkHttp (WebSocket)
- **UI**: AndroidX Leanback (TV 优化)

## 与 Windows 客户端的差异

| 方面 | Windows 客户端 | Android TV 版 |
|------|---------------|---------------|
| 前端加载 | 本地打包 | 从服务端加载 |
| 离线播放 | 支持 | 需要网络连接 |
| 输入方式 | 鼠标/键盘 | D-pad 遥控器 |
| 全屏方式 | Electron 全屏 | Android 沉浸式 |
| 配置存储 | electron-store | SharedPreferences |

## 故障排除

### 无法连接服务器

1. 检查 TV 和服务器是否在同一网络
2. 确认服务器地址和端口正确
3. 检查服务器防火墙设置
4. 尝试用浏览器访问 `http://<服务器地址>:<端口>/api/health`

### 视频播放卡顿

1. 检查网络连接速度
2. 确认视频格式兼容（推荐 H.264 MP4）
3. 尝试降低视频分辨率

### 遥控器无法操作

1. 确认 APP 获得焦点
2. 尝试点击屏幕后再用遥控器
3. 检查是否有其他 APP 拦截按键

## 后续优化

- [ ] 支持离线缓存素材
- [ ] 支持 HLS 视频流播放
- [ ] 添加开机自启动选项
- [ ] 支持多显示器切换
- [ ] 添加播放日志上报

## 许可证

与主项目保持一致。
