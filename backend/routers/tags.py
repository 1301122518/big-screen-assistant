"""
大屏操作助手 - 标签管理路由（v3.0 新增）
"""
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import Tag, MaterialTag

router = APIRouter(prefix="/api/tags", tags=["标签管理"])


class TagCreate(BaseModel):
    name: str
    color: str = "#3B82F6"


class TagResponse(BaseModel):
    id: int
    name: str
    color: str


@router.get("")
async def list_tags(db: AsyncSession = Depends(get_db)) -> dict:
    """获取所有标签"""
    result = await db.execute(select(Tag).order_by(Tag.name))
    tags = result.scalars().all()
    return {"code": 0, "data": [t.to_dict() for t in tags], "message": "success"}


@router.post("")
async def create_tag(req: TagCreate, db: AsyncSession = Depends(get_db)) -> dict:
    """创建标签"""
    # 检查是否已存在
    existing = await db.execute(select(Tag).where(Tag.name == req.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="标签已存在")

    tag = Tag(name=req.name, color=req.color)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)

    return {"code": 0, "data": tag.to_dict(), "message": "创建成功"}


@router.delete("/{tag_id}")
async def delete_tag(tag_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """删除标签"""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")

    await db.delete(tag)
    return {"code": 0, "data": None, "message": "删除成功"}


@router.post("/materials/{material_id}/tags")
async def add_material_tag(
    material_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """为素材添加标签"""
    # 检查素材是否存在
    from backend.models import Material
    result = await db.execute(select(Material).where(Material.id == material_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="素材不存在")

    # 检查标签是否存在
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="标签不存在")

    # 检查是否已关联
    result = await db.execute(
        select(MaterialTag).where(
            MaterialTag.material_id == material_id,
            MaterialTag.tag_id == tag_id,
        )
    )
    if result.scalar_one_or_none():
        return {"code": 0, "data": None, "message": "已存在"}

    mt = MaterialTag(material_id=material_id, tag_id=tag_id)
    db.add(mt)
    return {"code": 0, "data": None, "message": "添加成功"}


@router.delete("/materials/{material_id}/tags/{tag_id}")
async def remove_material_tag(
    material_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """移除素材标签"""
    result = await db.execute(
        select(MaterialTag).where(
            MaterialTag.material_id == material_id,
            MaterialTag.tag_id == tag_id,
        )
    )
    mt = result.scalar_one_or_none()
    if not mt:
        raise HTTPException(status_code=404, detail="关联不存在")

    await db.delete(mt)
    return {"code": 0, "data": None, "message": "移除成功"}
