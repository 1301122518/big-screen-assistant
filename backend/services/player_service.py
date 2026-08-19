"""
大屏操作助手 - 播放控制服务
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import PlayerState, Material, Playlist, PlaylistItem
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

    def _build_media_url(self, material: Material) -> str:
        """根据素材类型构建播放 URL"""
        if material.type == "webpage":
            return material.url or ""
        elif material.type == "html":
            return f"/uploads/{material.file_path}" if material.file_path else ""
        elif material.type == "video" and material.hls_path:
            return f"/uploads/{material.hls_path}/master.m3u8"
        else:
            return f"/uploads/{material.file_path}" if material.file_path else ""

    def _build_ws_message(self, material: Material, extra: dict = None) -> dict:
        """构建 WebSocket 播放消息"""
        msg = {
            "type": "play",
            "material": {
                "id": material.id,
                "type": material.type,
                "title": material.title,
                "url": self._build_media_url(material),
                "mime_type": material.mime_type,
                "hls_path": material.hls_path,
            },
        }
        if extra:
            msg.update(extra)
        return msg

    async def play(self, material_id: int) -> Dict[str, Any]:
        """播放指定素材，并通过 WebSocket 推送指令"""
        result = await self.db.execute(
            select(Material).where(Material.id == material_id)
        )
        material = result.scalar_one_or_none()
        if not material:
            return {"success": False, "message": "素材不存在"}

        state = await self.get_state()
        state.current_material_id = material_id
        state.status = "playing"
        state.updated_at = datetime.now()
        await self.db.flush()

        await ws_hub.broadcast(self._build_ws_message(material))
        return {"success": True, "message": "开始播放"}

    async def play_playlist(self, playlist_id: int) -> Dict[str, Any]:
        """播放播放列表中的第一个素材"""
        result = await self.db.execute(
            select(Playlist)
            .options(selectinload(Playlist.items).selectinload(PlaylistItem.material))
            .where(Playlist.id == playlist_id)
        )
        playlist = result.scalar_one_or_none()
        if not playlist:
            return {"success": False, "message": "播放列表不存在"}
        if not playlist.items:
            return {"success": False, "message": "播放列表为空"}

        # 播放第一个素材
        first_item = sorted(playlist.items, key=lambda x: x.sort_order)[0]
        material = first_item.material
        if not material:
            return {"success": False, "message": "素材不存在"}

        state = await self.get_state()
        state.current_material_id = material.id
        state.status = "playing"
        state.updated_at = datetime.now()
        await self.db.flush()

        # 构建播放消息，附带播放列表信息
        ws_msg = self._build_ws_message(material, extra={
            "playlist": {
                "id": playlist.id,
                "name": playlist.name,
                "play_mode": playlist.play_mode,
                "items": [
                    {
                        "id": item.id,
                        "material_id": item.material_id,
                        "sort_order": item.sort_order,
                    }
                    for item in sorted(playlist.items, key=lambda x: x.sort_order)
                ],
                "current_index": 0,
            }
        })
        await ws_hub.broadcast(ws_msg)
        return {"success": True, "message": f"开始播放列表：{playlist.name}"}

    async def play_next(self) -> Dict[str, Any]:
        """播放列表中的下一个素材"""
        state = await self.get_state()
        if not state.current_material_id:
            return {"success": False, "message": "当前没有播放中的素材"}

        # 查找当前素材所在的播放列表
        result = await self.db.execute(
            select(PlaylistItem)
            .options(selectinload(PlaylistItem.material))
            .where(PlaylistItem.material_id == state.current_material_id)
            .order_by(PlaylistItem.sort_order)
        )
        items = list(result.scalars().all())
        if not items:
            return {"success": False, "message": "当前素材不在播放列表中"}

        # 找到当前项的下一个
        current_idx = 0
        for i, item in enumerate(items):
            if item.material_id == state.current_material_id:
                current_idx = i
                break

        next_idx = current_idx + 1
        if next_idx >= len(items):
            # 循环播放
            next_idx = 0

        next_item = items[next_idx]
        if not next_item.material:
            return {"success": False, "message": "下一个素材不存在"}

        state.current_material_id = next_item.material_id
        state.updated_at = datetime.now()
        await self.db.flush()

        await ws_hub.broadcast(self._build_ws_message(next_item.material))
        return {"success": True, "message": "播放下一个"}

    async def play_prev(self) -> Dict[str, Any]:
        """播放列表中的上一个素材"""
        state = await self.get_state()
        if not state.current_material_id:
            return {"success": False, "message": "当前没有播放中的素材"}

        result = await self.db.execute(
            select(PlaylistItem)
            .options(selectinload(PlaylistItem.material))
            .where(PlaylistItem.material_id == state.current_material_id)
            .order_by(PlaylistItem.sort_order)
        )
        items = list(result.scalars().all())
        if not items:
            return {"success": False, "message": "当前素材不在播放列表中"}

        current_idx = 0
        for i, item in enumerate(items):
            if item.material_id == state.current_material_id:
                current_idx = i
                break

        prev_idx = current_idx - 1
        if prev_idx < 0:
            prev_idx = len(items) - 1

        prev_item = items[prev_idx]
        if not prev_item.material:
            return {"success": False, "message": "上一个素材不存在"}

        state.current_material_id = prev_item.material_id
        state.updated_at = datetime.now()
        await self.db.flush()

        await ws_hub.broadcast(self._build_ws_message(prev_item.material))
        return {"success": True, "message": "播放上一个"}

    async def stop(self) -> Dict[str, Any]:
        """停止播放，并通过 WebSocket 推送停止指令"""
        state = await self.get_state()
        state.status = "stopped"
        state.current_material_id = None
        state.updated_at = datetime.now()
        await self.db.flush()

        await ws_hub.broadcast({"type": "stop"})
        return {"success": True, "message": "已停止播放"}

    async def refresh(self) -> Dict[str, Any]:
        """刷新播放端页面，并通过 WebSocket 推送刷新指令"""
        await ws_hub.broadcast({"type": "refresh"})
        return {"success": True, "message": "已发送刷新指令"}
