"""
大屏操作助手 - 文件处理工具函数
"""
import uuid
from pathlib import Path
from backend.config import ALLOWED_EXTS, ALLOWED_IMAGE_EXTS, ALLOWED_VIDEO_EXTS, ALLOWED_HTML_EXTS


def get_file_extension(filename: str) -> str:
    """获取文件扩展名（小写）"""
    return Path(filename).suffix.lower()


def is_allowed_file(filename: str) -> bool:
    """检查文件类型是否允许上传"""
    ext = get_file_extension(filename)
    return ext in ALLOWED_EXTS


def get_mime_type(filename: str) -> str:
    """根据文件扩展名获取 MIME 类型"""
    ext = get_file_extension(filename)
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".html": "text/html",
        ".htm": "text/html",
    }
    return mime_map.get(ext, "application/octet-stream")


def get_material_type(filename: str) -> str:
    """根据文件扩展名判断素材类型"""
    ext = get_file_extension(filename)
    if ext in ALLOWED_IMAGE_EXTS:
        return "image"
    elif ext in ALLOWED_VIDEO_EXTS:
        return "video"
    elif ext in ALLOWED_HTML_EXTS:
        return "html"
    return "unknown"


def generate_unique_filename(original_filename: str) -> str:
    """生成唯一文件名：{uuid4}.{ext}"""
    ext = get_file_extension(original_filename)
    return f"{uuid.uuid4()}{ext}"
