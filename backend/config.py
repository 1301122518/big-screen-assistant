"""
大屏操作助手 - 后端配置模块
"""
import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent

# 服务端口，可通过环境变量 PORT 修改
PORT = int(os.getenv("PORT", "8080"))

# 数据库路径
DATABASE_URL = f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'app.db'}"

# 上传文件存储目录
UPLOAD_DIR = BASE_DIR / "uploads"

# 允许上传的文件类型及对应 MIME
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
ALLOWED_VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
ALLOWED_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_VIDEO_EXTS

# 最大上传文件大小 (500MB)
MAX_UPLOAD_SIZE = 500 * 1024 * 1024
