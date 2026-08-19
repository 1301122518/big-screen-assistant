"""
大屏操作助手 - 播放列表路由
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.playlist_service import PlaylistService
from backend.auth import get_current_user

router = APIRouter(prefix="/api/playlists", tags=["播放列表"])


class PlaylistCreate(BaseModel):
    name: str
    play_mode: str = "sequential"


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    play_mode: Optional[str] = None


class AddItemRequest(BaseModel):
    material_id: int


class ReorderRequest(BaseModel):
    item_ids: List[int]


@router.get("")
async def list_playlists(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """获取所有播放列表"""
    service = PlaylistService(db)
    playlists = await service.list_playlists()
    data = []
    for p in playlists:
        items_data = []
        for item in sorted(p.items, key=lambda x: x.sort_order):
            items_data.append({
                "id": item.id,
                "material_id": item.material_id,
                "sort_order": item.sort_order,
                "material": item.material.to_dict() if item.material else None,
            })
        data.append({
            "id": p.id,
            "name": p.name,
            "play_mode": p.play_mode,
            "items": items_data,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return {"code": 0, "data": data, "message": "success"}


@router.post("")
async def create_playlist(
    req: PlaylistCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """创建播放列表"""
    service = PlaylistService(db)
    playlist = await service.create_playlist(req.name, req.play_mode)
    return {
        "code": 0,
        "data": {"id": playlist.id, "name": playlist.name, "play_mode": playlist.play_mode},
        "message": "创建成功",
    }


@router.put("/{playlist_id}")
async def update_playlist(
    playlist_id: int,
    req: PlaylistUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """更新播放列表"""
    service = PlaylistService(db)
    playlist = await service.update_playlist(playlist_id, name=req.name, play_mode=req.play_mode)
    if not playlist:
        raise HTTPException(status_code=404, detail="播放列表不存在")
    return {
        "code": 0,
        "data": {"id": playlist.id, "name": playlist.name, "play_mode": playlist.play_mode},
        "message": "更新成功",
    }


@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """删除播放列表"""
    service = PlaylistService(db)
    success = await service.delete_playlist(playlist_id)
    if not success:
        raise HTTPException(status_code=404, detail="播放列表不存在")
    return {"code": 0, "data": None, "message": "删除成功"}


@router.post("/{playlist_id}/items")
async def add_item(
    playlist_id: int,
    req: AddItemRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """添加素材到播放列表"""
    service = PlaylistService(db)
    item = await service.add_item(playlist_id, req.material_id)
    if not item:
        raise HTTPException(status_code=400, detail="播放列表或素材不存在")
    return {
        "code": 0,
        "data": {"id": item.id, "material_id": item.material_id, "sort_order": item.sort_order},
        "message": "添加成功",
    }


@router.delete("/{playlist_id}/items/{item_id}")
async def remove_item(
    playlist_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """从播放列表移除素材"""
    service = PlaylistService(db)
    success = await service.remove_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="条目不存在")
    return {"code": 0, "data": None, "message": "移除成功"}


@router.put("/{playlist_id}/items/reorder")
async def reorder_items(
    playlist_id: int,
    req: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """重新排序播放列表条目"""
    service = PlaylistService(db)
    success = await service.reorder_items(playlist_id, req.item_ids)
    if not success:
        raise HTTPException(status_code=400, detail="排序失败")
    return {"code": 0, "data": None, "message": "排序更新成功"}
