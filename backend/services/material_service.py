"""
大屏操作助手 - 素材管理服务
"""
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path

from backend.models import Material
from backend.utils.file_helper import get_mime_type, get_material_type
from backend.config import UPLOAD_DIR


class MaterialService:
    """素材 CRUD 操作服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_materials(self) -> List[Material]:
        """获取所有素材列表，按创建时间倒序"""
        result = await self.db.execute(
            select(Material).order_by(Material.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_material(self, material_id: int) -> Optional[Material]:
        """根据 ID 获取单个素材"""
        result = await self.db.execute(
            select(Material).where(Material.id == material_id)
        )
        return result.scalar_one_or_none()

    async def create_material_from_upload(
        self,
        title: str,
        file_path: str,
        mime_type: str,
        size: int,
        material_type: str,
    ) -> Material:
        """从上传文件创建素材记录"""
        material = Material(
            title=title,
            type=material_type,
            file_path=file_path,
            mime_type=mime_type,
            size=size,
        )
        self.db.add(material)
        await self.db.flush()
        await self.db.refresh(material)
        return material

    async def create_material_from_url(self, title: str, url: str) -> Material:
        """从 URL 创建网页素材记录"""
        material = Material(
            title=title,
            type="webpage",
            url=url,
            mime_type="text/html",
        )
        self.db.add(material)
        await self.db.flush()
        await self.db.refresh(material)
        return material

    async def update_material(
        self, material_id: int, title: Optional[str] = None, url: Optional[str] = None
    ) -> Optional[Material]:
        """更新素材信息"""
        material = await self.get_material(material_id)
        if not material:
            return None
        if title is not None:
            material.title = title
        if url is not None:
            material.url = url
        await self.db.flush()
        await self.db.refresh(material)
        return material

    async def delete_material(self, material_id: int) -> bool:
        """删除素材记录及其关联文件"""
        material = await self.get_material(material_id)
        if not material:
            return False

        # 删除物理文件
        if material.file_path:
            file_full_path = UPLOAD_DIR / material.file_path
            if file_full_path.exists():
                try:
                    file_full_path.unlink()
                except OSError:
                    pass  # 文件删除失败不阻塞数据库操作

        await self.db.delete(material)
        await self.db.flush()
        return True
