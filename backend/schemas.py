"""
大屏操作助手 - Pydantic 数据模式定义
"""
from datetime import datetime
from typing import Optional, Any, Generic, TypeVar, Dict
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


class TagResponse(BaseModel):
    """标签响应"""
    id: int
    name: str
    color: str

    class Config:
        from_attributes = True


class MaterialResponse(BaseModel):
    """素材响应（v3.0 增加 tags）"""
    id: int
    title: str
    type: str
    file_path: Optional[str] = None
    url: Optional[str] = None
    mime_type: Optional[str] = None
    size: Optional[int] = None
    hls_path: Optional[str] = None
    tags: list = []
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
    version: str = "2.0.3"
    local_ip: str
    port: int
    admin_url: str
    player_url: str
    connected_players: int = 0


class PlaylistResponse(BaseModel):
    """播放列表响应"""
    id: int
    name: str
    play_mode: str
    items: list = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ 设备管理 ============

class DeviceRegisterRequest(BaseModel):
    """设备注册请求"""
    device_id: str
    device_name: str
    device_type: str  # electron / tv / web
    ip_address: Optional[str] = None


class DeviceStatusUpdate(BaseModel):
    """设备状态更新请求"""
    status: str  # approved / rejected


class DeviceAliasUpdate(BaseModel):
    """设备别名更新请求"""
    alias: str = Field(..., min_length=1, max_length=64, description="新的设备别名")


class DeviceCommandRequest(BaseModel):
    """设备远程控制指令请求"""
    command: str = Field(..., description="指令类型: screenshot/restart/volume/play/stop/refresh")
    params: Optional[Dict[str, Any]] = Field(default=None, description="指令参数，如音量值")


class DeviceResponse(BaseModel):
    """设备响应"""
    id: int
    device_id: str
    device_name: str
    device_type: str
    status: str
    ip_address: Optional[str] = None
    last_seen: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ 批量设备管理 ============

class BatchStatusUpdate(BaseModel):
    """批量状态更新请求"""
    ids: List[int] = Field(..., min_length=1, description="设备 ID 列表")
    status: str = Field(..., pattern=r"^(approved|rejected)$", description="目标状态")


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    ids: List[int] = Field(..., min_length=1, description="设备 ID 列表")


class BatchResult(BaseModel):
    """批量操作结果"""
    success_count: int = 0
    fail_count: int = 0
    total: int = 0


class PaginatedDeviceResponse(BaseModel):
    """分页设备列表响应"""
    items: List[DeviceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
