"""
大屏操作助手 - 播放控制服务
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import PlayerState, Material
from backend.websocket_hub import ws_hub


class PlayerService:
    """播放状态管理与控制服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_state(self) -> PlayerState:
        """获取当前播放状态（单例），不存在则自动创建"""
        result = await self.db.execute(
            select(PlayerState)
            .options(selectinload(PlayerState.current_material))
            .where(PlayerState.id == 1)
        )
        state = result.scalar_one_or_none()
        if not state:
            state = PlayerState(id=1, status="idle")
            self.db.add(state)
            await self.db.flush()
            await self.db.refresh(state)
        return state

    async def play(self, material_id: int) -> Dict[str, Any]:
        """播放指定素材，并通过 WebSocket 推送指令"""
        # 检查素材是否存在
        result = await self.db.execute(
            select(Material).where(Material.id == material_id)
        )
        material = result.scalar_one_or_none()
        if not material:
            return {"success": False, "message": "素材不存在"}

        # 更新播放状态
        state = await self.get_state()
        state.current_material_id = material_id
        state.status = "playing"
        state.updated_at = datetime.utcnow()
        await self.db.flush()

        # 构建 WebSocket 消息
        if material.type == "webpage":
            media_url = material.url or ""
        else:
            media_url = f"/uploads/{material.file_path}" if material.file_path else ""

        ws_message = {
            "type": "play",
            "material": {
                "id": material.id,
                "type": material.type,
                "title": material.title,
                "url": media_url,
                "mime_type": material.mime_type,
            },
        }
        await ws_hub.broadcast(ws_message)

        return {"success": True, "message": "开始播放"}

    async def stop(self) -> Dict[str, Any]:
        """停止播放，并通过 WebSocket 推送停止指令"""
        state = await self.get_state()
        state.status = "stopped"
        state.current_material_id = None
        state.updated_at = datetime.utcnow()
        await self.db.flush()

        await ws_hub.broadcast({"type": "stop"})
        return {"success": True, "message": "已停止播放"}

    async def refresh(self) -> Dict[str, Any]:
        """刷新播放端页面，并通过 WebSocket 推送刷新指令"""
        await ws_hub.broadcast({"type": "refresh"})
        return {"success": True, "message": "已发送刷新指令"}
