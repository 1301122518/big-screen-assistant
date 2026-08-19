"""
大屏操作助手 - 设备管理路由
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import Device
from backend.schemas import ApiResponse, DeviceRegisterRequest, DeviceStatusUpdate, DeviceAliasUpdate, DeviceResponse, DeviceCommandRequest, BatchStatusUpdate, BatchDeleteRequest, BatchResult, PaginatedDeviceResponse
from sqlalchemy import func
from backend.auth import get_current_user
from backend.websocket_hub import ws_hub

router = APIRouter(prefix="/api/devices", tags=["设备管理"])


@router.post("/register", response_model=ApiResponse)
async def register_device(
    request: DeviceRegisterRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    客户端注册/更新设备（公开接口，不需要JWT）
    幂等操作：同一 device_id 重复注册只更新信息
    """
    # 自动获取客户端IP（优先使用请求头，兼容代理场景）
    ip_address = request.ip_address
    if not ip_address:
        forwarded_for = http_request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        elif http_request.client:
            ip_address = http_request.client.host

    # 查找是否已存在
    result = await db.execute(
        select(Device).where(Device.device_id == request.device_id)
    )
    device = result.scalar_one_or_none()

    if device:
        # 已存在，更新信息
        device.device_name = request.device_name
        device.device_type = request.device_type
        device.ip_address = ip_address
        device.last_seen = datetime.now()
        device.updated_at = datetime.now()
        await db.flush()
        return {
            "code": 0,
            "data": device.to_dict(),
            "message": "设备信息已更新",
        }
    else:
        # 新设备注册
        device = Device(
            device_id=request.device_id,
            device_name=request.device_name,
            device_type=request.device_type,
            ip_address=ip_address,
            status="pending",
            last_seen=datetime.now(),
        )
        db.add(device)
        await db.flush()
        await db.refresh(device)
        return {
            "code": 0,
            "data": device.to_dict(),
            "message": "设备注册成功，请等待管理员审批",
        }


@router.get("", response_model=ApiResponse)
async def list_devices(
    page: int = 1,
    page_size: int = 20,
    status: str = None,
    _user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取设备列表（分页+筛选，需要JWT，管理端用）"""
    query = select(Device)
    count_query = select(func.count(Device.id))

    # 状态筛选
    if status and status in ("pending", "approved", "rejected"):
        query = query.where(Device.status == status)
        count_query = count_query.where(Device.status == status)

    # 总记录数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))

    # 分页查询
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Device.updated_at.desc()).offset(offset).limit(page_size)
    )
    devices = result.scalars().all()
    # 附加在线状态（基于 WebSocket hub 当前连接）
    online_ids = ws_hub.get_connected_device_ids()
    data = []
    for d in devices:
        info = d.to_dict()
        info["is_online"] = d.device_id in online_ids
        data.append(info)
    return {
        "code": 0,
        "data": {
            "items": data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
        "message": "success",
    }


@router.put("/{device_db_id}/status", response_model=ApiResponse)
async def update_device_status(
    device_db_id: int,
    request: DeviceStatusUpdate,
    _user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """更新设备状态（approve/reject，需要JWT）"""
    if request.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="状态值无效，仅支持 approved / rejected")

    result = await db.execute(
        select(Device).where(Device.id == device_db_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    device.status = request.status
    device.updated_at = datetime.now()
    await db.flush()
    await db.refresh(device)

    return {
        "code": 0,
        "data": device.to_dict(),
        "message": f"设备已{('批准' if request.status == 'approved' else '拒绝')}",
    }


@router.delete("/{device_db_id}", response_model=ApiResponse)
async def delete_device(
    device_db_id: int,
    _user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """删除设备（需要JWT）"""
    result = await db.execute(
        select(Device).where(Device.id == device_db_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    await db.delete(device)
    await db.flush()

    return {
        "code": 0,
        "data": None,
        "message": "设备已删除",
    }


@router.patch("/{device_id}/alias", response_model=ApiResponse)
async def update_device_alias(
    device_id: str,
    request: DeviceAliasUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    更新设备别名（公开接口，客户端调用）
    根据 device_id（UUID）查找设备，更新 device_name 字段
    """
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    device.device_name = request.alias
    device.updated_at = datetime.now()
    await db.flush()
    await db.refresh(device)

    return {
        "code": 0,
        "data": device.to_dict(),
        "message": "设备别名已更新",
    }


@router.post("/{device_id}/command", response_model=ApiResponse)
async def send_device_command(
    device_id: str,
    request: DeviceCommandRequest,
    _user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    向指定设备发送远程控制指令（需要 JWT）
    支持的指令类型：screenshot / restart / volume / play / stop / refresh
    """
    # 验证设备是否存在
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    # 通过 WebSocket 发送指令到设备
    message = {
        "type": "command",
        "command": request.command,
        "params": request.params or {},
    }
    sent = await ws_hub.send_to_device(device_id, message)
    if not sent:
        raise HTTPException(status_code=503, detail="设备不在线")

    return {
        "code": 0,
        "data": {"sent": True},
        "message": f"指令 {request.command} 已发送到设备 {device.device_name}",
    }


@router.get("/check/{device_id}", response_model=ApiResponse)
async def check_device_status(
    device_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """检查设备状态（公开接口，客户端轮询用）"""
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        return {
            "code": 0,
            "data": {"status": "not_found"},
            "message": "设备未注册",
        }

    # 更新最后心跳时间
    device.last_seen = datetime.now()
    await db.flush()

    return {
        "code": 0,
        "data": {"status": device.status, "device": device.to_dict()},
        "message": "success",
    }

@router.post("/batch/status", response_model=ApiResponse)
async def batch_update_status(
    request: BatchStatusUpdate,
    _user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """批量批准/拒绝设备（需要JWT）"""
    success_count = 0
    fail_count = 0
    for device_db_id in request.ids:
        result = await db.execute(
            select(Device).where(Device.id == device_db_id)
        )
        device = result.scalar_one_or_none()
        if not device:
            fail_count += 1
            continue
        device.status = request.status
        device.updated_at = datetime.now()
        success_count += 1
    await db.flush()
    status_label = "批准" if request.status == "approved" else "拒绝"
    return {
        "code": 0,
        "data": {"success_count": success_count, "fail_count": fail_count, "total": len(request.ids)},
        "message": f"批量{status_label}完成：成功 {success_count}，失败 {fail_count}",
    }


@router.post("/batch/delete", response_model=ApiResponse)
async def batch_delete_devices(
    request: BatchDeleteRequest,
    _user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """批量删除设备（需要JWT）"""
    success_count = 0
    fail_count = 0
    for device_db_id in request.ids:
        result = await db.execute(
            select(Device).where(Device.id == device_db_id)
        )
        device = result.scalar_one_or_none()
        if not device:
            fail_count += 1
            continue
        await db.delete(device)
        success_count += 1
    await db.flush()
    return {
        "code": 0,
        "data": {"success_count": success_count, "fail_count": fail_count, "total": len(request.ids)},
        "message": f"批量删除完成：成功 {success_count}，失败 {fail_count}",
    }
