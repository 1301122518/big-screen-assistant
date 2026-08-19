"""
大屏操作助手 - Dashboard 统计路由（v3.0 新增）
"""
import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database import get_db
from backend.models import Material, Device, Playlist
from backend.config import UPLOAD_DIR
from backend.websocket_hub import ws_hub

router = APIRouter(prefix="/api/dashboard", tags=["仪表盘"])


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)) -> dict:
    """获取 Dashboard 聚合统计数据"""
    # 素材总数
    material_count = await db.execute(select(func.count(Material.id)))
    total_materials = material_count.scalar() or 0

    # 今日上传数
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.execute(
        select(func.count(Material.id)).where(Material.created_at >= today_start)
    )
    today_uploads = today_count.scalar() or 0

    # 设备统计
    device_count = await db.execute(select(func.count(Device.id)))
    total_devices = device_count.scalar() or 0

    approved_count = await db.execute(
        select(func.count(Device.id)).where(Device.status == "approved")
    )
    approved_devices = approved_count.scalar() or 0

    online_players = ws_hub.connection_count

    # 播放列表数
    playlist_count = await db.execute(select(func.count(Playlist.id)))
    total_playlists = playlist_count.scalar() or 0

    # 存储空间
    try:
        total_space, used_space, free_space = get_disk_usage()
    except Exception:
        total_space = used_space = free_space = 0

    # 今日播放次数（暂不统计）
    today_plays = 0

    return {
        "code": 0,
        "data": {
            "materials": {
                "total": total_materials,
                "today_uploads": today_uploads,
            },
            "devices": {
                "total": total_devices,
                "approved": approved_devices,
                "online": online_players,
            },
            "playlists": {
                "total": total_playlists,
            },
            "storage": {
                "total": total_space,
                "used": used_space,
                "free": free_space,
            },
            "today_plays": today_plays
        },
        "message": "success",
    }


def get_disk_usage() -> tuple[int, int, int]:
    """获取磁盘使用情况"""
    try:
        usage = shutil.disk_usage(str(UPLOAD_DIR))
        return usage.total, usage.used, usage.free
    except Exception:
        return 0, 0, 0
