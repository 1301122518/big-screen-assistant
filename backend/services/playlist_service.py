"""
大屏操作助手 - 播放列表服务
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models import Playlist, PlaylistItem, Material


class PlaylistService:
    """播放列表 CRUD 操作服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_playlists(self) -> List[Playlist]:
        """获取所有播放列表（含条目和素材信息）"""
        result = await self.db.execute(
            select(Playlist)
            .options(
                selectinload(Playlist.items).selectinload(PlaylistItem.material)
            )
            .order_by(Playlist.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_playlist(self, playlist_id: int) -> Optional[Playlist]:
        """获取单个播放列表"""
        result = await self.db.execute(
            select(Playlist)
            .options(
                selectinload(Playlist.items).selectinload(PlaylistItem.material)
            )
            .where(Playlist.id == playlist_id)
        )
        return result.scalar_one_or_none()

    async def create_playlist(self, name: str, play_mode: str = "sequential") -> Playlist:
        """创建播放列表"""
        playlist = Playlist(name=name, play_mode=play_mode)
        self.db.add(playlist)
        await self.db.flush()
        await self.db.refresh(playlist)
        return playlist

    async def update_playlist(
        self, playlist_id: int,
        name: Optional[str] = None,
        play_mode: Optional[str] = None,
    ) -> Optional[Playlist]:
        """更新播放列表"""
        playlist = await self.get_playlist(playlist_id)
        if not playlist:
            return None
        if name is not None:
            playlist.name = name
        if play_mode is not None:
            playlist.play_mode = play_mode
        await self.db.flush()
        await self.db.refresh(playlist)
        return playlist

    async def delete_playlist(self, playlist_id: int) -> bool:
        """删除播放列表"""
        playlist = await self.get_playlist(playlist_id)
        if not playlist:
            return False
        await self.db.delete(playlist)
        await self.db.flush()
        return True

    async def add_item(self, playlist_id: int, material_id: int) -> Optional[PlaylistItem]:
        """添加素材到播放列表"""
        playlist = await self.get_playlist(playlist_id)
        if not playlist:
            return None
        # 检查素材存在
        result = await self.db.execute(select(Material).where(Material.id == material_id))
        if not result.scalar_one_or_none():
            return None
        # 获取最大排序值
        max_order = max((item.sort_order for item in playlist.items), default=-1)
        item = PlaylistItem(
            playlist_id=playlist_id,
            material_id=material_id,
            sort_order=max_order + 1,
        )
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def remove_item(self, item_id: int) -> bool:
        """从播放列表移除素材"""
        result = await self.db.execute(
            select(PlaylistItem).where(PlaylistItem.id == item_id)
        )
        item = result.scalar_one_or_none()
        if not item:
            return False
        await self.db.delete(item)
        await self.db.flush()
        return True

    async def reorder_items(self, playlist_id: int, item_ids: List[int]) -> bool:
        """按 item_ids 顺序重新排序"""
        for idx, item_id in enumerate(item_ids):
            result = await self.db.execute(
                select(PlaylistItem).where(
                    PlaylistItem.id == item_id,
                    PlaylistItem.playlist_id == playlist_id,
                )
            )
            item = result.scalar_one_or_none()
            if item:
                item.sort_order = idx
        await self.db.flush()
        return True
