"""
大屏操作助手 - Pydantic 数据模式定义
"""
from datetime import datetime
from typing import Optional, Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应格式"""
    code: int = 0
    data: Optional[T] = None
    message: str = "success"


class MaterialCreate(BaseModel):
    """素材创建请求"""
    title: str
    url: Optional[str] = None


class MaterialUpdate(BaseModel):
    """素材更新请求"""
    title: Optional[str] = None
    url: Optional[str] = None


class MaterialResponse(BaseModel):
    """素材响应"""
    id: int
    title: str
    type: str
    file_path: Optional[str] = None
    url: Optional[str] = None
    mime_type: Optional[str] = None
    size: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlayerStateResponse(BaseModel):
    """播放状态响应"""
    id: int
    current_material_id: Optional[int] = None
    status: str
    updated_at: Optional[datetime] = None
    current_material: Optional[MaterialResponse] = None

    class Config:
        from_attributes = True


class SystemInfoResponse(BaseModel):
    """系统信息响应"""
    version: str = "1.0.0"
    local_ip: str
    port: int
    admin_url: str
    player_url: str
    connected_players: int = 0
