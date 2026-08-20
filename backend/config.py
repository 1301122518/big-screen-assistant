"""
大屏操作助手 - 后端配置模块
"""
import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent

# 服务端口，可通过环境变量 PORT 修改
PORT = int(os.getenv("PORT", "8080"))

# 数据库路径（支持通过环境变量覆盖，Docker 部署时使用挂载卷路径）
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'app.db'}"
)

# 上传文件存储目录（支持通过环境变量覆盖）
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))

# HLS 转码输出目录（支持通过环境变量覆盖）
HLS_DIR = Path(os.getenv("HLS_DIR", str(UPLOAD_DIR / "hls")))

# 允许上传的文件类型及对应 MIME
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
ALLOWED_VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
ALLOWED_HTML_EXTS = {".html", ".htm"}
ALLOWED_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_VIDEO_EXTS | ALLOWED_HTML_EXTS

# 最大上传文件大小 (2GB)
MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024

# HLS 转码超时（秒），默认 30 分钟
HLS_TIMEOUT = int(os.getenv("HLS_TIMEOUT", "1800"))

# JWT 认证配置
JWT_SECRET = os.getenv("JWT_SECRET", "big-screen-assistant-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
